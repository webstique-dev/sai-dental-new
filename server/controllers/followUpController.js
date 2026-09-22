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
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
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

// POST /api/follow-ups (Direct scheduling action: creates or updates FollowUp + linked Appointment with status = Scheduled)
async function createFollowUp(req, res, next) {
  try {
    const { followUpId, patient, doctor, consultation, recommendedDate, time, reason, instructions, notes, treatmentStatus } = req.body;

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

    // Check if an existing follow-up exists by ID or by active consultation to prevent duplicate bookings
    let existingFollowUp = null;
    if (followUpId) {
      existingFollowUp = await FollowUp.findById(followUpId);
    } else if (consultation) {
      existingFollowUp = await FollowUp.findOne({
        consultation,
        status: { $nin: ['Completed', 'Cancelled'] },
      });
    }

    if (existingFollowUp) {
      existingFollowUp.doctor = doctor;
      existingFollowUp.recommendedDate = recommendedDate;
      existingFollowUp.reason = reason.trim();
      existingFollowUp.instructions = instructions || '';
      existingFollowUp.notes = notes || '';
      existingFollowUp.treatmentStatus = treatmentStatus || '';
      existingFollowUp.status = 'Scheduled';
      if (consultation && !existingFollowUp.consultation) {
        existingFollowUp.consultation = consultation;
      }

      let appt = null;
      if (existingFollowUp.scheduledAppointment) {
        appt = await Appointment.findById(existingFollowUp.scheduledAppointment);
      }

      if (!appt) {
        appt = new Appointment({
          patient,
          doctor,
          date: recommendedDate,
          time: time || '10:00 AM',
          reason: reason.trim(),
          type: 'Appointment',
          status: 'Scheduled',
          followUp: existingFollowUp._id,
          createdBy: req.user ? req.user._id : undefined,
        });
      } else {
        appt.doctor = doctor;
        appt.date = recommendedDate;
        appt.time = time || '10:00 AM';
        appt.reason = reason.trim();
        appt.status = 'Scheduled';
      }
      await appt.save();

      existingFollowUp.scheduledAppointment = appt._id;
      await existingFollowUp.save();

      const populated = await FollowUp.findById(existingFollowUp._id)
        .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
        .populate('doctor', 'name specialization')
        .populate({
          path: 'scheduledAppointment',
          populate: { path: 'doctor', select: 'name specialization' },
        })
        .populate('createdBy', 'name email');

      return res.json({
        message: 'Follow-up updated successfully',
        followUp: populated,
        appointment: appt,
      });
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
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
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

// PUT /api/follow-ups/:id (Update existing follow-up and linked appointment)
async function updateFollowUp(req, res, next) {
  try {
    const { id } = req.params;
    const { doctor, recommendedDate, time, reason, instructions, notes, treatmentStatus } = req.body;

    const followUp = await FollowUp.findById(id);
    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up record not found.' });
    }

    if (doctor) followUp.doctor = doctor;
    if (recommendedDate) followUp.recommendedDate = recommendedDate;
    if (reason !== undefined) followUp.reason = String(reason).trim();
    if (instructions !== undefined) followUp.instructions = instructions;
    if (notes !== undefined) followUp.notes = notes;
    if (treatmentStatus !== undefined) followUp.treatmentStatus = treatmentStatus;
    if (followUp.status === 'Pending' && recommendedDate) {
      followUp.status = 'Scheduled';
    }

    let appt = null;
    if (followUp.scheduledAppointment) {
      appt = await Appointment.findById(followUp.scheduledAppointment);
    }

    if (appt) {
      if (doctor) appt.doctor = doctor;
      if (recommendedDate) appt.date = recommendedDate;
      if (time) appt.time = time;
      if (reason) appt.reason = String(reason).trim();
      appt.status = 'Scheduled';
      await appt.save();
    } else if (recommendedDate) {
      appt = new Appointment({
        patient: followUp.patient,
        doctor: doctor || followUp.doctor,
        date: recommendedDate,
        time: time || '10:00 AM',
        reason: reason || followUp.reason || 'Follow-Up Visit',
        type: 'Appointment',
        status: 'Scheduled',
        followUp: followUp._id,
        createdBy: req.user ? req.user._id : undefined,
      });
      await appt.save();
      followUp.scheduledAppointment = appt._id;
    }

    await followUp.save();

    const populated = await FollowUp.findById(followUp._id)
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
      .populate('doctor', 'name specialization')
      .populate({
        path: 'scheduledAppointment',
        populate: { path: 'doctor', select: 'name specialization' },
      })
      .populate('createdBy', 'name email');

    return res.json({
      message: 'Follow-up updated successfully',
      followUp: populated,
      appointment: appt,
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
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
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

// POST /api/follow-ups/:id/check-in
async function checkInFollowUp(req, res, next) {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up record not found.' });
    }

    if (followUp.status === 'Completed' || followUp.status === 'Cancelled') {
      return res.status(400).json({ message: `Cannot check in a ${followUp.status} follow-up.` });
    }

    const QueueEntry = require('../models/QueueEntry');
    const { syncVisitStatus, getFormattedDateString } = require('../utils/statusSync');
    const { emitAppointmentUpdate, emitQueueUpdate } = require('../utils/socket');
    const { getDayBounds } = require('./appointmentController');

    const now = new Date();
    let apptId = followUp.scheduledAppointment;
    let doctorId = followUp.doctor;

    // If doctor not assigned, fallback to logged-in user (if doctor) or first doctor
    if (!doctorId && req.user && req.user.role === 'doctor') {
      doctorId = req.user._id;
    }
    if (!doctorId) {
      const defaultDoc = await User.findOne({ role: 'doctor', status: 'active' });
      doctorId = defaultDoc?._id || null;
    }

    let appt = null;
    if (apptId) {
      appt = await Appointment.findById(apptId);
    }

    if (!appt) {
      appt = new Appointment({
        patient: followUp.patient,
        doctor: doctorId,
        date: followUp.recommendedDate || now,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reason: followUp.reason || 'Follow-up Visit',
        type: 'Appointment',
        status: 'Checked-In',
        followUp: followUp._id,
        createdBy: req.user ? req.user._id : undefined,
      });
      await appt.save();
      followUp.scheduledAppointment = appt._id;
    } else {
      appt.status = 'Checked-In';
      if (!appt.doctor && doctorId) appt.doctor = doctorId;
      await appt.save();
    }

    // Ensure QueueEntry exists for today
    const { start, end } = getDayBounds(now);
    const queueDateStr = getFormattedDateString(now);

    let qEntry = await QueueEntry.findOne({ appointment: appt._id });
    if (!qEntry) {
      const lastEntry = await QueueEntry.findOne({ date: { $gte: start, $lte: end } }).sort({ token: -1 });
      const nextToken = lastEntry && (lastEntry.token || lastEntry.queue_token) ? (lastEntry.token || lastEntry.queue_token) + 1 : 1;
      qEntry = new QueueEntry({
        token: nextToken,
        queue_token: nextToken,
        patient: followUp.patient,
        doctor: appt.doctor || doctorId,
        appointment: appt._id,
        type: appt.type || 'Appointment',
        status: 'Checked-In',
        checked_in_at: now,
        checkInTime: now,
        queue_date: queueDateStr,
        date: now,
      });
      await qEntry.save();
    } else {
      qEntry.status = 'Checked-In';
      qEntry.checked_in_at = now;
      qEntry.checkInTime = now;
      await qEntry.save();
    }

    followUp.status = 'Checked-In';
    if (doctorId && !followUp.doctor) followUp.doctor = doctorId;
    await followUp.save();

    await syncVisitStatus({
      appointmentId: appt._id,
      queueEntryId: qEntry._id,
      status: 'Checked-In',
    });

    const populatedFollowUp = await FollowUp.findById(followUp._id)
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
      .populate('doctor', 'name specialization')
      .populate({
        path: 'scheduledAppointment',
        populate: { path: 'doctor', select: 'name specialization' },
      })
      .populate('createdBy', 'name email');

    const populatedAppt = await Appointment.findById(appt._id)
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
      .populate('doctor', 'name specialization');

    emitAppointmentUpdate(populatedAppt);
    emitQueueUpdate(qEntry);

    return res.json({
      message: 'Follow-up patient checked in successfully! Added to live queue.',
      followUp: populatedFollowUp,
      appointment: populatedAppt,
      queueEntry: qEntry,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/follow-ups/:id/cancel
async function cancelFollowUp(req, res, next) {
  try {
    const { cancellationReason } = req.body;
    if (!cancellationReason || !cancellationReason.trim()) {
      return res.status(400).json({ message: 'Cancellation reason is required.' });
    }

    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up record not found.' });
    }

    if (followUp.status === 'Completed') {
      return res.status(400).json({ message: 'Cannot cancel an already completed follow-up.' });
    }

    const QueueEntry = require('../models/QueueEntry');
    const { syncVisitStatus } = require('../utils/statusSync');
    const { emitAppointmentUpdate, emitQueueUpdate } = require('../utils/socket');

    const reasonTrimmed = cancellationReason.trim();
    followUp.status = 'Cancelled';
    followUp.cancellationReason = reasonTrimmed;
    await followUp.save();

    let appt = null;
    if (followUp.scheduledAppointment) {
      appt = await Appointment.findById(followUp.scheduledAppointment);
      if (appt) {
        appt.status = 'Cancelled';
        appt.cancellationReason = reasonTrimmed;
        await appt.save();

        // Clean up or cancel any queue entry
        await QueueEntry.updateMany({ appointment: appt._id }, { status: 'Cancelled' });
        emitAppointmentUpdate(appt);
      }
    }

    await syncVisitStatus({
      appointmentId: followUp.scheduledAppointment,
      status: 'Cancelled',
    });

    const populatedFollowUp = await FollowUp.findById(followUp._id)
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
      .populate('doctor', 'name specialization')
      .populate({
        path: 'scheduledAppointment',
        populate: { path: 'doctor', select: 'name specialization' },
      })
      .populate('createdBy', 'name email');

    return res.json({
      message: 'Follow-up cancelled successfully.',
      followUp: populatedFollowUp,
      appointment: appt,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listFollowUps,
  createFollowUp,
  updateFollowUp,
  scheduleFollowUp,
  getLastDoctorForPatient,
  checkInFollowUp,
  cancelFollowUp,
};
