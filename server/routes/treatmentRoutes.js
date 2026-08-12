const express = require('express');
const {
  listTreatments,
  createTreatment,
  updateTreatment,
} = require('../controllers/treatmentController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Read endpoint — accessible by admin, doctor, and receptionist
router.get('/', protect, allowRoles('admin', 'doctor', 'receptionist'), listTreatments);

// Write endpoints — strictly admin only
router.post('/', protect, allowRoles('admin'), createTreatment);
router.patch('/:id', protect, allowRoles('admin'), updateTreatment);

module.exports = router;
