const FollowUp = require('../models/FollowUp');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { checkAndMarkMissedAppointments } = require('../utils/statusSync');

// GET /api/follow-ups?status=&consultation=&patient=
async function listFollowUps(req, res, next) {
  try {
    // Auto-flag any passed appointments & follow-ups as Missed
    await checkAndMarkMissedAppointments();

    const { status, search, consultation, patient } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (consultation) {
      filter.consultation = consultation;
    }
    if (patient) {
      filter.patient = patient;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matchingPatients = await Patient.find({
        $or: [
          { firstName: regex },
          { lastName: regex },
          { phone: regex },
          { opNumber: regex },
        ],
      }).select('_id');

      filter.patient = { $in: matchingPatients.map((p) => p._id) };
    }

    const followUps = await FollowUp.find(filter)
      .sort({ recommendedDate: 1, createdAt: -1 })
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate({
        path: 'scheduledAppointment',
        populate: { path: 'doctor', select: 'name specialization' },
      })
      .populate('createdBy', 'name email');

    return res.json({ followUps });
  } catch (err) {
    next(err);
  }
}

// POST /api/follow-ups (Manual add by receptionist or doctor)
async function createFollowUp(req, res, next) {
  try {
    const { patient, doctor, consultation, recommendedDate, reason, instructions, notes, treatmentStatus, time } = req.body;

    if (!patient) {
      return res.status(400).json({ message: 'Patient is required.' });
    }

    const hasDate = Boolean(recommendedDate);

    const followUp = new FollowUp({
      patient,
      consultation: consultation || null,
      recommendedDate: hasDate ? recommendedDate : null,
      reason: reason || '',
      instructions: instructions || '',
      notes: notes || '',
      treatmentStatus: treatmentStatus || '',
      status: hasDate ? 'Scheduled' : 'Pending',
      createdBy: req.user ? req.user._id : undefined,
    });

    await followUp.save();

    // If a recommendedDate is specified, auto-create the linked Appointment immediately
    if (hasDate) {
      let assignedDoctor = doctor;
      if (!assignedDoctor) {
        const docUser = await User.findOne({ role: 'doctor' });
        assignedDoctor = docUser ? docUser._id : undefined;
      }

      const newAppt = new Appointment({
        patient,
        doctor: assignedDoctor,
        date: recommendedDate,
        time: time || '10:00 AM',
        reason: reason || 'Follow-Up Consultation',
        type: 'Appointment',
        status: 'Scheduled',
        followUp: followUp._id,
        createdBy: req.user ? req.user._id : undefined,
      });

      await newAppt.save();
      followUp.scheduledAppointment = newAppt._id;
      await followUp.save();
    }

    const populated = await FollowUp.findById(followUp._id)
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate({
        path: 'scheduledAppointment',
        populate: { path: 'doctor', select: 'name specialization' },
      })
      .populate('createdBy', 'name email');

    return res.status(201).json({
      message: hasDate
        ? 'Follow-up created and appointment scheduled automatically'
        : 'Follow-up created successfully',
      followUp: populated,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/follow-ups/:id/schedule (Create appointment & link to follow-up)
async function scheduleFollowUp(req, res, next) {
  try {
    const { doctor, date, time, type, reason } = req.body;
    const followUp = await FollowUp.findById(req.params.id);

    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up not found.' });
    }

    if (!doctor) {
      return res.status(400).json({ message: 'Doctor is required to schedule appointment.' });
    }

    // 1. Create Appointment document from follow-up details
    const appointmentDate = date || followUp.recommendedDate || new Date();
    const appointmentReason = reason || followUp.reason || 'Follow-up Visit';

    const newAppointment = new Appointment({
      patient: followUp.patient,
      doctor,
      date: appointmentDate,
      time: time || '10:00 AM',
      reason: appointmentReason,
      type: type || 'Appointment',
      status: 'Scheduled',
      createdBy: req.user ? req.user._id : undefined,
    });

    await newAppointment.save();

    // 2. Link appointment to follow-up and flip status to Scheduled
    followUp.scheduledAppointment = newAppointment._id;
    followUp.status = 'Scheduled';
    await followUp.save();

    const updatedFollowUp = await FollowUp.findById(followUp._id)
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate({
        path: 'scheduledAppointment',
        populate: { path: 'doctor', select: 'name specialization' },
      })
      .populate('createdBy', 'name email');

    return res.json({
      message: 'Follow-up scheduled into appointment successfully',
      followUp: updatedFollowUp,
      appointment: newAppointment,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listFollowUps,
  createFollowUp,
  scheduleFollowUp,
};
