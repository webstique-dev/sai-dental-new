const express = require('express');
const {
  listPatients,
  createPatient,
  getPatientById,
  updatePatient,
} = require('../controllers/patientController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Protected for Receptionist and Admin
router.use(protect, allowRoles('receptionist', 'admin'));

router.get('/', listPatients);
router.post('/', createPatient);
router.get('/:id', getPatientById);
router.patch('/:id', updatePatient);

module.exports = router;
