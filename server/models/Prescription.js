const mongoose = require('mongoose');
const { capitalizeWords } = require('../utils/formatters.js');

const medicineItemSchema = new mongoose.Schema(
  {
    medicine: { type: String, trim: true, required: true, set: capitalizeWords },
    dosage: { type: String, trim: true, default: '', set: capitalizeWords },
    frequency: { type: String, trim: true, default: '' },
    duration: { type: String, trim: true, default: '', set: capitalizeWords },
    instructions: { type: String, trim: true, default: '', set: capitalizeWords },
    type: { type: String, trim: true, default: 'medicine', set: (v) => (v ? v.toLowerCase() : 'medicine') },
  },
  { _id: true }
);

const prescriptionSchema = new mongoose.Schema(
  {
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    medicines: [medicineItemSchema],
    diagnosis: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    treatmentPlan: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    treatment: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);
