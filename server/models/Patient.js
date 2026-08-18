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
    },
    lastName: {
      type: String,
      trim: true,
      default: '',
    },
    age: {
      type: Number,
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
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    medicalHistory: {
      type: [String],
      default: [],
    },
    currentMedications: {
      type: String,
      default: '',
    },
    vitals: {
      type: mongoose.Schema.Types.Mixed,
      default: { bp: '', rbs: '' },
    },
    habits: {
      type: [String],
      default: [],
    },
    dentalHistory: {
      type: String,
      default: '',
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

// Pre-save hook to auto-generate sequential OP number if not present
// Format: YYYY-MM-001 (e.g. 2026-08-001), sequence restarts from 001 at start of each year
patientSchema.pre('save', async function (next) {
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

// Text index for search on firstName, lastName, phone, opNumber
patientSchema.index({
  firstName: 'text',
  lastName: 'text',
  phone: 'text',
  opNumber: 'text',
});

module.exports = mongoose.model('Patient', patientSchema);
module.exports.medicalHistoryOptions = medicalHistoryOptions;
module.exports.habitOptions = habitOptions;
