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
 * Parses appointment date and time string into a Date object.
 * Handles 12-hour ("09:45 AM", "2:30 pm") and 24-hour ("14:30", "09:30") formats.
 */
function parseAppointmentDateTime(dateVal, timeStr) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;

  let hours = 9;
  let minutes = 0;

  if (timeStr && typeof timeStr === 'string') {
    const cleanTime = timeStr.trim().toUpperCase();
    const isPM = cleanTime.includes('PM');
    const isAM = cleanTime.includes('AM');
    const digitsOnly = cleanTime.replace(/[^0-9:]/g, '');
    const parts = digitsOnly.split(':');

    if (parts.length >= 1 && parts[0] !== '') {
      let parsedHours = parseInt(parts[0], 10);
      if (parts.length >= 2 && parts[1] !== '') {
        minutes = parseInt(parts[1], 10) || 0;
      }

      if (isPM && parsedHours < 12) {
        parsedHours += 12;
      } else if (isAM && parsedHours === 12) {
        parsedHours = 0;
      }
      hours = parsedHours;
    }
  }

  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes, 0, 0);
}

/**
 * Checks all Scheduled appointments whose entire appointment date has passed without check-in,
 * and auto-flags both the appointment and any linked follow-up as 'Missed'.
 *
 * Rules:
 * 1. An appointment remains Scheduled throughout its booked date, even if the scheduled time has passed.
 * 2. Late check-in is allowed during the appointment date.
 * 3. Once the entire appointment date has passed (starting midnight of the next day),
 *    if the patient was not checked in, the appointment status changes to 'Missed'.
 * 4. The appointment MUST remain on its originally booked date and time.
 */
async function checkAndMarkMissedAppointments() {
  try {
    const now = new Date();

    const candidateAppointments = await Appointment.find({
      status: 'Scheduled',
      isDeleted: { $ne: true },
    });

    for (const appt of candidateAppointments) {
      if (!appt.date) continue;
      const apptDate = new Date(appt.date);
      if (isNaN(apptDate.getTime())) continue;

      // End of local appointment day
      const localEnd = new Date(
        apptDate.getFullYear(),
        apptDate.getMonth(),
        apptDate.getDate(),
        23,
        59,
        59,
        999
      );

      // End of UTC appointment day
      const utcEnd = new Date(
        Date.UTC(
          apptDate.getUTCFullYear(),
          apptDate.getUTCMonth(),
          apptDate.getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      // Entire appointment date has passed if current time is past both local and UTC day ends
      const dateEndCutoff = new Date(Math.max(localEnd.getTime(), utcEnd.getTime()));

      if (now > dateEndCutoff) {
        appt.status = 'Missed';
        // Note: appt.date and appt.time remain unchanged on their original booked date and time
        await appt.save();

        const linkedFollowUp = await FollowUp.findOne({
          scheduledAppointment: appt._id,
        });

        if (linkedFollowUp && ['Scheduled', 'Pending'].includes(linkedFollowUp.status)) {
          linkedFollowUp.status = 'Missed';
          await linkedFollowUp.save();
        }
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
 *   Allows late check-in: Missed -> Checked-In
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

      // Strict state machine progression + Late Check-In support:
      // Scheduled -> Checked-In / In Consultation / Cancelled / Missed
      // Missed -> Checked-In / In Consultation / Cancelled (Late arrival check-in)
      // Checked-In -> In Consultation / Completed / Cancelled
      // In Consultation -> Completed / Cancelled
      if (current === 'Scheduled' && ['Checked-In', 'In Consultation', 'Cancelled', 'Missed', 'No Show'].includes(stdStatus)) {
        allowed = true;
      } else if (current === 'Missed' && ['Checked-In', 'In Consultation', 'Cancelled'].includes(stdStatus)) {
        allowed = true;
      } else if (current === 'Checked-In' && ['In Consultation', 'Completed', 'Cancelled'].includes(stdStatus)) {
        allowed = true;
      } else if (current === 'In Consultation' && ['Completed', 'Cancelled'].includes(stdStatus)) {
        allowed = true;
      } else if (stdStatus === 'Completed' && (current === 'Checked-In' || current === 'In Consultation' || current === 'Scheduled' || current === 'Missed')) {
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
  parseAppointmentDateTime,
  checkAndMarkMissedAppointments,
};
