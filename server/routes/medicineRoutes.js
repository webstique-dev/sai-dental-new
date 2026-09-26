const express = require('express');
const { listMedicines, createMedicine } = require('../controllers/medicineController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Allow authenticated receptionist, doctor, admin to get suggestions and add medicines
router.use(protect, allowRoles('receptionist', 'doctor', 'admin'));

router.get('/', listMedicines);
router.post('/', createMedicine);

module.exports = router;
