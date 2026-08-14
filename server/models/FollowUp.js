const mongoose = require('mongoose');

const followUpStatusOptions = [
  'Pending',
  'Scheduled',
  'Checked-In',
  'In Consultation',
  'Completed',
  'Cancelled',
  'No Show',
  'Missed',
];

const followUpSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null,
    },
    recommendedDate: {
      type: Date,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    treatmentStatus: {
      type: String,
      trim: true,
      default: '',
    },
    scheduledAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    status: {
      type: String,
      enum: followUpStatusOptions,
      default: 'Pending',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FollowUp', followUpSchema);
module.exports.followUpStatusOptions = followUpStatusOptions;
