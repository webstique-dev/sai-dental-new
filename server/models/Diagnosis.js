const mongoose = require('mongoose');

const diagnosisSeverityOptions = ['Mild', 'Moderate', 'Severe'];

const diagnosisSchema = new mongoose.Schema(
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
    diagnosis: {
      type: String,
      trim: true,
      required: true,
    },
    clinicalFindings: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    severity: {
      type: String,
      enum: diagnosisSeverityOptions,
      default: undefined,
    },
    relatedTeeth: [
      {
        type: Number,
      },
    ],
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

module.exports = mongoose.model('Diagnosis', diagnosisSchema);
module.exports.diagnosisSeverityOptions = diagnosisSeverityOptions;
