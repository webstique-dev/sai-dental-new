const express = require('express');
const {
  listTreatmentPlans,
  createTreatmentPlan,
  updateTreatmentPlan,
} = require('../controllers/treatmentPlanController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Protected for Doctor and Admin
router.use(protect, allowRoles('doctor', 'admin'));

router.get('/', listTreatmentPlans);
router.post('/', createTreatmentPlan);
router.patch('/:id', updateTreatmentPlan);

module.exports = router;
