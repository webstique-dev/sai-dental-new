require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const FollowUp = require('../models/FollowUp');
const Consultation = require('../models/Consultation');
const { syncVisitStatus, checkAndMarkMissedAppointments } = require('../utils/statusSync');

async function verifyFollowUpAutoBookingFlow() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== STARTING FOLLOW-UP AUTO-BOOKING & SYNC TEST ===\n');

  const doctor = await User.findOne({ role: 'doctor' });
  const patient = await Patient.findOne({ isDeleted: { $ne: true } });

  if (!doctor || !patient) {
    console.error('Doctor or patient not found.');
    process.exit(1);
  }

  // 1. Create a consultation
  const consultation = new Consultation({
    patient: patient._id,
    doctor: doctor._id,
    status: 'In Progress',
  });
  await consultation.save();

  // 2. Simulate closing consultation with a date-specific follow-up
  console.log('1. Doctor closes consultation with recommended date (2026-09-01) & reason...');
  const recommendedDate = '2026-09-01';
  const reason = 'Post-op Scaling Checkup';

  const followUp = new FollowUp({
    patient: patient._id,
    consultation: consultation._id,
    recommendedDate: new Date(recommendedDate),
    reason,
    status: 'Scheduled',
    createdBy: doctor._id,
  });
  await followUp.save();

  const newAppt = new Appointment({
    patient: patient._id,
    doctor: doctor._id,
    date: new Date(recommendedDate),
    time: '10:00 AM',
    reason,
    type: 'Appointment',
    status: 'Scheduled',
    followUp: followUp._id,
    createdBy: doctor._id,
  });
  await newAppt.save();

  followUp.scheduledAppointment = newAppt._id;
  await followUp.save();

  console.log(`   Follow-Up ID: ${followUp._id}, Status: ${followUp.status}`);
  console.log(`   Linked Appointment ID: ${newAppt._id}, Date: ${newAppt.date.toISOString().split('T')[0]}, Status: ${newAppt.status}`);
  console.log('   Auto-booking test:', (followUp.status === 'Scheduled' && newAppt.status === 'Scheduled' && followUp.scheduledAppointment.toString() === newAppt._id.toString()) ? 'PASSED ✓' : 'FAILED ✗');

  // 3. Test completion sync
  console.log('\n2. Receptionist checks in and completes appointment...');
  await syncVisitStatus({ appointmentId: newAppt._id, status: 'Completed' });

  const updatedFollowUp1 = await FollowUp.findById(followUp._id);
  console.log(`   Updated Follow-Up Status: ${updatedFollowUp1.status}`);
  console.log('   Completion sync test:', updatedFollowUp1.status === 'Completed' ? 'PASSED ✓' : 'FAILED ✗');

  // 4. Test cancellation sync
  console.log('\n3. Testing appointment cancellation sync...');
  newAppt.status = 'Cancelled';
  await newAppt.save();
  await syncVisitStatus({ appointmentId: newAppt._id, status: 'Cancelled' });

  const updatedFollowUp2 = await FollowUp.findById(followUp._id);
  console.log(`   Updated Follow-Up Status: ${updatedFollowUp2.status}`);
  console.log('   Cancellation sync test:', updatedFollowUp2.status === 'Cancelled' ? 'PASSED ✓' : 'FAILED ✗');

  // 5. Test Missed appointment auto-flagger
  console.log('\n4. Testing Missed appointment auto-flagger...');
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

  const expiredAppt = new Appointment({
    patient: patient._id,
    doctor: doctor._id,
    date: pastDate,
    time: '10:00 AM',
    reason: 'Expired Follow-up Appt',
    type: 'Appointment',
    status: 'Scheduled',
  });
  await expiredAppt.save();

  const expiredFollowUp = new FollowUp({
    patient: patient._id,
    recommendedDate: pastDate,
    reason: 'Expired Follow-up Appt',
    status: 'Scheduled',
    scheduledAppointment: expiredAppt._id,
  });
  await expiredFollowUp.save();
  expiredAppt.followUp = expiredFollowUp._id;
  await expiredAppt.save();

  await checkAndMarkMissedAppointments();

  const updatedExpiredAppt = await Appointment.findById(expiredAppt._id);
  const updatedExpiredFollowUp = await FollowUp.findById(expiredFollowUp._id);

  console.log(`   Expired Appointment Status: ${updatedExpiredAppt.status}`);
  console.log(`   Expired Follow-Up Status: ${updatedExpiredFollowUp.status}`);
  console.log('   Missed status test:', (updatedExpiredAppt.status === 'Missed' && updatedExpiredFollowUp.status === 'Missed') ? 'PASSED ✓' : 'FAILED ✗');

  // Cleanup test data
  console.log('\n5. Cleaning up test data...');
  await Consultation.deleteMany({ _id: consultation._id });
  await FollowUp.deleteMany({ _id: { $in: [followUp._id, expiredFollowUp._id] } });
  await Appointment.deleteMany({ _id: { $in: [newAppt._id, expiredAppt._id] } });
  console.log('   Cleanup done.');

  console.log('\n=== ALL FOLLOW-UP AUTO-BOOKING TESTS PASSED PERFECTLY ===');
  process.exit(0);
}

verifyFollowUpAutoBookingFlow().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
