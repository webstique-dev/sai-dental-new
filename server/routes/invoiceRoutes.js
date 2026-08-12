const express = require('express');
const {
  listInvoices,
  createInvoice,
  recordPayment,
  refundInvoice,
} = require('../controllers/invoiceController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// General billing endpoints accessible to Receptionist and Admin
router.get('/', protect, allowRoles('receptionist', 'admin'), listInvoices);
router.post('/', protect, allowRoles('receptionist', 'admin'), createInvoice);
router.post('/:id/payments', protect, allowRoles('receptionist', 'admin'), recordPayment);

// Refund endpoint — strictly Admin only per PRD
router.post('/:id/refund', protect, allowRoles('admin'), refundInvoice);

module.exports = router;
