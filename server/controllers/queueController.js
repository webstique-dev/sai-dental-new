const QueueEntry = require('../models/QueueEntry');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const { syncVisitStatus, getFormattedDateString } = require('../utils/statusSync');
const { getDayBounds } = require('./appointmentController');

async function getNextTokenForDate(queueDateStr) {
  const { start, end } = getDayBounds(new Date(queueDateStr));
  const lastEntry = await QueueEntry.findOne({
    $or: [
      { queue_date: queueDateStr },
      { date: { $gte: start, $lte: end } },
    ],
  }).sort({ token: -1 });

  const maxToken = lastEntry && (lastEntry.queue_token || lastEntry.token)
    ? (lastEntry.queue_token || lastEntry.token)
    : 0;

  return maxToken + 1;
}

// GET /api/queue/today?includeAll=&date=&status=&doctor=
async function getTodayQueue(req, res, next) {
  try {
    const { includeAll, date, status, doctor } = req.query;
    const targetDateStr = date || getFormattedDateString(new Date());
    const { start, end } = getDayBounds(new Date(targetDateStr));

    const filter = {
      $or: [
        { queue_date: targetDateStr },
        { date: { $gte: start, $lte: end } },
      ],
    };

    if (doctor) {
      filter.doctor = doctor;
    }

    if (status) {
      filter.status = status;
    } else if (includeAll !== 'true') {
      filter.status = { $in: ['Checked-In', 'In Consultation'] };
    }

    const queueEntries = await QueueEntry.find(filter)
      .sort({ token: 1 })
      .populate('patient', 'firstName lastName opNumber phone age sex dateOfBirth occupation address medicalHistory currentMedications vitals habits dentalHistory')
      .populate('doctor', 'name email role specialization')
      .populate('appointment', 'time reason status type');

    // Enrich entries with consultation timestamps if consultation exists
    const enrichedEntries = await Promise.all(
      queueEntries.map(async (entry) => {
        const entryObj = entry.toObject();

        const consult = await Consultation.findOne({
          $or: [{ queueEntry: entry._id }, { appointment: entry.appointment }],
        });

        if (consult) {
          if (!entryObj.consultation_started_at && (consult.startedAt || consult.consultation_started_at)) {
            entryObj.consultation_started_at = consult.startedAt || consult.consultation_started_at;
          }
          if (!entryObj.consultation_ended_at && (consult.closedAt || consult.completed_at || consult.consultation_ended_at)) {
            entryObj.consultation_ended_at = consult.closedAt || consult.completed_at || consult.consultation_ended_at;
          }
          if (!entryObj.completed_at && (consult.closedAt || consult.completed_at)) {
            entryObj.completed_at = consult.closedAt || consult.completed_at;
          }
          entryObj.notes = consult.clinicalNotes || consult.notes || '';
          entryObj.consultationId = consult._id;
        }

        return entryObj;
      })
    );

    return res.json({ queueEntries: enrichedEntries });
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

    const now = new Date();
    const todayDateStr = getFormattedDateString(now);
    const nextToken = await getNextTokenForDate(todayDateStr);

    // Create a Walk-in Appointment record so it serves as single source of truth
    const newAppointment = new Appointment({
      patient: targetPatientId,
      doctor: doctorId,
      date: now,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reason: reason || 'Walk-in Consultation',
      type: 'Walk-in',
      status: 'Checked-In',
      createdBy: req.user ? req.user._id : undefined,
    });
    await newAppointment.save();

    // Create QueueEntry with status Checked-In, daily resetting token, and queue_date
    const queueEntry = new QueueEntry({
      token: nextToken,
      queue_token: nextToken,
      patient: targetPatientId,
      doctor: doctorId,
      appointment: newAppointment._id,
      type: 'Walk-in',
      status: 'Checked-In',
      checked_in_at: now,
      checkInTime: now,
      queue_date: todayDateStr,
      date: now,
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
    const now = new Date();
    const todayDateStr = getFormattedDateString(now);

    // Check if id belongs to an Appointment
    const appointment = await Appointment.findById(id);
    if (appointment) {
      appointment.status = 'Checked-In';
      await appointment.save();

      // Find or create QueueEntry for today
      let existingQueue = await QueueEntry.findOne({ appointment: appointment._id });
      if (!existingQueue) {
        const nextToken = await getNextTokenForDate(todayDateStr);

        existingQueue = new QueueEntry({
          token: nextToken,
          queue_token: nextToken,
          patient: appointment.patient,
          doctor: appointment.doctor,
          appointment: appointment._id,
          type: appointment.type || 'Appointment',
          status: 'Checked-In',
          checked_in_at: now,
          checkInTime: now,
          queue_date: todayDateStr,
          date: now,
        });
        await existingQueue.save();
      } else {
        existingQueue.status = 'Checked-In';
        if (!existingQueue.checked_in_at) existingQueue.checked_in_at = now;
        if (!existingQueue.checkInTime) existingQueue.checkInTime = now;
        if (!existingQueue.queue_date) existingQueue.queue_date = todayDateStr;
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
    if (!queueEntry.checked_in_at) queueEntry.checked_in_at = now;
    if (!queueEntry.checkInTime) queueEntry.checkInTime = now;
    if (!queueEntry.queue_date) queueEntry.queue_date = todayDateStr;
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

    let normalizedStatus = status;
    if (status === 'With Doctor' || status === 'In Progress') {
      normalizedStatus = 'In Consultation';
    } else if (status === 'Waiting') {
      normalizedStatus = 'Checked-In';
    }

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

    const now = new Date();
    queueEntry.status = normalizedStatus;
    if (normalizedStatus === 'In Consultation' && !queueEntry.consultation_started_at) {
      queueEntry.consultation_started_at = now;
    } else if (normalizedStatus === 'Completed') {
      if (!queueEntry.consultation_ended_at) queueEntry.consultation_ended_at = now;
      if (!queueEntry.completed_at) queueEntry.completed_at = now;
    }
    await queueEntry.save();

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
  getNextTokenForDate,
};
