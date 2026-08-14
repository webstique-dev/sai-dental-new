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
    checkInTime: {
      type: Date,
      default: Date.now,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying today's queue by date and token
queueEntrySchema.index({ date: 1, token: 1 });

module.exports = mongoose.model('QueueEntry', queueEntrySchema);
module.exports.queueStatusOptions = queueStatusOptions;
module.exports.queueTypeOptions = queueTypeOptions;
