const express = require('express');
const {
  getDoctorTodayQueue,
  startConsultation,
  getConsultationById,
} = require('../controllers/consultationController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Strictly protected for Doctor and Admin (403 for Receptionist)
router.use(protect, allowRoles('doctor', 'admin'));

router.get('/queue/today', getDoctorTodayQueue);
router.post('/start', startConsultation);
router.get('/:id', getConsultationById);

module.exports = router;
