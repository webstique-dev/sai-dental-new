require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const Patient = require('../models/Patient');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
require('../models/Diagnosis');

const { recordPayment } = require('../controllers/invoiceController');
const { getReceptionSummary } = require('../controllers/reportController');

async function verifyAnalyticsAutoFeed() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dental-clinic';
    await mongoose.connect(uri);
    console.log('=== STARTING AUTOMATIC ANALYTICS FEEDING VERIFICATION ===\n');

    let staff = await User.findOne({ role: 'receptionist' });
    if (!staff) {
      staff = await User.create({
        name: 'AutoFeed Receptionist',
        email: `autofeed.${Date.now()}@clinic.com`,
        password: 'Password123!',
        role: 'receptionist',
      });
    }

    const patient = await Patient.create({
      firstName: 'AnalyticsFeed',
      lastName: 'User',
      opNumber: `OP-FEED-${Date.now().toString().slice(-4)}`,
      phone: '9333322222',
      age: 33,
      sex: 'Female',
    });

    const invoice = await Invoice.create({
      patient: patient._id,
      opNumber: patient.opNumber,
      items: [
        { service: 'Root Canal Treatment', quantity: 1, unitPrice: 7000 },
        { service: 'Dental Scaling & Polishing', quantity: 1, unitPrice: 3500 },
      ],
      paymentStatus: 'Pending',
    });

    console.log(`Created test invoice: ${invoice._id} (Total: ₹${invoice.total})`);

    // 1. Record Payment 1: ₹5,000 via Cash
    console.log('\n1. Recording Payment 1: ₹5,000 via Cash...');
    await recordPayment(
      { params: { id: invoice._id }, user: { _id: staff._id, role: 'receptionist' }, body: { amount: 5000, method: 'Cash' } },
      { json: () => {} },
      (e) => { throw e; }
    );

    // 2. Record Payment 2: ₹3,500 via UPI / QR
    console.log('2. Recording Payment 2: ₹3,500 via UPI / QR...');
    await recordPayment(
      { params: { id: invoice._id }, user: { _id: staff._id, role: 'receptionist' }, body: { amount: 3500, method: 'UPI / QR' } },
      { json: () => {} },
      (e) => { throw e; }
    );

    // 3. Record Payment 3: ₹2,000 via Card
    console.log('3. Recording Payment 3: ₹2,000 via Card...');
    await recordPayment(
      { params: { id: invoice._id }, user: { _id: staff._id, role: 'receptionist' }, body: { amount: 2000, method: 'Card' } },
      { json: () => {} },
      (e) => { throw e; }
    );

    // 4. Query Reception Operational Summary Analytics Report
    console.log('\n4. Querying Operational Summary Analytics Report (getReceptionSummary)...');
    let summaryRes = null;
    const todayStr = new Date().toISOString().split('T')[0];
    const reqMock = { query: { dateFrom: todayStr, dateTo: todayStr } };
    const resMock = { json: (d) => { summaryRes = d; } };

    await getReceptionSummary(reqMock, resMock, (e) => { throw e; });

    console.log('\n--- Analytics Report Figures ---');
    console.log(`Total Desk Collections Figure: ₹${summaryRes.paymentsCollected.totalAmount}`);
    console.log('Payments by Method Breakdown:', summaryRes.paymentsCollected.byMethod);

    if (!summaryRes.paymentsCollected || summaryRes.paymentsCollected.totalAmount < 10500) {
      throw new Error(`FAIL: Expected Total Desk Collections >= 10500, got ${summaryRes.paymentsCollected?.totalAmount}`);
    }

    const { Cash, Card, UPI } = summaryRes.paymentsCollected.byMethod;

    console.log(`   - Cash Collections: ₹${Cash} (Expected >= 5000)`);
    console.log(`   - Card Collections: ₹${Card} (Expected >= 2000)`);
    console.log(`   - UPI Collections: ₹${UPI} (Expected >= 3500)`);

    if (Cash < 5000 || Card < 2000 || UPI < 3500) {
      throw new Error('FAIL: Payments by Method figures did not automatically accumulate payments!');
    }

    console.log('\n   Automatic Analytics Feed Verification: PASSED ✓');

    // Clean up test documents
    console.log('\n5. Cleaning up test records...');
    await Invoice.deleteOne({ _id: invoice._id });
    await Patient.deleteOne({ _id: patient._id });
    console.log('   Cleanup done.');

    console.log('\n=== ALL ANALYTICS AUTO-FEED TESTS PASSED PERFECTLY ===\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyAnalyticsAutoFeed();
