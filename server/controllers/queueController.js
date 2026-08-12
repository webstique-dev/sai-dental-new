const QueueEntry = require('../models/QueueEntry');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

function getTodayDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

// GET /api/queue/today
async function getTodayQueue(req, res, next) {
  try {
    const { start, end } = getTodayDateRange();
    const queueEntries = await QueueEntry.find({
      date: { $gte: start, $lte: end },
    })
      .sort({ token: 1 })
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('appointment', 'time reason status type');

    return res.json({ queueEntries });
  } catch (err) {
    next(err);
  }
}

// POST /api/queue/walk-in
async function createWalkIn(req, res, next) {
  try {
    const { patientId, doctorId, patientData, reason } = req.body;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor is required for walk-in check-in.' });
    }

    let targetPatientId = patientId;

    // Step a & b: If patientId given, use it; otherwise create inline patient
    if (!targetPatientId) {
      const pData = patientData || {};
      const newPatient = new Patient({
        firstName: pData.firstName || '',
        lastName: pData.lastName || '',
        age: pData.age ? parseInt(pData.age, 10) : undefined,
        sex: pData.sex || '',
        phone: pData.phone || '',
        address: pData.address || '',
        occupation: pData.occupation || '',
        medicalHistory: pData.medicalHistory || [],
        currentMedications: pData.currentMedications || '',
        vitals: pData.vitals || { bp: '', rbs: '' },
        habits: pData.habits || [],
        dentalHistory: pData.dentalHistory || '',
        registeredBy: req.user ? req.user._id : undefined,
      });
      await newPatient.save();
      targetPatientId = newPatient._id;
    }

    // Step d: Calculate next token for today
    const { start, end } = getTodayDateRange();
    const lastEntry = await QueueEntry.findOne({
      date: { $gte: start, $lte: end },
    }).sort({ token: -1 });

    const nextToken = lastEntry && lastEntry.token ? lastEntry.token + 1 : 1;

    // Optional: create a Walk-in Appointment record so it shows in appointment history too
    const newAppointment = new Appointment({
      patient: targetPatientId,
      doctor: doctorId,
      date: new Date(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reason: reason || 'Walk-in Consultation',
      type: 'Walk-in',
      status: 'Checked-In',
      createdBy: req.user ? req.user._id : undefined,
    });
    await newAppointment.save();

    // Step e: Create QueueEntry with status Checked-In
    const queueEntry = new QueueEntry({
      token: nextToken,
      patient: targetPatientId,
      doctor: doctorId,
      appointment: newAppointment._id,
      type: 'Walk-in',
      status: 'Checked-In',
      checkInTime: new Date(),
      date: new Date(),
    });
    await queueEntry.save();

    const populated = await QueueEntry.findById(queueEntry._id)
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('appointment', 'time reason status type');

    return res.status(201).json({
      message: 'Walk-in patient checked in successfully',
      queueEntry: populated,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/queue/:id/check-in (Check-in existing appointment or queue entry)
async function checkInAppointment(req, res, next) {
  try {
    const { id } = req.params;
    const { start, end } = getTodayDateRange();

    // Check if id belongs to an Appointment
    const appointment = await Appointment.findById(id);
    if (appointment) {
      appointment.status = 'Checked-In';
      await appointment.save();

      // Find or create QueueEntry for today
      let existingQueue = await QueueEntry.findOne({ appointment: appointment._id });
      if (!existingQueue) {
        const lastEntry = await QueueEntry.findOne({ date: { $gte: start, $lte: end } }).sort({ token: -1 });
        const nextToken = lastEntry && lastEntry.token ? lastEntry.token + 1 : 1;

        existingQueue = new QueueEntry({
          token: nextToken,
          patient: appointment.patient,
          doctor: appointment.doctor,
          appointment: appointment._id,
          type: appointment.type || 'Appointment',
          status: 'Checked-In',
          checkInTime: new Date(),
          date: new Date(),
        });
        await existingQueue.save();
      } else {
        existingQueue.status = 'Checked-In';
        existingQueue.checkInTime = new Date();
        await existingQueue.save();
      }

      const populated = await QueueEntry.findById(existingQueue._id)
        .populate('patient', 'firstName lastName opNumber phone age sex')
        .populate('doctor', 'name email role specialization')
        .populate('appointment', 'time reason status type');

      return res.json({ message: 'Appointment checked in successfully', queueEntry: populated });
    }

    // Otherwise check if it's a QueueEntry
    const queueEntry = await QueueEntry.findByIdAndUpdate(
      id,
      { status: 'Checked-In', checkInTime: new Date() },
      { new: true }
    )
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('appointment', 'time reason status type');

    if (!queueEntry) {
      return res.status(404).json({ message: 'Queue entry not found' });
    }

    if (queueEntry.appointment) {
      await Appointment.findByIdAndUpdate(queueEntry.appointment, { status: 'Checked-In' });
    }

    return res.json({ message: 'Patient checked in successfully', queueEntry });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/queue/:id/status
async function updateQueueStatus(req, res, next) {
  try {
    const { status } = req.body;
    const queueEntry = await QueueEntry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('appointment', 'time reason status type');

    if (!queueEntry) {
      return res.status(404).json({ message: 'Queue entry not found' });
    }

    // Sync appointment status if linked
    if (queueEntry.appointment) {
      let aptStatus = status;
      if (status === 'With Doctor') aptStatus = 'In Consultation';
      await Appointment.findByIdAndUpdate(queueEntry.appointment, { status: aptStatus });
    }

    return res.json({ message: 'Queue status updated successfully', queueEntry });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTodayQueue,
  createWalkIn,
  checkInAppointment,
  updateQueueStatus,
};
