const express = require('express');
const {
  listFollowUps,
  createFollowUp,
  scheduleFollowUp,
} = require('../controllers/followUpController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Protected for Receptionist and Admin
router.use(protect, allowRoles('receptionist', 'admin'));

router.get('/', listFollowUps);
router.post('/', createFollowUp);
router.post('/:id/schedule', scheduleFollowUp);

module.exports = router;
