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

function getDayBounds(dateInput = new Date()) {
  const d = new Date(dateInput);
  const localStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const localEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const utcStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const utcEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));

  return {
    minStart: new Date(Math.min(localStart.getTime(), utcStart.getTime())),
    maxEnd: new Date(Math.max(localEnd.getTime(), utcEnd.getTime())),
  };
}

/**
 * Manual check-in policy: appointments should never be checked in automatically.
 * Kept as safe no-op function for backwards compatibility.
 */
async function autoCheckInScheduledAppointments() {
  // No automatic check-in. All appointments must be checked in manually by the user.
  return;
}


/**
 * Automatically marks any Scheduled or Checked-In / In Consultation appointments and queue entries
 * that have passed their appointment day without being completed as 'Missed'.
 *
 * Rules:
 * 1. Scheduled appointments & Checked-In appointments remain active throughout their scheduled day.
 * 2. If an appointment (Scheduled or Checked-In / In Consultation) remains incomplete once the entire appointment date
 *    has passed (starting midnight of the next day), its status automatically becomes 'Missed'.
 * 3. Appointments already Completed, Cancelled, or No Show are NOT modified.
 * 4. All linked models (Appointment, QueueEntry, Consultation, FollowUp) are synchronized, and real-time Socket.IO events are emitted.
 */
async function checkAndMarkMissedAppointments() {
  try {
    const now = new Date();
    const { emitAppointmentUpdate, emitQueueUpdate } = require('./socket');

    // 1. Candidate Appointments with status Scheduled, Checked-In, In Consultation, Waiting
    const candidateAppointments = await Appointment.find({
      status: { $in: ['Scheduled', 'Checked-In', 'In Consultation', 'Waiting'] },
      isDeleted: { $ne: true },
    });

    for (const appt of candidateAppointments) {
      if (!appt.date) continue;
      const apptDate = new Date(appt.date);
      if (isNaN(apptDate.getTime())) continue;

      // End of local appointment day (23:59:59.999)
      const localEnd = new Date(
        apptDate.getFullYear(),
        apptDate.getMonth(),
        apptDate.getDate(),
        23,
        59,
        59,
        999
      );

      // End of UTC appointment day (23:59:59.999)
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
        // Double check whether a Completed consultation exists for this appointment
        const completedConsult = await Consultation.findOne({
          appointment: appt._id,
          status: 'Completed',
        });

        if (completedConsult) {
          await syncVisitStatus({ appointmentId: appt._id, status: 'Completed' });
          continue;
        }

        // Set status to Hold On for checked-in appointments that didn't complete, Missed for un-checked-in Scheduled
        const targetStatus = (appt.status === 'Checked-In' || appt.status === 'Waiting') ? 'Hold On' : 'Missed';
        await syncVisitStatus({ appointmentId: appt._id, status: targetStatus });

        const populatedAppt = await Appointment.findById(appt._id)
          .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex patientType dateOfBirth')
          .populate('doctor', 'name email role specialization');
        emitAppointmentUpdate(populatedAppt || appt);

        const linkedQ = await QueueEntry.findOne({ appointment: appt._id });
        if (linkedQ) {
          const populatedQ = await QueueEntry.findById(linkedQ._id)
            .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex patientType dateOfBirth')
            .populate('doctor', 'name email role specialization');
          emitQueueUpdate(populatedQ || linkedQ);
        }
      }
    }

    // 2. Also process unlinked QueueEntries created on or before past days that remain incomplete
    const candidateQueueEntries = await QueueEntry.find({
      status: { $in: ['Waiting', 'Checked-In', 'In Consultation', 'With Doctor', 'In Progress'] },
      appointment: { $exists: false },
    });

    for (const qEntry of candidateQueueEntries) {
      const qDate = new Date(qEntry.date || qEntry.createdAt);
      if (isNaN(qDate.getTime())) continue;

      const localEnd = new Date(qDate.getFullYear(), qDate.getMonth(), qDate.getDate(), 23, 59, 59, 999);
      const utcEnd = new Date(Date.UTC(qDate.getUTCFullYear(), qDate.getUTCMonth(), qDate.getUTCDate(), 23, 59, 59, 999));
      const dateEndCutoff = new Date(Math.max(localEnd.getTime(), utcEnd.getTime()));

      if (now > dateEndCutoff) {
        const completedConsult = await Consultation.findOne({
          queueEntry: qEntry._id,
          status: 'Completed',
        });

        if (completedConsult) {
          await syncVisitStatus({ queueEntryId: qEntry._id, status: 'Completed' });
          continue;
        }

        const targetStatus = (qEntry.status === 'Checked-In' || qEntry.status === 'Waiting') ? 'Hold On' : 'Missed';
        await syncVisitStatus({ queueEntryId: qEntry._id, status: targetStatus });

        const populatedQ = await QueueEntry.findById(qEntry._id)
          .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex patientType dateOfBirth')
          .populate('doctor', 'name email role specialization');
        emitQueueUpdate(populatedQ || qEntry);
      }
    }
  } catch (err) {
    console.error('Error auto-flagging missed/hold-on appointments:', err);
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
    const consultStatus = ['Completed', 'Missed', 'Cancelled', 'No Show'].includes(stdStatus) ? stdStatus : 'In Progress';
    const consultUpdate = { status: consultStatus };
    if (stdStatus === 'In Consultation') {
      consultUpdate.startedAt = now;
      consultUpdate.consultation_started_at = now;
    } else if (stdStatus === 'Completed' || stdStatus === 'Missed' || stdStatus === 'Cancelled') {
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

      if (current === 'Scheduled' && ['Checked-In', 'In Consultation', 'Cancelled', 'Missed', 'No Show'].includes(stdStatus)) {
        allowed = true;
      } else if (current === 'Missed' && ['Checked-In', 'In Consultation', 'Cancelled'].includes(stdStatus)) {
        allowed = true;
      } else if ((current === 'Checked-In' || current === 'In Consultation') && ['Completed', 'Cancelled', 'Missed', 'No Show'].includes(stdStatus)) {
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
  autoCheckInScheduledAppointments,
  checkAndMarkMissedAppointments,
};
