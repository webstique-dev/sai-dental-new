const mongoose = require('mongoose');
const FollowUp = require('../models/FollowUp');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Consultation = require('../models/Consultation');
const { checkAndMarkMissedAppointments } = require('../utils/statusSync');
const { buildPatientSearchFilter } = require('../utils/patientSearchHelper');

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

    const patientSearchFilter = buildPatientSearchFilter(search);
    if (patientSearchFilter) {
      const matchingPatients = await Patient.find({
        ...patientSearchFilter,
        isDeleted: { $ne: true },
      }).select('_id');

      filter.patient = { $in: matchingPatients.map((p) => p._id) };
    }

    // Filter by logged-in doctor if request comes from a doctor
    if (req.user && req.user.role === 'doctor') {
      const docId = req.user._id;
      const doctorAppts = await Appointment.find({ doctor: docId }).select('_id');
      const doctorApptIds = doctorAppts.map((a) => a._id);

      filter.$or = [
        { doctor: docId },
        { scheduledAppointment: { $in: doctorApptIds } },
      ];
    }

    const followUps = await FollowUp.find(filter)
      .sort({ recommendedDate: 1, createdAt: -1 })
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name specialization')
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

// POST /api/follow-ups (Direct scheduling action: creates FollowUp + linked Appointment with status = Scheduled)
async function createFollowUp(req, res, next) {
  try {
    const { patient, doctor, consultation, recommendedDate, time, reason, instructions, notes, treatmentStatus } = req.body;

    if (!patient) {
      return res.status(400).json({ message: 'Patient selection is required.' });
    }
    if (!doctor) {
      return res.status(400).json({ message: 'Assigned doctor is required.' });
    }
    if (!recommendedDate) {
      return res.status(400).json({ message: 'Follow-Up date is required.' });
    }
    if (!time) {
      return res.status(400).json({ message: 'Follow-Up time is required.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason / Procedure is required.' });
    }

    const followUp = new FollowUp({
      patient,
      doctor,
      consultation: consultation || null,
      recommendedDate,
      reason: reason.trim(),
      instructions: instructions || '',
      notes: notes || '',
      treatmentStatus: treatmentStatus || '',
      status: 'Scheduled',
      createdBy: req.user ? req.user._id : undefined,
    });

    await followUp.save();

    // Auto-create linked Appointment
    const newAppt = new Appointment({
      patient,
      doctor,
      date: recommendedDate,
      time: time || '10:00 AM',
      reason: reason.trim(),
      type: 'Appointment',
      status: 'Scheduled',
      followUp: followUp._id,
      createdBy: req.user ? req.user._id : undefined,
    });

    await newAppt.save();

    followUp.scheduledAppointment = newAppt._id;
    await followUp.save();

    const populated = await FollowUp.findById(followUp._id)
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name specialization')
      .populate({
        path: 'scheduledAppointment',
        populate: { path: 'doctor', select: 'name specialization' },
      })
      .populate('createdBy', 'name email');

    return res.status(201).json({
      message: 'Follow-up created and appointment scheduled successfully',
      followUp: populated,
      appointment: newAppt,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/follow-ups/:id/schedule (Book appointment from Pending follow-up row)
async function scheduleFollowUp(req, res, next) {
  try {
    const { doctor, date, time, type, reason } = req.body;
    const followUp = await FollowUp.findById(req.params.id);

    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up not found.' });
    }

    if (!doctor) {
      return res.status(400).json({ message: 'Doctor selection is required to book an appointment.' });
    }

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
      followUp: followUp._id,
      createdBy: req.user ? req.user._id : undefined,
    });

    await newAppointment.save();

    // Link appointment to follow-up and flip status to Scheduled
    followUp.scheduledAppointment = newAppointment._id;
    followUp.doctor = doctor;
    followUp.status = 'Scheduled';
    await followUp.save();

    const updatedFollowUp = await FollowUp.findById(followUp._id)
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name specialization')
      .populate({
        path: 'scheduledAppointment',
        populate: { path: 'doctor', select: 'name specialization' },
      })
      .populate('createdBy', 'name email');

    return res.json({
      message: 'Appointment booked successfully. Follow-up status set to Scheduled.',
      followUp: updatedFollowUp,
      appointment: newAppointment,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/follow-ups/patient-last-doctor/:patientId
async function getLastDoctorForPatient(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!patientId) return res.json({ doctor: null });

    const lastAppt = await Appointment.findOne({ patient: patientId, doctor: { $ne: null } })
      .sort({ date: -1, createdAt: -1 })
      .populate('doctor', '_id name specialization');

    if (lastAppt && lastAppt.doctor) {
      return res.json({ doctor: lastAppt.doctor });
    }

    const lastConsult = await Consultation.findOne({ patient: patientId, doctor: { $ne: null } })
      .sort({ createdAt: -1 })
      .populate('doctor', '_id name specialization');

    if (lastConsult && lastConsult.doctor) {
      return res.json({ doctor: lastConsult.doctor });
    }

    return res.json({ doctor: null });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listFollowUps,
  createFollowUp,
  scheduleFollowUp,
  getLastDoctorForPatient,
};
