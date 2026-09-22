const express = require('express');
const {
  listFollowUps,
  createFollowUp,
  updateFollowUp,
  scheduleFollowUp,
  getLastDoctorForPatient,
  checkInFollowUp,
  cancelFollowUp,
} = require('../controllers/followUpController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Protected for Receptionist, Admin, and Doctor
router.use(protect, allowRoles('receptionist', 'admin', 'doctor'));

router.get('/', listFollowUps);
router.post('/', createFollowUp);
router.put('/:id', updateFollowUp);
router.patch('/:id', updateFollowUp);
router.get('/patient-last-doctor/:patientId', getLastDoctorForPatient);
router.post('/:id/schedule', scheduleFollowUp);
router.post('/:id/check-in', checkInFollowUp);
router.post('/:id/cancel', cancelFollowUp);

module.exports = router;
