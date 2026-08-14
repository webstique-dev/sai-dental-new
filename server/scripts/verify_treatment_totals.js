require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const Patient = require('../models/Patient');
const User = require('../models/User');
const Diagnosis = require('../models/Diagnosis');
const Consultation = require('../models/Consultation');
const TreatmentPlan = require('../models/TreatmentPlan');
const TreatmentRecord = require('../models/TreatmentRecord');
const { createTreatmentPlan, updateTreatmentPlan, deleteTreatmentPlan } = require('../controllers/treatmentPlanController');
const { createTreatmentRecord, deleteTreatmentRecord } = require('../controllers/treatmentRecordController');

async function verifyTreatmentTotals() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dental-clinic';
    await mongoose.connect(uri);
    console.log('=== STARTING TREATMENT TOTALS & PER-VISIT STORAGE VERIFICATION ===\n');

    let doctor = await User.findOne({ role: 'doctor' });
    if (!doctor) {
      doctor = await User.create({
        name: 'Dr. Totals Specialist',
        email: `dr.totals.${Date.now()}@clinic.com`,
        password: 'Password123!',
        role: 'doctor',
      });
    }

    const patient = await Patient.create({
      firstName: 'TotalsTest',
      lastName: 'Patient',
      opNumber: `OP-TOT-${Date.now().toString().slice(-4)}`,
      phone: '9777766666',
      age: 28,
      sex: 'Female',
    });

    const consultation = await Consultation.create({
      patient: patient._id,
      doctor: doctor._id,
      status: 'In Progress',
    });

    console.log(`Created test consultation: ${consultation._id}`);

    // -------------------------------------------------------------
    // TEST 1: Add TreatmentPlan items & verify totalEstimatedCharges
    // -------------------------------------------------------------
    console.log('\n1. Adding 2 Treatment Plan line items (₹5,000 + ₹3,500)...');
    let plan1 = null;
    let plan2 = null;

    const reqPlan1 = {
      user: { _id: doctor._id, role: 'doctor' },
      body: {
        consultation: consultation._id,
        patient: patient._id,
        tooth: 16,
        treatment: 'RCT Step 1',
        estimatedCost: 5000,
        priority: 'Normal',
      },
    };
    await createTreatmentPlan(reqPlan1, { status: () => ({ json: (d) => { plan1 = d.treatmentPlan; } }) }, (e) => { throw e; });

    const reqPlan2 = {
      user: { _id: doctor._id, role: 'doctor' },
      body: {
        consultation: consultation._id,
        patient: patient._id,
        tooth: 16,
        treatment: 'Crown Placement',
        estimatedCost: 3500,
        priority: 'High',
      },
    };
    await createTreatmentPlan(reqPlan2, { status: () => ({ json: (d) => { plan2 = d.treatmentPlan; } }) }, (e) => { throw e; });

    let updatedConsultation = await Consultation.findById(consultation._id);
    console.log(`   Consultation totalEstimatedCharges: ₹${updatedConsultation.totalEstimatedCharges} (Expected: ₹8500)`);
    if (updatedConsultation.totalEstimatedCharges !== 8500) {
      throw new Error(`FAIL: Expected totalEstimatedCharges to be 8500, got ${updatedConsultation.totalEstimatedCharges}`);
    }
    console.log('   Treatment Plan Estimated Sum & Per-Visit Storage: PASSED ✓');

    // -------------------------------------------------------------
    // TEST 2: Add TreatmentRecord items & verify totalPerformedCharges
    // -------------------------------------------------------------
    console.log('\n2. Adding 2 Treatment Record line items (₹4,500 + ₹2,000)...');
    let rec1 = null;
    let rec2 = null;

    const reqRec1 = {
      user: { _id: doctor._id, role: 'doctor' },
      body: {
        consultation: consultation._id,
        patient: patient._id,
        tooth: 16,
        procedure: 'RCT Cleaning & Canal Prep',
        charges: 4500,
      },
    };
    await createTreatmentRecord(reqRec1, { json: (d) => { rec1 = d.treatmentRecord; } }, (e) => { throw e; });

    const reqRec2 = {
      user: { _id: doctor._id, role: 'doctor' },
      body: {
        consultation: consultation._id,
        patient: patient._id,
        tooth: 16,
        procedure: 'Temporary Obturation',
        charges: 2000,
      },
    };
    await createTreatmentRecord(reqRec2, { json: (d) => { rec2 = d.treatmentRecord; } }, (e) => { throw e; });

    updatedConsultation = await Consultation.findById(consultation._id);
    console.log(`   Consultation totalPerformedCharges: ₹${updatedConsultation.totalPerformedCharges} (Expected: ₹6500)`);
    if (updatedConsultation.totalPerformedCharges !== 6500) {
      throw new Error(`FAIL: Expected totalPerformedCharges to be 6500, got ${updatedConsultation.totalPerformedCharges}`);
    }
    console.log('   Treatment Record Performed Sum & Per-Visit Storage: PASSED ✓');

    // -------------------------------------------------------------
    // TEST 3: Update TreatmentPlan cost & verify live recalculation
    // -------------------------------------------------------------
    console.log('\n3. Updating Plan 1 cost from ₹5,000 to ₹6,000...');
    const reqUpdatePlan = {
      params: { id: plan1._id },
      user: { _id: doctor._id, role: 'doctor' },
      body: { estimatedCost: 6000 },
    };
    await updateTreatmentPlan(reqUpdatePlan, { json: () => {} }, (e) => { throw e; });

    updatedConsultation = await Consultation.findById(consultation._id);
    console.log(`   Updated Consultation totalEstimatedCharges: ₹${updatedConsultation.totalEstimatedCharges} (Expected: ₹9500)`);
    if (updatedConsultation.totalEstimatedCharges !== 9500) {
      throw new Error(`FAIL: Expected totalEstimatedCharges to be 9500, got ${updatedConsultation.totalEstimatedCharges}`);
    }
    console.log('   Plan Cost Modification Live Recalculation: PASSED ✓');

    // -------------------------------------------------------------
    // TEST 4: Delete TreatmentRecord item & verify live recalculation
    // -------------------------------------------------------------
    console.log('\n4. Deleting Treatment Record 2 (₹2,000)...');
    const reqDelRec = {
      params: { id: rec2._id },
      user: { _id: doctor._id, role: 'doctor' },
    };
    await deleteTreatmentRecord(reqDelRec, { json: () => {} }, (e) => { throw e; });

    updatedConsultation = await Consultation.findById(consultation._id);
    console.log(`   Updated Consultation totalPerformedCharges: ₹${updatedConsultation.totalPerformedCharges} (Expected: ₹4500)`);
    if (updatedConsultation.totalPerformedCharges !== 4500) {
      throw new Error(`FAIL: Expected totalPerformedCharges to be 4500, got ${updatedConsultation.totalPerformedCharges}`);
    }
    console.log('   Record Deletion Live Recalculation: PASSED ✓');

    // Clean up test documents
    console.log('\n5. Cleaning up test documents...');
    await TreatmentPlan.deleteMany({ consultation: consultation._id });
    await TreatmentRecord.deleteMany({ consultation: consultation._id });
    await Consultation.deleteOne({ _id: consultation._id });
    await Patient.deleteOne({ _id: patient._id });
    console.log('   Cleanup done.');

    console.log('\n=== ALL TREATMENT TOTALS TESTS PASSED PERFECTLY ===\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyTreatmentTotals();
