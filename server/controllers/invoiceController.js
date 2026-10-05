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

    // Role-based doctor restriction: Doctor role can only view their own invoices
    if (req.user && req.user.role === 'doctor') {
      filter.doctor = req.user._id;
    } else if (doctor) {
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
      .sort({ date: -1, createdAt: -1 })
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

    if (req.user && req.user.role === 'doctor') {
      const invoiceDoctorId = invoice.doctor?._id?.toString() || invoice.doctor?.toString();
      const userDoctorId = req.user._id ? req.user._id.toString() : req.user.id?.toString();
      if (invoiceDoctorId && userDoctorId && invoiceDoctorId !== userDoctorId) {
        return res.status(403).json({ message: 'Access denied: You cannot view invoices belonging to other doctors.' });
      }
    }

    return res.json({ invoice });
  } catch (err) {
    next(err);
  }
}

// POST /api/invoices (Generate or update invoice for consultation)
async function createInvoice(req, res, next) {
  try {
    const {
      patient,
      doctor,
      consultation,
      appointment,
      opNumber,
      items,
      discount,
      tax,
      amountPaid,
      paymentMethod,
      paymentDate,
      paymentTime,
      paymentNotes,
      newPayment,
      date,
      createdAt,
    } = req.body;

    const sanitizedItems = Array.isArray(items)
      ? items.map((it) => ({
          service: (it.service || it.treatment || '').trim(),
          treatment: (it.treatment || '').trim(),
          quantity: Math.max(1, Number(it.quantity) || 1),
          unitPrice: Math.max(0, Number(it.unitPrice) || 0),
        }))
      : [];

    const targetDate = date || createdAt ? new Date(date || createdAt) : new Date();

    // Check if an invoice already exists for this consultation or appointment
    let existingInvoice = null;
    if (consultation) {
      existingInvoice = await Invoice.findOne({ consultation });
    }
    if (!existingInvoice && appointment) {
      existingInvoice = await Invoice.findOne({ appointment });
    }

    if (existingInvoice) {
      if (patient) existingInvoice.patient = patient;
      if (doctor) existingInvoice.doctor = doctor;
      if (opNumber) existingInvoice.opNumber = opNumber;
      if (items) existingInvoice.items = sanitizedItems;
      if (discount !== undefined) existingInvoice.discount = Math.max(0, Number(discount) || 0);
      if (tax !== undefined) existingInvoice.tax = Math.max(0, Number(tax) || 0);
      if (targetDate && !isNaN(targetDate.getTime())) {
        existingInvoice.date = targetDate;
        existingInvoice.createdAt = targetDate;
      }

      // Record new payment if provided
      const payToRecord = newPayment || (Number(amountPaid) > 0 && (!existingInvoice.payments || existingInvoice.payments.length === 0) ? {
        amount: Number(amountPaid),
        method: paymentMethod || 'Cash',
        date: paymentDate || targetDate,
        time: paymentTime || '',
        notes: paymentNotes || '',
      } : null);

      if (payToRecord && Number(payToRecord.amount) > 0) {
        if (!existingInvoice.payments) existingInvoice.payments = [];
        existingInvoice.payments.push({
          amount: Number(payToRecord.amount),
          method: payToRecord.method || 'Cash',
          type: 'payment',
          date: payToRecord.date ? new Date(payToRecord.date) : new Date(),
          time: payToRecord.time || '',
          notes: payToRecord.notes || payToRecord.reason || '',
          reason: payToRecord.reason || payToRecord.notes || '',
          recordedBy: req.user ? req.user._id : undefined,
        });
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

    let targetOpNumber = opNumber || '';
    if (patient && !targetOpNumber) {
      const patientDoc = await Patient.findById(patient);
      if (patientDoc) {
        targetOpNumber = patientDoc.opNumber || '';
      }
    }

    const initialPaid = Number(newPayment?.amount || amountPaid) || 0;
    const initialPayments =
      initialPaid > 0
        ? [
            {
              amount: initialPaid,
              method: newPayment?.method || paymentMethod || 'Cash',
              type: 'payment',
              date: newPayment?.date ? new Date(newPayment.date) : (paymentDate ? new Date(paymentDate) : (!isNaN(targetDate.getTime()) ? targetDate : new Date())),
              time: newPayment?.time || paymentTime || '',
              notes: newPayment?.notes || paymentNotes || '',
              reason: newPayment?.reason || paymentNotes || '',
              recordedBy: req.user ? req.user._id : undefined,
            },
          ]
        : [];

    const newInvoice = new Invoice({
      patient,
      doctor,
      consultation: consultation || null,
      appointment: appointment || null,
      opNumber: targetOpNumber,
      date: !isNaN(targetDate.getTime()) ? targetDate : new Date(),
      createdAt: !isNaN(targetDate.getTime()) ? targetDate : new Date(),
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
    const {
      patient,
      doctor,
      consultation,
      appointment,
      opNumber,
      items,
      discount,
      tax,
      amountPaid,
      paymentMethod,
      paymentDate,
      paymentTime,
      paymentNotes,
      newPayment,
      date,
      createdAt,
    } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    if (patient) invoice.patient = patient;
    if (doctor) invoice.doctor = doctor;
    if (consultation !== undefined) invoice.consultation = consultation || null;
    if (appointment !== undefined) invoice.appointment = appointment || null;
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

    const targetDate = date || createdAt ? new Date(date || createdAt) : null;
    if (targetDate && !isNaN(targetDate.getTime())) {
      invoice.date = targetDate;
      invoice.createdAt = targetDate;
    }

    // Append new payment if passed via newPayment
    if (newPayment && Number(newPayment.amount) > 0) {
      if (!invoice.payments) invoice.payments = [];
      invoice.payments.push({
        amount: Number(newPayment.amount),
        method: newPayment.method || 'Cash',
        type: 'payment',
        date: newPayment.date ? new Date(newPayment.date) : new Date(),
        time: newPayment.time || '',
        notes: newPayment.notes || newPayment.reason || '',
        reason: newPayment.reason || newPayment.notes || '',
        recordedBy: req.user ? req.user._id : undefined,
      });
    } else if (amountPaid !== undefined && (!invoice.payments || invoice.payments.length === 0)) {
      // First payment on an unpaid invoice
      const initialPaid = Math.max(0, Number(amountPaid) || 0);
      if (initialPaid > 0) {
        invoice.payments = [
          {
            amount: initialPaid,
            method: paymentMethod || 'Cash',
            type: 'payment',
            date: paymentDate ? new Date(paymentDate) : (targetDate && !isNaN(targetDate.getTime()) ? targetDate : new Date()),
            time: paymentTime || '',
            notes: paymentNotes || '',
            reason: paymentNotes || '',
            recordedBy: req.user ? req.user._id : undefined,
          },
        ];
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
    const { amount, method, date, time, notes, reason, discount } = req.body;

    const paymentAmt = Number(amount);
    if (isNaN(paymentAmt) || paymentAmt <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than zero.' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    if (discount !== undefined) {
      invoice.discount = Math.max(0, Number(discount) || 0);
    }

    if (!invoice.payments) {
      invoice.payments = [];
    }

    invoice.payments.push({
      amount: paymentAmt,
      method: method || 'Cash',
      type: 'payment',
      date: date ? new Date(date) : new Date(),
      time: time || '',
      notes: notes || reason || '',
      reason: reason || notes || '',
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
        paymentAmount: paymentAmt,
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

// DELETE /api/invoices/:id (Delete invoice)
async function deleteInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    if (req.user && req.user.role === 'doctor') {
      const invoiceDoctorId = invoice.doctor?._id?.toString() || invoice.doctor?.toString();
      const userDoctorId = req.user._id ? req.user._id.toString() : req.user.id?.toString();
      if (invoiceDoctorId && userDoctorId && invoiceDoctorId !== userDoctorId) {
        return res.status(403).json({ message: 'Access denied: You cannot delete invoices belonging to other doctors.' });
      }
    }

    const patientId = invoice.patient;
    const invTotal = invoice.total;

    await Invoice.findByIdAndDelete(req.params.id);

    await logAction(req, {
      action: 'deleted invoice',
      entityType: 'Invoice',
      entityId: req.params.id,
      patient: patientId,
      newValue: { deletedAmount: invTotal },
    });

    emitInvoiceUpdate({ _id: req.params.id, patient: patientId, isDeleted: true }, false);

    return res.json({ message: 'Invoice deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  recordPayment,
  refundInvoice,
};
