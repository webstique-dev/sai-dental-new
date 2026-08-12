const mongoose = require('mongoose');

const defaultWorkingHours = [
  { day: 'Monday', startTime: '09:00', endTime: '18:00', isAvailable: true },
  { day: 'Tuesday', startTime: '09:00', endTime: '18:00', isAvailable: true },
  { day: 'Wednesday', startTime: '09:00', endTime: '18:00', isAvailable: true },
  { day: 'Thursday', startTime: '09:00', endTime: '18:00', isAvailable: true },
  { day: 'Friday', startTime: '09:00', endTime: '18:00', isAvailable: true },
  { day: 'Saturday', startTime: '09:00', endTime: '17:00', isAvailable: true },
  { day: 'Sunday', startTime: '10:00', endTime: '14:00', isAvailable: false },
];

const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      default: 'General Dentistry',
      trim: true,
    },
    qualification: {
      type: String,
      default: 'BDS',
      trim: true,
    },
    workingHours: [
      {
        day: { type: String, required: true },
        startTime: { type: String, default: '09:00' },
        endTime: { type: String, default: '18:00' },
        isAvailable: { type: Boolean, default: true },
      },
    ],
    consultationFee: {
      type: Number,
      default: 500,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
module.defaultWorkingHours = defaultWorkingHours;
