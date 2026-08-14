const mongoose = require('mongoose');

const queueStatusOptions = [
  'Scheduled',
  'Checked-In',
  'In Consultation',
  'Completed',
  'Cancelled',
  'No Show',
];
const queueTypeOptions = ['Appointment', 'Walk-in'];

const queueEntrySchema = new mongoose.Schema(
  {
    token: {
      type: Number,
    },
    queue_token: {
      type: Number,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    type: {
      type: String,
      enum: queueTypeOptions,
      default: 'Walk-in',
    },
    status: {
      type: String,
      enum: queueStatusOptions,
      default: 'Checked-In',
    },
    checked_in_at: {
      type: Date,
      default: Date.now,
    },
    checkInTime: {
      type: Date,
      default: Date.now,
    },
    queue_date: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    consultation_started_at: {
      type: Date,
      default: null,
    },
    consultation_ended_at: {
      type: Date,
      default: null,
    },
    completed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying daily queue by date, status, and token
queueEntrySchema.index({ queue_date: 1, token: 1 });
queueEntrySchema.index({ queue_date: 1, status: 1 });

module.exports = mongoose.model('QueueEntry', queueEntrySchema);
module.exports.queueStatusOptions = queueStatusOptions;
module.exports.queueTypeOptions = queueTypeOptions;
