const mongoose = require('mongoose');

const paymentStatusOptions = ['Pending', 'Partially Paid', 'Paid', 'Refunded'];
const paymentMethodOptions = ['Cash', 'Card', 'UPI', 'Refund', 'Other'];

const invoiceItemSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      trim: true,
      default: '',
    },
    treatment: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

const paymentRecordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      default: 'Cash',
    },
    type: {
      type: String,
      enum: ['payment', 'refund'],
      default: 'payment',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    opNumber: {
      type: String,
      trim: true,
      default: '',
    },
    items: [invoiceItemSchema],
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: paymentStatusOptions,
      default: 'Pending',
    },
    payments: [paymentRecordSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save calculation helper for total, balance, and paymentStatus
invoiceSchema.pre('save', function (next) {
  // 1. Calculate items subtotal
  const subtotal = (this.items || []).reduce((sum, item) => {
    const qty = item.quantity || 1;
    const price = item.unitPrice || 0;
    return sum + qty * price;
  }, 0);

  // 2. Compute total = subtotal - discount + tax
  const disc = this.discount || 0;
  const taxVal = this.tax || 0;
  this.total = Math.max(0, subtotal - disc + taxVal);

  // 3. Compute amountPaid from payments array (net payments minus refunds)
  this.amountPaid = (this.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);

  // 4. Compute balance = total - amountPaid
  this.balance = Math.max(0, this.total - this.amountPaid);

  // 5. Recompute paymentStatus
  if (this.paymentStatus !== 'Refunded') {
    if (this.amountPaid >= this.total && this.total > 0) {
      this.paymentStatus = 'Paid';
    } else if (this.amountPaid > 0 && this.amountPaid < this.total) {
      this.paymentStatus = 'Partially Paid';
    } else {
      this.paymentStatus = 'Pending';
    }
  }

  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
module.exports.paymentStatusOptions = paymentStatusOptions;
module.exports.paymentMethodOptions = paymentMethodOptions;
