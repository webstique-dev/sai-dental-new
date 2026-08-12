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
    closedAt: {
      type: Date,
    },
    clinicalNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Consultation', consultationSchema);
module.exports.consultationStatusOptions = consultationStatusOptions;
