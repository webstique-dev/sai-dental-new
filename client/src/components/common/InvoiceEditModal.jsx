import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Receipt, Plus, Trash2, Save, X, RefreshCw, Tag, CreditCard, Printer, AlertCircle
} from 'lucide-react';
import api from '../../api/axios.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import { openBillPrintWindow } from '../../utils/billPdfGenerator.js';
import { formatPatientFullName, capitalizeWords } from '../../utils/formatters.js';

export default function InvoiceEditModal({
  isOpen,
  invoice,
  onClose,
  onSuccess,
}) {
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Editable Form state
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [currentInvoice, setCurrentInvoice] = useState(null);

  // Initialize or fetch latest invoice data when modal opens
  useEffect(() => {
    if (!isOpen || !invoice) return;

    const invId = invoice._id || invoice.id;
    let isMounted = true;

    async function loadFullInvoice() {
      try {
        setLoading(true);
        setError('');
        let fullData = invoice;

        // Try to fetch full populated invoice if missing items or payments
        if (invId && (!invoice.items || invoice.items.length === 0 || !invoice.doctor?.name)) {
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
        setAmountPaid(fullData.amountPaid !== undefined && fullData.amountPaid !== null ? String(fullData.amountPaid) : '');

        if (fullData.payments && fullData.payments.length > 0) {
          setPaymentMethod(fullData.payments[0].method || 'Cash');
        } else {
          setPaymentMethod('Cash');
        }
      } catch (err) {
        if (isMounted) setError(err.response?.data?.message || 'Failed to load invoice details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFullInvoice();

    return () => {
      isMounted = false;
    };
  }, [isOpen, invoice]);

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
  const numAmountPaid = Math.max(0, Number(amountPaid) || 0);
  const liveBalance = Math.max(0, total - numAmountPaid);

  const liveStatus = useMemo(() => {
    if (numAmountPaid >= total && total > 0) return 'Paid';
    if (numAmountPaid > 0 && numAmountPaid < total) return 'Partially Paid';
    return 'Pending';
  }, [numAmountPaid, total]);

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
    if (!invoice) return;
    const invId = invoice._id || invoice.id;

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

    try {
      setSaving(true);
      setError('');

      const payload = {
        items: validItems,
        discount: numDiscount,
        tax: numTax,
        amountPaid: numAmountPaid,
        paymentMethod,
      };

      const res = await api.put(`/invoices/${invId}`, payload);
      const updated = res.data?.invoice || {
        ...invoice,
        ...payload,
        total,
        balance: liveBalance,
        paymentStatus: liveStatus,
      };

      showSuccess('Bill / Invoice updated successfully.');
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      console.error('Failed to update invoice:', err);
      setError(err.response?.data?.message || 'Failed to update billing details.');
      showError(err.response?.data?.message || 'Failed to update billing details.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const invId = invoice?._id || invoice?.id;
  const patientObj = currentInvoice?.patient || invoice?.patient;
  const patientDisplayName = formatPatientFullName(patientObj) || 'Patient';
  const opNo = patientObj?.opNumber || invoice?.opNumber || 'N/A';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-xs animate-fadeIn overflow-hidden">
      <div className="card w-full max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center font-bold text-sm">
              <Receipt size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-base font-bold text-ink">Edit Bill / Invoice</h3>
                <span className="badge bg-brand/10 text-brand font-mono font-bold text-[10px]">
                  OP #{opNo}
                </span>
              </div>
              <p className="text-xs text-ink-soft">
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
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs scrollbar-none no-scrollbar">
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
                                placeholder="e.g. Scaling & Polishing, Root Canal"
                                value={row.service}
                                onChange={(e) => handleItemChange(idx, 'service', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="e.g. Tooth #16 or notes"
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

              {/* Payment & Calculations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Payment Method */}
                <div className="p-4 rounded-xl bg-bg/40 border border-border space-y-2.5">
                  <label className="block font-bold text-ink text-xs uppercase tracking-wider">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Cash', 'Card', 'UPI'].map((method) => {
                      const isSelected = paymentMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-brand text-white border-brand shadow-sm'
                              : 'bg-surface border-slate-200 text-ink-soft hover:text-ink hover:bg-bg/80'
                          }`}
                        >
                          {method}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-ink-soft">
                    Payment status is automatically set to <strong className="text-ink">{liveStatus}</strong> based on collected amount.
                  </p>
                </div>

                {/* Calculation breakdown */}
                <div className="p-4 rounded-xl bg-bg/50 border border-border space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-ink-soft">Items Subtotal:</span>
                    <span className="font-mono text-ink font-bold text-sm">₹{subtotal.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-ink-soft flex items-center gap-1.5">
                      <Tag size={13} className="text-emerald-700" /> Discount (₹):
                    </span>
                    <div className="relative inline-block w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2.5 py-1 text-xs text-right font-mono text-ink focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-ink-soft">Tax (₹):</span>
                    <div className="relative inline-block w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={tax}
                        onChange={(e) => setTax(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2.5 py-1 text-xs text-right font-mono text-ink focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold text-ink border-t border-border/80 pt-2">
                    <span className="uppercase tracking-wider text-[11px]">Total Invoice:</span>
                    <span className="font-mono text-base font-bold text-brand">₹{total.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs border-t border-border/60 pt-2">
                    <span className="font-bold text-emerald-800">Amount Paid (₹):</span>
                    <div className="relative inline-block w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-mono text-xs font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="w-full rounded-lg border border-emerald-300 bg-white pl-6 pr-2.5 py-1 text-xs text-right font-mono font-bold text-emerald-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold border-t border-border/80 pt-2">
                    <span className="uppercase tracking-wider text-[11px] text-ink">Balance Due:</span>
                    <span
                      className={`font-mono text-sm font-bold px-2 py-0.5 rounded-lg ${
                        liveBalance > 0
                          ? 'text-rose-600 bg-rose-50 border border-rose-200'
                          : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                      }`}
                    >
                      ₹{liveBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-border bg-bg/40 shrink-0">
          <button
            type="button"
            className="btn-secondary py-1.5 px-3.5 text-xs font-bold inline-flex items-center gap-1.5 hover:border-brand/50 hover:text-brand cursor-pointer"
            onClick={() => {
              openBillPrintWindow({
                invoice: {
                  ...currentInvoice,
                  _id: invId,
                  patient: patientObj,
                  opNumber: opNo,
                  items: items.map((it) => ({
                    service: it.service,
                    treatment: it.treatment,
                    quantity: Number(it.quantity) || 1,
                    unitPrice: Number(it.unitPrice) || 0,
                  })),
                  discount: numDiscount,
                  tax: numTax,
                  total,
                  amountPaid: numAmountPaid,
                  balance: liveBalance,
                  paymentStatus: liveStatus,
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
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
