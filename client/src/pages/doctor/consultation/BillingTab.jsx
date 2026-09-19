import { useState, useEffect } from 'react';
import {
  Receipt, Plus, Trash2, Save, RefreshCw, Tag, History,
  Eye, X, Stethoscope, Clock, CreditCard, UserSquare2, ChevronRight
} from 'lucide-react';
import api from '../../../api/axios.js';
import { useNotification } from '../../../context/NotificationContext.jsx';
import { formatAge } from '../../../utils/formatters.js';

const STATUS_BADGE_CLASSES = {
  Paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Partially Paid': 'bg-amber-50 text-amber-800 border-amber-200',
  Pending: 'bg-rose-50 text-rose-800 border-rose-200',
  Refunded: 'bg-purple-50 text-purple-800 border-purple-200',
};

function formatReadableDate(dateInput) {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BillingTab({ consultation, isReadOnly = false }) {
  const consultationId = consultation?._id || consultation?.id;
  const patientId = consultation?.patient?._id || consultation?.patient?.id;
  const doctorId = consultation?.doctor?._id || consultation?.doctor?.id;
  const { showSuccess, showError } = useNotification();

  // Active Consultation Invoice state
  const [invoiceId, setInvoiceId] = useState(null);
  const [invoiceStatus, setInvoiceStatus] = useState('Pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // Form Fields
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Patient History State
  const [historyInvoices, setHistoryInvoices] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryInvoice, setSelectedHistoryInvoice] = useState(null);

  // Function to load all historical invoices for this patient
  const fetchPatientBillingHistory = async () => {
    if (!patientId) return;
    try {
      setLoadingHistory(true);
      const res = await api.get(`/invoices?patient=${patientId}`);
      setHistoryInvoices(res.data?.invoices || []);
    } catch (err) {
      console.error('Failed to load patient invoice history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load existing invoice or pre-fill from consultation treatment plans / records
  useEffect(() => {
    let isMounted = true;

    async function loadBillingData() {
      if (!consultationId) return;
      try {
        setLoading(true);
        // 1. Check if an invoice already exists for this consultation
        const invRes = await api.get(`/invoices?consultation=${consultationId}`);
        const existingInvoices = invRes.data?.invoices || [];

        if (!isMounted) return;

        if (existingInvoices.length > 0) {
          const inv = existingInvoices[0];
          setInvoiceId(inv._id || inv.id);
          setInvoiceStatus(inv.paymentStatus || 'Pending');
          setDiscount(inv.discount !== undefined && inv.discount !== null && inv.discount !== 0 ? String(inv.discount) : '');
          setTax(inv.tax !== undefined && inv.tax !== null && inv.tax !== 0 ? String(inv.tax) : '');
          setAmountPaid(inv.amountPaid !== undefined && inv.amountPaid !== null && inv.amountPaid !== 0 ? String(inv.amountPaid) : '');
          setLastSavedAt(inv.updatedAt || inv.createdAt);

          if (inv.payments && inv.payments.length > 0) {
            setPaymentMethod(inv.payments[0].method || 'Cash');
          }

          if (inv.items && inv.items.length > 0) {
            setItems(
              inv.items.map((it) => ({
                service: it.service || it.treatment || '',
                treatment: it.treatment && it.treatment !== it.service ? it.treatment : '',
                quantity: Math.max(1, Number(it.quantity) || 1),
                unitPrice: it.unitPrice !== undefined && it.unitPrice !== null ? String(it.unitPrice) : '',
              }))
            );
          } else {
            setItems([{ service: '', treatment: '', quantity: 1, unitPrice: '' }]);
          }
        } else {
          // No invoice exists yet — check for treatment plans / records to pre-fill
          setInvoiceId(null);
          setInvoiceStatus('Pending');
          setDiscount('');
          setTax('');
          setAmountPaid('');
          setLastSavedAt(null);

          try {
            const [plansRes, recordsRes] = await Promise.all([
              api.get(`/treatment-plans?consultation=${consultationId}`).catch(() => ({ data: { treatmentPlans: [] } })),
              api.get(`/treatment-records?consultation=${consultationId}`).catch(() => ({ data: { treatmentRecords: [] } })),
            ]);

            const plans = plansRes.data?.treatmentPlans || [];
            const records = recordsRes.data?.treatmentRecords || [];

            const prefilledItems = [];

            // From completed/performed records first
            records.forEach((rec) => {
              if (rec.procedure) {
                prefilledItems.push({
                  service: rec.procedure,
                  treatment: rec.tooth ? `Tooth #${rec.tooth}` : '',
                  quantity: 1,
                  unitPrice: rec.charges ? String(rec.charges) : '',
                });
              }
            });

            // From treatment plans if not already covered
            plans.forEach((plan) => {
              if (plan.treatment) {
                prefilledItems.push({
                  service: plan.treatment,
                  treatment: plan.tooth ? `Tooth #${plan.tooth}` : '',
                  quantity: 1,
                  unitPrice: plan.estimatedCost ? String(plan.estimatedCost) : '',
                });
              }
            });

            if (!isMounted) return;

            if (prefilledItems.length > 0) {
              setItems(prefilledItems);
            } else {
              setItems([{ service: '', treatment: '', quantity: 1, unitPrice: '' }]);
            }
          } catch {
            if (isMounted) {
              setItems([{ service: '', treatment: '', quantity: 1, unitPrice: '' }]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load consultation billing:', err);
        if (isMounted) {
          showError('Failed to fetch invoice details.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBillingData();
    fetchPatientBillingHistory();

    return () => {
      isMounted = false;
    };
  }, [consultationId, patientId]);

  // Repeatable rows handlers
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { service: '', treatment: '', quantity: 1, unitPrice: '' }]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => {
      if (prev.length <= 1) {
        return [{ service: '', treatment: '', quantity: 1, unitPrice: '' }];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Live client-side calculations for immediate feedback
  const subtotal = items.reduce((sum, it) => {
    const price = Math.max(0, Number(it.unitPrice) || 0);
    const qty = Math.max(1, Number(it.quantity) || 1);
    return sum + (price * qty);
  }, 0);

  const numDiscount = Math.max(0, Number(discount) || 0);
  const numTax = Math.max(0, Number(tax) || 0);
  const total = Math.max(0, subtotal - numDiscount + numTax);
  const numAmountPaid = Math.max(0, Number(amountPaid) || 0);
  const liveBalance = Math.max(0, total - numAmountPaid);

  // Live status badge calculation
  const computedPaymentStatus =
    numAmountPaid >= total && total > 0
      ? 'Paid'
      : numAmountPaid > 0 && numAmountPaid < total
      ? 'Partially Paid'
      : 'Pending';

  const statusToDisplay = invoiceId ? invoiceStatus : computedPaymentStatus;

  // Save handler (Create or Update)
  const handleSaveInvoice = async (e) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;

    // Filter valid items
    const validItems = items
      .map((it) => ({
        service: (it.service || '').trim(),
        treatment: (it.treatment || '').trim(),
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      }))
      .filter((it) => it.service.length > 0 || it.unitPrice > 0);

    if (validItems.length === 0) {
      showError('Please add at least one procedure with a name or charge.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        consultation: consultationId,
        patient: patientId,
        doctor: doctorId,
        opNumber: consultation?.patient?.opNumber || '',
        items: validItems,
        discount: numDiscount,
        tax: numTax,
        amountPaid: numAmountPaid,
        paymentMethod: paymentMethod || 'Cash',
      };

      let res;
      if (invoiceId) {
        // Update existing invoice
        res = await api.put(`/invoices/${invoiceId}`, payload);
      } else {
        // Create new invoice linked to this consultation
        res = await api.post('/invoices', payload);
      }

      const savedInv = res.data?.invoice;
      if (savedInv) {
        setInvoiceId(savedInv._id || savedInv.id);
        setInvoiceStatus(savedInv.paymentStatus || 'Pending');
        setDiscount(savedInv.discount !== undefined && savedInv.discount !== null && savedInv.discount !== 0 ? String(savedInv.discount) : '');
        setTax(savedInv.tax !== undefined && savedInv.tax !== null && savedInv.tax !== 0 ? String(savedInv.tax) : '');
        setAmountPaid(savedInv.amountPaid !== undefined && savedInv.amountPaid !== null && savedInv.amountPaid !== 0 ? String(savedInv.amountPaid) : '');
        setLastSavedAt(savedInv.updatedAt || savedInv.createdAt);

        if (savedInv.items && savedInv.items.length > 0) {
          setItems(
            savedInv.items.map((it) => ({
              service: it.service || it.treatment || '',
              treatment: it.treatment && it.treatment !== it.service ? it.treatment : '',
              quantity: Math.max(1, Number(it.quantity) || 1),
              unitPrice: it.unitPrice !== undefined && it.unitPrice !== null ? String(it.unitPrice) : '',
            }))
          );
        }
      }

      showSuccess(invoiceId ? 'Invoice updated successfully!' : 'Invoice generated successfully!');
      fetchPatientBillingHistory();
    } catch (err) {
      console.error('Failed to save invoice:', err);
      showError(err.response?.data?.message || 'Failed to save invoice.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-8 text-center text-xs text-ink-soft space-y-2 bg-surface border-border shadow-sm">
        <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-semibold text-ink">Loading consultation invoice & charges...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">
      {/* SECTION 1: ACTIVE CONSULTATION INVOICE FORM */}
      <div className="card bg-surface border-border shadow-sm overflow-hidden">
        {/* Top Section Header (Responsive) */}
        <div className="p-4 sm:p-5 border-b border-border bg-bg/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center font-bold shrink-0">
              <Receipt size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-sm font-bold text-ink">
                  Itemized Procedures & Charges
                </h3>
                <span className={`badge border text-[10px] font-bold py-0.5 px-2 ${STATUS_BADGE_CLASSES[statusToDisplay] || 'bg-slate-100 text-slate-800'}`}>
                  {statusToDisplay}
                </span>
                {invoiceId && (
                  <span className="badge bg-brand/10 text-brand font-mono text-[10px] font-bold border border-brand/20">
                    OP #{consultation?.patient?.opNumber || 'N/A'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-soft mt-0.5">
                {invoiceId
                  ? `Saved Invoice linked to this visit • Last updated ${lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}`
                  : 'Enter treatment procedures and pricing for this consultation.'}
              </p>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={handleAddItem}
                className="btn-secondary py-1.5 px-3 text-xs font-semibold text-brand inline-flex items-center gap-1 hover:bg-brand-light/30 shadow-2xs cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Row</span>
              </button>
              <button
                type="button"
                onClick={handleSaveInvoice}
                disabled={saving}
                className="btn-primary py-1.5 px-4 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{saving ? 'Saving...' : invoiceId ? 'Update Invoice' : 'Save Invoice'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Procedures & Charges Form Container */}
        <div className="p-3.5 sm:p-5 space-y-4">
          {/* DESKTOP & TABLET TABLE VIEW (Hidden on mobile <640px) */}
          <div className="hidden sm:block border border-border rounded-xl overflow-hidden shadow-2xs bg-surface">
            <div className="overflow-x-auto scrollbar-none no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-bg/60 text-ink-soft font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3.5 w-12 text-center">#</th>
                    <th className="py-3 px-3.5 min-w-[220px]">Service / Procedure Name *</th>
                    <th className="py-3 px-3.5 min-w-[150px]">Notes / Tooth Ref</th>
                    <th className="py-3 px-3.5 w-36 text-right">Charges (₹)</th>
                    {!isReadOnly && <th className="py-3 px-3.5 w-14 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((row, idx) => {
                    const price = Math.max(0, Number(row.unitPrice) || 0);

                    return (
                      <tr key={idx} className="hover:bg-bg/25 transition-colors">
                        {/* Index */}
                        <td className="py-2.5 px-3.5 text-center font-mono text-ink-soft font-medium">
                          {idx + 1}
                        </td>

                        {/* Service / Procedure Name */}
                        <td className="py-2.5 px-3.5">
                          {isReadOnly ? (
                            <span className="font-semibold text-ink">{row.service || '—'}</span>
                          ) : (
                            <input
                              type="text"
                              required
                              placeholder="e.g. Scaling & Polishing, Root Canal"
                              value={row.service}
                              onChange={(e) => handleItemChange(idx, 'service', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition-all shadow-2xs"
                            />
                          )}
                        </td>

                        {/* Notes / Tooth Ref */}
                        <td className="py-2.5 px-3.5">
                          {isReadOnly ? (
                            <span className="text-ink-soft">{row.treatment || '—'}</span>
                          ) : (
                            <input
                              type="text"
                              placeholder="e.g. Tooth #16 or notes"
                              value={row.treatment}
                              onChange={(e) => handleItemChange(idx, 'treatment', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition-all shadow-2xs"
                            />
                          )}
                        </td>

                        {/* Unit Price / Charges */}
                        <td className="py-2.5 px-3.5 text-right">
                          {isReadOnly ? (
                            <span className="font-mono font-bold text-ink">₹{price.toLocaleString()}</span>
                          ) : (
                            <div className="relative inline-block w-full max-w-[130px]">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                placeholder="0"
                                value={row.unitPrice}
                                onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2.5 py-1.5 text-xs text-right font-mono font-bold text-ink focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition-all shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          )}
                        </td>

                        {/* Remove Action */}
                        {!isReadOnly && (
                          <td className="py-2.5 px-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              title="Remove procedure row"
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!isReadOnly && (
              <div className="p-3 bg-bg/20 border-t border-border/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Another Procedure Row</span>
                </button>
                <span className="text-[11px] text-ink-soft font-medium">
                  {items.filter((it) => it.service?.trim()).length} procedure line(s)
                </span>
              </div>
            )}
          </div>

          {/* MOBILE STACKED CARD VIEW (Shown on <640px) */}
          <div className="block sm:hidden space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-ink text-xs uppercase tracking-wider">
                Procedures List ({items.length})
              </span>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={14} /> Add Row
                </button>
              )}
            </div>

            <div className="space-y-3">
              {items.map((row, idx) => {
                const price = Math.max(0, Number(row.unitPrice) || 0);

                return (
                  <div key={idx} className="p-3.5 rounded-xl border border-border bg-bg/20 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-brand bg-brand-light/50 px-2 py-0.5 rounded-md">
                        #{idx + 1}
                      </span>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                        Service / Procedure Name *
                      </label>
                      {isReadOnly ? (
                        <span className="font-semibold text-ink text-xs">{row.service || '—'}</span>
                      ) : (
                        <input
                          type="text"
                          placeholder="e.g. Scaling & Polishing, Root Canal"
                          value={row.service}
                          onChange={(e) => handleItemChange(idx, 'service', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                          Notes / Tooth
                        </label>
                        {isReadOnly ? (
                          <span className="text-ink-soft text-xs">{row.treatment || '—'}</span>
                        ) : (
                          <input
                            type="text"
                            placeholder="e.g. Tooth #16"
                            value={row.treatment}
                            onChange={(e) => handleItemChange(idx, 'treatment', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                          Charges (₹)
                        </label>
                        {isReadOnly ? (
                          <span className="font-mono font-bold text-ink text-xs">₹{price.toLocaleString()}</span>
                        ) : (
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="50"
                              placeholder="0"
                              value={row.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2.5 py-1.5 text-xs text-right font-mono font-bold text-ink focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Details & Calculations Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Left Column: Payment Collection Method & Real-Time Sync Info (5 cols) */}
            <div className="lg:col-span-5 space-y-3.5">
              <div className="p-4 rounded-xl bg-bg/40 border border-border space-y-2.5">
                <label className="block font-bold text-ink text-xs uppercase tracking-wider">
                  Payment Collection Method
                </label>
                {isReadOnly ? (
                  <div className="font-semibold text-ink font-mono bg-surface p-2 rounded-lg border border-border inline-block">
                    {paymentMethod}
                  </div>
                ) : (
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
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-brand-soft/20 border border-brand/20 text-ink-soft text-[11px] leading-relaxed flex items-start gap-2.5">
                <div className="h-5 w-5 rounded-md bg-brand-light text-brand flex items-center justify-center shrink-0 font-bold mt-0.5">
                  i
                </div>
                <div>
                  <span className="font-bold text-brand block mb-0.5">Real-time Financial Sync</span>
                  Invoices saved here are automatically synchronized with the Patient EMR and the Clinic Billing dashboard.
                </div>
              </div>
            </div>

            {/* Right Column: Calculations & Live Totals Breakdown (7 cols) */}
            <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl bg-bg/50 border border-border space-y-3">
              {/* Items Subtotal */}
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-ink-soft">Items Subtotal:</span>
                <span className="font-mono text-ink font-bold text-sm">₹{subtotal.toLocaleString()}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-ink-soft flex items-center gap-1.5">
                  <Tag size={13} className="text-emerald-700" /> Discount (₹):
                </span>
                {isReadOnly ? (
                  <span className="font-mono font-bold text-emerald-700">
                    {numDiscount > 0 ? `-₹${numDiscount.toLocaleString()}` : '₹0'}
                  </span>
                ) : (
                  <div className="relative inline-block w-28 sm:w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2.5 py-1.5 text-xs text-right font-mono text-ink focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition-all shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                )}
              </div>

              {/* Tax */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-ink-soft">Tax (₹):</span>
                {isReadOnly ? (
                  <span className="font-mono font-medium text-ink">
                    {numTax > 0 ? `+₹${numTax.toLocaleString()}` : '₹0'}
                  </span>
                ) : (
                  <div className="relative inline-block w-28 sm:w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2.5 py-1.5 text-xs text-right font-mono text-ink focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition-all shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                )}
              </div>

              {/* Total Invoice Amount */}
              <div className="flex justify-between items-center text-xs font-bold text-ink border-t border-border/80 pt-2.5">
                <span className="uppercase tracking-wider text-[11px]">Total Invoice Amount:</span>
                <span className="font-mono text-base font-bold text-brand">₹{total.toLocaleString()}</span>
              </div>

              {/* Amount Paid */}
              <div className="flex items-center justify-between gap-3 text-xs border-t border-border/60 pt-2.5">
                <span className="font-bold text-emerald-800">Amount Paid (₹):</span>
                {isReadOnly ? (
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    ₹{numAmountPaid.toLocaleString()}
                  </span>
                ) : (
                  <div className="relative inline-block w-28 sm:w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-mono text-xs font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full rounded-lg border border-emerald-300 bg-white pl-6 pr-2.5 py-1.5 text-xs text-right font-mono font-bold text-emerald-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                )}
              </div>

              {/* Balance Due (Live-computed, READ-ONLY, NOT an input field) */}
              <div className="flex justify-between items-center text-xs font-bold border-t border-border/80 pt-2.5">
                <span className="uppercase tracking-wider text-[11px] text-ink">Balance Due:</span>
                <span
                  className={`font-mono text-base font-bold px-2 py-0.5 rounded-lg ${
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

          {/* Bottom Save Action Bar */}
          {!isReadOnly && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={handleSaveInvoice}
                disabled={saving}
                className="btn-primary w-full sm:w-auto py-2.5 px-7 text-xs font-bold inline-flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                <span>{saving ? 'Saving Invoice...' : invoiceId ? 'Update Invoice & Balance' : 'Save Invoice & Record'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: PATIENT'S PREVIOUS BILLING HISTORY */}
      <div className="card bg-surface border-border shadow-sm overflow-hidden space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <History size={16} />
            </div>
            <div>
              <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                Patient Billing & Invoice History
              </h4>
              <p className="text-[11px] text-ink-soft">
                All historical billing records and payment logs for this patient.
              </p>
            </div>
          </div>
          <span className="badge bg-slate-100 text-slate-700 font-mono text-[11px] border border-slate-200">
            {historyInvoices.length} Record(s)
          </span>
        </div>

        {loadingHistory ? (
          <div className="p-6 text-center text-xs text-ink-soft space-y-1">
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading billing history...</p>
          </div>
        ) : historyInvoices.length > 0 ? (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden sm:block border border-border/80 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto scrollbar-none no-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg/60 text-ink-soft font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3.5">Invoice Date</th>
                      <th className="py-2.5 px-3.5">Doctor</th>
                      <th className="py-2.5 px-3.5">Services / Items</th>
                      <th className="py-2.5 px-3.5 text-right">Total (₹)</th>
                      <th className="py-2.5 px-3.5 text-right">Paid (₹)</th>
                      <th className="py-2.5 px-3.5 text-right">Balance (₹)</th>
                      <th className="py-2.5 px-3.5 text-center">Status</th>
                      <th className="py-2.5 px-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {historyInvoices.map((inv) => {
                      const invId = inv._id || inv.id;
                      const isCurrentConsultation =
                        inv.consultation === consultationId ||
                        inv.consultation?._id === consultationId ||
                        inv._id === invoiceId;
                      const docName = inv.doctor ? `Dr. ${inv.doctor.name}` : 'Clinic Visit';
                      const itemsSummary = (inv.items || [])
                        .map((item) => (item.service || item.treatment || '').trim())
                        .filter(Boolean)
                        .join(', ') || 'Dental Treatment';

                      return (
                        <tr key={invId} className="hover:bg-bg/25 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-ink whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{formatReadableDate(inv.createdAt)}</span>
                              {isCurrentConsultation && (
                                <span className="badge bg-brand/10 text-brand text-[9px] py-0 px-1 font-bold">
                                  Current Visit
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-3.5 text-ink-soft whitespace-nowrap font-medium">
                            {docName}
                          </td>

                          <td className="py-2.5 px-3.5 text-ink-soft max-w-xs truncate" title={itemsSummary}>
                            <span className="text-ink font-medium">{itemsSummary}</span>
                          </td>

                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-ink whitespace-nowrap">
                            ₹{(inv.total || 0).toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                            ₹{(inv.amountPaid || 0).toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                            <span className={inv.balance > 0 ? 'text-rose-600' : 'text-slate-600'}>
                              ₹{(inv.balance || 0).toLocaleString()}
                            </span>
                          </td>

                          <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                            <span className={`badge border text-[10px] font-bold py-0.5 px-2 ${STATUS_BADGE_CLASSES[inv.paymentStatus] || 'bg-slate-100 text-slate-800'}`}>
                              {inv.paymentStatus || 'Pending'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedHistoryInvoice(inv)}
                              className="btn-secondary py-1 px-2.5 text-xs font-semibold inline-flex items-center gap-1 text-brand hover:underline cursor-pointer"
                              title="View Invoice Details"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Stacked History Cards */}
            <div className="sm:hidden space-y-2.5">
              {historyInvoices.map((inv) => {
                const invId = inv._id || inv.id;
                const isCurrentConsultation =
                  inv.consultation === consultationId ||
                  inv.consultation?._id === consultationId ||
                  inv._id === invoiceId;
                const docName = inv.doctor ? `Dr. ${inv.doctor.name}` : 'Clinic Visit';
                const itemsSummary = (inv.items || [])
                  .map((item) => (item.service || item.treatment || '').trim())
                  .filter(Boolean)
                  .join(', ') || 'Dental Treatment';

                return (
                  <div key={invId} className="p-3.5 rounded-xl border border-border bg-bg/20 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-ink text-xs flex items-center gap-1.5 flex-wrap">
                          <span>{formatReadableDate(inv.createdAt)}</span>
                          {isCurrentConsultation && (
                            <span className="badge bg-brand/10 text-brand text-[9px] py-0 px-1 font-bold">
                              Current Visit
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-ink-soft block">{docName}</span>
                      </div>
                      <span className={`badge border text-[10px] font-bold py-0.5 px-2 shrink-0 ${STATUS_BADGE_CLASSES[inv.paymentStatus] || 'bg-slate-100 text-slate-800'}`}>
                        {inv.paymentStatus || 'Pending'}
                      </span>
                    </div>

                    <p className="text-xs text-ink-soft bg-surface p-2 rounded-lg border border-border">
                      {itemsSummary}
                    </p>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-surface p-2 rounded-lg border border-border">
                      <div>
                        <span className="text-[10px] text-ink-soft block font-semibold">Total</span>
                        <span className="font-mono font-bold text-ink">₹{(inv.total || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-soft block font-semibold">Paid</span>
                        <span className="font-mono font-semibold text-emerald-700">₹{(inv.amountPaid || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-soft block font-semibold">Balance</span>
                        <span className={`font-mono font-bold ${inv.balance > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                          ₹{(inv.balance || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedHistoryInvoice(inv)}
                        className="btn-secondary py-1 px-3 text-xs font-bold text-brand inline-flex items-center gap-1"
                      >
                        <Eye size={13} />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-xs text-ink-soft space-y-1 bg-bg/20 rounded-xl border border-dashed border-border">
            <Receipt size={24} className="mx-auto text-ink-soft/40" />
            <p className="font-semibold text-ink">No prior billing history for this patient</p>
            <p className="text-[11px]">Saved invoices for past visits will appear here.</p>
          </div>
        )}
      </div>

      {/* HISTORICAL INVOICE VIEW DETAILS MODAL */}
      {selectedHistoryInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-xs animate-fadeIn overflow-hidden">
          <div className="card w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center font-bold text-sm">
                  <Receipt size={16} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">
                    Invoice Record Breakdown
                  </h3>
                  <p className="text-xs text-ink-soft">
                    Billed on {formatReadableDate(selectedHistoryInvoice.createdAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryInvoice(null)}
                className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-bg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto scrollbar-none no-scrollbar p-5 space-y-4 text-xs">
              {/* Doctor & Status Details */}
              <div className="p-3.5 rounded-xl bg-bg/60 border border-border/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block">Doctor / Provider</span>
                  <div className="font-bold text-ink text-sm">
                    {selectedHistoryInvoice.doctor ? `Dr. ${selectedHistoryInvoice.doctor.name}` : 'Clinic Provider'}
                  </div>
                </div>
                <div>
                  <span className={`badge border text-[10px] font-bold py-0.5 px-2 ${STATUS_BADGE_CLASSES[selectedHistoryInvoice.paymentStatus] || 'bg-slate-100 text-slate-800'}`}>
                    {selectedHistoryInvoice.paymentStatus || 'Pending'}
                  </span>
                </div>
              </div>

              {/* Itemized Procedures Breakdown */}
              <div className="space-y-2">
                <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope size={14} className="text-brand" /> Itemized Procedures
                </h4>
                <div className="card overflow-hidden border border-border shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft">
                      <tr>
                        <th className="py-2.5 px-4">Procedure / Description</th>
                        <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(selectedHistoryInvoice.items || []).length > 0 ? (
                        selectedHistoryInvoice.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-bg/30">
                            <td className="py-2.5 px-4 font-medium text-ink">
                              {item.service || item.treatment || 'Dental Procedure'}
                              {item.treatment && item.treatment !== item.service && (
                                <span className="block text-[11px] text-ink-soft">{item.treatment}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-ink">
                              ₹{((item.unitPrice || 0) * (item.quantity || 1)).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="py-3 px-4 text-center text-ink-soft italic">
                            General Dental Services
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment History Log (if any) */}
              {selectedHistoryInvoice.payments && selectedHistoryInvoice.payments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={14} className="text-emerald-700" /> Payment Log
                  </h4>
                  <div className="space-y-1.5">
                    {selectedHistoryInvoice.payments.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-bg/50 border border-border font-medium text-xs">
                        <div>
                          <span className="font-bold text-emerald-800">{p.method || 'Payment'}</span>
                          <span className="text-[11px] text-ink-soft block mt-0.5">
                            {new Date(p.date || Date.now()).toLocaleString()}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-700 text-sm">₹{(p.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Totals Breakdown */}
              <div className="p-4 rounded-xl bg-bg/60 border border-border space-y-2 text-xs">
                <div className="flex justify-between font-semibold text-ink-soft">
                  <span>Total Charges:</span>
                  <span className="font-mono text-ink font-bold">₹{(selectedHistoryInvoice.total || 0).toLocaleString()}</span>
                </div>
                {selectedHistoryInvoice.discount > 0 && (
                  <div className="flex justify-between text-ink-soft">
                    <span>Discount Applied:</span>
                    <span className="font-mono text-emerald-700">-₹{selectedHistoryInvoice.discount.toLocaleString()}</span>
                  </div>
                )}
                {selectedHistoryInvoice.tax > 0 && (
                  <div className="flex justify-between text-ink-soft">
                    <span>Tax:</span>
                    <span className="font-mono">+₹{selectedHistoryInvoice.tax.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-800 font-semibold border-t border-border/60 pt-2">
                  <span>Amount Paid / Collected:</span>
                  <span className="font-mono font-bold">₹{(selectedHistoryInvoice.amountPaid || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold border-t border-border/80 pt-2">
                  <span className="text-ink">Balance Due:</span>
                  <span className={`font-mono text-base ${selectedHistoryInvoice.balance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                    ₹{(selectedHistoryInvoice.balance || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-5 py-3 border-t border-border bg-bg/40 shrink-0">
              <button
                type="button"
                className="btn-secondary py-1.5 px-4 text-xs font-bold cursor-pointer"
                onClick={() => setSelectedHistoryInvoice(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
