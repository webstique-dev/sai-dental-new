const express = require('express');
const {
  listInvestigations,
  createInvestigation,
  updateInvestigation,
  deleteInvestigation,
} = require('../controllers/investigationController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Protected for Doctor and Admin
router.use(protect, allowRoles('doctor', 'admin'));

router.get('/', listInvestigations);
router.post('/', createInvestigation);
router.patch('/:id', updateInvestigation);
router.delete('/:id', deleteInvestigation);

module.exports = router;
