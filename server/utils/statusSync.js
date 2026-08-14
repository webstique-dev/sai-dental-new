const Appointment = require('../models/Appointment');
const QueueEntry = require('../models/QueueEntry');
const Consultation = require('../models/Consultation');

function getFormattedDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Synchronizes visit/appointment status and timestamps across Appointment, QueueEntry, and Consultation models.
 * Standard Statuses: 'Scheduled', 'Checked-In', 'In Consultation', 'Completed', 'Cancelled', 'No Show'
 */
async function syncVisitStatus({ appointmentId, queueEntryId, consultationId, status }) {
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

  const now = new Date();

  // 2. Update Appointment status
  if (apptId) {
    await Appointment.findByIdAndUpdate(apptId, { status: stdStatus });
  }

  // 3. Update QueueEntry status & timestamps
  if (qId) {
    const queueUpdate = { status: stdStatus };
    if (stdStatus === 'Checked-In') {
      queueUpdate.checked_in_at = now;
      queueUpdate.checkInTime = now;
    } else if (stdStatus === 'In Consultation') {
      queueUpdate.consultation_started_at = now;
    } else if (stdStatus === 'Completed') {
      queueUpdate.consultation_ended_at = now;
      queueUpdate.completed_at = now;
    }
    await QueueEntry.findByIdAndUpdate(qId, queueUpdate);
  }

  // 4. Update Consultation status & timestamps
  if (cId) {
    const consultStatus = stdStatus === 'Completed' ? 'Completed' : 'In Progress';
    const consultUpdate = { status: consultStatus };
    if (stdStatus === 'In Consultation') {
      consultUpdate.startedAt = now;
      consultUpdate.consultation_started_at = now;
    } else if (stdStatus === 'Completed') {
      consultUpdate.closedAt = now;
      consultUpdate.consultation_ended_at = now;
      consultUpdate.completed_at = now;
    }
    await Consultation.findByIdAndUpdate(cId, consultUpdate);
  }

  return { apptId, qId, cId, status: stdStatus };
}

module.exports = {
  syncVisitStatus,
  getFormattedDateString,
};
