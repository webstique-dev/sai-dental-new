const express = require('express');
const {
  getReceptionSummary,
  getClinicPerformance,
  getFinancialReport,
  getTreatmentAnalytics,
  getDoctorAnalytics,
} = require('../controllers/reportController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Reception summary — accessible to receptionist + admin
router.get('/reception-summary', protect, allowRoles('receptionist', 'admin'), getReceptionSummary);

// Full admin analytics — admin only
router.get('/clinic-performance', protect, allowRoles('admin'), getClinicPerformance);
router.get('/financial', protect, allowRoles('admin'), getFinancialReport);
router.get('/treatment-analytics', protect, allowRoles('admin'), getTreatmentAnalytics);
router.get('/doctor-analytics', protect, allowRoles('admin'), getDoctorAnalytics);

module.exports = router;
