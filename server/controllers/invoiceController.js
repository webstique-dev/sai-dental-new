const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');
const { logAction } = require('../middleware/auditLog');
const { buildPatientSearchFilter } = require('../utils/patientSearchHelper');
const { emitInvoiceUpdate } = require('../utils/socket');

// GET /api/invoices?patient=&doctor=&consultation=&status=&search=&dateFrom=&dateTo=
async function listInvoices(req, res, next) {
  try {
    const { patient, doctor, consultation, status, search, dateFrom, dateTo } = req.query;
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

    if (consultation) {
      filter.consultation = consultation;
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

    const patientSearchFilter = buildPatientSearchFilter(search);
    if (patientSearchFilter) {
      const q = search.trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      const matchingPatients = await Patient.find({
        ...patientSearchFilter,
        isDeleted: { $ne: true },
      }).select('_id');

      const patientIds = matchingPatients.map((p) => p._id);
      filter.$or = [{ patient: { $in: patientIds } }, { opNumber: regex }];
    }

    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('consultation')
      .populate('createdBy', 'name email')
      .populate('payments.recordedBy', 'name email');

    return res.json({ invoices });
  } catch (err) {
    next(err);
  }
}

// GET /api/invoices/:id (Fetch single invoice detail)
async function getInvoiceById(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth address')
      .populate('doctor', 'name email role specialization')
      .populate('consultation')
      .populate('createdBy', 'name email')
      .populate('payments.recordedBy', 'name email');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    return res.json({ invoice });
  } catch (err) {
    next(err);
  }
}

// POST /api/invoices (Generate or update invoice for consultation)
async function createInvoice(req, res, next) {
  try {
    const { patient, doctor, consultation, opNumber, items, discount, tax, amountPaid, paymentMethod } = req.body;

    const sanitizedItems = Array.isArray(items)
      ? items.map((it) => ({
          service: (it.service || it.treatment || '').trim(),
          treatment: (it.treatment || '').trim(),
          quantity: Math.max(1, Number(it.quantity) || 1),
          unitPrice: Math.max(0, Number(it.unitPrice) || 0),
        }))
      : [];

    // Check if an invoice already exists for this consultation (Update, don't duplicate pattern)
    if (consultation) {
      let existingInvoice = await Invoice.findOne({ consultation });
      if (existingInvoice) {
        if (patient) existingInvoice.patient = patient;
        if (doctor) existingInvoice.doctor = doctor;
        if (opNumber) existingInvoice.opNumber = opNumber;
        if (items) existingInvoice.items = sanitizedItems;
        if (discount !== undefined) existingInvoice.discount = Math.max(0, Number(discount) || 0);
        if (tax !== undefined) existingInvoice.tax = Math.max(0, Number(tax) || 0);

        if (amountPaid !== undefined) {
          const targetPaid = Math.max(0, Number(amountPaid) || 0);
          if (!existingInvoice.payments || existingInvoice.payments.length === 0) {
            if (targetPaid > 0) {
              existingInvoice.payments = [
                {
                  amount: targetPaid,
                  method: paymentMethod || 'Cash',
                  date: new Date(),
                  recordedBy: req.user ? req.user._id : undefined,
                },
              ];
            }
          } else if (existingInvoice.payments.length === 1) {
            existingInvoice.payments[0].amount = targetPaid;
            if (paymentMethod) existingInvoice.payments[0].method = paymentMethod;
          } else {
            const sumPayments = existingInvoice.payments.reduce((s, p) => s + (p.amount || 0), 0);
            if (targetPaid !== sumPayments) {
              existingInvoice.payments =
                targetPaid > 0
                  ? [
                      {
                        amount: targetPaid,
                        method: paymentMethod || 'Cash',
                        date: new Date(),
                        recordedBy: req.user ? req.user._id : undefined,
                      },
                    ]
                  : [];
            }
          }
        }

        await existingInvoice.save();

        await logAction(req, {
          action: 'updated invoice',
          entityType: 'Invoice',
          entityId: existingInvoice._id,
          patient: existingInvoice.patient,
          newValue: {
            totalAmount: existingInvoice.total,
            paidAmount: existingInvoice.amountPaid,
            balance: existingInvoice.balance,
            status: existingInvoice.paymentStatus,
          },
        });

        const populated = await Invoice.findById(existingInvoice._id)
          .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
          .populate('doctor', 'name email role specialization')
          .populate('consultation')
          .populate('createdBy', 'name email')
          .populate('payments.recordedBy', 'name email');

        emitInvoiceUpdate(populated, false);

        return res.status(200).json({
          message: 'Invoice updated successfully',
          invoice: populated,
        });
      }
    }

    let targetOpNumber = opNumber || '';
    if (patient && !targetOpNumber) {
      const patientDoc = await Patient.findById(patient);
      if (patientDoc) {
        targetOpNumber = patientDoc.opNumber || '';
      }
    }

    const initialPaid = Math.max(0, Number(amountPaid) || 0);
    const initialPayments =
      initialPaid > 0
        ? [
            {
              amount: initialPaid,
              method: paymentMethod || 'Cash',
              date: new Date(),
              recordedBy: req.user ? req.user._id : undefined,
            },
          ]
        : [];

    const newInvoice = new Invoice({
      patient,
      doctor,
      consultation: consultation || null,
      opNumber: targetOpNumber,
      items: sanitizedItems,
      discount: Math.max(0, Number(discount) || 0),
      tax: Math.max(0, Number(tax) || 0),
      payments: initialPayments,
      createdBy: req.user ? req.user._id : undefined,
    });

    await newInvoice.save();

    await logAction(req, {
      action: 'generated invoice',
      entityType: 'Invoice',
      entityId: newInvoice._id,
      patient: newInvoice.patient,
      newValue: {
        totalAmount: newInvoice.total,
        paidAmount: newInvoice.amountPaid,
        balance: newInvoice.balance,
        status: newInvoice.paymentStatus,
      },
    });

    const populated = await Invoice.findById(newInvoice._id)
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('consultation')
      .populate('createdBy', 'name email')
      .populate('payments.recordedBy', 'name email');

    emitInvoiceUpdate(populated, true);

    return res.status(201).json({
      message: 'Invoice generated successfully',
      invoice: populated,
    });
  } catch (err) {
    next(err);
  }
}

// PUT or PATCH /api/invoices/:id (Update existing invoice)
async function updateInvoice(req, res, next) {
  try {
    const { patient, doctor, consultation, opNumber, items, discount, tax, amountPaid, paymentMethod } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    if (patient) invoice.patient = patient;
    if (doctor) invoice.doctor = doctor;
    if (consultation !== undefined) invoice.consultation = consultation || null;
    if (opNumber) invoice.opNumber = opNumber;
    if (items) {
      invoice.items = Array.isArray(items)
        ? items.map((it) => ({
            service: (it.service || it.treatment || '').trim(),
            treatment: (it.treatment || '').trim(),
            quantity: Math.max(1, Number(it.quantity) || 1),
            unitPrice: Math.max(0, Number(it.unitPrice) || 0),
          }))
        : [];
    }
    if (discount !== undefined) invoice.discount = Math.max(0, Number(discount) || 0);
    if (tax !== undefined) invoice.tax = Math.max(0, Number(tax) || 0);

    if (amountPaid !== undefined) {
      const targetPaid = Math.max(0, Number(amountPaid) || 0);
      if (!invoice.payments || invoice.payments.length === 0) {
        if (targetPaid > 0) {
          invoice.payments = [
            {
              amount: targetPaid,
              method: paymentMethod || 'Cash',
              date: new Date(),
              recordedBy: req.user ? req.user._id : undefined,
            },
          ];
        }
      } else if (invoice.payments.length === 1) {
        invoice.payments[0].amount = targetPaid;
        if (paymentMethod) invoice.payments[0].method = paymentMethod;
      } else {
        const sumPayments = invoice.payments.reduce((s, p) => s + (p.amount || 0), 0);
        if (targetPaid !== sumPayments) {
          invoice.payments =
            targetPaid > 0
              ? [
                  {
                    amount: targetPaid,
                    method: paymentMethod || 'Cash',
                    date: new Date(),
                    recordedBy: req.user ? req.user._id : undefined,
                  },
                ]
              : [];
        }
      }
    }

    // Save triggers pre-save hook to recompute subtotal, total, amountPaid, balance, paymentStatus
    await invoice.save();

    await logAction(req, {
      action: 'updated invoice',
      entityType: 'Invoice',
      entityId: invoice._id,
      patient: invoice.patient,
      newValue: {
        totalAmount: invoice.total,
        paidAmount: invoice.amountPaid,
        balance: invoice.balance,
        status: invoice.paymentStatus,
      },
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('consultation')
      .populate('createdBy', 'name email')
      .populate('payments.recordedBy', 'name email');

    emitInvoiceUpdate(populated, false);

    return res.json({
      message: 'Invoice updated successfully',
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
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('consultation')
      .populate('createdBy', 'name email')
      .populate('payments.recordedBy', 'name email');

    emitInvoiceUpdate(updated, false);

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
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('consultation')
      .populate('createdBy', 'name email')
      .populate('payments.recordedBy', 'name email');

    emitInvoiceUpdate(updated, false);

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
  getInvoiceById,
  createInvoice,
  updateInvoice,
  recordPayment,
  refundInvoice,
};
