require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const QueueEntry = require('../models/QueueEntry');
const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');

function getFormattedDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function runAuditAndMigration() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/dental-clinic-db';
  console.log('Connecting to MongoDB for Queue Data Model Audit & Migration...');
  await mongoose.connect(mongoUri);

  console.log('--- AUDITING QUEUE ENTRIES ---');
  const queueEntries = await QueueEntry.find({});
  let queueUpdatedCount = 0;

  for (const q of queueEntries) {
    let modified = false;

    // 1. Backfill checked_in_at
    const checkedInTime = q.checked_in_at || q.checkInTime || q.createdAt || new Date();
    if (!q.checked_in_at) {
      q.checked_in_at = checkedInTime;
      modified = true;
    }
    if (!q.checkInTime) {
      q.checkInTime = checkedInTime;
      modified = true;
    }

    // 2. Backfill queue_date
    const dateStr = q.queue_date || getFormattedDateString(checkedInTime);
    if (!q.queue_date || q.queue_date !== dateStr) {
      q.queue_date = dateStr;
      modified = true;
    }

    // 3. Backfill queue_token
    if (!q.queue_token && q.token) {
      q.queue_token = q.token;
      modified = true;
    }

    // 4. Backfill consultation timestamps
    if (['In Consultation', 'Completed'].includes(q.status) && !q.consultation_started_at) {
      const c = await Consultation.findOne({
        $or: [{ queueEntry: q._id }, { appointment: q.appointment }],
      });
      q.consultation_started_at = c && c.startedAt ? c.startedAt : checkedInTime;
      modified = true;
    }

    if (q.status === 'Completed') {
      const c = await Consultation.findOne({
        $or: [{ queueEntry: q._id }, { appointment: q.appointment }],
      });
      const endTime = (c && (c.closedAt || c.completed_at)) || q.updatedAt || checkedInTime;
      if (!q.consultation_ended_at) {
        q.consultation_ended_at = endTime;
        modified = true;
      }
      if (!q.completed_at) {
        q.completed_at = endTime;
        modified = true;
      }
    }

    if (modified) {
      await q.save();
      queueUpdatedCount++;
    }
  }

  console.log(`Successfully audited & backfilled ${queueUpdatedCount} / ${queueEntries.length} QueueEntry records.`);

  console.log('--- AUDITING CONSULTATIONS ---');
  const consultations = await Consultation.find({});
  let consultUpdatedCount = 0;

  for (const c of consultations) {
    let modified = false;

    if (!c.consultation_started_at) {
      c.consultation_started_at = c.startedAt || c.createdAt || new Date();
      modified = true;
    }

    if (c.status === 'Completed') {
      const endTime = c.closedAt || c.completed_at || c.consultation_ended_at || c.updatedAt || new Date();
      if (!c.closedAt) {
        c.closedAt = endTime;
        modified = true;
      }
      if (!c.consultation_ended_at) {
        c.consultation_ended_at = endTime;
        modified = true;
      }
      if (!c.completed_at) {
        c.completed_at = endTime;
        modified = true;
      }
    }

    if (modified) {
      await c.save();
      consultUpdatedCount++;
    }
  }

  console.log(`Successfully audited & backfilled ${consultUpdatedCount} / ${consultations.length} Consultation records.`);
  console.log('--- MIGRATION & AUDIT COMPLETE ---');
  process.exit(0);
}

runAuditAndMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
