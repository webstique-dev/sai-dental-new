const express = require('express');
const {
  listAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
} = require('../controllers/appointmentController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Protected for Receptionist and Admin
router.use(protect, allowRoles('receptionist', 'admin'));

router.get('/', listAppointments);
router.post('/', createAppointment);
router.patch('/:id', updateAppointment);
router.delete('/:id', cancelAppointment);

module.exports = router;
