const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');
const { logAction } = require('../middleware/auditLog');

// GET /api/invoices?patient=&doctor=&status=&search=&dateFrom=&dateTo=
async function listInvoices(req, res, next) {
  try {
    const { patient, doctor, status, search, dateFrom, dateTo } = req.query;
    const filter = {};

    if (status) {
      filter.paymentStatus = status;
    }

    if (patient) {
      filter.patient = patient;
    }

    if (doctor) {
      filter.doctor = doctor;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matchingPatients = await Patient.find({
        $or: [
          { firstName: regex },
          { lastName: regex },
          { phone: regex },
          { opNumber: regex },
        ],
      }).select('_id');

      const patientIds = matchingPatients.map((p) => p._id);
      filter.$or = [{ patient: { $in: patientIds } }, { opNumber: regex }];
    }

    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('consultation')
      .populate('createdBy', 'name email')
      .populate('payments.recordedBy', 'name email');

    return res.json({ invoices });
  } catch (err) {
    next(err);
  }
}

// POST /api/invoices (Generate a new invoice)
async function createInvoice(req, res, next) {
  try {
    const { patient, doctor, opNumber, items, discount, tax } = req.body;

    let targetOpNumber = opNumber || '';
    if (patient && !targetOpNumber) {
      const patientDoc = await Patient.findById(patient);
      if (patientDoc) {
        targetOpNumber = patientDoc.opNumber || '';
      }
    }

    const newInvoice = new Invoice({
      patient,
      doctor,
      opNumber: targetOpNumber,
      items: items || [],
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      createdBy: req.user ? req.user._id : undefined,
    });

    await newInvoice.save();

    await logAction(req, {
      action: 'generated invoice',
      entityType: 'Invoice',
      entityId: newInvoice._id,
      patient: newInvoice.patient,
      newValue: {
        totalAmount: newInvoice.totalAmount,
        paidAmount: newInvoice.amountPaid,
        balance: newInvoice.balance,
        status: newInvoice.paymentStatus,
      },
    });

    const populated = await Invoice.findById(newInvoice._id)
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('createdBy', 'name email');

    return res.status(201).json({
      message: 'Invoice generated successfully',
      invoice: populated,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/invoices/:id/payments (Record a payment)
async function recordPayment(req, res, next) {
  try {
    const { amount, method, discount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than zero.' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    if (discount !== undefined) {
      invoice.discount = Math.max(0, Number(discount) || 0);
    }

    invoice.payments.push({
      amount: Number(amount),
      method: method || 'Cash',
      type: 'payment',
      date: new Date(),
      recordedBy: req.user ? req.user._id : undefined,
    });

    // Save triggers pre-save hook to recompute amountPaid, balance, and paymentStatus
    await invoice.save();

    await logAction(req, {
      action: 'recorded payment',
      entityType: 'Invoice',
      entityId: invoice._id,
      patient: invoice.patient,
      newValue: {
        paymentAmount: Number(amount),
        method: method || 'Cash',
        status: invoice.paymentStatus,
        balance: invoice.balance,
      },
    });

    const updated = await Invoice.findById(invoice._id)
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('consultation')
      .populate('createdBy', 'name email')
      .populate('payments.recordedBy', 'name email');

    return res.json({
      message: 'Payment recorded successfully',
      invoice: updated,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/invoices/:id/refund (Admin Only — Issue a refund)
async function refundInvoice(req, res, next) {
  try {
    const { amount, reason } = req.body;

    const refundAmount = Number(amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      return res.status(400).json({ message: 'Valid refund amount greater than zero is required.' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    // Set paymentStatus = 'Refunded'
    invoice.paymentStatus = 'Refunded';

    // Append refund payment record with negative amount
    invoice.payments.push({
      amount: -Math.abs(refundAmount),
      method: 'Refund',
      type: 'refund',
      reason: reason || 'Administrative Refund',
      date: new Date(),
      recordedBy: req.user ? req.user._id : undefined,
    });

    await invoice.save();

    await logAction(req, {
      action: 'issued invoice refund',
      entityType: 'Invoice',
      entityId: invoice._id,
      patient: invoice.patient,
      newValue: { refundAmount, reason: reason || 'Administrative Refund', status: 'Refunded' },
    });

    const updated = await Invoice.findById(invoice._id)
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('createdBy', 'name email')
      .populate('payments.recordedBy', 'name email');

    return res.json({
      message: 'Invoice refund processed successfully',
      invoice: updated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listInvoices,
  createInvoice,
  recordPayment,
  refundInvoice,
};
