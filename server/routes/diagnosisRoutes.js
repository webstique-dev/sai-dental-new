const express = require('express');
const {
  listDiagnoses,
  createDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
} = require('../controllers/diagnosisController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Protected for Doctor and Admin
router.use(protect, allowRoles('doctor', 'admin'));

router.get('/', listDiagnoses);
router.post('/', createDiagnosis);
router.patch('/:id', updateDiagnosis);
router.delete('/:id', deleteDiagnosis);

module.exports = router;
