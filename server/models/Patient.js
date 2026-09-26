const mongoose = require('mongoose');

const medicalHistoryOptions = [
  'Diabetes Mellitus',
  'Hypertension',
  'Asthma',
  'Allergy',
  'Pregnancy',
  'Cardiac Disease',
  'Epilepsy',
  'Thyroid Disorder',
  'Hepatitis',
  'Bleeding Disorder',
  'Any Other',
];

const habitOptions = ['Smoking', 'Tobacco', 'Alcohol', 'Pan'];

const { capitalizeWords, capitalizeName } = require('../utils/formatters.js');

const patientSchema = new mongoose.Schema(
  {
    opNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    firstName: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    lastName: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },

    age: {
      type: Number,
      min: [0, 'Age cannot be negative'],
      max: [130, 'Age cannot exceed 130'],
      set: (v) => {
        if (v === null || v === undefined || v === '' || isNaN(v)) return undefined;
        return Math.round(Number(v) * 10) / 10;
      },
    },
    sex: {
      type: String,
      trim: true,
      default: '',
    },
    patientType: {
      type: String,
      enum: ['adult', 'child'],
      default: 'adult',
    },
    dateOfBirth: {
      type: Date,
    },
    occupation: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    address: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    primaryPhone: {
      type: String,
      trim: true,
      default: '',
    },
    secondaryPhone: {
      type: String,
      trim: true,
      default: '',
    },
    medicalHistory: {
      type: [String],
      default: [],
    },
    allergies: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    currentMedications: {
      type: String,
      default: '',
      set: capitalizeWords,
    },
    vitals: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    habits: {
      type: [String],
      default: [],
    },
    dentalHistory: {
      type: String,
      default: '',
      set: capitalizeWords,
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    registrationDate: {
      type: Date,
      default: Date.now,
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

// Pre-save hook to format names and auto-generate sequential OP number if not present
// Format: YYYY-MM-001 (e.g. 2026-08-001), sequence restarts from 001 at start of each year
patientSchema.pre('save', async function (next) {
  if (this.firstName && typeof this.firstName === 'string') {
    this.firstName = capitalizeName(this.firstName);
  }
  if (this.lastName && typeof this.lastName === 'string') {
    this.lastName = capitalizeName(this.lastName);
  }

  if (!this.opNumber) {
    try {
      const Patient = mongoose.model('Patient');
      const targetDate = this.registrationDate || this.createdAt || new Date();
      const yearStr = String(targetDate.getFullYear());
      const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');

      // Find all patients with opNumber matching yearStr (e.g., ^2026-)
      const regexYear = new RegExp(`^${yearStr}-`);
      const existingYearPatients = await Patient.find(
        { opNumber: regexYear },
        { opNumber: 1 }
      );

      let maxSeq = 0;
      for (const p of existingYearPatients) {
        if (p.opNumber) {
          const parts = p.opNumber.split('-');
          if (parts.length >= 3) {
            const seqNum = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(seqNum) && seqNum > maxSeq) {
              maxSeq = seqNum;
            }
          }
        }
      }

      const nextSeq = maxSeq + 1;
      const seqStr = String(nextSeq).padStart(3, '0');
      this.opNumber = `${yearStr}-${monthStr}-${seqStr}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

patientSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
  const update = this.getUpdate();
  if (update) {
    if (update.firstName !== undefined && typeof update.firstName === 'string') {
      update.firstName = capitalizeName(update.firstName);
    }
    if (update.lastName !== undefined && typeof update.lastName === 'string') {
      update.lastName = capitalizeName(update.lastName);
    }
    if (update.$set) {
      if (update.$set.firstName !== undefined && typeof update.$set.firstName === 'string') {
        update.$set.firstName = capitalizeName(update.$set.firstName);
      }
      if (update.$set.lastName !== undefined && typeof update.$set.lastName === 'string') {
        update.$set.lastName = capitalizeName(update.$set.lastName);
      }
    }
  }
  next();
});


// Text index for search on firstName, lastName, primaryPhone, secondaryPhone, opNumber
patientSchema.index({
  firstName: 'text',
  lastName: 'text',
  primaryPhone: 'text',
  secondaryPhone: 'text',
  opNumber: 'text',
});

module.exports = mongoose.model('Patient', patientSchema);
module.exports.medicalHistoryOptions = medicalHistoryOptions;
module.exports.habitOptions = habitOptions;
