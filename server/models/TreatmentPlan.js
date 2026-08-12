const mongoose = require('mongoose');

const priorityOptions = ['Low', 'Medium', 'High'];
const treatmentStatusOptions = ['Planned', 'Approved', 'In Progress', 'Completed', 'Cancelled'];

const treatmentPlanSchema = new mongoose.Schema(
  {
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    diagnosis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Diagnosis',
      default: null,
    },
    tooth: {
      type: Number,
      default: null,
    },
    treatment: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    priority: {
      type: String,
      enum: priorityOptions,
      default: 'Medium',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: treatmentStatusOptions,
      default: 'Planned',
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

module.exports = mongoose.model('TreatmentPlan', treatmentPlanSchema);
module.exports.priorityOptions = priorityOptions;
module.exports.treatmentStatusOptions = treatmentStatusOptions;
