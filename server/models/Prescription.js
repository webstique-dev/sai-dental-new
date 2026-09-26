const mongoose = require('mongoose');
const { capitalizeWords } = require('../utils/formatters.js');

const medicineItemSchema = new mongoose.Schema(
  {
    medicine: { type: String, trim: true, required: true, set: capitalizeWords },
    dosage: { type: String, trim: true, default: '', set: capitalizeWords },
    frequency: { type: String, trim: true, default: '' },
    duration: { type: String, trim: true, default: '', set: capitalizeWords },
    instructions: { type: String, trim: true, default: '', set: capitalizeWords },
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
