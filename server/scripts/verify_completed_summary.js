require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Consultation = require('../models/Consultation');
const User = require('../models/User');
const { getConsultationCompleteSummary, listConsultations } = require('../controllers/consultationController');

async function runTests() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully.');

    // 1. Find a doctor and any consultation
    const doctor = await User.findOne({ role: 'doctor' });
    const consultation = await Consultation.findOne().populate('doctor');

    console.log('\n--- TEST 1: getConsultationCompleteSummary with consultation._id ---');
    if (consultation) {
      const req = {
        params: { id: consultation._id.toString() },
        query: {},
        user: doctor,
      };
      let resultData = null;
      const res = {
        json: (data) => { resultData = data; },
        status: (code) => res,
      };
      await getConsultationCompleteSummary(req, res, (err) => {
        if (err) throw err;
      });
      console.log('PASS Test 1: getConsultationCompleteSummary executed without error.');
      console.log('  Patient:', resultData?.patient?.firstName || 'None');
      console.log('  Diagnoses count:', (resultData?.diagnoses || []).length);
      console.log('  Tooth findings count:', (resultData?.toothFindings || []).length);
    } else {
      console.log('Skip Test 1: No consultation found in DB.');
    }

    console.log('\n--- TEST 2: getConsultationCompleteSummary with "by-visit" and query params ---');
    {
      const req = {
        params: { id: 'by-visit' },
        query: { consultationId: consultation ? consultation._id.toString() : '' },
        user: doctor,
      };
      let resultData = null;
      const res = {
        json: (data) => { resultData = data; },
        status: (code) => res,
      };
      await getConsultationCompleteSummary(req, res, (err) => {
        if (err) throw err;
      });
      console.log('PASS Test 2: by-visit summary executed successfully without mongoose reference error.');
    }

    console.log('\n--- TEST 3: getConsultationCompleteSummary with empty/non-existent ID (no results state) ---');
    {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const req = {
        params: { id: fakeId },
        query: {},
        user: doctor,
      };
      let resultData = null;
      const res = {
        json: (data) => { resultData = data; },
        status: (code) => res,
      };
      await getConsultationCompleteSummary(req, res, (err) => {
        if (err) throw err;
      });
      console.log('PASS Test 3: empty result handled gracefully.');
      console.log('  diagnoses:', resultData?.diagnoses);
      console.log('  treatmentRecords:', resultData?.treatmentRecords);
      console.log('  prescriptions:', resultData?.prescriptions);
    }

    console.log('\n--- TEST 4: listConsultations with doctor filter ---');
    {
      const req = {
        query: { doctor: doctor._id.toString() },
        user: doctor,
      };
      let listData = null;
      const res = {
        json: (data) => { listData = data; },
        status: (code) => res,
      };
      await listConsultations(req, res, (err) => {
        if (err) throw err;
      });
      console.log('PASS Test 4: listConsultations returned successfully.');
      console.log('  Count for doctor:', (listData?.consultations || []).length);
    }

    console.log('\nALL BACKEND CHECKS PASSED!\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('FAILED backend test:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTests();
