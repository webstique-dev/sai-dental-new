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
patientSchema.pre('save', async function (next) {
  if (!this.opNumber) {
    try {
      const Patient = mongoose.model('Patient');
      const count = await Patient.countDocuments();
      const lastPatient = await Patient.findOne({ opNumber: { $exists: true, $ne: '' } }, { opNumber: 1 })
        .sort({ createdAt: -1 });

      let nextSeq = count + 1;
      if (lastPatient && lastPatient.opNumber) {
        const match = lastPatient.opNumber.match(/OP-(\d+)/);
        if (match) {
          nextSeq = Math.max(nextSeq, parseInt(match[1], 10) + 1);
        }
      }
      this.opNumber = `OP-${String(nextSeq).padStart(6, '0')}`;
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
