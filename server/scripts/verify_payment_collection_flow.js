require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const Patient = require('../models/Patient');
const User = require('../models/User');
const Consultation = require('../models/Consultation');
const Invoice = require('../models/Invoice');
const { recordPayment } = require('../controllers/invoiceController');

async function verifyPaymentCollectionFlow() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dental-clinic';
    await mongoose.connect(uri);
    console.log('=== STARTING PAYMENT COLLECTION & BILL SETTLEMENT VERIFICATION ===\n');

    let staff = await User.findOne({ role: 'receptionist' });
    if (!staff) {
      staff = await User.create({
        name: 'Reception Staff',
        email: `reception.${Date.now()}@clinic.com`,
        password: 'Password123!',
        role: 'receptionist',
      });
    }

    let doctor = await User.findOne({ role: 'doctor' });
    if (!doctor) {
      doctor = await User.create({
        name: 'Dr. Payment Tester',
        email: `dr.pay.${Date.now()}@clinic.com`,
        password: 'Password123!',
        role: 'doctor',
      });
    }

    const patient = await Patient.create({
      firstName: 'PayFlow',
      lastName: 'User',
      opNumber: `OP-PAY-${Date.now().toString().slice(-4)}`,
      phone: '9444433333',
      age: 29,
      sex: 'Male',
    });

    const consultation = await Consultation.create({
      patient: patient._id,
      doctor: doctor._id,
      status: 'Completed',
    });

    // Create itemized invoice of ₹8,000
    const invoice = new Invoice({
      patient: patient._id,
      doctor: doctor._id,
      consultation: consultation._id,
      opNumber: patient.opNumber,
      items: [
        { service: 'Root Canal Access & Prep (Tooth #16)', treatment: 'Root Canal Therapy', quantity: 1, unitPrice: 5000 },
        { service: 'Post-Op Scaling & Polish', treatment: 'Scaling', quantity: 1, unitPrice: 3000 },
      ],
      paymentStatus: 'Pending',
    });
    await invoice.save();

    console.log(`Created initial pending bill (ID: ${invoice._id}, total: ₹${invoice.total}, balance: ₹${invoice.balance})`);

    // -------------------------------------------------------------
    // TEST 1: Partial Payment of ₹3,000 via UPI
    // -------------------------------------------------------------
    console.log('\n1. Recording partial payment of ₹3,000 via UPI...');
    let resPartial = null;
    const reqPartial = {
      params: { id: invoice._id },
      user: { _id: staff._id, role: 'receptionist' },
      body: { amount: 3000, method: 'UPI' },
    };

    await recordPayment(reqPartial, { json: (d) => { resPartial = d; } }, (e) => { throw e; });

    console.log(`   Response Message: "${resPartial.message}"`);
    console.log(`   Updated Payment Status: ${resPartial.invoice.paymentStatus} (Expected: Partially Paid)`);
    console.log(`   Amount Paid: ₹${resPartial.invoice.amountPaid}`);
    console.log(`   Remaining Balance: ₹${resPartial.invoice.balance}`);
    const lastPayment = resPartial.invoice.payments[resPartial.invoice.payments.length - 1];
    console.log(`   Payment Method: ${lastPayment.method}`);
    console.log(`   Recorded By Staff: ${lastPayment.recordedBy?.name || lastPayment.recordedBy}`);
    console.log(`   Payment Timestamp: ${lastPayment.date}`);

    if (resPartial.invoice.paymentStatus !== 'Partially Paid') {
      throw new Error(`FAIL: Expected paymentStatus 'Partially Paid', got '${resPartial.invoice.paymentStatus}'`);
    }
    if (resPartial.invoice.balance !== 5000) {
      throw new Error(`FAIL: Expected balance 5000, got ${resPartial.invoice.balance}`);
    }
    if (!lastPayment.recordedBy) {
      throw new Error('FAIL: Staff member was not recorded on payment!');
    }
    console.log('   Partial Payment & Staff Timestamping: PASSED ✓');

    // -------------------------------------------------------------
    // TEST 2: Remaining Payment of ₹5,000 via Cash with ₹500 Discount
    // -------------------------------------------------------------
    console.log('\n2. Recording remaining payment of ₹4,500 via Cash with ₹500 Discount...');
    let resFinal = null;
    const reqFinal = {
      params: { id: invoice._id },
      user: { _id: staff._id, role: 'receptionist' },
      body: { amount: 4500, method: 'Cash', discount: 500 },
    };

    await recordPayment(reqFinal, { json: (d) => { resFinal = d; } }, (e) => { throw e; });

    console.log(`   Response Message: "${resFinal.message}"`);
    console.log(`   Updated Payment Status: ${resFinal.invoice.paymentStatus} (Expected: Paid)`);
    console.log(`   Discount: ₹${resFinal.invoice.discount}`);
    console.log(`   Net Total: ₹${resFinal.invoice.total}`);
    console.log(`   Total Amount Paid: ₹${resFinal.invoice.amountPaid}`);
    console.log(`   Final Balance: ₹${resFinal.invoice.balance}`);

    if (resFinal.invoice.paymentStatus !== 'Paid') {
      throw new Error(`FAIL: Expected paymentStatus 'Paid', got '${resFinal.invoice.paymentStatus}'`);
    }
    if (resFinal.invoice.balance !== 0) {
      throw new Error(`FAIL: Expected balance 0, got ${resFinal.invoice.balance}`);
    }
    console.log('   Full Settlement & Discount Processing: PASSED ✓');

    // Clean up test records
    console.log('\n3. Cleaning up test records...');
    await Invoice.deleteOne({ _id: invoice._id });
    await Consultation.deleteOne({ _id: consultation._id });
    await Patient.deleteOne({ _id: patient._id });
    console.log('   Cleanup done.');

    console.log('\n=== ALL PAYMENT COLLECTION TESTS PASSED PERFECTLY ===\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyPaymentCollectionFlow();
