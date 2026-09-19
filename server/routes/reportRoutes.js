const express = require('express');
const {
  getReceptionSummary,
  getClinicPerformance,
  getFinancialReport,
  getTreatmentAnalytics,
  getDoctorAnalytics,
  getAdminOverview,
  getAppointmentsReport,
  getFollowUpsReport,
} = require('../controllers/reportController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Reception summary — accessible to receptionist, doctor, admin
router.get('/reception-summary', protect, allowRoles('receptionist', 'doctor', 'admin'), getReceptionSummary);

// Full analytics & reports — accessible to admin and doctor (with role-level data isolation)
router.get('/admin-overview', protect, allowRoles('admin', 'doctor'), getAdminOverview);
router.get('/clinic-performance', protect, allowRoles('admin', 'doctor'), getClinicPerformance);
router.get('/financial', protect, allowRoles('admin', 'doctor'), getFinancialReport);
router.get('/treatment-analytics', protect, allowRoles('admin', 'doctor'), getTreatmentAnalytics);
router.get('/doctor-analytics', protect, allowRoles('admin', 'doctor'), getDoctorAnalytics);
router.get('/appointments', protect, allowRoles('admin', 'doctor', 'receptionist'), getAppointmentsReport);
router.get('/follow-ups', protect, allowRoles('admin', 'doctor', 'receptionist'), getFollowUpsReport);

module.exports = router;

