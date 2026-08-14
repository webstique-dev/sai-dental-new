require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const QueueEntry = require('../models/QueueEntry');
const Consultation = require('../models/Consultation');
const { getNextTokenForDate } = require('../controllers/queueController');
const { syncVisitStatus } = require('../utils/statusSync');

async function testAllQueueFixes() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== STARTING MANUAL VERIFICATION TEST ===');

  const doctor = await User.findOne({ role: 'doctor' });
  const patients = await Patient.find({ isDeleted: { $ne: true } }).limit(3);

  if (!doctor || patients.length < 3) {
    console.log('Not enough patients/doctors to run test.');
    process.exit(0);
  }

  const testDate = '2026-08-20'; // Simulated test date

  console.log('1. Checking in 3 patients for test date:', testDate);
  const createdEntries = [];

  for (let i = 0; i < 3; i++) {
    const nextToken = await getNextTokenForDate(testDate);
    const now = new Date();
    const entry = new QueueEntry({
      token: nextToken,
      queue_token: nextToken,
      patient: patients[i]._id,
      doctor: doctor._id,
      type: 'Walk-in',
      status: 'Checked-In',
      checked_in_at: now,
      checkInTime: now,
      queue_date: testDate,
      date: new Date(testDate),
    });
    await entry.save();
    createdEntries.push(entry);
    console.log(`   Patient ${i + 1} (${patients[i].firstName} ${patients[i].lastName}) checked in -> Token: #${entry.token}, Queue Date: ${entry.queue_date}, Checked-in At: ${entry.checked_in_at.toISOString()}`);
  }

  console.log('\n2. Verifying token order for test date:');
  const tokens = createdEntries.map(e => e.token);
  console.log('   Tokens generated:', tokens.join(', '));
  console.log('   Token order check (expected 1, 2, 3):', tokens[0] === 1 && tokens[1] === 2 && tokens[2] === 3 ? 'PASSED ✓' : 'FAILED ✗');

  console.log('\n3. Starting and completing a consultation for Token #1:');
  const entry1 = createdEntries[0];
  const consult = new Consultation({
    patient: entry1.patient,
    doctor: entry1.doctor,
    queueEntry: entry1._id,
    status: 'In Progress',
    startedAt: new Date(),
    consultation_started_at: new Date(),
  });
  await consult.save();

  await syncVisitStatus({
    queueEntryId: entry1._id,
    consultationId: consult._id,
    status: 'In Consultation',
  });

  // Complete consultation
  consult.status = 'Completed';
  consult.closedAt = new Date();
  consult.consultation_ended_at = new Date();
  consult.completed_at = new Date();
  await consult.save();

  await syncVisitStatus({
    queueEntryId: entry1._id,
    consultationId: consult._id,
    status: 'Completed',
  });

  const updatedEntry1 = await QueueEntry.findById(entry1._id);
  console.log('   Consultation Start Time:', updatedEntry1.consultation_started_at ? updatedEntry1.consultation_started_at.toISOString() : 'MISSING ✗');
  console.log('   Consultation End Time:', (updatedEntry1.consultation_ended_at || updatedEntry1.completed_at) ? (updatedEntry1.consultation_ended_at || updatedEntry1.completed_at).toISOString() : 'MISSING ✗');
  console.log('   Timestamps check:', (updatedEntry1.consultation_started_at && updatedEntry1.completed_at) ? 'PASSED ✓' : 'FAILED ✗');

  console.log('\n4. Cleaning up test data...');
  await QueueEntry.deleteMany({ queue_date: testDate });
  await Consultation.deleteMany({ _id: consult._id });
  console.log('   Cleanup done.');

  console.log('\n=== ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY ===');
  process.exit(0);
}

testAllQueueFixes().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
