const mongoose = require('mongoose');
const { capitalizeWords } = require('../utils/formatters.js');

const treatmentRecordSchema = new mongoose.Schema(
  {
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: false,
      default: null,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    tooth: {
      type: Number,
      default: null,
    },
    procedure: {
      type: String,
      trim: true,
      required: true,
      set: capitalizeWords,
    },
    charges: {
      type: Number,
      default: 0,
      min: 0,
    },
    actualDuration: {
      type: String,
      trim: true,
      default: '',
    },
    nextAppointment: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    recordedBy: {
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

treatmentRecordSchema.virtual('treatment').get(function () {
  return this.procedure;
}).set(function (v) {
  this.procedure = v;
});

module.exports = mongoose.model('TreatmentRecord', treatmentRecordSchema);

