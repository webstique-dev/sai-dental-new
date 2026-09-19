const express = require('express');
const {
  getPatientToothChart,
  updateToothRecord,
  bulkUpdateTeeth,
  updateToothHistoryEntry,
  deleteToothHistoryEntry,
  getToothConditions,
  createToothCondition,
  deleteToothCondition,
} = require('../controllers/toothChartController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Publicly readable within authenticated session (Doctor, Admin, Receptionist)
router.get('/conditions', protect, getToothConditions);
router.post('/conditions', protect, allowRoles('doctor', 'admin'), createToothCondition);
router.delete('/conditions/:conditionId', protect, allowRoles('doctor', 'admin'), deleteToothCondition);

// Strictly protected for Doctor and Admin
router.use(protect, allowRoles('doctor', 'admin'));

router.get('/:patientId', getPatientToothChart);
router.patch('/:patientId/:toothNumber', updateToothRecord);
router.post('/:patientId/bulk', bulkUpdateTeeth);
router.put('/:patientId/:toothNumber/history/:historyId', updateToothHistoryEntry);
router.patch('/:patientId/:toothNumber/history/:historyId', updateToothHistoryEntry);
router.delete('/:patientId/:toothNumber/history/:historyId', deleteToothHistoryEntry);
router.delete('/:patientId/:toothNumber/history', deleteToothHistoryEntry);

module.exports = router;
