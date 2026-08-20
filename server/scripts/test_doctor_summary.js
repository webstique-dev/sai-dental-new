require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const { getDoctorSummary } = require('../controllers/consultationController');

async function testSummary() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Testing getDoctorSummary...');

    const doctor = await User.findOne({ role: 'doctor', status: 'active' });
    if (!doctor) {
      console.error('Doctor user not found');
      process.exit(1);
    }

    const req = {
      user: doctor,
      query: {},
    };

    const res = {
      json: (data) => {
        console.log('SUCCESS! getDoctorSummary returned:', data);
        process.exit(0);
      },
      status: (code) => {
        console.log('HTTP Status:', code);
        return res;
      },
    };

    const next = (err) => {
      console.error('ERROR in getDoctorSummary:', err);
      process.exit(1);
    };

    await getDoctorSummary(req, res, next);
  } catch (err) {
    console.error('Catch error:', err);
    process.exit(1);
  }
}

testSummary();
