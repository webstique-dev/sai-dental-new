const Appointment = require('../models/Appointment');
const QueueEntry = require('../models/QueueEntry');
const Consultation = require('../models/Consultation');

/**
 * Synchronizes visit/appointment status across Appointment, QueueEntry, and Consultation models.
 * Standard Statuses: 'Scheduled', 'Checked-In', 'In Consultation', 'Completed', 'Cancelled', 'No Show'
 */
async function syncVisitStatus({ appointmentId, queueEntryId, consultationId, status }) {
  // Normalize status string if legacy/alias is passed
  let stdStatus = status;
  if (status === 'With Doctor' || status === 'In Progress') {
    stdStatus = 'In Consultation';
  } else if (status === 'Waiting') {
    stdStatus = 'Checked-In';
  }

  let apptId = appointmentId || null;
  let qId = queueEntryId || null;
  let cId = consultationId || null;

  // 1. Resolve missing IDs if possible
  if (cId && (!apptId || !qId)) {
    const c = await Consultation.findById(cId);
    if (c) {
      if (!apptId && c.appointment) apptId = c.appointment;
      if (!qId && c.queueEntry) qId = c.queueEntry;
    }
  }

  if (qId && (!apptId || !cId)) {
    const q = await QueueEntry.findById(qId);
    if (q) {
      if (!apptId && q.appointment) apptId = q.appointment;
      if (!cId) {
        const c = await Consultation.findOne({ queueEntry: q._id });
        if (c) cId = c._id;
      }
    }
  }

  if (apptId && (!qId || !cId)) {
    if (!qId) {
      const q = await QueueEntry.findOne({ appointment: apptId });
      if (q) qId = q._id;
    }
    if (!cId) {
      const c = await Consultation.findOne({ appointment: apptId });
      if (c) cId = c._id;
    }
  }

  // 2. Update Appointment status
  if (apptId) {
    await Appointment.findByIdAndUpdate(apptId, { status: stdStatus });
  }

  // 3. Update QueueEntry status
  if (qId) {
    const queueUpdate = { status: stdStatus };
    if (stdStatus === 'Checked-In') {
      queueUpdate.checkInTime = new Date();
    }
    await QueueEntry.findByIdAndUpdate(qId, queueUpdate);
  }

  // 4. Update Consultation status
  if (cId) {
    const consultStatus = stdStatus === 'Completed' ? 'Completed' : 'In Progress';
    const consultUpdate = { status: consultStatus };
    if (stdStatus === 'Completed') {
      consultUpdate.closedAt = new Date();
    }
    await Consultation.findByIdAndUpdate(cId, consultUpdate);
  }

  return { apptId, qId, cId, status: stdStatus };
}

module.exports = {
  syncVisitStatus,
};
