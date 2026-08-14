const mongoose = require('mongoose');

const investigationTypeOptions = ['RVG/IOPA', 'OPG', 'CBCT', 'Other', 'X-Ray', 'Blood Tests'];

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
    selectedTypes: [
      {
        type: String,
        trim: true,
      },
    ],
    otherText: {
      type: String,
      trim: true,
      default: '',
    },
    investigationDetails: {
      type: Map,
      of: String,
      default: {},
    },
    findings: {
      type: String,
      trim: true,
      default: '',
    },
    // Legacy / individual item fields
    type: {
      type: String,
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
