const mongoose = require('mongoose');
const { capitalizeWords } = require('../utils/formatters.js');

const appointmentStatusOptions = [
  'Scheduled',
  'Checked-In',
  'In Consultation',
  'Completed',
  'Cancelled',
  'No Show',
  'Missed',
];

const appointmentTypeOptions = [
  'Walk-In',
  'Phone Booking',
  'Online Booking',
  'Appointment', // Legacy support
  'Walk-in',     // Legacy support
];

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    date: {
      type: Date,
    },
    time: {
      type: String,
      trim: true,
      default: '',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    status: {
      type: String,
      enum: appointmentStatusOptions,
      default: 'Scheduled',
    },
    type: {
      type: String,
      enum: appointmentTypeOptions,
      default: 'Walk-In',
    },
    followUp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FollowUp',
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

module.exports = mongoose.model('Appointment', appointmentSchema);
module.exports.appointmentStatusOptions = appointmentStatusOptions;
module.exports.appointmentTypeOptions = appointmentTypeOptions;
