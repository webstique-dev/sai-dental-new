require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { getReceptionSummary } = require('../controllers/reportController');

async function verifyIntakeChannels() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dental-clinic';
    await mongoose.connect(uri);
    console.log('=== STARTING INTAKE CHANNELS & ANALYTICS VERIFICATION ===\n');

    let doctor = await User.findOne({ role: 'doctor' });
    if (!doctor) {
      doctor = await User.create({
        name: 'Dr. Channel Specialist',
        email: `dr.channel.${Date.now()}@clinic.com`,
        password: 'Password123!',
        role: 'doctor',
      });
    }

    const patient = await Patient.create({
      firstName: 'ChannelTest',
      lastName: 'Patient',
      opNumber: `OP-CHAN-${Date.now().toString().slice(-4)}`,
      phone: '9888877777',
      age: 30,
      sex: 'Male',
    });

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Create Walk-In appointment
    const walkInAppt = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      date: new Date(),
      time: '10:00 AM',
      type: 'Walk-In',
      status: 'Scheduled',
    });
    console.log(`1. Saved Walk-In Appointment (ID: ${walkInAppt._id}, type: '${walkInAppt.type}')`);

    // 2. Create Phone Booking appointment
    const phoneAppt = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      date: new Date(),
      time: '11:00 AM',
      type: 'Phone Booking',
      status: 'Scheduled',
    });
    console.log(`2. Saved Phone Booking Appointment (ID: ${phoneAppt._id}, type: '${phoneAppt.type}')`);

    // 3. Create Online Booking appointment
    const onlineAppt = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      date: new Date(),
      time: '02:00 PM',
      type: 'Online Booking',
      status: 'Scheduled',
    });
    console.log(`3. Saved Online Booking Appointment (ID: ${onlineAppt._id}, type: '${onlineAppt.type}')`);

    // 4. Create Legacy Appointment entry to test mapping to Phone Booking
    const legacyAppt = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      date: new Date(),
      time: '04:00 PM',
      type: 'Appointment',
      status: 'Scheduled',
    });
    console.log(`4. Saved Legacy Appointment (ID: ${legacyAppt._id}, type: '${legacyAppt.type}')`);

    // 5. Test Reception Summary analytics endpoint response
    console.log('\n5. Testing Queue Intake Method Analytics Breakdown...');
    let reportOutput = null;
    const reqMock = { query: { dateFrom: todayStr, dateTo: todayStr } };
    const resMock = { json: (data) => { reportOutput = data; } };

    await getReceptionSummary(reqMock, resMock, (err) => { throw err; });

    console.log('   queueSummary output:', reportOutput.queueSummary);

    if (!reportOutput || !reportOutput.queueSummary) {
      throw new Error('FAIL: queueSummary missing from reception report response!');
    }

    const { totalWalkIns, totalPhoneBookings, totalOnlineBookings } = reportOutput.queueSummary;

    console.log(`   Walk-Ins count: ${totalWalkIns}`);
    console.log(`   Phone Bookings count: ${totalPhoneBookings} (includes legacy 'Appointment')`);
    console.log(`   Online Bookings count: ${totalOnlineBookings}`);

    if (totalWalkIns < 1) throw new Error('FAIL: totalWalkIns count is 0');
    if (totalPhoneBookings < 2) throw new Error('FAIL: totalPhoneBookings count should be >= 2 (includes legacy)');
    if (totalOnlineBookings < 1) throw new Error('FAIL: totalOnlineBookings count is 0');

    console.log('   Intake Channel Breakdown Verification: PASSED ✓');

    // Clean up test data
    console.log('\n6. Cleaning up test records...');
    await Appointment.deleteMany({ patient: patient._id });
    await Patient.deleteOne({ _id: patient._id });
    console.log('   Cleanup done.');

    console.log('\n=== ALL INTAKE CHANNEL TESTS PASSED PERFECTLY ===\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyIntakeChannels();
