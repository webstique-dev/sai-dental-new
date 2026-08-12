const express = require('express');
const {
  listInvoices,
  createInvoice,
  recordPayment,
} = require('../controllers/invoiceController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// Protected for Receptionist and Admin
router.use(protect, allowRoles('receptionist', 'admin'));

router.get('/', listInvoices);
router.post('/', createInvoice);
router.post('/:id/payments', recordPayment);

module.exports = router;
