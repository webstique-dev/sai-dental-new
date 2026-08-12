const express = require('express');
const {
  listConsultations,
  getDoctorTodayQueue,
  startConsultation,
  getConsultationById,
  closeConsultation,
  getDoctorSummary,
} = require('../controllers/consultationController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Strictly protected for Doctor and Admin (403 for Receptionist)
router.use(protect, allowRoles('doctor', 'admin'));

router.get('/', listConsultations);
router.get('/queue/today', getDoctorTodayQueue);
router.get('/doctor-summary', getDoctorSummary);
router.post('/start', startConsultation);
router.get('/:id', getConsultationById);
router.post('/:id/close', closeConsultation);

module.exports = router;
