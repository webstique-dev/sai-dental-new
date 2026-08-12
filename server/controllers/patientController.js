const Patient = require('../models/Patient');
const { logAction } = require('../middleware/auditLog');

// GET /api/patients?search=&page=&limit=&sortBy=&sortOrder=
async function listPatients(req, res, next) {
  try {
    const { search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    let filter = {};
    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter = {
        $or: [
          { firstName: regex },
          { lastName: regex },
          { phone: regex },
          { opNumber: regex },
        ],
      };
    }

    const sortOptions = {};
    const order = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'registrationDate' || sortBy === 'createdAt') {
      sortOptions.createdAt = order;
    } else if (sortBy === 'name') {
      sortOptions.firstName = order;
    } else if (sortBy === 'opNumber') {
      sortOptions.opNumber = order;
    } else {
      sortOptions[sortBy] = order;
    }

    const total = await Patient.countDocuments(filter);
    const patients = await Patient.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .populate('registeredBy', 'name email role');

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
    const patient = await Patient.findById(req.params.id).populate('registeredBy', 'name email role');
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

module.exports = {
  listPatients,
  createPatient,
  getPatientById,
  updatePatient,
};
