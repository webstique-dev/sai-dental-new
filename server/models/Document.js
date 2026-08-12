const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['X-Ray', 'Prescription', 'Bill', 'Clinical Note', 'Clinical Image', 'Report', 'Other'],
      required: true,
      default: 'Other',
    },
    fileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
    },
    mimeType: {
      type: String,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    relatedConsultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
    },
  },
  {
    timestamps: true,
  }
);

// Note: Local disk storage under Express /uploads static directory is used for file references.
// Swapping to cloud object storage (e.g. AWS S3, Google Cloud Storage) is a drop-in replacement
// for the multer upload handler in documentController.js and does not require API schema changes.

module.exports = mongoose.model('Document', documentSchema);
