const mongoose = require('mongoose');

const followUpStatusOptions = ['Pending', 'Scheduled', 'Completed'];

const followUpSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
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
