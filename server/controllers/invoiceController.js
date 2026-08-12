const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');

// GET /api/invoices?patient=&status=
async function listInvoices(req, res, next) {
  try {
    const { patient, status, search } = req.query;
    const filter = {};

    if (status) {
      filter.paymentStatus = status;
    }

    if (patient) {
      filter.patient = patient;
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
    const { amount, method } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than zero.' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    invoice.payments.push({
      amount: Number(amount),
      method: method || 'Cash',
      date: new Date(),
      recordedBy: req.user ? req.user._id : undefined,
    });

    // Save triggers pre-save hook to recompute amountPaid, balance, and paymentStatus
    await invoice.save();

    const updated = await Invoice.findById(invoice._id)
      .populate('patient', 'firstName lastName opNumber phone age sex')
      .populate('doctor', 'name email role specialization')
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

module.exports = {
  listInvoices,
  createInvoice,
  recordPayment,
};
