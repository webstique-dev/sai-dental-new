const mongoose = require('mongoose');
const { capitalizeWords } = require('../utils/formatters.js');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      set: capitalizeWords,
    },
    dosage: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
      set: capitalizeWords,
    },
    defaultFrequency: {
      type: String,
      trim: true,
      default: '',
    },
    defaultDuration: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    defaultInstructions: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on normalized name and dosage to aid fast lookup & unique checks
medicineSchema.index({ name: 1, dosage: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
