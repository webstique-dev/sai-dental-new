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

// Read routes — accessible by receptionist + admin
router.get('/', protect, allowRoles('admin', 'receptionist'), listDoctorProfiles);
router.get('/:userId', protect, allowRoles('admin', 'receptionist'), getDoctorProfileByUserId);

// Stats & Write routes — strictly admin only
router.get('/:userId/stats', protect, allowRoles('admin'), getDoctorStats);
router.patch('/:userId', protect, allowRoles('admin'), upsertDoctorProfile);

module.exports = router;
