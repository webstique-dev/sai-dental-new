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

// Protected for Doctor, Admin, and Receptionist
router.use(protect, allowRoles('doctor', 'admin', 'receptionist'));

router.get('/', listConsultations);
router.get('/queue/today', getDoctorTodayQueue);
router.get('/doctor-summary', getDoctorSummary);
router.post('/start', startConsultation);
router.get('/:id', getConsultationById);
router.post('/:id/close', closeConsultation);

module.exports = router;
