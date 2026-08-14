const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Document = require('../models/Document');
const Patient = require('../models/Patient');

// Ensure server/uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, 'doc-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max file size
});

// GET /api/documents?patient= (protect + allowRoles('admin', 'receptionist', 'doctor'))
async function listDocuments(req, res, next) {
  try {
    const { patient } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (patient) {
      filter.patient = patient;
    }

    const documents = await Document.find(filter)
      .sort({ createdAt: -1 })
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('uploadedBy', 'name email role specialization')
      .populate('relatedConsultation');

    return res.json({ documents });
  } catch (err) {
    next(err);
  }
}

// POST /api/documents (protect + allowRoles('admin', 'receptionist', 'doctor'))
async function createDocument(req, res, next) {
  try {
    const { patient, type, relatedConsultation, fileName: customFileName } = req.body;

    if (!patient) {
      return res.status(400).json({ message: 'Patient ID is required.' });
    }

    const patientDoc = await Patient.findById(patient);
    if (!patientDoc) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    let fileUrl = '';
    let fileName = customFileName || 'Document';
    let fileSize = 0;
    let mimeType = 'application/octet-stream';

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;
      mimeType = req.file.mimetype;
    } else if (req.body.fileUrl) {
      fileUrl = req.body.fileUrl;
      fileName = customFileName || 'External Document';
    } else {
      return res.status(400).json({ message: 'A file attachment or fileUrl is required.' });
    }

    const doc = new Document({
      patient,
      type: type || 'Other',
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
      relatedConsultation: relatedConsultation || null,
    });

    await doc.save();

    const populated = await Document.findById(doc._id)
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('uploadedBy', 'name email role specialization')
      .populate('relatedConsultation');

    return res.status(201).json({
      message: 'Document uploaded successfully.',
      document: populated,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/documents/:id/download (protect - any authenticated role)
async function downloadDocument(req, res, next) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    if (doc.fileUrl.startsWith('/uploads/')) {
      const localFileName = path.basename(doc.fileUrl);
      const filePath = path.join(uploadsDir, localFileName);
      if (fs.existsSync(filePath)) {
        return res.download(filePath, doc.fileName);
      }
    }

    // Fallback if file URL is an external link or not found locally
    return res.redirect(doc.fileUrl);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/documents/:id (Soft delete)
async function deleteDocument(req, res, next) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.deletedBy = req.user ? req.user._id : undefined;
    await doc.save();

    return res.json({
      message: 'Document deleted successfully.',
      id: req.params.id,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  upload,
  listDocuments,
  createDocument,
  downloadDocument,
  deleteDocument,
};
