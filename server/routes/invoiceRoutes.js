const express = require('express');
const {
  listInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  recordPayment,
  refundInvoice,
} = require('../controllers/invoiceController');
const protect = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const router = express.Router();

// General billing endpoints (list accessible to Doctor, Receptionist, Admin)
router.get('/', protect, allowRoles('receptionist', 'admin', 'doctor'), listInvoices);
router.get('/:id', protect, allowRoles('receptionist', 'admin', 'doctor'), getInvoiceById);

// Create / Update endpoints (Doctor, Receptionist, Admin)
router.post('/', protect, allowRoles('receptionist', 'admin', 'doctor'), createInvoice);
router.put('/:id', protect, allowRoles('receptionist', 'admin', 'doctor'), updateInvoice);
router.patch('/:id', protect, allowRoles('receptionist', 'admin', 'doctor'), updateInvoice);

// Payment recording (Doctor, Receptionist, Admin)
router.post('/:id/payments', protect, allowRoles('receptionist', 'admin', 'doctor'), recordPayment);

// Refund endpoint — strictly Admin only per PRD
router.post('/:id/refund', protect, allowRoles('admin'), refundInvoice);

module.exports = router;

