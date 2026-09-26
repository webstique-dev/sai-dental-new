const mongoose = require('mongoose');
const { capitalizeWords } = require('../utils/formatters.js');

const extraoralFindingsOptions = ['Facial Symmetry', 'TMJ', 'Lymph Nodes', 'Swelling'];
const softTissueAreaOptions = ['Labial/Buccal Mucosa', 'Tongue', 'Floor of Mouth', 'Gingiva', 'Hard Palate', 'Soft Palate'];
const gingivalFindingsOptions = ['Healthy', 'Gingivitis', 'Periodontitis', 'Enlargement', 'Recession', 'Bleeding on Probing'];

const extraoralItemSchema = new mongoose.Schema(
  {
    finding: { type: String, trim: true, default: '', set: capitalizeWords },
    notes: { type: String, trim: true, default: '', set: capitalizeWords },
  },
  { _id: false }
);

const softTissueItemSchema = new mongoose.Schema(
  {
    area: { type: String, trim: true, default: '', set: capitalizeWords },
    notes: { type: String, trim: true, default: '', set: capitalizeWords },
  },
  { _id: false }
);

const examinationSchema = new mongoose.Schema(
  {
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
      unique: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    chiefComplaints: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    extraoral: [extraoralItemSchema],
    softTissue: [softTissueItemSchema],
    gingivalFindings: [
      {
        type: String,
        trim: true,
        set: capitalizeWords,
      },
    ],
    periodontalDetails: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    overallNotes: {
      type: String,
      trim: true,
      default: '',
      set: capitalizeWords,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Examination', examinationSchema);
module.exports.extraoralFindingsOptions = extraoralFindingsOptions;
module.exports.softTissueAreaOptions = softTissueAreaOptions;
module.exports.gingivalFindingsOptions = gingivalFindingsOptions;
