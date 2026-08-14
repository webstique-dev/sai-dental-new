require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const Patient = require('../models/Patient');
const User = require('../models/User');
const Consultation = require('../models/Consultation');
const Diagnosis = require('../models/Diagnosis');
const TreatmentPlan = require('../models/TreatmentPlan');
const TreatmentRecord = require('../models/TreatmentRecord');
const Invoice = require('../models/Invoice');

const { createTreatmentPlan } = require('../controllers/treatmentPlanController');
const { createTreatmentRecord } = require('../controllers/treatmentRecordController');
const { closeConsultation } = require('../controllers/consultationController');

async function verifyRedesignedTreatmentFlow() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dental-clinic';
    await mongoose.connect(uri);
    console.log('=== STARTING REDESIGNED DIAGNOSIS & TREATMENT WORKFLOW VERIFICATION ===\n');

    let doctor = await User.findOne({ role: 'doctor' });
    if (!doctor) {
      doctor = await User.create({
        name: 'Dr. Redesign Tester',
        email: `dr.redesign.${Date.now()}@clinic.com`,
        password: 'Password123!',
        role: 'doctor',
      });
    }

    const patient = await Patient.create({
      firstName: 'RedesignFlow',
      lastName: 'Patient',
      opNumber: `OP-REDESIGN-${Date.now().toString().slice(-4)}`,
      phone: '9222211111',
      age: 28,
      sex: 'Female',
    });

    const consultation = await Consultation.create({
      patient: patient._id,
      doctor: doctor._id,
      status: 'In Progress',
    });

    console.log(`Created consultation: ${consultation._id} for patient: ${patient.firstName}`);

    // 1. Create Diagnosis
    console.log('\n1. Creating Diagnosis...');
    const diagnosis = await Diagnosis.create({
      consultation: consultation._id,
      patient: patient._id,
      diagnosis: 'Irreversible Pulpitis',
      severity: 'Severe',
      clinicalFindings: 'Deep occlusal decay on Tooth #16 with thermal sensitivity',
      relatedTeeth: [16],
    });
    console.log(`   Saved Diagnosis: "${diagnosis.diagnosis}" (Tooth #16)`);

    // 2. Create Treatment Plan linked to Diagnosis with Estimated Duration & Cost
    console.log('\n2. Creating Treatment Plan linked to Diagnosis...');
    let planRes = null;
    const reqPlan = {
      user: { _id: doctor._id, role: 'doctor' },
      body: {
        consultation: consultation._id,
        patient: patient._id,
        diagnosis: diagnosis._id,
        tooth: 16,
        treatment: 'Root Canal Therapy & Crown',
        estimatedCost: 8500,
        estimatedDuration: '2 sittings',
        priority: 'Urgent',
        notes: 'Sitting 1: Pulpectomy & shaping. Sitting 2: Obturation & Crown fit.',
      },
    };

    await createTreatmentPlan(reqPlan, { status: () => ({ json: (d) => { planRes = d; } }) }, (e) => { throw e; });

    console.log(`   Created Plan: "${planRes.treatmentPlan.treatment}"`);
    console.log(`   - Linked Diagnosis ID: ${planRes.treatmentPlan.diagnosis?._id || planRes.treatmentPlan.diagnosis}`);
    console.log(`   - Estimated Duration: ${planRes.treatmentPlan.estimatedDuration} (Expected: 2 sittings)`);
    console.log(`   - Estimated Cost: ₹${planRes.treatmentPlan.estimatedCost}`);

    if (planRes.treatmentPlan.estimatedDuration !== '2 sittings') {
      throw new Error(`FAIL: Expected estimatedDuration '2 sittings', got '${planRes.treatmentPlan.estimatedDuration}'`);
    }
    console.log('   Treatment Plan Linked Diagnosis & Est. Duration: PASSED ✓');

    // 3. Create Treatment Record for performed procedure with Actual Duration & Charges
    console.log('\n3. Creating Treatment Record for performed procedure...');
    let recRes = null;
    const reqRec = {
      user: { _id: doctor._id, role: 'doctor' },
      body: {
        consultation: consultation._id,
        patient: patient._id,
        tooth: 16,
        procedure: 'RCT Access, Pulpectomy & Canal Prep',
        charges: 4500,
        actualDuration: '45 mins',
        notes: 'Canals located, working length established.',
      },
    };

    await createTreatmentRecord(reqRec, { json: (d) => { recRes = d; } }, (e) => { throw e; });

    console.log(`   Logged Performed Record: "${recRes.treatmentRecord.procedure}"`);
    console.log(`   - Actual Duration: ${recRes.treatmentRecord.actualDuration} (Expected: 45 mins)`);
    console.log(`   - Performed Charges: ₹${recRes.treatmentRecord.charges}`);

    if (recRes.treatmentRecord.actualDuration !== '45 mins') {
      throw new Error(`FAIL: Expected actualDuration '45 mins', got '${recRes.treatmentRecord.actualDuration}'`);
    }
    console.log('   Treatment Record Actual Duration: PASSED ✓');

    // 4. Verify Consultation Totals Sync
    console.log('\n4. Verifying Consultation Totals Sync...');
    const reloadedConsultation = await Consultation.findById(consultation._id);
    console.log(`   Consultation Total Estimated Charges: ₹${reloadedConsultation.totalEstimatedCharges} (Expected: 8500)`);
    console.log(`   Consultation Total Performed Charges: ₹${reloadedConsultation.totalPerformedCharges} (Expected: 4500)`);

    if (reloadedConsultation.totalEstimatedCharges !== 8500 || reloadedConsultation.totalPerformedCharges !== 4500) {
      throw new Error('FAIL: Consultation totals did not sync properly!');
    }
    console.log('   Consultation Charges Sync: PASSED ✓');

    // 5. Close Consultation & Verify Billing Handoff
    console.log('\n5. Closing Consultation & Verifying Billing Handoff Pending Bill...');
    let closeRes = null;
    await closeConsultation(
      { params: { id: consultation._id }, user: { _id: doctor._id, role: 'doctor' }, body: { closeNotes: 'Visit completed.' } },
      { json: (d) => { closeRes = d; } },
      (e) => { throw e; }
    );

    const generatedInvoice = await Invoice.findOne({ consultation: consultation._id });
    console.log(`   Pending Invoice generated (Total: ₹${generatedInvoice.total})`);
    console.log(`   Itemized Line Item: "${generatedInvoice.items[0].service}" — ₹${generatedInvoice.items[0].unitPrice}`);

    if (!generatedInvoice || generatedInvoice.total !== 4500) {
      throw new Error('FAIL: Billing handoff pending bill not generated with performed charges!');
    }
    console.log('   Close Consultation Billing Handoff: PASSED ✓');

    // Clean up test documents
    console.log('\n6. Cleaning up test records...');
    await TreatmentRecord.deleteMany({ consultation: consultation._id });
    await TreatmentPlan.deleteMany({ consultation: consultation._id });
    await Diagnosis.deleteMany({ consultation: consultation._id });
    await Invoice.deleteMany({ consultation: consultation._id });
    await Consultation.deleteOne({ _id: consultation._id });
    await Patient.deleteOne({ _id: patient._id });
    console.log('   Cleanup done.');

    console.log('\n=== ALL REDESIGNED TREATMENT WORKFLOW TESTS PASSED PERFECTLY ===\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyRedesignedTreatmentFlow();
