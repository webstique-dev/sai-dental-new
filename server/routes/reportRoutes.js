const express = require('express');
const { getReceptionSummary } = require('../controllers/reportController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Protected for Receptionist and Admin
router.use(protect, allowRoles('receptionist', 'admin'));

router.get('/reception-summary', getReceptionSummary);

module.exports = router;
