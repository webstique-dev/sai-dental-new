const mongoose = require('mongoose');

const toothConditionOptions = [
  'Healthy',
  'Decayed',
  'Caries',
  'Missing',
  'Filling',
  'RCT',
  'Crown',
  'Bridge',
  'Implant',
  'Extraction',
  'Restored',
  'Prosthetic',
  'Other',
];

const toothHistorySchema = new mongoose.Schema(
  {
    condition: {
      type: String,
      enum: toothConditionOptions,
      required: true,
    },
    treatment: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null,
    },
  },
  { _id: true }
);

const toothRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    toothNumber: {
      type: Number,
      required: true,
    },
    currentCondition: {
      type: String,
      enum: toothConditionOptions,
      default: 'Healthy',
    },
    history: [toothHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Compound unique index on (patient, toothNumber)
toothRecordSchema.index({ patient: 1, toothNumber: 1 }, { unique: true });

module.exports = mongoose.model('ToothRecord', toothRecordSchema);
module.exports.toothConditionOptions = toothConditionOptions;
