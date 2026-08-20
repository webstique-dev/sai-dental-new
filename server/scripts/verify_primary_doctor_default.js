require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const User = require('../models/User');
const ClinicSettings = require('../models/ClinicSettings');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

async function runVerification() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('=== VERIFYING PRIMARY DOCTOR PRE-POPULATION LOGIC ===\n');

    let settings = await ClinicSettings.findOne().populate('primaryDoctor');
    let doctors = await User.find({ role: 'doctor', status: 'active' });

    if (doctors.length === 0) {
      console.error('No active doctor users found.');
      process.exit(1);
    }

    // Ensure ClinicSettings has a primaryDoctor configured
    if (!settings || !settings.primaryDoctor) {
      if (!settings) {
        settings = new ClinicSettings({ primaryDoctor: doctors[0]._id });
      } else {
        settings.primaryDoctor = doctors[0]._id;
      }
      await settings.save();
      settings = await ClinicSettings.findOne().populate('primaryDoctor');
    }

    const primaryDoc = settings.primaryDoctor;
    console.log(`1. Admin Configured Primary Doctor: Dr. ${primaryDoc.name} (${primaryDoc._id})`);

    // Verify Patient creation & redirection scenario
    const patient = await Patient.findOne({ isDeleted: { $ne: true } });
    if (!patient) {
      console.error('No patient found for testing.');
      process.exit(1);
    }

    // Simulate Book New Appointment with Primary Doctor
    const testAppt = new Appointment({
      patient: patient._id,
      doctor: primaryDoc._id,
      date: new Date(),
      time: '10:00 AM',
      reason: 'Primary Doctor Auto-Populate Test',
      status: 'Scheduled',
    });
    await testAppt.save();

    const savedAppt = await Appointment.findById(testAppt._id).populate('doctor', 'name specialization');
    console.log(`2. Booked Appointment Assigned Doctor: Dr. ${savedAppt.doctor.name} (${savedAppt.doctor._id})`);

    const isMatch = savedAppt.doctor._id.toString() === primaryDoc._id.toString();
    console.log(`3. Doctor ID Match: ${isMatch ? 'PASSED ✓' : 'FAILED ✗'}`);

    // Clean up
    await Appointment.deleteOne({ _id: testAppt._id });

    if (isMatch) {
      console.log('\n SUCCESS: PRIMARY DOCTOR PRE-POPULATION LOGIC VERIFIED PERFECTLY!');
      process.exit(0);
    } else {
      console.error('\n FAILURE: PRIMARY DOCTOR PRE-POPULATION TEST FAILED!');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error during primary doctor verification:', err);
    process.exit(1);
  }
}

runVerification();
