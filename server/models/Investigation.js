const mongoose = require('mongoose');

const investigationTypeOptions = ['X-Ray', 'Blood Tests', 'Other'];

const investigationSchema = new mongoose.Schema(
  {
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    type: {
      type: String,
      enum: investigationTypeOptions,
      default: 'X-Ray',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    result: {
      type: String,
      trim: true,
      default: '',
    },
    // Attachment URL or file path reference
    attachment: {
      type: String,
      trim: true,
      default: '',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Investigation', investigationSchema);
module.exports.investigationTypeOptions = investigationTypeOptions;
