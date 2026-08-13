const express = require('express');
const {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  disableUser,
  listDoctors,
} = require('../controllers/userController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Doctor listing for appointments (Receptionist, Admin & Doctor)
router.get('/doctors', protect, allowRoles('admin', 'receptionist', 'doctor'), listDoctors);

// Every route below is Admin-only per PRD section 4 & 27.
router.use(protect, allowRoles('admin'));

router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.post('/:id/reset-password', resetPassword);
router.patch('/:id/disable', disableUser);

module.exports = router;
