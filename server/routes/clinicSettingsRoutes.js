const express = require('express');
const { getSettings, updateSettings } = require('../controllers/clinicSettingsController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Strictly protected for Admin role per PRD
router.use(protect, allowRoles('admin'));

router.get('/', getSettings);
router.patch('/', updateSettings);

module.exports = router;
