const express = require('express');
const { getExamination, upsertExamination, updateExaminationById } = require('../controllers/examinationController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Strictly protected for Doctor and Admin
router.use(protect, allowRoles('doctor', 'admin'));

router.get('/', getExamination);
router.post('/', upsertExamination);
router.put('/:id', updateExaminationById);
router.patch('/:id', updateExaminationById);

module.exports = router;
