const express = require('express');
const { listPrescriptions, createPrescription, deletePrescription } = require('../controllers/prescriptionController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Protected for Receptionist, Doctor, and Admin
router.use(protect, allowRoles('receptionist', 'doctor', 'admin'));

router.get('/', listPrescriptions);
router.post('/', createPrescription);
router.delete('/:id', deletePrescription);

module.exports = router;
