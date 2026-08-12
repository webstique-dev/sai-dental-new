const Consultation = require('../models/Consultation');
const QueueEntry = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');

function getTodayDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

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

// GET /api/consultations/queue/today (Checked-In or With Doctor, doctor-scoped)
async function getDoctorTodayQueue(req, res, next) {
  try {
    const { start, end } = getTodayDateRange();
    const filter = {
      date: { $gte: start, $lte: end },
      status: { $in: ['Checked-In', 'With Doctor'] },
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
          queueEntry: entry._id,
          status: 'In Progress',
        }).select('_id');

        const entryObj = entry.toObject();
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
    const { queueEntryId } = req.body;

    if (!queueEntryId) {
      return res.status(400).json({ message: 'queueEntryId is required.' });
    }

    const queueEntry = await QueueEntry.findById(queueEntryId);
    if (!queueEntry) {
      return res.status(404).json({ message: 'Queue entry not found.' });
    }

    // Check if consultation is already in progress for this queue entry
    let consultation = await Consultation.findOne({
      queueEntry: queueEntry._id,
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

    // Flip QueueEntry status to "With Doctor"
    queueEntry.status = 'With Doctor';
    await queueEntry.save();

    // Sync linked appointment status if present
    if (queueEntry.appointment) {
      await Appointment.findByIdAndUpdate(queueEntry.appointment, { status: 'In Consultation' });
    }

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

// POST /api/consultations/:id/close (Sets status = Completed, closedAt = now, updates QueueEntry/Appointment)
async function closeConsultation(req, res, next) {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    consultation.status = 'Completed';
    consultation.closedAt = new Date();
    await consultation.save();

    // Flip linked QueueEntry status to Completed
    if (consultation.queueEntry) {
      await QueueEntry.findByIdAndUpdate(consultation.queueEntry, { status: 'Completed' });
    }

    // Flip linked Appointment status to Completed
    if (consultation.appointment) {
      await Appointment.findByIdAndUpdate(consultation.appointment, { status: 'Completed' });
    }

    return res.json({
      message: 'Consultation closed successfully.',
      consultation,
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
};
