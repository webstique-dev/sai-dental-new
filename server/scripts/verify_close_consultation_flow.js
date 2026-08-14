require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const Patient = require('../models/Patient');
const User = require('../models/User');
const QueueEntry = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const TreatmentRecord = require('../models/TreatmentRecord');
const FollowUp = require('../models/FollowUp');
const Invoice = require('../models/Invoice');
require('../models/Diagnosis');

const { closeConsultation } = require('../controllers/consultationController');
const { createTreatmentRecord } = require('../controllers/treatmentRecordController');

async function runCloseConsultationFlowTest() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dental-clinic';
    await mongoose.connect(uri);
    console.log('=== STARTING CLOSE CONSULTATION END-TO-END FLOW VERIFICATION ===\n');

    let doctor = await User.findOne({ role: 'doctor' });
    if (!doctor) {
      doctor = await User.create({
        name: 'Dr. Close Workflow',
        email: `dr.close.${Date.now()}@clinic.com`,
        password: 'Password123!',
        role: 'doctor',
      });
    }

    const patient = await Patient.create({
      firstName: 'CloseFlow',
      lastName: 'Patient',
      opNumber: `OP-CLOSE-${Date.now().toString().slice(-4)}`,
      phone: '9666655555',
      age: 35,
      sex: 'Male',
    });

    const queueEntry = await QueueEntry.create({
      patient: patient._id,
      doctor: doctor._id,
      status: 'In Consultation',
      type: 'Walk-in',
      date: new Date(),
      queue_date: new Date(),
    });

    const consultation = await Consultation.create({
      patient: patient._id,
      doctor: doctor._id,
      queueEntry: queueEntry._id,
      status: 'In Progress',
    });

    console.log(`Created consultation: ${consultation._id} for patient: ${patient.firstName}`);

    // 1. Add 2 performed treatment records
    console.log('\n1. Logging 2 performed treatment records...');
    const reqRec1 = {
      user: { _id: doctor._id, role: 'doctor' },
      body: {
        consultation: consultation._id,
        patient: patient._id,
        tooth: 14,
        procedure: 'Composite Filling',
        charges: 2500,
      },
    };
    await createTreatmentRecord(reqRec1, { json: () => {} }, (e) => { throw e; });

    const reqRec2 = {
      user: { _id: doctor._id, role: 'doctor' },
      body: {
        consultation: consultation._id,
        patient: patient._id,
        tooth: 26,
        procedure: 'Root Canal Access',
        charges: 4000,
      },
    };
    await createTreatmentRecord(reqRec2, { json: () => {} }, (e) => { throw e; });

    // 2. Close Consultation with Follow-Up Date set
    console.log('\n2. Closing Consultation with Follow-Up set to +7 days...');
    const futureDateStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    let closeRes = null;

    const reqClose = {
      params: { id: consultation._id },
      user: { _id: doctor._id, role: 'doctor' },
      body: {
        closeNotes: 'Patient advised warm saline rinses and soft diet.',
        followUp: {
          recommendedDate: futureDateStr,
          time: '11:30 AM',
          reason: 'Crown Impression & Final Fit',
        },
      },
    };

    const resCloseMock = {
      json: (data) => { closeRes = data; },
    };

    await closeConsultation(reqClose, resCloseMock, (err) => { throw err; });

    console.log(`   Response Message: "${closeRes.message}"`);

    // -------------------------------------------------------------
    // VERIFY (a): Lock/finalize clinical records
    // -------------------------------------------------------------
    console.log('\n3. Verifying (a) Consultation record locked & finalized...');
    const reloadedConsultation = await Consultation.findById(consultation._id);
    console.log(`   Consultation Status: ${reloadedConsultation.status} (Expected: Completed)`);
    console.log(`   Closed At: ${reloadedConsultation.closedAt}`);
    if (reloadedConsultation.status !== 'Completed') {
      throw new Error(`FAIL: Expected consultation status 'Completed', got '${reloadedConsultation.status}'`);
    }

    // Test immutability guard
    let immutabilityBlocked = false;
    try {
      await createTreatmentRecord(reqRec1, { json: () => {} }, (e) => { throw e; });
    } catch (err) {
      immutabilityBlocked = err.status === 403;
    }
    console.log(`   Immutability guard blocked modifications post-close: ${immutabilityBlocked}`);
    if (!immutabilityBlocked) {
      throw new Error('FAIL: Modifications were not blocked on closed consultation!');
    }
    console.log('   (a) Lock & Finalize Read-Only Records: PASSED ✓');

    // -------------------------------------------------------------
    // VERIFY (b): Generate Pending Bill record itemized by procedure/tooth
    // -------------------------------------------------------------
    console.log('\n4. Verifying (b) Itemized Pending Bill generated...');
    const invoice = await Invoice.findOne({ consultation: consultation._id });
    if (!invoice) {
      throw new Error('FAIL: Pending invoice was not generated on close!');
    }

    console.log(`   Invoice Payment Status: ${invoice.paymentStatus} (Expected: Pending)`);
    console.log(`   Invoice Total Amount: ₹${invoice.total} (Expected: ₹6500)`);
    console.log(`   Invoice Item Count: ${invoice.items.length}`);
    invoice.items.forEach((item, idx) => {
      console.log(`   - Item ${idx + 1}: ${item.service} — ₹${item.unitPrice}`);
    });

    if (invoice.paymentStatus !== 'Pending') {
      throw new Error(`FAIL: Expected invoice paymentStatus 'Pending', got '${invoice.paymentStatus}'`);
    }
    if (invoice.total !== 6500) {
      throw new Error(`FAIL: Expected invoice total to be 6500, got ${invoice.total}`);
    }
    console.log('   (b) Pending Bill Generation: PASSED ✓');

    // -------------------------------------------------------------
    // VERIFY (c): Follow-Up & Linked Appointment creation
    // -------------------------------------------------------------
    console.log('\n5. Verifying (c) Follow-Up & Linked Appointment creation...');
    const followUpDoc = await FollowUp.findOne({ consultation: consultation._id });
    if (!followUpDoc) {
      throw new Error('FAIL: Follow-up record was not created!');
    }

    console.log(`   Follow-Up Status: ${followUpDoc.status} (Expected: Scheduled)`);
    const linkedAppt = await Appointment.findById(followUpDoc.scheduledAppointment);
    if (!linkedAppt) {
      throw new Error('FAIL: Linked appointment for follow-up was not created!');
    }

    console.log(`   Linked Appointment Date: ${linkedAppt.date.toISOString().split('T')[0]}`);
    console.log(`   Linked Appointment Time: ${linkedAppt.time}`);
    console.log(`   Linked Appointment Status: ${linkedAppt.status} (Expected: Scheduled)`);

    if (linkedAppt.status !== 'Scheduled') {
      throw new Error(`FAIL: Expected linked appointment status 'Scheduled', got '${linkedAppt.status}'`);
    }
    console.log('   (c) Follow-Up & Linked Appointment Creation: PASSED ✓');

    // -------------------------------------------------------------
    // VERIFY (d): Queue/Appointment status updated to Completed
    // -------------------------------------------------------------
    console.log('\n6. Verifying (d) Queue Entry status updated to Completed...');
    const reloadedQueue = await QueueEntry.findById(queueEntry._id);
    console.log(`   Queue Entry Status: ${reloadedQueue.status} (Expected: Completed)`);
    if (reloadedQueue.status !== 'Completed') {
      throw new Error(`FAIL: Expected queue status 'Completed', got '${reloadedQueue.status}'`);
    }
    console.log('   (d) Patient Queue Status Updated to Completed: PASSED ✓');

    // Clean up test documents
    console.log('\n7. Cleaning up test documents...');
    await TreatmentRecord.deleteMany({ consultation: consultation._id });
    await Invoice.deleteMany({ consultation: consultation._id });
    await FollowUp.deleteMany({ consultation: consultation._id });
    await Appointment.deleteMany({ patient: patient._id });
    await QueueEntry.deleteOne({ _id: queueEntry._id });
    await Consultation.deleteOne({ _id: consultation._id });
    await Patient.deleteOne({ _id: patient._id });
    console.log('   Cleanup done.');

    console.log('\n=== ALL CLOSE CONSULTATION FLOW TESTS PASSED PERFECTLY ===\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runCloseConsultationFlowTest();
