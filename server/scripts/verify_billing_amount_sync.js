const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Patient = require('../models/Patient');
const User = require('../models/User');
const QueueEntry = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const TreatmentRecord = require('../models/TreatmentRecord');
const TreatmentPlan = require('../models/TreatmentPlan');
const FollowUp = require('../models/FollowUp');
const Invoice = require('../models/Invoice');
require('../models/Diagnosis');

const { closeConsultation } = require('../controllers/consultationController');
const { createInvoice, updateInvoice, recordPayment, listInvoices, getInvoiceById } = require('../controllers/invoiceController');
const { getPatientEMR } = require('../controllers/patientController');

async function runBillingAmountSyncVerification() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sai-dental-new';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB successfully.\n');

    console.log('================================================================');
    console.log('STARTING BILLING AMOUNT SYNC & DATA FLOW VERIFICATION SUITE');
    console.log('================================================================\n');

    let doctor = await User.findOne({ role: 'doctor' });
    if (!doctor) {
      doctor = await User.create({
        name: 'Dr. Test Billing Sync',
        email: `dr.testsync.${Date.now()}@clinic.com`,
        password: 'Password123!',
        role: 'doctor',
      });
    }

    const patient = await Patient.create({
      firstName: 'Billing',
      lastName: 'SyncTest',
      opNumber: `OP-SYNC-${Date.now().toString().slice(-4)}`,
      phone: '9888877777',
      age: 29,
      sex: 'Female',
    });

    console.log(`Created Test Patient: ${patient.firstName} ${patient.lastName} (OP: ${patient.opNumber})`);

    // -------------------------------------------------------------
    // TEST 1: Doctor enters custom billing in Consultation and saves invoice
    // Scenario: Custom Procedure ₹3,750 with ₹250 Discount, ₹50 Tax, ₹1,000 partial payment
    // Expected: Subtotal: ₹3,750, Total: ₹3,550, Paid: ₹1,000, Balance: ₹2,550, Status: Partially Paid
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Doctor Enters Custom Billing in Consultation ---');
    const consultation1 = await Consultation.create({
      patient: patient._id,
      doctor: doctor._id,
      status: 'In Progress',
      startedAt: new Date(),
    });

    const reqCreateInv = {
      user: doctor,
      body: {
        consultation: consultation1._id,
        patient: patient._id,
        doctor: doctor._id,
        opNumber: patient.opNumber,
        items: [
          { service: 'Ceramic Crown Placement', treatment: 'Tooth #14', quantity: 1, unitPrice: 3750 },
        ],
        discount: 250,
        tax: 50,
        amountPaid: 1000,
        paymentMethod: 'UPI',
      },
    };

    let createdInvRes = null;
    await createInvoice(
      reqCreateInv,
      {
        status: () => ({ json: (d) => { createdInvRes = d; } }),
        json: (d) => { createdInvRes = d; },
      },
      (e) => { throw e; }
    );

    const savedInvoice1 = createdInvRes.invoice;
    console.log(`✓ Invoice created: ID ${savedInvoice1._id}`);
    console.log(`  - Subtotal: ₹3,750 (item unitPrice: ₹${savedInvoice1.items[0].unitPrice})`);
    console.log(`  - Discount: ₹${savedInvoice1.discount}`);
    console.log(`  - Tax: ₹${savedInvoice1.tax}`);
    console.log(`  - Total: ₹${savedInvoice1.total} (Expected: 3550)`);
    console.log(`  - Amount Paid: ₹${savedInvoice1.amountPaid} (Expected: 1000)`);
    console.log(`  - Balance: ₹${savedInvoice1.balance} (Expected: 2550)`);
    console.log(`  - Payment Status: ${savedInvoice1.paymentStatus} (Expected: Partially Paid)`);

    if (savedInvoice1.total !== 3550 || savedInvoice1.amountPaid !== 1000 || savedInvoice1.balance !== 2550) {
      throw new Error(`FAIL: Initial saved invoice amounts mismatch: total=${savedInvoice1.total}, paid=${savedInvoice1.amountPaid}, bal=${savedInvoice1.balance}`);
    }

    // -------------------------------------------------------------
    // TEST 2: Close Consultation and ensure amounts are NOT overwritten
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Close Consultation (Verify No Overwrite / Fallback) ---');
    let closeRes = null;
    await closeConsultation(
      {
        params: { id: consultation1._id },
        user: doctor,
        body: { closeNotes: 'Treatment completed successfully.' },
      },
      {
        status: () => ({ json: (d) => { closeRes = d; } }),
        json: (d) => { closeRes = d; },
      },
      (e) => { throw e; }
    );

    const reloadedInvoice1 = await Invoice.findById(savedInvoice1._id);
    console.log(`✓ Post-Close Invoice Check:`);
    console.log(`  - Item Name: "${reloadedInvoice1.items[0].service}" (Preserved)`);
    console.log(`  - Total: ₹${reloadedInvoice1.total} (Expected: 3550)`);
    console.log(`  - Amount Paid: ₹${reloadedInvoice1.amountPaid} (Expected: 1000)`);
    console.log(`  - Balance: ₹${reloadedInvoice1.balance} (Expected: 2550)`);
    console.log(`  - Status: ${reloadedInvoice1.paymentStatus}`);

    if (reloadedInvoice1.total !== 3550 || reloadedInvoice1.amountPaid !== 1000 || reloadedInvoice1.balance !== 2550) {
      throw new Error(`FAIL: Consultation close overwrote invoice amounts! total=${reloadedInvoice1.total}`);
    }
    if (reloadedInvoice1.items[0].service !== 'Ceramic Crown Placement') {
      throw new Error(`FAIL: Invoice item description was altered on close!`);
    }

    // -------------------------------------------------------------
    // TEST 3: Receptionist & Doctor Billing APIs return exact same values
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Billing API Single Source of Truth Check ---');
    let listRes = null;
    await listInvoices(
      { query: { consultation: consultation1._id.toString() } },
      { json: (d) => { listRes = d; } },
      (e) => { throw e; }
    );

    const apiInvoice = listRes.invoices[0];
    console.log(`✓ GET /api/invoices?consultation=${consultation1._id}:`);
    console.log(`  - Total: ₹${apiInvoice.total}`);
    console.log(`  - Paid: ₹${apiInvoice.amountPaid}`);
    console.log(`  - Balance: ₹${apiInvoice.balance}`);

    if (apiInvoice.total !== 3550 || apiInvoice.balance !== 2550) {
      throw new Error(`FAIL: List API returned mismatched invoice data`);
    }

    let singleInvRes = null;
    await getInvoiceById(
      { params: { id: savedInvoice1._id } },
      { json: (d) => { singleInvRes = d; } },
      (e) => { throw e; }
    );

    console.log(`✓ GET /api/invoices/:id:`);
    console.log(`  - Total: ₹${singleInvRes.invoice.total}`);
    console.log(`  - Paid: ₹${singleInvRes.invoice.amountPaid}`);
    console.log(`  - Balance: ₹${singleInvRes.invoice.balance}`);

    if (singleInvRes.invoice.total !== 3550 || singleInvRes.invoice.balance !== 2550) {
      throw new Error(`FAIL: Get by ID API returned mismatched invoice data`);
    }

    // -------------------------------------------------------------
    // TEST 4: Patient EMR Billing Summary consistency check
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Patient EMR Financial Summary Check ---');
    let emrRes = null;
    await getPatientEMR(
      { params: { id: patient._id } },
      { json: (d) => { emrRes = d; } },
      (e) => { throw e; }
    );

    const emrBilling = emrRes.billing;
    console.log(`✓ Patient EMR Billing:`);
    console.log(`  - Total Charges: ₹${emrBilling.totalCharges} (Expected: 3550)`);
    console.log(`  - Total Paid: ₹${emrBilling.totalPaid} (Expected: 1000)`);
    console.log(`  - Total Balance: ₹${emrBilling.totalBalance} (Expected: 2550)`);

    if (emrBilling.totalCharges !== 3550 || emrBilling.totalPaid !== 1000 || emrBilling.totalBalance !== 2550) {
      throw new Error(`FAIL: EMR Billing summary does not match invoice figures!`);
    }

    // -------------------------------------------------------------
    // TEST 5: Payment Collection on Remaining Balance
    // Pay ₹2,550 via Card -> Balance should be 0, Status: Paid
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Recording Settlement Payment ---');
    let payRes = null;
    await recordPayment(
      {
        params: { id: savedInvoice1._id },
        user: doctor,
        body: { amount: 2550, method: 'Card' },
      },
      { json: (d) => { payRes = d; } },
      (e) => { throw e; }
    );

    const paidInvoice = payRes.invoice;
    console.log(`✓ Settlement Payment Recorded:`);
    console.log(`  - Amount Paid: ₹${paidInvoice.amountPaid} (Expected: 3550)`);
    console.log(`  - Balance: ₹${paidInvoice.balance} (Expected: 0)`);
    console.log(`  - Status: ${paidInvoice.paymentStatus} (Expected: Paid)`);

    if (paidInvoice.balance !== 0 || paidInvoice.amountPaid !== 3550 || paidInvoice.paymentStatus !== 'Paid') {
      throw new Error(`FAIL: Payment settlement calculations mismatch: bal=${paidInvoice.balance}, paid=${paidInvoice.amountPaid}`);
    }

    // -------------------------------------------------------------
    // TEST 6: Consultation without manual billing, but with TreatmentRecord
    // Verify it automatically generates exact pending bill matching TreatmentRecord charges (no fallback 500)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Auto Pending Bill from TreatmentRecord on Close ---');
    const consultation2 = await Consultation.create({
      patient: patient._id,
      doctor: doctor._id,
      status: 'In Progress',
      startedAt: new Date(),
    });

    await TreatmentRecord.create({
      consultation: consultation2._id,
      patient: patient._id,
      doctor: doctor._id,
      procedure: 'Composite Restoration',
      tooth: 21,
      charges: 2400,
    });

    await closeConsultation(
      {
        params: { id: consultation2._id },
        user: doctor,
        body: { closeNotes: 'Restoration done.' },
      },
      {
        status: () => ({ json: () => {} }),
        json: () => {},
      },
      (e) => { throw e; }
    );

    const invoice2 = await Invoice.findOne({ consultation: consultation2._id });
    console.log(`✓ Auto-Generated Invoice from TreatmentRecord:`);
    console.log(`  - Service: "${invoice2.items[0].service}"`);
    console.log(`  - Charges: ₹${invoice2.items[0].unitPrice} (Expected: 2400)`);
    console.log(`  - Total: ₹${invoice2.total} (Expected: 2400)`);
    console.log(`  - Balance: ₹${invoice2.balance} (Expected: 2400)`);

    if (invoice2.total !== 2400 || invoice2.items[0].unitPrice !== 2400) {
      throw new Error(`FAIL: Auto-generated invoice did not match treatment record charges (2400)!`);
    }

    // -------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------
    console.log('\n--- CLEANING UP TEST DATA ---');
    await Invoice.deleteMany({ patient: patient._id });
    await TreatmentRecord.deleteMany({ patient: patient._id });
    await Consultation.deleteMany({ patient: patient._id });
    await Patient.findByIdAndDelete(patient._id);
    console.log('✓ Test data cleaned up successfully.');

    console.log('\n================================================================');
    console.log('ALL BILLING AMOUNT DATA FLOW VERIFICATIONS PASSED SUCCESSFULLY ✓');
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runBillingAmountSyncVerification();
