const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');

// GET /api/appointments?date=&doctor=&status=&search=
async function listAppointments(req, res, next) {
  try {
    const { date, doctor, status, search } = req.query;
    const filter = {};

    // Filter by specific date range (start of day to end of day)
    if (date) {
      const dayStart = new Date(date);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setUTCHours(23, 59, 59, 999);
      filter.date = { $gte: dayStart, $lte: dayEnd };
    }

    // Filter by doctor
    if (doctor) {
      filter.doctor = doctor;
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Filter by patient search term (name/phone/opNumber)
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

      const patientIds = matchingPatients.map((p) => p._id);
      filter.patient = { $in: patientIds };
    }

    const appointments = await Appointment.find(filter)
      .sort({ date: 1, time: 1 })
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('createdBy', 'name email');

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

    const newAppointment = new Appointment(data);
    await newAppointment.save();

    const appointment = await Appointment.findById(newAppointment._id)
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('createdBy', 'name email');

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
    const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('createdBy', 'name email');

    if (!updated) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    return res.json({
      message: 'Appointment updated successfully',
      appointment: updated,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/appointments/:id (Soft cancel — set status to Cancelled)
async function cancelAppointment(req, res, next) {
  try {
    const cancelled = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'Cancelled' },
      { new: true }
    )
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('createdBy', 'name email');

    if (!cancelled) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

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
};
