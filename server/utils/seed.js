// Creates one starter account per role so you can log in immediately.
// Run with: npm run seed  (from the backend/ directory, after configuring .env)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const SEED_USERS = [
  {
    name: 'Clinic Admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@clinic.com',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    role: 'admin',
    phone: '',
  },
  {
    name: 'Front Desk',
    email: 'reception@clinic.com',
    password: 'Reception@123',
    role: 'receptionist',
    phone: '',
  },
  {
    name: 'Dr. Sample',
    email: 'doctor@clinic.com',
    password: 'Doctor@12345',
    role: 'doctor',
    phone: '',
  },
];

async function seed() {
  await connectDB();

  for (const u of SEED_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`Skipped (already exists): ${u.email}`);
      continue;
    }
    await User.create(u);
    console.log(`Created: ${u.email} / role: ${u.role}`);
  }

  console.log('\nSeed complete. Login credentials:');
  SEED_USERS.forEach((u) => console.log(`  ${u.role.padEnd(13)} ${u.email} / ${u.password}`));

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
