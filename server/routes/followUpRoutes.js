const express = require('express');
const {
  listFollowUps,
  createFollowUp,
  scheduleFollowUp,
} = require('../controllers/followUpController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Protected for Receptionist, Admin, and Doctor
router.use(protect, allowRoles('receptionist', 'admin', 'doctor'));

router.get('/', listFollowUps);
router.post('/', createFollowUp);
router.post('/:id/schedule', scheduleFollowUp);

module.exports = router;
