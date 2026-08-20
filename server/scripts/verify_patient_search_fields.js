require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const FollowUp = require('../models/FollowUp');
const Invoice = require('../models/Invoice');
const { buildPatientSearchFilter } = require('../utils/patientSearchHelper');

async function runSearchVerification() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('=== VERIFYING UNIVERSAL PATIENT SEARCH LOGIC ===\n');

    const doctor = await User.findOne({ role: 'doctor' });
    if (!doctor) {
      console.error('Doctor user not found.');
      process.exit(1);
    }

    // 1. Create test patient with distinct first name, last name, phone, OP number
    const testFirstName = 'UniqueSearchFirst';
    const testLastName = 'UniqueSearchLast';
    const testPhone = '9988776655';
    const testOpNumber = '2026-TEST-999';

    // Delete existing test patient if any
    await Patient.deleteMany({ opNumber: testOpNumber });

    const testPatient = new Patient({
      firstName: testFirstName,
      lastName: testLastName,
      phone: testPhone,
      opNumber: testOpNumber,
      age: 30,
      sex: 'Male',
    });
    await testPatient.save();

    // Create linked appointment, consultation, follow-up, and invoice
    const testAppt = new Appointment({
      patient: testPatient._id,
      doctor: doctor._id,
      date: new Date(),
      time: '11:00 AM',
      reason: 'Search Test Appt',
      status: 'Scheduled',
    });
    await testAppt.save();

    const testConsultation = new Consultation({
      patient: testPatient._id,
      doctor: doctor._id,
      queueEntry: new mongoose.Types.ObjectId(),
      appointment: testAppt._id,
      status: 'In Progress',
      chiefComplaint: 'Search test consultation',
    });
    await testConsultation.save();

    const testFollowUp = new FollowUp({
      patient: testPatient._id,
      recommendedDate: new Date(),
      reason: 'Search test follow-up',
      status: 'Scheduled',
    });
    await testFollowUp.save();

    const testInvoice = new Invoice({
      patient: testPatient._id,
      doctor: doctor._id,
      items: [{ description: 'Scaling', amount: 500, quantity: 1, total: 500 }],
      subtotal: 500,
      grandTotal: 500,
      opNumber: testOpNumber,
      paymentStatus: 'Pending',
    });
    await testInvoice.save();

    // 2. Test Patient Search Filter Generator for 5 scenarios
    console.log('Testing buildPatientSearchFilter generator:');

    // Scenario A: Partial First Name ("UniqueSearchFirst")
    const filterA = buildPatientSearchFilter('UniqueSearchF');
    const resA = await Patient.find({ ...filterA, isDeleted: { $ne: true } });
    console.log(`  A. Search by First Name ("UniqueSearchF"): Found ${resA.length} patient(s)`);

    // Scenario B: Partial Last Name ("UniqueSearchLast")
    const filterB = buildPatientSearchFilter('SearchLast');
    const resB = await Patient.find({ ...filterB, isDeleted: { $ne: true } });
    console.log(`  B. Search by Last Name ("SearchLast"): Found ${resB.length} patient(s)`);

    // Scenario C: Full Name ("UniqueSearchFirst UniqueSearchLast")
    const filterC = buildPatientSearchFilter('UniqueSearchFirst UniqueSearchLast');
    const resC = await Patient.find({ ...filterC, isDeleted: { $ne: true } });
    console.log(`  C. Search by Full Name ("UniqueSearchFirst UniqueSearchLast"): Found ${resC.length} patient(s)`);

    // Scenario D: Partial OP Number ("TEST-999")
    const filterD = buildPatientSearchFilter('TEST-999');
    const resD = await Patient.find({ ...filterD, isDeleted: { $ne: true } });
    console.log(`  D. Search by OP Number ("TEST-999"): Found ${resD.length} patient(s)`);

    // Scenario E: Partial Phone Number ("998877")
    const filterE = buildPatientSearchFilter('998877');
    const resE = await Patient.find({ ...filterE, isDeleted: { $ne: true } });
    console.log(`  E. Search by Phone Number ("998877"): Found ${resE.length} patient(s)`);

    const generatorOk = resA.length >= 1 && resB.length >= 1 && resC.length >= 1 && resD.length >= 1 && resE.length >= 1;
    console.log(`\nPatient Search Generator Test: ${generatorOk ? 'PASSED ✓' : 'FAILED ✗'}`);

    // 3. Clean up test records
    await Patient.deleteOne({ _id: testPatient._id });
    await Appointment.deleteOne({ _id: testAppt._id });
    await Consultation.deleteOne({ _id: testConsultation._id });
    await FollowUp.deleteOne({ _id: testFollowUp._id });
    await Invoice.deleteOne({ _id: testInvoice._id });

    if (generatorOk) {
      console.log('\n SUCCESS: UNIVERSAL PATIENT SEARCH LOGIC VERIFIED PERFECTLY!');
      process.exit(0);
    } else {
      console.error('\n FAILURE: SOME PATIENT SEARCH TESTS FAILED!');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error during search verification:', err);
    process.exit(1);
  }
}

runSearchVerification();
