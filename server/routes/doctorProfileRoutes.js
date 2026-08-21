const express = require('express');
const {
  listDoctorProfiles,
  getDoctorProfileByUserId,
  upsertDoctorProfile,
  getDoctorStats,
} = require('../controllers/doctorProfileController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Read routes — accessible by doctor, receptionist, admin
router.get('/', protect, allowRoles('admin', 'receptionist', 'doctor'), listDoctorProfiles);
router.get('/:userId', protect, allowRoles('admin', 'receptionist', 'doctor'), getDoctorProfileByUserId);

// Stats & Write routes — accessible by admin & doctor
router.get('/:userId/stats', protect, allowRoles('admin', 'doctor'), getDoctorStats);
router.patch('/:userId', protect, allowRoles('admin', 'doctor'), upsertDoctorProfile);

module.exports = router;
