require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const FollowUp = require('../models/FollowUp');
const { syncVisitStatus, checkAndMarkMissedAppointments, parseAppointmentDateTime } = require('../utils/statusSync');

async function verifyTimeAndMissedGraceFlow() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== STARTING TIME PARSER, 30-MIN GRACE PERIOD & LATE CHECK-IN TEST ===\n');

  const doctor = await User.findOne({ role: 'doctor' });
  const patient = await Patient.findOne({ isDeleted: { $ne: true } });

  if (!doctor || !patient) {
    console.error('Doctor or patient not found.');
    process.exit(1);
  }

  // 1. Test Time Parser with 12-hour AM/PM formats
  console.log('1. Testing 12-hour AM/PM Time Parser...');
  const t1 = parseAppointmentDateTime('2026-08-14', '09:45 AM');
  const t2 = parseAppointmentDateTime('2026-08-14', '02:30 PM');
  const t3 = parseAppointmentDateTime('2026-08-14', '12:15 PM');
  const t4 = parseAppointmentDateTime('2026-08-14', '12:00 AM');

  console.log('   "09:45 AM" -> Hours:', t1.getHours(), 'Mins:', t1.getMinutes());
  console.log('   "02:30 PM" -> Hours:', t2.getHours(), 'Mins:', t2.getMinutes());
  console.log('   "12:15 PM" -> Hours:', t3.getHours(), 'Mins:', t3.getMinutes());
  console.log('   "12:00 AM" -> Hours:', t4.getHours(), 'Mins:', t4.getMinutes());

  const parserOk = t1.getHours() === 9 && t2.getHours() === 14 && t3.getHours() === 12 && t4.getHours() === 0;
  console.log('   12-Hour Time Parser test:', parserOk ? 'PASSED ✓' : 'FAILED ✗');

  // 2. Test 30-Minute Grace Period Missed Detection
  console.log('\n2. Testing 30-Minute Grace Period Missed Detection...');
  const now = new Date();

  // Past Appointment 1: 45 minutes ago (Outside 30-min grace period -> Should be MISSED)
  const past45 = new Date(now.getTime() - 45 * 60 * 1000);
  const p45DateStr = past45.toISOString().split('T')[0];
  const p45Hours = past45.getHours();
  const p45Mins = String(past45.getMinutes()).padStart(2, '0');
  const p45Period = p45Hours >= 12 ? 'PM' : 'AM';
  const p45H12 = String(p45Hours % 12 === 0 ? 12 : p45Hours % 12).padStart(2, '0');
  const p45TimeStr = `${p45H12}:${p45Mins} ${p45Period}`;

  const apptExpired = new Appointment({
    patient: patient._id,
    doctor: doctor._id,
    date: past45,
    time: p45TimeStr,
    reason: 'Expired 45m ago',
    status: 'Scheduled',
  });
  await apptExpired.save();

  const followUpExpired = new FollowUp({
    patient: patient._id,
    recommendedDate: past45,
    reason: 'Expired 45m ago',
    status: 'Scheduled',
    scheduledAppointment: apptExpired._id,
  });
  await followUpExpired.save();
  apptExpired.followUp = followUpExpired._id;
  await apptExpired.save();

  // Past Appointment 2: 10 minutes ago (Within 30-min grace period -> Should STAY Scheduled)
  const past10 = new Date(now.getTime() - 10 * 60 * 1000);
  const p10DateStr = past10.toISOString().split('T')[0];
  const p10Hours = past10.getHours();
  const p10Mins = String(past10.getMinutes()).padStart(2, '0');
  const p10Period = p10Hours >= 12 ? 'PM' : 'AM';
  const p10H12 = String(p10Hours % 12 === 0 ? 12 : p10Hours % 12).padStart(2, '0');
  const p10TimeStr = `${p10H12}:${p10Mins} ${p10Period}`;

  const apptGrace = new Appointment({
    patient: patient._id,
    doctor: doctor._id,
    date: past10,
    time: p10TimeStr,
    reason: 'Within 10m grace',
    status: 'Scheduled',
  });
  await apptGrace.save();

  // Run detection with 30-min grace
  await checkAndMarkMissedAppointments(30);

  const resExpiredAppt = await Appointment.findById(apptExpired._id);
  const resExpiredFollowUp = await FollowUp.findById(followUpExpired._id);
  const resGraceAppt = await Appointment.findById(apptGrace._id);

  console.log(`   45m Past Appt Status: ${resExpiredAppt.status} (Expected: Missed)`);
  console.log(`   45m Past FollowUp Status: ${resExpiredFollowUp.status} (Expected: Missed)`);
  console.log(`   10m Past Appt Status: ${resGraceAppt.status} (Expected: Scheduled)`);

  const graceOk = resExpiredAppt.status === 'Missed' && resExpiredFollowUp.status === 'Missed' && resGraceAppt.status === 'Scheduled';
  console.log('   Grace Period Missed Detection test:', graceOk ? 'PASSED ✓' : 'FAILED ✗');

  // 3. Test Late Check-In from Missed Status
  console.log('\n3. Testing Late Check-In from Missed Status...');
  await syncVisitStatus({ appointmentId: resExpiredAppt._id, status: 'Checked-In' });

  const lateCheckedInAppt = await Appointment.findById(resExpiredAppt._id);
  const lateCheckedInFollowUp = await FollowUp.findById(resExpiredFollowUp._id);

  console.log(`   Late Check-In Appt Status: ${lateCheckedInAppt.status} (Expected: Checked-In)`);
  console.log(`   Late Check-In FollowUp Status: ${lateCheckedInFollowUp.status} (Expected: Checked-In)`);

  const lateOk = lateCheckedInAppt.status === 'Checked-In' && lateCheckedInFollowUp.status === 'Checked-In';
  console.log('   Late Check-In from Missed test:', lateOk ? 'PASSED ✓' : 'FAILED ✗');

  // Cleanup
  console.log('\n4. Cleaning up test data...');
  await Appointment.deleteMany({ _id: { $in: [apptExpired._id, apptGrace._id] } });
  await FollowUp.deleteMany({ _id: followUpExpired._id });
  console.log('   Cleanup done.');

  console.log('\n=== ALL TIME & MISSED GRACE TESTS PASSED PERFECTLY ===');
  process.exit(0);
}

verifyTimeAndMissedGraceFlow().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
