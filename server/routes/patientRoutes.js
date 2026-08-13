const express = require('express');
const {
  listPatients,
  createPatient,
  getPatientById,
  updatePatient,
  getPatientEMR,
} = require('../controllers/patientController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

router.get('/', protect, allowRoles('receptionist', 'doctor', 'admin'), listPatients);
router.post('/', protect, allowRoles('receptionist', 'admin'), createPatient);
router.get('/:patientId/emr', protect, allowRoles('doctor', 'admin', 'receptionist'), getPatientEMR);
router.get('/:id', protect, allowRoles('receptionist', 'doctor', 'admin'), getPatientById);
router.patch('/:id', protect, allowRoles('receptionist', 'admin'), updatePatient);

module.exports = router;
