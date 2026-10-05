import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Receipt, Plus, Trash2, Save, X, RefreshCw, Tag, CreditCard, Printer,
  AlertCircle, Calendar, Clock, CheckCircle2, History, Banknote, QrCode
} from 'lucide-react';
import api from '../../api/axios.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import { openBillPrintWindow } from '../../utils/billPdfGenerator.js';
import {
  formatPatientFullName,
  capitalizeWords,
  combineDateAndTime,
  formatTime12Hour
} from '../../utils/formatters.js';
import DatePicker, { formatToDateString } from './DatePicker.jsx';
import SplitTimeInput from './SplitTimeInput.jsx';

const STATUS_BADGE_STYLES = {
  Paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Partially Paid': 'bg-amber-50 text-amber-800 border-amber-200',
  Pending: 'bg-rose-50 text-rose-800 border-rose-200',
  Refunded: 'bg-purple-50 text-purple-800 border-purple-200',
};

export default function InvoiceEditModal({
  isOpen,
  invoice = null,
  patientId = null,
  patient = null,
  onClose,
  onSuccess,
}) {
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Invoice Base Fields
  const [invoiceDate, setInvoiceDate] = useState(() => formatToDateString(new Date()));
  const [invoiceTime, setInvoiceTime] = useState('09:00 AM');
  const [items, setItems] = useState([{ service: '', treatment: '', quantity: 1, unitPrice: '' }]);
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');

  // Payment History list on existing invoice
  const [payments, setPayments] = useState([]);

  // New / Additional Payment Entry Form Fields
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState(() => formatToDateString(new Date()));
  const [newPaymentTime, setNewPaymentTime] = useState(() => formatTime12Hour(new Date()));
  const [newPaymentMethod, setNewPaymentMethod] = useState('Cash');
  const [newPaymentNotes, setNewPaymentNotes] = useState('');

  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [patientData, setPatientData] = useState(patient || null);

  const isEditMode = Boolean(invoice && (invoice._id || invoice.id));

  // Initialize or fetch latest invoice / patient data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    if (patient) {
      setPatientData(patient);
    } else if (patientId && !invoice?.patient) {
      api.get(`/patients/${patientId}`)
        .then((res) => {
          if (isMounted && res.data?.patient) {
            setPatientData(res.data.patient);
          }
        })
        .catch((e) => console.warn('Could not fetch patient info:', e));
    }

    if (isEditMode) {
      const invId = invoice._id || invoice.id;

      async function loadFullInvoice() {
        try {
          setLoading(true);
          setError('');
          let fullData = invoice;

          if (invId) {
            try {
              const res = await api.get(`/invoices/${invId}`);
              if (res.data?.invoice) {
                fullData = res.data.invoice;
              }
            } catch (e) {
              console.warn('Using passed invoice object:', e);
            }
          }

          if (!isMounted) return;
          setCurrentInvoice(fullData);
          if (fullData.patient) {
            setPatientData(fullData.patient);
          }

          const rawDate = fullData.date || fullData.createdAt || new Date();
          setInvoiceDate(formatToDateString(new Date(rawDate)));
          setInvoiceTime(formatTime12Hour(rawDate));

          const loadedItems = (fullData.items && fullData.items.length > 0)
            ? fullData.items.map((it) => ({
                service: it.service || it.treatment || '',
                treatment: it.treatment && it.treatment !== it.service ? it.treatment : '',
                quantity: Math.max(1, Number(it.quantity) || 1),
                unitPrice: it.unitPrice !== undefined && it.unitPrice !== null ? String(it.unitPrice) : '',
              }))
            : [{ service: '', treatment: '', quantity: 1, unitPrice: '' }];

          setItems(loadedItems);
          setDiscount(fullData.discount ? String(fullData.discount) : '');
          setTax(fullData.tax ? String(fullData.tax) : '');
          setPayments(Array.isArray(fullData.payments) ? fullData.payments : []);

          // Reset new payment entry fields
          setNewPaymentAmount('');
          setNewPaymentDate(formatToDateString(new Date()));
          setNewPaymentTime(formatTime12Hour(new Date()));
          setNewPaymentMethod('Cash');
          setNewPaymentNotes('');
        } catch (err) {
          if (isMounted) setError(err.response?.data?.message || 'Failed to load invoice details.');
        } finally {
          if (isMounted) setLoading(false);
        }
      }

      loadFullInvoice();
    } else {
      // Create mode
      setCurrentInvoice(null);
      setInvoiceDate(formatToDateString(new Date()));
      setInvoiceTime(formatTime12Hour(new Date()));
      setItems([{ service: '', treatment: '', quantity: 1, unitPrice: '' }]);
      setDiscount('');
      setTax('');
      setPayments([]);
      setNewPaymentAmount('');
      setNewPaymentDate(formatToDateString(new Date()));
      setNewPaymentTime(formatTime12Hour(new Date()));
      setNewPaymentMethod('Cash');
      setNewPaymentNotes('');
      setError('');
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, invoice, patientId, patient]);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const q = Math.max(1, Number(it.quantity) || 1);
      const p = Math.max(0, Number(it.unitPrice) || 0);
      return sum + q * p;
    }, 0);
  }, [items]);

  const numDiscount = Math.max(0, Number(discount) || 0);
  const numTax = Math.max(0, Number(tax) || 0);
  const total = Math.max(0, subtotal - numDiscount + numTax);

  // Total already paid from payment records
  const existingPaidSum = useMemo(() => {
    return (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  // If user enters a new payment amount right now
  const enteredNewPaymentAmt = Math.max(0, Number(newPaymentAmount) || 0);

  // Live total paid and balance
  const liveTotalPaid = existingPaidSum + enteredNewPaymentAmt;
  const liveBalance = Math.max(0, total - liveTotalPaid);

  const liveStatus = useMemo(() => {
    if (liveTotalPaid >= total && total > 0) return 'Paid';
    if (liveTotalPaid > 0 && liveTotalPaid < total) return 'Partially Paid';
    return 'Pending';
  }, [liveTotalPaid, total]);

  const handleItemChange = (index, field, value) => {
    let formattedVal = value;
    if (['service', 'treatment'].includes(field)) {
      formattedVal = capitalizeWords(value);
    }
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: formattedVal };
      return copy;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { service: '', treatment: '', quantity: 1, unitPrice: '' }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      setItems([{ service: '', treatment: '', quantity: 1, unitPrice: '' }]);
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    const validItems = items
      .map((it) => ({
        service: capitalizeWords((it.service || it.treatment || '').trim()),
        treatment: capitalizeWords((it.treatment || '').trim()),
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      }))
      .filter((it) => it.service || it.treatment || it.unitPrice > 0);

    if (validItems.length === 0) {
      setError('Please provide at least one procedure or charge line.');
      return;
    }

    if (!invoiceDate || !invoiceDate.trim()) {
      setError('Invoice Date is required.');
      showError('Invoice Date is required.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const combinedDateObj = combineDateAndTime(invoiceDate, invoiceTime);
      const isoDate = combinedDateObj.toISOString();

      // Build optional new payment payload if amount was entered
      let newPaymentPayload = null;
      if (enteredNewPaymentAmt > 0) {
        const payDateObj = combineDateAndTime(newPaymentDate, newPaymentTime);
        newPaymentPayload = {
          amount: enteredNewPaymentAmt,
          method: newPaymentMethod || 'Cash',
          date: payDateObj.toISOString(),
          time: newPaymentTime,
          notes: capitalizeWords(newPaymentNotes.trim()),
        };
      }

      const payload = {
        date: isoDate,
        createdAt: isoDate,
        items: validItems,
        discount: numDiscount,
        tax: numTax,
        ...(newPaymentPayload ? { newPayment: newPaymentPayload } : {}),
      };

      let updated;
      if (isEditMode) {
        const invId = invoice._id || invoice.id;
        const res = await api.put(`/invoices/${invId}`, payload);
        updated = res.data?.invoice || {
          ...invoice,
          ...payload,
          total,
          amountPaid: liveTotalPaid,
          balance: liveBalance,
          paymentStatus: liveStatus,
        };
        showSuccess(
          enteredNewPaymentAmt > 0
            ? `Payment of ₹${enteredNewPaymentAmt.toLocaleString()} recorded and invoice updated successfully.`
            : 'Bill / Invoice updated successfully.'
        );
      } else {
        const targetPatientId = patientId || patientData?._id || patientData?.id;
        if (!targetPatientId) {
          setError('Patient ID is required to create a billing record.');
          setSaving(false);
          return;
        }

        const createPayload = {
          patient: targetPatientId,
          opNumber: patientData?.opNumber || '',
          ...payload,
        };
        const res = await api.post('/invoices', createPayload);
        updated = res.data?.invoice;
        showSuccess('New billing invoice generated successfully.');
      }

      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      console.error('Failed to save invoice:', err);
      setError(err.response?.data?.message || 'Failed to save billing details.');
      showError(err.response?.data?.message || 'Failed to save billing details.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const invId = invoice?._id || invoice?.id;
  const patientObj = patientData || currentInvoice?.patient || invoice?.patient;
  const patientDisplayName = formatPatientFullName(patientObj) || 'Patient';
  const opNo = patientObj?.opNumber || invoice?.opNumber || 'N/A';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="card w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center font-bold text-sm shrink-0">
              <Receipt size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-sm font-bold text-ink">
                  {isEditMode ? 'Edit Bill / Invoice' : 'Add New Billing / Invoice Record'}
                </h3>
                <span className="badge bg-brand/10 text-brand font-mono font-bold text-[10px]">
                  OP #{opNo}
                </span>
                <span className={`badge border text-[10px] font-bold py-0.5 px-2 ${STATUS_BADGE_STYLES[liveStatus] || 'bg-slate-100 text-slate-800'}`}>
                  {liveStatus}
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                Patient: <span className="font-bold text-ink">{patientDisplayName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-bg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-xs text-ink-soft space-y-2">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading invoice records...</p>
            </div>
          ) : (
            <>
              {/* Top Strip: Date & Time */}
              <div className="p-3 rounded-xl bg-bg/60 border border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink whitespace-nowrap flex items-center gap-1.5 shrink-0">
                    <Calendar size={14} className="text-brand" />
                    <span>Billing Date:</span>
                  </span>
                  <div className="w-44 sm:w-48">
                    <DatePicker
                      required
                      value={invoiceDate}
                      maxDate={new Date()}
                      onChange={(d, dStr) => setInvoiceDate(dStr)}
                      inputClassName="py-1 text-xs h-[34px]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-start sm:justify-end">
                  <span className="text-xs font-bold text-ink whitespace-nowrap flex items-center gap-1.5 shrink-0">
                    <Clock size={14} className="text-brand" />
                    <span>Time:</span>
                  </span>
                  <div className="w-52 sm:w-56">
                    <SplitTimeInput
                      label=""
                      showIcon={false}
                      value={invoiceTime}
                      onChange={(time12) => setInvoiceTime(time12)}
                      inputClassName="h-[34px]"
                    />
                  </div>
                </div>
              </div>

              {/* Itemized Procedures Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs font-bold text-ink uppercase tracking-wider">
                    Itemized Procedures & Services
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>

                <div className="card overflow-hidden border border-border shadow-2xs">
                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-bg/50 text-ink-soft font-semibold">
                          <th className="py-2 px-3 text-center w-8">#</th>
                          <th className="py-2 px-3">Service / Procedure *</th>
                          <th className="py-2 px-3">Notes / Tooth</th>
                          <th className="py-2 px-3 text-right w-28">Charges (₹)</th>
                          <th className="py-2 px-3 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {items.map((row, idx) => (
                          <tr key={idx} className="hover:bg-bg/25">
                            <td className="py-2 px-3 text-center font-mono text-ink-soft">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                required
                                placeholder="Procedure name..."
                                value={row.service}
                                onChange={(e) => handleItemChange(idx, 'service', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="Tooth or notes..."
                                value={row.treatment}
                                onChange={(e) => handleItemChange(idx, 'treatment', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <div className="relative inline-block w-full">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="50"
                                  placeholder="0"
                                  value={row.unitPrice}
                                  onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2 py-1.5 text-xs text-right font-mono font-bold text-ink focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                title="Remove item"
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Items View */}
                  <div className="sm:hidden divide-y divide-border/60 p-3 space-y-3">
                    {items.map((row, idx) => (
                      <div key={idx} className="space-y-2 pt-2 first:pt-0">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-brand bg-brand-light/50 px-2 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="Service / Procedure Name *"
                          value={row.service}
                          onChange={(e) => handleItemChange(idx, 'service', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Notes / Tooth"
                            value={row.treatment}
                            onChange={(e) => handleItemChange(idx, 'treatment', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                          />
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="50"
                              placeholder="Charges"
                              value={row.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2 py-1.5 text-xs text-right font-mono font-bold text-ink focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2-Column Split: Left Panel (Payment History & Form) | Right Panel (Summary & Totals) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Left Panel: Payment History + Record Installment Form (7 cols) */}
                <div className="md:col-span-7 space-y-3">
                  {/* Payment History Table / List */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                        <History size={13} className="text-brand" /> Payment History ({payments.length})
                      </span>
                      {payments.length > 0 && (
                        <span className="text-[11px] text-emerald-800 font-bold font-mono">
                          Total Paid: ₹{existingPaidSum.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {payments.length > 0 ? (
                      <div className="card overflow-hidden border border-border shadow-2xs max-h-36 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="border-b border-border bg-bg/50 text-ink-soft font-semibold sticky top-0">
                            <tr>
                              <th className="py-1.5 px-2.5 text-center w-6">#</th>
                              <th className="py-1.5 px-2.5">Date & Time</th>
                              <th className="py-1.5 px-2.5">Method</th>
                              <th className="py-1.5 px-2.5">Note/Ref</th>
                              <th className="py-1.5 px-2.5 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {payments.map((p, idx) => {
                              const pDate = p.date ? new Date(p.date) : new Date();
                              const formattedDate = pDate.toLocaleDateString(undefined, {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              });
                              const formattedTime = p.time || pDate.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              });

                              return (
                                <tr key={p._id || idx} className="hover:bg-bg/25">
                                  <td className="py-1.5 px-2.5 text-center font-mono text-ink-soft text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-1.5 px-2.5 font-medium text-ink text-[11px]">
                                    <span>{formattedDate}</span>
                                    <span className="text-[10px] text-ink-soft font-mono ml-1">({formattedTime})</span>
                                  </td>
                                  <td className="py-1.5 px-2.5">
                                    <span className="badge bg-slate-100 text-slate-800 font-semibold text-[9px] border border-slate-200">
                                      {p.method || 'Cash'}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2.5 text-ink-soft text-[11px] truncate max-w-[100px]" title={p.notes || p.reason}>
                                    {p.notes || p.reason || '—'}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-800 text-[11px]">
                                    ₹{(Number(p.amount) || 0).toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-bg/40 border border-dashed border-border text-center text-ink-soft text-[11px]">
                        No payments recorded yet.
                      </div>
                    )}
                  </div>

                  {/* Record Payment Form Section */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[11px] font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard size={13} className="text-emerald-700" />
                        {payments.length === 0 ? 'Record Initial Payment' : 'Add Another Payment to this Invoice'}
                      </span>
                      {liveBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => setNewPaymentAmount(String(liveBalance))}
                          className="text-[10px] font-bold text-brand hover:underline cursor-pointer"
                        >
                          Pay Balance (₹{liveBalance.toLocaleString()})
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Amount */}
                      <div>
                        <label className="block text-[10px] font-bold text-ink mb-1">
                          Amount to Collect (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-700 font-mono text-xs font-bold">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            placeholder="0"
                            value={newPaymentAmount}
                            onChange={(e) => setNewPaymentAmount(e.target.value)}
                            className="w-full rounded-lg border border-emerald-300 bg-white pl-6 pr-2.5 py-1.5 text-xs text-right font-mono font-bold text-emerald-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-[10px] font-bold text-ink mb-1">
                          Payment Method
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {['Cash', 'Card', 'UPI'].map((method) => {
                            const isSelected = newPaymentMethod === method;
                            return (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setNewPaymentMethod(method)}
                                className={`py-1.5 px-1 rounded-lg border text-[10px] font-bold transition-all ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white border-slate-200 text-ink-soft hover:text-ink hover:bg-slate-50'
                                }`}
                              >
                                {method}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-ink mb-1">
                          Payment Date
                        </label>
                        <DatePicker
                          value={newPaymentDate}
                          maxDate={new Date()}
                          onChange={(d, dStr) => setNewPaymentDate(dStr)}
                          inputClassName="py-1 text-xs h-[32px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-ink mb-1">
                          Payment Time
                        </label>
                        <SplitTimeInput
                          label=""
                          value={newPaymentTime}
                          onChange={(t12) => setNewPaymentTime(t12)}
                          inputClassName="h-[32px]"
                        />
                      </div>
                    </div>

                    {/* Note / Reference */}
                    <div>
                      <input
                        type="text"
                        placeholder="Optional payment note / transaction reference..."
                        value={newPaymentNotes}
                        onChange={(e) => setNewPaymentNotes(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                    </div>

                    {enteredNewPaymentAmt > 0 && (
                      <div className="p-2 rounded-lg bg-emerald-100/60 border border-emerald-300 text-emerald-900 text-[11px] font-medium flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={13} className="text-emerald-700" />
                          Adding ₹{enteredNewPaymentAmt.toLocaleString()} via {newPaymentMethod}
                        </span>
                        <span>
                          New Balance: <strong>₹{liveBalance.toLocaleString()}</strong> ({liveStatus})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel: Invoice Calculation Summary (5 cols) */}
                <div className="md:col-span-5 p-4 rounded-xl bg-bg/60 border border-border flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    <span className="font-display text-xs font-bold text-ink uppercase tracking-wider block border-b border-border/80 pb-1.5">
                      Invoice Totals Summary
                    </span>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-ink-soft">Items Subtotal:</span>
                      <span className="font-mono text-ink font-bold">₹{subtotal.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-ink-soft flex items-center gap-1">
                        <Tag size={12} className="text-emerald-700" /> Discount (₹):
                      </span>
                      <div className="relative inline-block w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white pl-5 pr-2 py-1 text-xs text-right font-mono text-ink focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-ink-soft">Tax (₹):</span>
                      <div className="relative inline-block w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={tax}
                          onChange={(e) => setTax(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white pl-5 pr-2 py-1 text-xs text-right font-mono text-ink focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Stat Cards */}
                  <div className="space-y-2 pt-2 border-t border-border/80">
                    <div className="flex justify-between items-center p-2 rounded-lg bg-surface border border-border text-xs font-bold">
                      <span className="uppercase tracking-wider text-[10px] text-ink-soft">Total Invoice:</span>
                      <span className="font-mono text-sm font-bold text-brand">₹{total.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-lg bg-surface border border-border text-xs font-bold">
                      <span className="uppercase tracking-wider text-[10px] text-emerald-800">Total Paid:</span>
                      <span className="font-mono text-sm font-bold text-emerald-700">₹{liveTotalPaid.toLocaleString()}</span>
                    </div>

                    <div className={`flex justify-between items-center p-2 rounded-lg border text-xs font-bold ${
                      liveBalance > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <span className="uppercase tracking-wider text-[10px] text-ink">Balance Due:</span>
                      <span className={`font-mono text-sm font-bold ${liveBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        ₹{liveBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </form>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-border bg-bg/40 shrink-0">
          <button
            type="button"
            className="btn-secondary py-1.5 px-3.5 text-xs font-bold inline-flex items-center gap-1.5 hover:border-brand/50 hover:text-brand cursor-pointer"
            onClick={() => {
              const combinedDateObj = combineDateAndTime(invoiceDate, invoiceTime);
              const isoDate = combinedDateObj.toISOString();

              const allPayments = [...payments];
              if (enteredNewPaymentAmt > 0) {
                const payDateObj = combineDateAndTime(newPaymentDate, newPaymentTime);
                allPayments.push({
                  amount: enteredNewPaymentAmt,
                  method: newPaymentMethod || 'Cash',
                  date: payDateObj.toISOString(),
                  time: newPaymentTime,
                  notes: newPaymentNotes,
                  reason: newPaymentNotes,
                });
              }

              openBillPrintWindow({
                invoice: {
                  ...currentInvoice,
                  _id: invId,
                  patient: patientObj,
                  opNumber: opNo,
                  date: isoDate,
                  createdAt: isoDate,
                  items: items.map((it) => ({
                    service: it.service,
                    treatment: it.treatment,
                    quantity: Number(it.quantity) || 1,
                    unitPrice: Number(it.unitPrice) || 0,
                  })),
                  discount: numDiscount,
                  tax: numTax,
                  total,
                  amountPaid: liveTotalPaid,
                  balance: liveBalance,
                  paymentStatus: liveStatus,
                  payments: allPayments,
                },
              }, true);
            }}
          >
            <Printer size={14} />
            <span>Print Bill</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary py-1.5 px-4 text-xs font-bold cursor-pointer"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="btn-primary py-1.5 px-5 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>
                {saving
                  ? 'Saving...'
                  : enteredNewPaymentAmt > 0
                  ? `Save & Record ₹${enteredNewPaymentAmt.toLocaleString()} Payment`
                  : isEditMode
                  ? 'Save Changes'
                  : 'Create Bill / Invoice'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
