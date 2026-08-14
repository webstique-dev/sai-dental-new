const Patient = require('../models/Patient');
const { logAction } = require('../middleware/auditLog');
const { canDoctorAccessPatient } = require('../utils/patientAuth');

// GET /api/patients?search=&lastVisitFrom=&lastVisitTo=&doctorId=&sort=&sortBy=&sortOrder=&page=&limit=
async function listPatients(req, res, next) {
  try {
    const {
      search,
      lastVisitFrom,
      lastVisitTo,
      doctorId,
      sort,
      sortBy,
      sortOrder,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Determine effective doctor filter
    let effectiveDoctorId = null;
    if (req.user && req.user.role === 'doctor') {
      effectiveDoctorId = req.user._id.toString();
    } else if (doctorId && doctorId.trim()) {
      effectiveDoctorId = doctorId.trim();
    }

    const mongoose = require('mongoose');

    // Build aggregation pipeline
    const pipeline = [];

    // 1. Initial Match (Search by name, phone, OP number, exclude soft deleted)
    const matchStage = { isDeleted: { $ne: true } };
    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      matchStage.$or = [
        { firstName: regex },
        { lastName: regex },
        { phone: regex },
        { opNumber: regex },
      ];
    }
    pipeline.push({ $match: matchStage });

    // 2. Lookup consultations, appointments, and queue entries for each patient
    pipeline.push(
      {
        $lookup: {
          from: 'consultations',
          localField: '_id',
          foreignField: 'patient',
          as: 'consultations',
        },
      },
      {
        $lookup: {
          from: 'appointments',
          localField: '_id',
          foreignField: 'patient',
          as: 'appointments',
        },
      },
      {
        $lookup: {
          from: 'queueentries',
          localField: '_id',
          foreignField: 'patient',
          as: 'queueEntries',
        },
      }
    );

    // 3. If filtered by doctorId, ensure patient has at least one consultation, appointment, or queueEntry with this doctor
    if (effectiveDoctorId && mongoose.Types.ObjectId.isValid(effectiveDoctorId)) {
      const docObjId = new mongoose.Types.ObjectId(effectiveDoctorId);
      pipeline.push({
        $match: {
          $or: [
            { 'consultations.doctor': docObjId },
            { appointments: { $elemMatch: { doctor: docObjId, isDeleted: { $ne: true } } } },
            { 'queueEntries.doctor': docObjId },
          ],
        },
      });
    }

    // 4. Calculate lastVisitDoc, lastVisitDate, and lastVisitDoctorId
    pipeline.push({
      $addFields: {
        lastVisitDoc: {
          $arrayElemAt: [
            {
              $filter: {
                input: {
                  $sortArray: {
                    input: '$consultations',
                    sortBy: { startedAt: -1, createdAt: -1 },
                  },
                },
                as: 'c',
                cond:
                  effectiveDoctorId && mongoose.Types.ObjectId.isValid(effectiveDoctorId)
                    ? { $eq: ['$$c.doctor', new mongoose.Types.ObjectId(effectiveDoctorId)] }
                    : true,
              },
            },
            0,
          ],
        },
      },
    });

    pipeline.push({
      $addFields: {
        lastVisitDate: {
          $ifNull: ['$lastVisitDoc.startedAt', '$lastVisitDoc.createdAt'],
        },
        lastVisitDoctorId: '$lastVisitDoc.doctor',
      },
    });

    // 5. Filter by lastVisitFrom and lastVisitTo
    if (lastVisitFrom || lastVisitTo) {
      const dateMatch = {};
      if (lastVisitFrom) {
        dateMatch.$gte = new Date(lastVisitFrom);
      }
      if (lastVisitTo) {
        const toDate = new Date(lastVisitTo);
        toDate.setHours(23, 59, 59, 999);
        dateMatch.$lte = toDate;
      }
      pipeline.push({
        $match: {
          lastVisitDate: dateMatch,
        },
      });
    }

    // 6. Populate lastVisitDoctor info
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'lastVisitDoctorId',
        foreignField: '_id',
        as: 'lastVisitDoctor',
      },
    });

    pipeline.push({
      $addFields: {
        lastVisitDoctor: { $arrayElemAt: ['$lastVisitDoctor', 0] },
      },
    });

    // 7. Sorting
    const sortField = sort || sortBy || 'lastVisit';
    const direction = sortOrder === 'asc' ? 1 : -1;
    let sortOptions = {};

    if (sortField === 'name') {
      sortOptions = { firstName: direction, lastName: direction };
    } else if (sortField === 'registrationDate') {
      sortOptions = { registrationDate: direction, createdAt: direction };
    } else {
      sortOptions = { lastVisitDate: direction, createdAt: direction };
    }

    // 8. Pagination Facet
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $sort: sortOptions }, { $skip: skip }, { $limit: limitNum }],
      },
    });

    const result = await Patient.aggregate(pipeline);
    const facetRes = result[0] || {};
    const total = facetRes.metadata && facetRes.metadata.length > 0 ? facetRes.metadata[0].total : 0;
    const patients = facetRes.data || [];

    return res.json({
      patients,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/patients (Register patient — works even with empty body)
async function createPatient(req, res, next) {
  try {
    const data = { ...req.body };
    if (req.user && req.user._id) {
      data.registeredBy = req.user._id;
    }

    const patient = new Patient(data);
    await patient.save();

    await logAction(req, {
      action: 'registered patient',
      entityType: 'Patient',
      entityId: patient._id,
      patient: patient._id,
      newValue: {
        opNumber: patient.opNumber,
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        phone: patient.phone,
      },
    });

    return res.status(201).json({
      message: 'Patient registered successfully',
      patient,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/patients/:id
async function getPatientById(req, res, next) {
  try {
    const patientId = req.params.id || req.params.patientId;

    if (req.user && req.user.role === 'doctor') {
      const allowed = await canDoctorAccessPatient(req.user._id, patientId);
      if (!allowed) {
        return res.status(403).json({
          message: 'Access denied. You can only view records for patients assigned to you via appointments or consultations.',
        });
      }
    }

    const patient = await Patient.findById(patientId).populate('registeredBy', 'name email role');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    return res.json({ patient });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/patients/:id
async function updatePatient(req, res, next) {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('registeredBy', 'name email role');

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    return res.json({
      message: 'Patient updated successfully',
      patient,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/patients/:patientId/emr
async function getPatientEMR(req, res, next) {
  try {
    const patientId = req.params.patientId || req.params.id;

    if (req.user && req.user.role === 'doctor') {
      const allowed = await canDoctorAccessPatient(req.user._id, patientId);
      if (!allowed) {
        return res.status(403).json({
          message: 'Access denied. You can only view records for patients assigned to you via appointments or consultations.',
        });
      }
    }

    const Consultation = require('../models/Consultation');
    const Examination = require('../models/Examination');
    const Diagnosis = require('../models/Diagnosis');
    const TreatmentPlan = require('../models/TreatmentPlan');
    const Prescription = require('../models/Prescription');
    const Investigation = require('../models/Investigation');
    const ToothRecord = require('../models/ToothRecord');
    const FollowUp = require('../models/FollowUp');

    const ALL_FDI_TEETH = [
      18, 17, 16, 15, 14, 13, 12, 11,
      21, 22, 23, 24, 25, 26, 27, 28,
      48, 47, 46, 45, 44, 43, 42, 41,
      31, 32, 33, 34, 35, 36, 37, 38,
    ];

    // 1. Patient Details
    const patient = await Patient.findById(patientId).populate('registeredBy', 'name email role');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // 2. Fetch all consultations for this patient (most recent first)
    const rawConsultations = await Consultation.find({ patient: patientId })
      .sort({ createdAt: -1 })
      .populate('doctor', 'name email specialization');

    // 3. Group clinical records per consultation by querying { consultation: cId }
    const consultationsData = await Promise.all(
      rawConsultations.map(async (c) => {
        const cId = c._id;

        const [exam, diagnoses, treatmentPlans, prescriptions, investigations] = await Promise.all([
          Examination.findOne({ consultation: cId }).populate('recordedBy', 'name email'),
          Diagnosis.find({ consultation: cId }).sort({ createdAt: -1 }).populate('recordedBy', 'name email'),
          TreatmentPlan.find({ consultation: cId })
            .sort({ createdAt: -1 })
            .populate('diagnosis', 'diagnosis clinicalFindings severity')
            .populate('recordedBy', 'name email'),
          Prescription.find({ consultation: cId })
            .sort({ createdAt: -1 })
            .populate('recordedBy', 'name email role specialization'),
          Investigation.find({ consultation: cId }).sort({ createdAt: -1 }).populate('recordedBy', 'name email'),
        ]);

        return {
          consultationId: c._id,
          id: c._id,
          doctor: c.doctor ? { _id: c.doctor._id, name: c.doctor.name, specialization: c.doctor.specialization } : null,
          date: c.startedAt || c.createdAt,
          status: c.status,
          closedAt: c.closedAt || null,
          notes: c.notes || '',
          examination: exam || null,
          diagnoses: diagnoses || [],
          treatmentPlans: treatmentPlans || [],
          prescriptions: prescriptions || [],
          investigations: investigations || [],
        };
      })
    );

    // 4. Fetch full current 32-tooth chart state
    const records = await ToothRecord.find({ patient: patientId })
      .populate('history.doctor', 'name email')
      .sort({ toothNumber: 1 });

    const recordMap = {};
    records.forEach((r) => {
      recordMap[r.toothNumber] = r;
    });

    const toothChart = ALL_FDI_TEETH.map((tNum) => {
      if (recordMap[tNum]) {
        return recordMap[tNum];
      }
      return {
        patient: patientId,
        toothNumber: tNum,
        currentCondition: 'Healthy',
        history: [],
      };
    });

    // 5. Fetch all FollowUp records for this patient
    const followUps = await FollowUp.find({ patient: patientId })
      .sort({ recommendedDate: -1, createdAt: -1 })
      .populate({
        path: 'scheduledAppointment',
        populate: { path: 'doctor', select: 'name specialization' },
      })
      .populate('createdBy', 'name email');

    return res.json({
      patient,
      consultations: consultationsData,
      toothChart,
      followUps,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/patients/:id (Soft delete patient)
async function deletePatient(req, res, next) {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    patient.isDeleted = true;
    patient.deletedAt = new Date();
    patient.deletedBy = req.user ? req.user._id : undefined;
    await patient.save();

    return res.json({ message: 'Patient record deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPatients,
  createPatient,
  getPatientById,
  updatePatient,
  getPatientEMR,
  deletePatient,
};
