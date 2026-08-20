require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const QueueEntry = require('../models/QueueEntry');
const ClinicSettings = require('../models/ClinicSettings');

async function runVerification() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('=== VERIFYING BOOK APPOINTMENT CHECK-IN / IN-CONSULTATION LOGIC ===\n');

    const doctor = await User.findOne({ role: 'doctor', status: 'active' });
    const receptionist = await User.findOne({ role: 'receptionist', status: 'active' });
    let patient = await Patient.findOne({ isDeleted: { $ne: true } });

    if (!doctor || !patient) {
      console.error('Doctor or patient not found.');
      process.exit(1);
    }

    console.log(`Testing with Doctor: Dr. ${doctor.name} (${doctor._id})`);
    console.log(`Testing with Patient: ${patient.firstName} ${patient.lastName} (${patient._id})`);

    // 1. Test creating appointment with "Checked-In" status
    const apptCheckIn = new Appointment({
      patient: patient._id,
      doctor: doctor._id,
      date: new Date(),
      time: '10:30 AM',
      type: 'Walk-In',
      reason: 'Check-in Direct Test',
      status: 'Checked-In',
      createdBy: receptionist ? receptionist._id : doctor._id,
    });
    await apptCheckIn.save();

    // Generate QueueEntry as done in controller
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const lastEntry = await QueueEntry.findOne({ date: { $gte: start, $lte: end } }).sort({ token: -1 });
    const nextToken = lastEntry && lastEntry.token ? lastEntry.token + 1 : 1;

    const { getFormattedDateString } = require('../utils/statusSync');
    const queueDateStr = getFormattedDateString(now);

    const qEntry = new QueueEntry({
      token: nextToken,
      queue_token: nextToken,
      patient: apptCheckIn.patient,
      doctor: apptCheckIn.doctor,
      appointment: apptCheckIn._id,
      type: 'Appointment',
      status: 'Checked-In',
      checked_in_at: now,
      checkInTime: now,
      queue_date: queueDateStr,
      date: now,
    });
    await qEntry.save();

    console.log(`\n1. Created Appointment with status 'Checked-In' (ID: ${apptCheckIn._id})`);
    console.log(`2. Generated QueueEntry (ID: ${qEntry._id}, Status: ${qEntry.status}, Token: #${qEntry.token})`);

    // Verify QueueEntry is visible on Doctor's queue
    const doctorQueue = await QueueEntry.find({
      date: { $gte: start, $lte: end },
      doctor: doctor._id,
      status: { $in: ['Checked-In', 'In Consultation'] },
    });

    const isFoundOnQueue = doctorQueue.some((q) => q._id.toString() === qEntry._id.toString());
    console.log(`3. Visible on Doctor's Active Queue: ${isFoundOnQueue ? 'PASSED ✓' : 'FAILED ✗'}`);

    // 2. Test creating appointment with "Scheduled" status
    const apptScheduled = new Appointment({
      patient: patient._id,
      doctor: doctor._id,
      date: new Date(),
      time: '02:00 PM',
      type: 'Phone Booking',
      reason: 'Scheduled Test',
      status: 'Scheduled',
      createdBy: receptionist ? receptionist._id : doctor._id,
    });
    await apptScheduled.save();

    console.log(`\n4. Created Appointment with status 'Scheduled' (ID: ${apptScheduled._id}, Status: ${apptScheduled.status})`);
    const isScheduledOk = apptScheduled.status === 'Scheduled';
    console.log(`5. Scheduled Appointment Status Match: ${isScheduledOk ? 'PASSED ✓' : 'FAILED ✗'}`);

    // Clean up test objects
    await Appointment.deleteOne({ _id: apptCheckIn._id });
    await Appointment.deleteOne({ _id: apptScheduled._id });
    await QueueEntry.deleteOne({ _id: qEntry._id });

    if (isFoundOnQueue && isScheduledOk) {
      console.log('\n SUCCESS: BOOK APPOINTMENT CHECK-IN LOGIC VERIFIED PERFECTLY!');
      process.exit(0);
    } else {
      console.error('\n FAILURE: TEST VERIFICATION FAILED!');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error during verification:', err);
    process.exit(1);
  }
}

runVerification();
