const mongoose = require('mongoose');

const defaultWorkingHours = [
  { day: 'Monday', open: '09:00', close: '18:00', isOpen: true },
  { day: 'Tuesday', open: '09:00', close: '18:00', isOpen: true },
  { day: 'Wednesday', open: '09:00', close: '18:00', isOpen: true },
  { day: 'Thursday', open: '09:00', close: '18:00', isOpen: true },
  { day: 'Friday', open: '09:00', close: '18:00', isOpen: true },
  { day: 'Saturday', open: '09:00', close: '17:00', isOpen: true },
  { day: 'Sunday', open: '10:00', close: '14:00', isOpen: false },
];

const clinicSettingsSchema = new mongoose.Schema(
  {
    clinicName: {
      type: String,
      required: true,
      default: 'Sai Dental Clinic – Digital Platform',
      trim: true,
    },
    address: {
      type: String,
      default: '123 Healthcare Avenue, Medical District, City',
    },
    phone: {
      type: String,
      default: '+91 98765 43210',
    },
    email: {
      type: String,
      default: 'contact@dentalcareclinic.com',
      trim: true,
      lowercase: true,
    },
    workingHours: [
      {
        day: { type: String, required: true },
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isOpen: { type: Boolean, default: true },
      },
    ],
    appointmentSlotDurationMinutes: {
      type: Number,
      default: 30,
      min: 5,
      max: 120,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Note: Future steps can wire workingHours into appointment availability checks in appointmentController.js,
// and wire taxRate/currency into invoice calculation in invoiceController.js.

module.exports = mongoose.model('ClinicSettings', clinicSettingsSchema);
module.defaultWorkingHours = defaultWorkingHours;
