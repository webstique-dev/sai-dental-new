const express = require('express');
const {
  getTodayQueue,
  createWalkIn,
  checkInAppointment,
  updateQueueStatus,
} = require('../controllers/queueController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Protected for Receptionist and Admin
router.use(protect, allowRoles('receptionist', 'admin'));

router.get('/today', getTodayQueue);
router.post('/walk-in', createWalkIn);
router.patch('/:id/check-in', checkInAppointment);
router.patch('/:id/status', updateQueueStatus);

module.exports = router;
