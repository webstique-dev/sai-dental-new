require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const FollowUp = require('../models/FollowUp');
const Consultation = require('../models/Consultation');
const { syncVisitStatus, checkAndMarkMissedAppointments } = require('../utils/statusSync');

async function testFollowUpStateMachine() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== STARTING STRICT FOLLOW-UP STATE MACHINE VERIFICATION ===\n');

  const doctor = await User.findOne({ role: 'doctor' });
  const patient = await Patient.findOne({ isDeleted: { $ne: true } });

  if (!doctor || !patient) {
    console.error('Doctor or patient not found.');
    process.exit(1);
  }

  // -------------------------------------------------------------
  // STEP 1: ON CREATION (Doctor enters a follow-up date)
  // -------------------------------------------------------------
  console.log('1. Testing ON CREATION: Doctor enters follow-up date...');
  
  // Originating consultation
  const originatingConsultation = new Consultation({
    patient: patient._id,
    doctor: doctor._id,
    status: 'In Progress',
  });
  await originatingConsultation.save();

  const recommendedDate = '2026-09-15';
  const reason = 'Post-op Root Canal Check';

  // Create follow-up and linked appointment
  const followUp = new FollowUp({
    patient: patient._id,
    consultation: originatingConsultation._id,
    recommendedDate: new Date(recommendedDate),
    reason,
    status: 'Scheduled',
    createdBy: doctor._id,
  });
  await followUp.save();

  const targetAppt = new Appointment({
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
  await targetAppt.save();

  followUp.scheduledAppointment = targetAppt._id;
  await followUp.save();

  // Close originating consultation
  originatingConsultation.status = 'Completed';
  await originatingConsultation.save();
  await syncVisitStatus({ consultationId: originatingConsultation._id, status: 'Completed' });

  const freshFollowUp1 = await FollowUp.findById(followUp._id);
  const freshAppt1 = await Appointment.findById(targetAppt._id);

  console.log(`   Follow-Up Status after creation & originating consult close: ${freshFollowUp1.status}`);
  console.log(`   Linked Appointment Status: ${freshAppt1.status}`);
  if (freshFollowUp1.status === 'Scheduled' && freshAppt1.status === 'Scheduled') {
    console.log('   STEP 1 (ON CREATION = Scheduled): PASSED ✓');
  } else {
    console.error(`   STEP 1 FAILED! Status was ${freshFollowUp1.status} instead of Scheduled`);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // STEP 2: ON CHECK-IN
  // -------------------------------------------------------------
  console.log('\n2. Testing ON CHECK-IN: Receptionist checks in the patient on follow-up date...');
  await syncVisitStatus({ appointmentId: targetAppt._id, status: 'Checked-In' });

  const freshFollowUp2 = await FollowUp.findById(followUp._id);
  const freshAppt2 = await Appointment.findById(targetAppt._id);

  console.log(`   Follow-Up Status: ${freshFollowUp2.status}`);
  console.log(`   Linked Appointment Status: ${freshAppt2.status}`);
  if (freshFollowUp2.status === 'Checked-In' && freshAppt2.status === 'Checked-In') {
    console.log('   STEP 2 (ON CHECK-IN = Checked-In): PASSED ✓');
  } else {
    console.error(`   STEP 2 FAILED! Status was ${freshFollowUp2.status} instead of Checked-In`);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // STEP 3: ON CONSULTATION START & CLOSE
  // -------------------------------------------------------------
  console.log('\n3. Testing ON CONSULTATION START & CLOSE...');
  
  // Doctor starts consultation
  await syncVisitStatus({ appointmentId: targetAppt._id, status: 'In Consultation' });
  const freshFollowUp3 = await FollowUp.findById(followUp._id);
  console.log(`   Follow-Up Status during consultation: ${freshFollowUp3.status}`);

  // Create target consultation for follow-up visit
  const targetConsultation = new Consultation({
    patient: patient._id,
    doctor: doctor._id,
    appointment: targetAppt._id,
    status: 'In Progress',
  });
  await targetConsultation.save();

  // Doctor closes/completes target consultation
  console.log('   Doctor closes target consultation...');
  targetConsultation.status = 'Completed';
  await targetConsultation.save();
  await syncVisitStatus({
    consultationId: targetConsultation._id,
    appointmentId: targetAppt._id,
    status: 'Completed',
  });

  const freshFollowUp4 = await FollowUp.findById(followUp._id);
  const freshAppt4 = await Appointment.findById(targetAppt._id);

  console.log(`   Follow-Up Status after target consult close: ${freshFollowUp4.status}`);
  console.log(`   Linked Appointment Status: ${freshAppt4.status}`);
  if (freshFollowUp4.status === 'Completed' && freshAppt4.status === 'Completed') {
    console.log('   STEP 3 (ON CONSULTATION CLOSE = Completed): PASSED ✓');
  } else {
    console.error(`   STEP 3 FAILED! Status was ${freshFollowUp4.status} instead of Completed`);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // STEP 4: ON MISSED DATE
  // -------------------------------------------------------------
  console.log('\n4. Testing ON MISSED DATE: Date passes without check-in...');
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 3); // 3 days ago

  const expiredAppt = new Appointment({
    patient: patient._id,
    doctor: doctor._id,
    date: pastDate,
    time: '10:00 AM',
    reason: 'Unattended Follow-up',
    type: 'Appointment',
    status: 'Scheduled',
  });
  await expiredAppt.save();

  const expiredFollowUp = new FollowUp({
    patient: patient._id,
    recommendedDate: pastDate,
    reason: 'Unattended Follow-up',
    status: 'Scheduled',
    scheduledAppointment: expiredAppt._id,
  });
  await expiredFollowUp.save();
  expiredAppt.followUp = expiredFollowUp._id;
  await expiredAppt.save();

  await checkAndMarkMissedAppointments();

  const freshExpiredAppt = await Appointment.findById(expiredAppt._id);
  const freshExpiredFollowUp = await FollowUp.findById(expiredFollowUp._id);

  console.log(`   Expired Appointment Status: ${freshExpiredAppt.status}`);
  console.log(`   Expired Follow-Up Status: ${freshExpiredFollowUp.status}`);
  if (freshExpiredAppt.status === 'Missed' && freshExpiredFollowUp.status === 'Missed') {
    console.log('   STEP 4 (ON MISSED DATE = Missed): PASSED ✓');
  } else {
    console.error(`   STEP 4 FAILED! Status was ${freshExpiredFollowUp.status} instead of Missed`);
    process.exit(1);
  }

  // Cleanup test data
  console.log('\n5. Cleaning up test data...');
  await Consultation.deleteMany({ _id: { $in: [originatingConsultation._id, targetConsultation._id] } });
  await FollowUp.deleteMany({ _id: { $in: [followUp._id, expiredFollowUp._id] } });
  await Appointment.deleteMany({ _id: { $in: [targetAppt._id, expiredAppt._id] } });
  console.log('   Cleanup done.');

  console.log('\n=== ALL STATE MACHINE VERIFICATION TESTS PASSED PERFECTLY ===');
  process.exit(0);
}

testFollowUpStateMachine().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
