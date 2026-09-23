require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const bcrypt = require('bcryptjs');

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for test data setup.');

    let doc1 = await User.findOne({ email: 'doctor@saidental.com' });
    let doc2 = await User.findOne({ email: 'maran@saidental.com' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Doctor@12345', salt);

    if (!doc2) {
      doc2 = await User.create({
        name: 'Dr. Maran',
        email: 'maran@saidental.com',
        password: passwordHash,
        role: 'doctor',
        specialization: 'Orthodontics',
        phone: '9876543210',
        status: 'active',
      });
    } else {
      doc2.password = passwordHash;
      await doc2.save();
    }

    let patient1 = await Patient.findOne({ firstName: 'DocOnePatient' });
    if (!patient1) {
      patient1 = await Patient.create({
        firstName: 'DocOnePatient',
        lastName: 'Smith',
        opNumber: 'OP-D1-101',
        primaryPhone: '9111111111',
        phone: '9111111111',
        age: 30,
        sex: 'Male',
        patientType: 'adult',
      });
    }

    let patient2 = await Patient.findOne({ firstName: 'DocTwoPatient' });
    if (!patient2) {
      patient2 = await Patient.create({
        firstName: 'DocTwoPatient',
        lastName: 'Taylor',
        opNumber: 'OP-D2-202',
        primaryPhone: '9222222222',
        phone: '9222222222',
        age: 28,
        sex: 'Female',
        patientType: 'adult',
      });
    }

    const now = new Date();

    let consult1 = await Consultation.findOne({ patient: patient1._id, doctor: doc1._id, status: 'Completed' });
    if (!consult1) {
      consult1 = await Consultation.create({
        patient: patient1._id,
        doctor: doc1._id,
        status: 'Completed',
        startedAt: now,
        closedAt: now,
        completed_at: now,
        clinicalNotes: 'Consultation completed exclusively by Doctor 1.',
        reason: 'Regular Checkup D1',
      });
    } else {
      consult1.closedAt = now;
      consult1.completed_at = now;
      await consult1.save();
    }

    let consult2 = await Consultation.findOne({ patient: patient2._id, doctor: doc2._id, status: 'Completed' });
    if (!consult2) {
      consult2 = await Consultation.create({
        patient: patient2._id,
        doctor: doc2._id,
        status: 'Completed',
        startedAt: now,
        closedAt: now,
        completed_at: now,
        clinicalNotes: 'Consultation completed exclusively by Doctor 2.',
        reason: 'Orthodontic Followup D2',
      });
    } else {
      consult2.closedAt = now;
      consult2.completed_at = now;
      await consult2.save();
    }

    console.log('✓ Test data setup complete:');
    console.log(`  Doctor 1 (${doc1.email}) completed consultation for: ${patient1.firstName} ${patient1.lastName} (#${patient1.opNumber})`);
    console.log(`  Doctor 2 (${doc2.email}) completed consultation for: ${patient2.firstName} ${patient2.lastName} (#${patient2.opNumber})`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Data setup failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedData();
