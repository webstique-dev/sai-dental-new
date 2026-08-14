const mongoose = require('mongoose');

const consultationStatusOptions = ['In Progress', 'Completed'];

const consultationSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    queueEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QueueEntry',
      default: null,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    status: {
      type: String,
      enum: consultationStatusOptions,
      default: 'In Progress',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    consultation_started_at: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
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
    clinicalNotes: {
      type: String,
      trim: true,
      default: '',
    },
    totalEstimatedCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPerformedCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Consultation', consultationSchema);
module.exports.consultationStatusOptions = consultationStatusOptions;
