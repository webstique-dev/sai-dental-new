const express = require('express');
const router = express.Router();
const {
  listTreatmentRecords,
  createTreatmentRecord,
  updateTreatmentRecord,
  deleteTreatmentRecord,
} = require('../controllers/treatmentRecordController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

router.use(protect, allowRoles('doctor', 'admin'));

router.get('/', listTreatmentRecords);
router.post('/', createTreatmentRecord);
router.put('/:id', updateTreatmentRecord);
router.patch('/:id', updateTreatmentRecord);
router.delete('/:id', deleteTreatmentRecord);

module.exports = router;

