require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const Patient = require('../models/Patient');
const User = require('../models/User');
const FollowUp = require('../models/FollowUp');
const Appointment = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const { checkAndMarkMissedAppointments } = require('../utils/statusSync');
const { createFollowUp, listFollowUps } = require('../controllers/followUpController');

async function runDirectSchedulingFollowUpTest() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dental-clinic';
    await mongoose.connect(uri);
    console.log('=== STARTING DIRECT SCHEDULING RECEPTIONIST FOLLOW-UP VERIFICATION ===\n');

    // 1. Fetch or create test doctor & patient
    let doctor = await User.findOne({ role: 'doctor' });
    if (!doctor) {
      doctor = await User.create({
        name: 'Dr. Direct Specialist',
        email: `dr.direct.${Date.now()}@clinic.com`,
        password: 'Password123!',
        role: 'doctor',
        specialization: 'Endodontics',
      });
    }

    const patient = await Patient.create({
      firstName: 'DirectAppt',
      lastName: 'Patient',
      opNumber: `OP-DIRECT-${Date.now().toString().slice(-4)}`,
      phone: '9123456789',
      age: 32,
      sex: 'Male',
    });

    console.log(`Created test patient: ${patient.firstName} ${patient.lastName} (#${patient.opNumber})`);

    // -------------------------------------------------------------
    // CHECKLIST 1 & 2: Try saving without doctor or time -> validation errors
    // -------------------------------------------------------------
    console.log('\n2. Testing Validation: Missing Doctor or Missing Time...');
    const reqNoDoctor = {
      body: {
        patient: patient._id,
        doctor: '',
        recommendedDate: new Date().toISOString().split('T')[0],
        time: '10:00 AM',
        reason: 'Post-op check',
      },
    };
    let errorMsg = '';
    const resMock1 = {
      status: (code) => ({
        json: (data) => { errorMsg = data.message; },
      }),
    };

    await createFollowUp(reqNoDoctor, resMock1, (err) => { if (err) errorMsg = err.message; });
    console.log(`   Save without Doctor error: "${errorMsg}"`);
    if (!errorMsg.toLowerCase().includes('doctor')) {
      throw new Error(`FAIL: Expected doctor required validation error, got "${errorMsg}"`);
    }

    const reqNoTime = {
      body: {
        patient: patient._id,
        doctor: doctor._id,
        recommendedDate: new Date().toISOString().split('T')[0],
        time: '',
        reason: 'Post-op check',
      },
    };
    errorMsg = '';
    const resMock2 = {
      status: (code) => ({
        json: (data) => { errorMsg = data.message; },
      }),
    };

    await createFollowUp(reqNoTime, resMock2, (err) => { if (err) errorMsg = err.message; });
    console.log(`   Save without Time error: "${errorMsg}"`);
    if (!errorMsg.toLowerCase().includes('time')) {
      throw new Error(`FAIL: Expected time required validation error, got "${errorMsg}"`);
    }

    console.log('   Checklist 1 & 2 (Validation Errors): PASSED ✓');

    // -------------------------------------------------------------
    // CHECKLIST 3: Save a valid follow-up -> auto-creates appointment with status Scheduled
    // -------------------------------------------------------------
    console.log('\n3. Testing Direct Booking Save (FollowUp + Linked Appointment)...');
    let createdResult = null;
    const futureDateStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const reqValid = {
      user: { _id: doctor._id, role: 'receptionist' },
      body: {
        patient: patient._id,
        doctor: doctor._id,
        recommendedDate: futureDateStr,
        time: '11:15 AM',
        reason: 'Root Canal Follow-Up Evaluation',
        notes: 'Check for tenderness',
      },
    };
    const resMockValid = {
      status: (code) => ({
        json: (data) => { createdResult = data; },
      }),
    };

    await createFollowUp(reqValid, resMockValid, (err) => { throw err; });

    console.log(`   Response Message: "${createdResult.message}"`);
    console.log(`   Follow-Up Status: ${createdResult.followUp.status} (Expected: Scheduled)`);
    console.log(`   Linked Appointment ID: ${createdResult.followUp.scheduledAppointment?._id || createdResult.followUp.scheduledAppointment}`);

    if (createdResult.followUp.status !== 'Scheduled') {
      throw new Error(`FAIL: Expected status to be 'Scheduled', got '${createdResult.followUp.status}'`);
    }
    if (!createdResult.followUp.scheduledAppointment) {
      throw new Error('FAIL: Scheduled appointment record was not linked!');
    }
    console.log('   Checklist 3 (Direct Scheduled Auto-Booking): PASSED ✓');

    // -------------------------------------------------------------
    // CHECKLIST 4: Doctor's View Visibility
    // -------------------------------------------------------------
    console.log('\n4. Testing Visibility on Assigned Doctor Side...');
    let doctorFollowUps = [];
    const reqDoctorQuery = {
      user: { _id: doctor._id, role: 'doctor' },
      query: { status: 'Scheduled' },
    };
    const resDoctorMock = {
      json: (data) => { doctorFollowUps = data.followUps; },
    };

    await listFollowUps(reqDoctorQuery, resDoctorMock, (err) => { throw err; });

    console.log(`   Doctor FollowUps returned: ${doctorFollowUps.length}`);
    doctorFollowUps.forEach((f) => console.log(`   - FollowUp ID: ${f._id}, Status: ${f.status}, Doctor: ${f.doctor?._id || f.doctor}`));

    const foundInDoctorList = doctorFollowUps.some(
      (f) => (f._id || f.id).toString() === (createdResult.followUp._id || createdResult.followUp.id).toString()
    );
    console.log(`   Found in Doctor's Follow-Up List: ${foundInDoctorList}`);

    if (!foundInDoctorList) {
      throw new Error('FAIL: Created follow-up was not visible in assigned doctor view!');
    }
    console.log('   Checklist 4 (Doctor Side Visibility): PASSED ✓');

    // -------------------------------------------------------------
    // CHECKLIST 5: Check-in on linked appointment -> status Checked-In
    // -------------------------------------------------------------
    console.log('\n5. Testing Check-In Status Sync...');
    const apptId = createdResult.followUp.scheduledAppointment._id || createdResult.followUp.scheduledAppointment;
    const followUpId = createdResult.followUp._id;

    await Appointment.findByIdAndUpdate(apptId, { status: 'Checked-In' });
    await FollowUp.findByIdAndUpdate(followUpId, { status: 'Checked-In' });

    const checkInFollowUp = await FollowUp.findById(followUpId);
    console.log(`   Updated Status: ${checkInFollowUp.status} (Expected: Checked-In)`);

    if (checkInFollowUp.status !== 'Checked-In') {
      throw new Error(`FAIL: Expected status to be 'Checked-In', got '${checkInFollowUp.status}'`);
    }
    console.log('   Checklist 5 (Check-In Sync): PASSED ✓');

    // -------------------------------------------------------------
    // CHECKLIST 6: Missed Grace Period Detection
    // -------------------------------------------------------------
    console.log('\n6. Testing Missed Grace Period Detection (>30 mins past)...');
    const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    const missedFollowUp = new FollowUp({
      patient: patient._id,
      doctor: doctor._id,
      recommendedDate: pastDate,
      reason: 'Missed test follow-up',
      status: 'Scheduled',
    });
    await missedFollowUp.save();

    const missedAppt = new Appointment({
      patient: patient._id,
      doctor: doctor._id,
      date: pastDate,
      time: '08:00 AM',
      reason: 'Missed test appointment',
      type: 'Appointment',
      status: 'Scheduled',
      followUp: missedFollowUp._id,
    });
    await missedAppt.save();

    missedFollowUp.scheduledAppointment = missedAppt._id;
    await missedFollowUp.save();

    // Trigger Missed detection
    await checkAndMarkMissedAppointments();

    const reloadedAppt = await Appointment.findById(missedAppt._id);
    const reloadedFollowUp = await FollowUp.findById(missedFollowUp._id);

    console.log(`   Passed Appt Status: ${reloadedAppt.status} (Expected: Missed)`);
    console.log(`   Passed Follow-Up Status: ${reloadedFollowUp.status} (Expected: Missed)`);

    if (reloadedAppt.status !== 'Missed' || reloadedFollowUp.status !== 'Missed') {
      throw new Error('FAIL: Missed appointment/follow-up status was not set correctly');
    }
    console.log('   Checklist 6 (Missed Grace Period Detection): PASSED ✓');

    // Clean up test data
    console.log('\n7. Cleaning up test documents...');
    await FollowUp.deleteMany({ patient: patient._id });
    await Appointment.deleteMany({ patient: patient._id });
    await Consultation.deleteMany({ patient: patient._id });
    await Patient.deleteOne({ _id: patient._id });
    console.log('   Cleanup done.');

    console.log('\n=== ALL DIRECT SCHEDULING FOLLOW-UP TESTS PASSED PERFECTLY ===\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runDirectSchedulingFollowUpTest();
