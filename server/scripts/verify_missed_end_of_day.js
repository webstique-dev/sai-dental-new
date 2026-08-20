require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const FollowUp = require('../models/FollowUp');
const { checkAndMarkMissedAppointments } = require('../utils/statusSync');

async function runVerification() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('=== VERIFYING MISSED APPOINTMENT END-OF-DAY LOGIC ===\n');

    const doctor = await User.findOne({ role: 'doctor' });
    const patient = await Patient.findOne({ isDeleted: { $ne: true } });

    if (!doctor || !patient) {
      console.error('Doctor or patient not found.');
      process.exit(1);
    }

    const now = new Date();

    // 1. Appointment for TODAY at 09:00 AM (scheduled time in past, but date is today)
    const todayApptDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
    const todayAppt = new Appointment({
      patient: patient._id,
      doctor: doctor._id,
      date: todayApptDate,
      time: '09:00 AM',
      reason: 'Test Today Past Time Appt',
      status: 'Scheduled',
    });
    await todayAppt.save();

    // 2. Appointment for YESTERDAY (entire date has passed)
    const yesterdayApptDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 30, 0, 0);
    const yesterdayAppt = new Appointment({
      patient: patient._id,
      doctor: doctor._id,
      date: yesterdayApptDate,
      time: '10:30 AM',
      reason: 'Test Yesterday Appt',
      status: 'Scheduled',
    });
    await yesterdayAppt.save();

    const linkedFollowUp = new FollowUp({
      patient: patient._id,
      recommendedDate: yesterdayApptDate,
      reason: 'Test Yesterday FollowUp',
      status: 'Scheduled',
      scheduledAppointment: yesterdayAppt._id,
    });
    await linkedFollowUp.save();

    console.log('Running checkAndMarkMissedAppointments()...');
    await checkAndMarkMissedAppointments();

    const checkedTodayAppt = await Appointment.findById(todayAppt._id);
    const checkedYesterdayAppt = await Appointment.findById(yesterdayAppt._id);
    const checkedFollowUp = await FollowUp.findById(linkedFollowUp._id);

    console.log(`1. Today's 09:00 AM Appt Status: "${checkedTodayAppt.status}" (Expected: "Scheduled")`);
    const todayPassed = checkedTodayAppt.status === 'Scheduled';

    console.log(`2. Yesterday's Appt Status: "${checkedYesterdayAppt.status}" (Expected: "Missed")`);
    const yesterdayPassed = checkedYesterdayAppt.status === 'Missed';

    console.log(`3. Yesterday's Linked FollowUp Status: "${checkedFollowUp.status}" (Expected: "Missed")`);
    const followUpPassed = checkedFollowUp.status === 'Missed';

    console.log(`4. Yesterday's Appt Date Intact: ${checkedYesterdayAppt.date.toISOString()} === ${yesterdayApptDate.toISOString()}`);
    console.log(`   Yesterday's Appt Time Intact: "${checkedYesterdayAppt.time}" === "10:30 AM"`);
    const dateIntact = checkedYesterdayAppt.date.getTime() === yesterdayApptDate.getTime() && checkedYesterdayAppt.time === '10:30 AM';

    // Clean up
    await Appointment.deleteMany({ _id: { $in: [todayAppt._id, yesterdayAppt._id] } });
    await FollowUp.deleteOne({ _id: linkedFollowUp._id });

    if (todayPassed && yesterdayPassed && followUpPassed && dateIntact) {
      console.log('\n SUCCESS: ALL MISSED APPOINTMENT CHECKS PASSED PERFECTLY!');
      process.exit(0);
    } else {
      console.error('\n FAILURE: SOME CHECKS FAILED!');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error during verification:', err);
    process.exit(1);
  }
}

runVerification();
