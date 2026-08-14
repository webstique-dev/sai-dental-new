const Consultation = require('../models/Consultation');
const QueueEntry = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const FollowUp = require('../models/FollowUp');
const { logAction } = require('../middleware/auditLog');
const { syncVisitStatus } = require('../utils/statusSync');
const { getDayBounds } = require('./appointmentController');

// Immutability Guard Helper: Rejects write actions on closed consultations with HTTP 403
async function checkConsultationNotClosed(consultationId) {
  if (!consultationId) return;
  const consultation = await Consultation.findById(consultationId);
  if (consultation && consultation.status === 'Completed') {
    const err = new Error('This consultation has been closed and cannot be modified. Reopening closed consultations is not supported.');
    err.status = 403;
    throw err;
  }
}

// GET /api/consultations?patient=
async function listConsultations(req, res, next) {
  try {
    const { patient } = req.query;
    const filter = {};
    if (patient) filter.patient = patient;

    const consultations = await Consultation.find(filter)
      .sort({ createdAt: -1 })
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email specialization');

    return res.json({ consultations });
  } catch (err) {
    next(err);
  }
}

// GET /api/consultations/queue/today (Checked-In or In Consultation, doctor-scoped)
async function getDoctorTodayQueue(req, res, next) {
  try {
    const { start, end } = getDayBounds(new Date());

    // First ensure all checked-in appointments for today have an active QueueEntry
    const checkedInAppointments = await Appointment.find({
      date: { $gte: start, $lte: end },
      status: { $in: ['Checked-In', 'In Consultation'] },
    });

    for (const apt of checkedInAppointments) {
      let qEntry = await QueueEntry.findOne({ appointment: apt._id });
      if (!qEntry) {
        const lastEntry = await QueueEntry.findOne({ date: { $gte: start, $lte: end } }).sort({ token: -1 });
        const nextToken = lastEntry && lastEntry.token ? lastEntry.token + 1 : 1;
        qEntry = new QueueEntry({
          token: nextToken,
          patient: apt.patient,
          doctor: apt.doctor,
          appointment: apt._id,
          type: apt.type || 'Appointment',
          status: apt.status,
          checkInTime: new Date(),
          date: new Date(),
        });
        await qEntry.save();
      } else if (qEntry.status !== apt.status) {
        qEntry.status = apt.status;
        await qEntry.save();
      }
    }

    const filter = {
      date: { $gte: start, $lte: end },
      status: { $in: ['Checked-In', 'In Consultation', 'With Doctor'] },
    };

    // Doctor role sees only their own patients; Admin sees all
    if (req.user && req.user.role === 'doctor') {
      filter.doctor = req.user._id;
    }

    const queueEntries = await QueueEntry.find(filter)
      .sort({ token: 1 })
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('appointment', 'time reason status type');

    // Attach active consultation ID if already started
    const entriesWithConsultation = await Promise.all(
      queueEntries.map(async (entry) => {
        const activeConsultation = await Consultation.findOne({
          $or: [{ queueEntry: entry._id }, { appointment: entry.appointment }],
          status: 'In Progress',
        }).select('_id');

        const entryObj = entry.toObject();
        // Normalize status display
        if (entryObj.status === 'With Doctor') {
          entryObj.status = 'In Consultation';
        }
        entryObj.activeConsultationId = activeConsultation ? activeConsultation._id : null;
        return entryObj;
      })
    );

    return res.json({ queueEntries: entriesWithConsultation });
  } catch (err) {
    next(err);
  }
}

// POST /api/consultations/start (body: { queueEntryId })
async function startConsultation(req, res, next) {
  try {
    const { queueEntryId, appointmentId } = req.body;

    if (!queueEntryId && !appointmentId) {
      return res.status(400).json({ message: 'queueEntryId or appointmentId is required.' });
    }

    let queueEntry = null;
    if (queueEntryId) {
      queueEntry = await QueueEntry.findById(queueEntryId);
    } else if (appointmentId) {
      queueEntry = await QueueEntry.findOne({ appointment: appointmentId });
    }

    if (!queueEntry && appointmentId) {
      const apt = await Appointment.findById(appointmentId);
      if (apt) {
        const { start, end } = getDayBounds(new Date());
        const lastEntry = await QueueEntry.findOne({ date: { $gte: start, $lte: end } }).sort({ token: -1 });
        const nextToken = lastEntry && lastEntry.token ? lastEntry.token + 1 : 1;
        queueEntry = new QueueEntry({
          token: nextToken,
          patient: apt.patient,
          doctor: apt.doctor,
          appointment: apt._id,
          type: apt.type || 'Appointment',
          status: 'In Consultation',
          checkInTime: new Date(),
          date: new Date(),
        });
        await queueEntry.save();
      }
    }

    if (!queueEntry) {
      return res.status(404).json({ message: 'Queue entry not found.' });
    }

    // Check if consultation is already in progress for this queue entry
    let consultation = await Consultation.findOne({
      $or: [{ queueEntry: queueEntry._id }, { appointment: queueEntry.appointment }],
      status: 'In Progress',
    });

    if (!consultation) {
      consultation = new Consultation({
        patient: queueEntry.patient,
        doctor: req.user ? req.user._id : queueEntry.doctor,
        queueEntry: queueEntry._id,
        appointment: queueEntry.appointment || null,
        status: 'In Progress',
        startedAt: new Date(),
      });
      await consultation.save();
    }

    // Synchronize visit status to "In Consultation" across all models
    await syncVisitStatus({
      appointmentId: queueEntry.appointment,
      queueEntryId: queueEntry._id,
      consultationId: consultation._id,
      status: 'In Consultation',
    });

    const populated = await Consultation.findById(consultation._id)
      .populate('patient', 'firstName lastName opNumber phone age sex dateOfBirth occupation address medicalHistory currentMedications vitals habits dentalHistory')
      .populate('doctor', 'name email role specialization')
      .populate('queueEntry')
      .populate('appointment');

    return res.status(201).json({
      message: 'Consultation started successfully',
      consultation: populated,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/consultations/:id (full consultation detail)
async function getConsultationById(req, res, next) {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate('patient', 'firstName lastName opNumber phone age sex dateOfBirth occupation address medicalHistory currentMedications vitals habits dentalHistory')
      .populate('doctor', 'name email role specialization')
      .populate('queueEntry')
      .populate('appointment');

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    return res.json({ consultation });
  } catch (err) {
    next(err);
  }
}

// POST /api/consultations/:id/close (Sets status = Completed, closedAt = now, creates/updates followUp, updates QueueEntry/Appointment)
async function closeConsultation(req, res, next) {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    const { closeNotes, followUp } = req.body || {};
    let savedFollowUp = null;

    // Handle optional Follow-Up payload
    if (followUp && typeof followUp === 'object') {
      const { recommendedDate, reason, instructions, treatmentStatus, notes } = followUp;

      // Check if a FollowUp document already exists for this consultation
      let existingFollowUp = await FollowUp.findOne({ consultation: consultation._id });

      if (existingFollowUp) {
        if (recommendedDate) existingFollowUp.recommendedDate = recommendedDate;
        if (reason !== undefined) existingFollowUp.reason = reason;
        if (instructions !== undefined) existingFollowUp.instructions = instructions;
        if (notes !== undefined) existingFollowUp.notes = notes;
        if (treatmentStatus !== undefined) existingFollowUp.treatmentStatus = treatmentStatus;
        await existingFollowUp.save();
        savedFollowUp = existingFollowUp;
      } else {
        savedFollowUp = new FollowUp({
          patient: consultation.patient,
          consultation: consultation._id,
          recommendedDate: recommendedDate || new Date(),
          reason: reason || 'Follow-up Visit',
          instructions: instructions || '',
          notes: notes || '',
          treatmentStatus: treatmentStatus || '',
          status: 'Pending',
          createdBy: req.user ? req.user._id : undefined,
        });
        await savedFollowUp.save();
      }

      savedFollowUp = await FollowUp.findById(savedFollowUp._id)
        .populate('patient', 'firstName lastName opNumber phone age sex')
        .populate('createdBy', 'name email');
    }

    if (closeNotes) {
      consultation.notes = closeNotes;
    }

    consultation.status = 'Completed';
    consultation.closedAt = new Date();
    await consultation.save();

    // Synchronize visit status across QueueEntry and Appointment
    await syncVisitStatus({
      consultationId: consultation._id,
      queueEntryId: consultation.queueEntry,
      appointmentId: consultation.appointment,
      status: 'Completed',
    });

    await logAction(req, {
      action: 'closed consultation',
      entityType: 'Consultation',
      entityId: consultation._id,
      patient: consultation.patient,
      newValue: {
        status: 'Completed',
        closedAt: consultation.closedAt,
        followUp: savedFollowUp ? savedFollowUp._id : null,
      },
    });

    return res.json({
      message: 'Consultation closed successfully.',
      consultation,
      followUp: savedFollowUp,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/consultations/doctor-summary?doctorId=
async function getDoctorSummary(req, res, next) {
  try {
    let targetDoctorId = req.user ? req.user._id : null;
    if (req.user && req.user.role === 'admin' && req.query.doctorId) {
      targetDoctorId = req.query.doctorId;
    }

    const { start, end } = getDayBounds(new Date());

    // 1. patientsInQueue: count of QueueEntry with status Checked-In or In Consultation, assigned to this doctor, for today
    const queueFilter = {
      date: { $gte: start, $lte: end },
      status: { $in: ['Checked-In', 'Checked In', 'Waiting', 'With Doctor', 'In Consultation'] },
    };
    if (targetDoctorId) {
      queueFilter.doctor = targetDoctorId;
    }
    const patientsInQueue = await QueueEntry.countDocuments(queueFilter);

    // 2. todaysConsultations: count of Consultation for this doctor with startedAt today (In Progress and Completed)
    const consultFilter = {
      startedAt: { $gte: start, $lte: end },
    };
    if (targetDoctorId) {
      consultFilter.doctor = targetDoctorId;
    }
    const todaysConsultations = await Consultation.countDocuments(consultFilter);

    // 3. activeTreatmentPlans: count of TreatmentPlan for this doctor's patients with status in [Planned, Approved, In Progress]
    const TreatmentPlan = require('../models/TreatmentPlan');
    const tpFilter = {
      status: { $in: ['Planned', 'Approved', 'In Progress'] },
    };
    if (targetDoctorId) {
      tpFilter.$or = [{ doctor: targetDoctorId }, { recordedBy: targetDoctorId }];
    }
    const activeTreatmentPlans = await TreatmentPlan.countDocuments(tpFilter);

    // 4. followUpsDue: count of FollowUp with status Pending, recommendedDate <= today
    const FollowUp = require('../models/FollowUp');
    const fuFilter = {
      status: 'Pending',
      recommendedDate: { $lte: end },
    };

    if (targetDoctorId) {
      const patientIdsForDoctor = await Consultation.distinct('patient', { doctor: targetDoctorId });
      fuFilter.$or = [
        { createdBy: targetDoctorId },
        { patient: { $in: patientIdsForDoctor } },
      ];
    }
    const followUpsDue = await FollowUp.countDocuments(fuFilter);

    // 5. nextInQueue: single next patient in this doctor's queue (lowest token number with status Checked-In today)
    const nextQueueEntry = await QueueEntry.findOne(queueFilter)
      .sort({ token: 1 })
      .populate('patient', 'firstName lastName opNumber phone age sex');

    let nextInQueue = null;
    if (nextQueueEntry) {
      nextInQueue = {
        _id: nextQueueEntry._id,
        id: nextQueueEntry._id,
        token: nextQueueEntry.token,
        checkInTime: nextQueueEntry.checkInTime || nextQueueEntry.createdAt,
        patient: nextQueueEntry.patient
          ? {
              _id: nextQueueEntry.patient._id,
              id: nextQueueEntry.patient._id,
              firstName: nextQueueEntry.patient.firstName,
              lastName: nextQueueEntry.patient.lastName,
              opNumber: nextQueueEntry.patient.opNumber,
            }
          : null,
      };
    }

    return res.json({
      patientsInQueue,
      todaysConsultations,
      activeTreatmentPlans,
      followUpsDue,
      nextInQueue,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listConsultations,
  getDoctorTodayQueue,
  startConsultation,
  getConsultationById,
  closeConsultation,
  checkConsultationNotClosed,
  getDoctorSummary,
};
