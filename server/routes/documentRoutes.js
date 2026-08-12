const express = require('express');
const {
  upload,
  listDocuments,
  createDocument,
  downloadDocument,
  deleteDocument,
} = require('../controllers/documentController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// GET /api/documents?patient= (view allowed for all 3 clinical roles)
router.get('/', protect, allowRoles('admin', 'receptionist', 'doctor'), listDocuments);

// POST /api/documents (upload allowed for all 3 clinical roles)
router.post('/', protect, allowRoles('admin', 'receptionist', 'doctor'), upload.single('file'), createDocument);

// GET /api/documents/:id/download (download allowed for any authenticated user)
router.get('/:id/download', protect, downloadDocument);

// DELETE /api/documents/:id (strictly admin-only deletion per PRD section 25)
router.delete('/:id', protect, allowRoles('admin'), deleteDocument);

module.exports = router;
