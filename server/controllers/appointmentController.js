const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const FollowUp = require('../models/FollowUp');
const QueueEntry = require('../models/QueueEntry');
const { syncVisitStatus, checkAndMarkMissedAppointments, getFormattedDateString } = require('../utils/statusSync');
const { emitAppointmentUpdate } = require('../utils/socket');
const { buildPatientSearchFilter } = require('../utils/patientSearchHelper');

function getDayBounds(dateInput) {
  let d;
  if (!dateInput) {
    d = new Date();
  } else if (typeof dateInput === 'string' && dateInput.includes('T')) {
    d = new Date(dateInput);
  } else if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const parts = dateInput.split('T')[0].split('-');
    d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else if (dateInput instanceof Date) {
    d = dateInput;
  } else {
    d = new Date();
  }

  const localStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const localEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const utcStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const utcEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));

  const minStart = new Date(Math.min(localStart.getTime(), utcStart.getTime()));
  const maxEnd = new Date(Math.max(localEnd.getTime(), utcEnd.getTime()));

  return { start: minStart, end: maxEnd, minStart, maxEnd };
}

// GET /api/appointments?date=&dateFilterPreset=&doctor=&status=&search=
async function listAppointments(req, res, next) {
  try {
    const { date, dateFilterPreset, doctor, status, search } = req.query;
    const filter = { isDeleted: { $ne: true } };

    // Automatically check and transition past un-checked-in appointments to Missed
    await checkAndMarkMissedAppointments();

    if (dateFilterPreset === 'today') {
      const { start, end } = getDayBounds(new Date());
      filter.date = { $gte: start, $lte: end };
    } else if (dateFilterPreset === 'upcoming') {
      const now = new Date();
      filter.date = { $gte: now };
    } else if (date) {
      const { start, end } = getDayBounds(date);
      filter.date = { $gte: start, $lte: end };
    }

    if (doctor) {
      filter.doctor = doctor;
    } else if (req.user && req.user.role === 'doctor') {
      filter.doctor = req.user._id;
    }
    if (status) {
      filter.status = status;
    }

    if (search && search.trim()) {
      const patientFilter = buildPatientSearchFilter(search.trim());
      const matchingPatients = await Patient.find(patientFilter).select('_id');
      const patientIds = matchingPatients.map((p) => p._id);
      filter.patient = { $in: patientIds };
    }

    const appointments = await Appointment.find(filter)
      .populate('patient', 'firstName lastName opNumber phone age sex patientType dateOfBirth')
      .populate('doctor', 'name email role specialization')
      .sort({ date: 1, time: 1 });

    return res.json({ appointments });
  } catch (err) {
    next(err);
  }
}

// POST /api/appointments
async function createAppointment(req, res, next) {
  try {
    const data = { ...req.body };
    if (req.user && req.user._id) {
      data.createdBy = req.user._id;
    }

    // Default status is Checked-In if not specified
    if (!data.status) {
      data.status = 'Checked-In';
    }

    // Normalize Check-in to Checked-In
    if (data.status === 'Check-in') {
      data.status = 'Checked-In';
    }

    // Prevent receptionist from creating appointment directly as Completed
    if (req.user && req.user.role === 'receptionist') {
      if (data.status === 'Completed') {
        return res.status(403).json({
          message: 'Receptionists are not permitted to set status to Completed.',
        });
      }
    }

    const newAppointment = new Appointment(data);
    await newAppointment.save();

    // If created with Checked-In or In Consultation status, generate a QueueEntry so it goes directly to doctor queue
    if (['Checked-In', 'In Consultation'].includes(data.status)) {
      const now = new Date();
      const { minStart, maxEnd } = getDayBounds(now);
      const queueDateStr = getFormattedDateString(now);
      let qEntry = await QueueEntry.findOne({ appointment: newAppointment._id });
      if (!qEntry) {
        const lastEntry = await QueueEntry.findOne({ date: { $gte: minStart, $lte: maxEnd } }).sort({ token: -1 });
        const nextToken = lastEntry && (lastEntry.token || lastEntry.queue_token) ? (lastEntry.token || lastEntry.queue_token) + 1 : 1;
        qEntry = new QueueEntry({
          token: nextToken,
          queue_token: nextToken,
          patient: newAppointment.patient,
          doctor: newAppointment.doctor,
          appointment: newAppointment._id,
          type: newAppointment.type || 'Appointment',
          status: data.status,
          checked_in_at: now,
          checkInTime: now,
          queue_date: queueDateStr,
          consultation_started_at: data.status === 'In Consultation' ? now : undefined,
          date: now,
        });
        await qEntry.save();
      }
    }

    const appointment = await Appointment.findById(newAppointment._id)
      .populate('patient', 'firstName lastName opNumber phone age sex patientType dateOfBirth')
      .populate('doctor', 'name email role specialization')
      .populate('createdBy', 'name email');

    emitAppointmentUpdate(appointment);

    return res.status(201).json({
      message: 'Appointment created successfully',
      appointment,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/appointments/:id (reschedule or change status)
async function updateAppointment(req, res, next) {
  try {
    const { status, date } = req.body;

    // Enforce status permissions for receptionists
    if (req.user && req.user.role === 'receptionist' && status) {
      if (status === 'Completed') {
        return res.status(403).json({
          message: 'Receptionists are not permitted to set appointment status to Completed.',
        });
      }
    }

    const updated = await Appointment.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('patient', 'firstName lastName opNumber phone age sex patientType dateOfBirth')
      .populate('doctor', 'name email role specialization')
      .populate('createdBy', 'name email');

    if (!updated) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Sync status with related QueueEntry/Consultation/FollowUp if status updated
    if (status) {
      await syncVisitStatus({ appointmentId: updated._id, status });
    }

    // If rescheduled to a new date, update linked follow-up
    if (date) {
      const linkedFollowUp = await FollowUp.findOne({
        $or: [{ scheduledAppointment: updated._id }, { _id: updated.followUp }],
      });
      if (linkedFollowUp) {
        linkedFollowUp.recommendedDate = date;
        if (['Cancelled', 'Missed'].includes(linkedFollowUp.status)) {
          linkedFollowUp.status = 'Scheduled';
        }
        await linkedFollowUp.save();
      }
    }

    emitAppointmentUpdate(updated);

    return res.json({
      message: 'Appointment updated successfully',
      appointment: updated,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/appointments/:id (Cancel appointment — set status to Cancelled immediately, keep in history)
async function cancelAppointment(req, res, next) {
  try {
    const cancelled = await Appointment.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      {
        status: 'Cancelled',
        isDeleted: false,
      },
      { new: true }
    )
      .populate('patient', 'firstName lastName opNumber phone age sex patientType dateOfBirth')
      .populate('doctor', 'name email role specialization')
      .populate('createdBy', 'name email');

    if (!cancelled) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Sync status across models (updates linked FollowUp to Cancelled)
    await syncVisitStatus({ appointmentId: cancelled._id, status: 'Cancelled' });

    emitAppointmentUpdate(cancelled);

    return res.json({
      message: 'Appointment cancelled successfully',
      appointment: cancelled,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  getDayBounds,
};
