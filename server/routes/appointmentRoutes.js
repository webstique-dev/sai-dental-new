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

// Protected for Receptionist, Admin, and Doctor
router.use(protect, allowRoles('receptionist', 'admin', 'doctor'));

router.get('/', listAppointments);
router.post('/', createAppointment);
router.patch('/:id', updateAppointment);
router.delete('/:id', cancelAppointment);

module.exports = router;
