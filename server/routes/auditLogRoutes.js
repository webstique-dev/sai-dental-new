const express = require('express');
const { listAuditLogs } = require('../controllers/auditLogController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Strictly protected for Admin role per PRD
router.use(protect, allowRoles('admin'));

router.get('/', listAuditLogs);

module.exports = router;
