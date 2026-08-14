const QueueEntry = require('../models/QueueEntry');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const { syncVisitStatus } = require('../utils/statusSync');
const { getDayBounds } = require('./appointmentController');

// GET /api/queue/today?includeAll=
async function getTodayQueue(req, res, next) {
  try {
    const { start, end } = getDayBounds(new Date());
    const { includeAll } = req.query;

    const filter = {
      date: { $gte: start, $lte: end },
    };

    // By default, active queue shows only Checked-In and In Consultation patients
    if (includeAll !== 'true') {
      filter.status = { $in: ['Checked-In', 'In Consultation'] };
    }

    const queueEntries = await QueueEntry.find(filter)
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

    // Calculate next token for today
    const { start, end } = getDayBounds(new Date());
    const lastEntry = await QueueEntry.findOne({
      date: { $gte: start, $lte: end },
    }).sort({ token: -1 });

    const nextToken = lastEntry && lastEntry.token ? lastEntry.token + 1 : 1;

    // Create a Walk-in Appointment record so it serves as single source of truth
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

    // Create QueueEntry with status Checked-In
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

    // Sync visit status across records
    await syncVisitStatus({
      appointmentId: newAppointment._id,
      queueEntryId: queueEntry._id,
      status: 'Checked-In',
    });

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
    const { start, end } = getDayBounds(new Date());

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

      await syncVisitStatus({
        appointmentId: appointment._id,
        queueEntryId: existingQueue._id,
        status: 'Checked-In',
      });

      const populated = await QueueEntry.findById(existingQueue._id)
        .populate('patient', 'firstName lastName opNumber phone age sex')
        .populate('doctor', 'name email role specialization')
        .populate('appointment', 'time reason status type');

      return res.json({ message: 'Appointment checked in successfully', queueEntry: populated });
    }

    // Otherwise check if it's a QueueEntry
    const queueEntry = await QueueEntry.findById(id);
    if (!queueEntry) {
      return res.status(404).json({ message: 'Queue entry or appointment not found' });
    }

    queueEntry.status = 'Checked-In';
    queueEntry.checkInTime = new Date();
    await queueEntry.save();

    await syncVisitStatus({
      queueEntryId: queueEntry._id,
      status: 'Checked-In',
    });

    const populated = await QueueEntry.findById(queueEntry._id)
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('appointment', 'time reason status type');

    return res.json({ message: 'Patient checked in successfully', queueEntry: populated });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/queue/:id/status
async function updateQueueStatus(req, res, next) {
  try {
    const { status } = req.body;

    // Normalize legacy status strings if any
    let normalizedStatus = status;
    if (status === 'With Doctor' || status === 'In Progress') {
      normalizedStatus = 'In Consultation';
    } else if (status === 'Waiting') {
      normalizedStatus = 'Checked-In';
    }

    // Enforce role permissions for receptionists
    if (req.user && req.user.role === 'receptionist') {
      if (['In Consultation', 'Completed'].includes(normalizedStatus)) {
        return res.status(403).json({
          message: 'Receptionists are not permitted to change status to In Consultation or Completed.',
        });
      }
    }

    const queueEntry = await QueueEntry.findById(req.params.id);
    if (!queueEntry) {
      return res.status(404).json({ message: 'Queue entry not found' });
    }

    queueEntry.status = normalizedStatus;
    await queueEntry.save();

    // Sync status across Appointment and Consultation
    await syncVisitStatus({
      queueEntryId: queueEntry._id,
      status: normalizedStatus,
    });

    const populated = await QueueEntry.findById(queueEntry._id)
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('appointment', 'time reason status type');

    return res.json({ message: 'Queue status updated successfully', queueEntry: populated });
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
