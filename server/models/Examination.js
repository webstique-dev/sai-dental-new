const mongoose = require('mongoose');

const extraoralFindingsOptions = ['Facial Symmetry', 'TMJ', 'Lymph Nodes', 'Swelling'];
const softTissueAreaOptions = ['Labial/Buccal Mucosa', 'Tongue', 'Floor of Mouth', 'Gingiva', 'Hard Palate', 'Soft Palate'];
const gingivalFindingsOptions = ['Healthy', 'Gingivitis', 'Periodontitis', 'Enlargement', 'Recession', 'Bleeding on Probing'];

const extraoralItemSchema = new mongoose.Schema(
  {
    finding: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const softTissueItemSchema = new mongoose.Schema(
  {
    area: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
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
    extraoral: [extraoralItemSchema],
    softTissue: [softTissueItemSchema],
    gingivalFindings: [
      {
        type: String,
        trim: true,
      },
    ],
    periodontalDetails: {
      type: String,
      trim: true,
      default: '',
    },
    overallNotes: {
      type: String,
      trim: true,
      default: '',
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
