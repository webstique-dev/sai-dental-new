const express = require('express');
const {
  getPatientToothChart,
  updateToothRecord,
  bulkUpdateTeeth,
  updateToothHistoryEntry,
  deleteToothHistoryEntry,
} = require('../controllers/toothChartController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Strictly protected for Doctor and Admin
router.use(protect, allowRoles('doctor', 'admin'));

router.get('/:patientId', getPatientToothChart);
router.patch('/:patientId/:toothNumber', updateToothRecord);
router.post('/:patientId/bulk', bulkUpdateTeeth);
router.put('/:patientId/:toothNumber/history/:historyId', updateToothHistoryEntry);
router.patch('/:patientId/:toothNumber/history/:historyId', updateToothHistoryEntry);
router.delete('/:patientId/:toothNumber/history/:historyId', deleteToothHistoryEntry);

module.exports = router;
