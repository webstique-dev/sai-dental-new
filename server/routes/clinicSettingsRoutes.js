const express = require('express');
const { getSettings, updateSettings } = require('../controllers/clinicSettingsController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

router.get('/', protect, allowRoles('admin', 'receptionist', 'doctor'), getSettings);
router.patch('/', protect, allowRoles('admin'), updateSettings);

module.exports = router;
