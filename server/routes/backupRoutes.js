const express = require('express');
const { exportBackup } = require('../controllers/backupController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Strictly protected for Admin role
router.use(protect, allowRoles('admin'));

router.get('/export', exportBackup);

module.exports = router;
