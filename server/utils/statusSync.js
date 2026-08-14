const Appointment = require('../models/Appointment');
const QueueEntry = require('../models/QueueEntry');
const Consultation = require('../models/Consultation');
const FollowUp = require('../models/FollowUp');

function getFormattedDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks all Scheduled appointments whose date has passed without check-in,
 * and auto-flags both the appointment and any linked follow-up as 'Missed'.
 */
async function checkAndMarkMissedAppointments() {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const missedAppointments = await Appointment.find({
      status: 'Scheduled',
      date: { $lt: startOfToday },
      isDeleted: { $ne: true },
    });

    for (const appt of missedAppointments) {
      appt.status = 'Missed';
      await appt.save();

      const linkedFollowUp = await FollowUp.findOne({
        scheduledAppointment: appt._id,
      });

      if (linkedFollowUp && linkedFollowUp.status === 'Scheduled') {
        linkedFollowUp.status = 'Missed';
        await linkedFollowUp.save();
      }
    }
  } catch (err) {
    console.error('Error auto-flagging missed appointments:', err);
  }
}

/**
 * Synchronizes visit/appointment status across Appointment, QueueEntry, Consultation, and FollowUp models.
 * State Machine Progression:
 *   Scheduled -> Checked-In -> In Consultation -> Completed (or Cancelled / Missed)
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

  // 5. Update linked FollowUp status ONLY for the target scheduled appointment
  if (apptId) {
    const linkedFollowUp = await FollowUp.findOne({ scheduledAppointment: apptId });
    if (linkedFollowUp) {
      const current = linkedFollowUp.status;
      let allowed = false;

      // Strict state machine progression:
      // Scheduled -> Checked-In / In Consultation / Cancelled / Missed
      // Checked-In -> In Consultation / Completed / Cancelled
      // In Consultation -> Completed / Cancelled
      if (current === 'Scheduled' && ['Checked-In', 'In Consultation', 'Cancelled', 'Missed', 'No Show'].includes(stdStatus)) {
        allowed = true;
      } else if (current === 'Checked-In' && ['In Consultation', 'Completed', 'Cancelled'].includes(stdStatus)) {
        allowed = true;
      } else if (current === 'In Consultation' && ['Completed', 'Cancelled'].includes(stdStatus)) {
        allowed = true;
      } else if (stdStatus === 'Completed' && (current === 'Checked-In' || current === 'In Consultation' || current === 'Scheduled')) {
        // Only set Completed if consultation is finished
        allowed = true;
      } else if (stdStatus === 'Cancelled') {
        allowed = true;
      }

      if (allowed) {
        linkedFollowUp.status = stdStatus === 'No Show' ? 'Missed' : stdStatus;
        await linkedFollowUp.save();
      }
    }
  }

  return { apptId, qId, cId, status: stdStatus };
}

module.exports = {
  syncVisitStatus,
  getFormattedDateString,
  checkAndMarkMissedAppointments,
};
