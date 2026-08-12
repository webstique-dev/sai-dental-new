import { useState, useEffect } from 'react';
import {
  Wallet, Plus, Search, Trash2, CheckCircle2, AlertTriangle, X,
  FileText, DollarSign, CreditCard, ChevronRight, User, Stethoscope, Eye,
} from 'lucide-react';
import api from '../../api/axios.js';

const STATUS_BADGE_CLASSES = {
  Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Partially Paid': 'bg-amber-100 text-amber-800 border-amber-200',
  Pending: 'bg-rose-100 text-rose-800 border-rose-200',
  Refunded: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [activePaymentInvoice, setActivePaymentInvoice] = useState(null);
  const [showConfirmSettlement, setShowConfirmSettlement] = useState(false);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Generate Invoice Form state
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [items, setItems] = useState([
    { service: 'General Consultation', treatment: 'Dental Exam', quantity: 1, unitPrice: 500 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);

  // Record Payment Form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [catalogItems, setCatalogItems] = useState([]);

  // Fetch doctors & catalog items
  const fetchDoctors = async () => {
    try {
      const [docRes, catRes] = await Promise.all([
        api.get('/users/doctors'),
        api.get('/treatments?active=true').catch(() => ({ data: { treatments: [] } })),
      ]);
      const docs = docRes.data?.doctors || [];
      setDoctors(docs);
      setCatalogItems(catRes.data?.treatments || []);
      if (docs.length > 0) {
        setSelectedDoctorId(docs[0]._id || docs[0].id);
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/invoices?${params.toString()}`);
      setInvoices(res.data?.invoices || []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Live patient search inside Generate Invoice Modal
  useEffect(() => {
    if (!patientSearch || patientSearch.trim().length < 2) {
      setPatientOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/patients?search=${encodeURIComponent(patientSearch)}&limit=5`);
        setPatientOptions(res.data?.patients || []);
      } catch (err) {
        console.error('Patient search error:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Live calculations for Generate Invoice
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0), 0);
  const computedTotal = Math.max(0, subtotal - (Number(discount) || 0) + (Number(tax) || 0));

  const handleAddItem = () => {
    setItems([...items, { service: '', treatment: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const resetGenerateModal = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setPatientOptions([]);
    setSelectedDoctorId(doctors[0]?._id || doctors[0]?.id || '');
    setItems([{ service: 'General Consultation', treatment: 'Dental Exam', quantity: 1, unitPrice: 500 }]);
    setDiscount(0);
    setTax(0);
    setErrorMessage('');
    setShowGenerateModal(false);
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setErrorMessage('Please search and select a patient.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const payload = {
        patient: selectedPatient._id || selectedPatient.id,
        doctor: selectedDoctorId,
        opNumber: selectedPatient.opNumber || '',
        items,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
      };

      await api.post('/invoices', payload);
      setSuccessMessage('Invoice generated successfully!');
      resetGenerateModal();
      fetchInvoices();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to generate invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentModal = (inv) => {
    setActivePaymentInvoice(inv);
    setPaymentAmount(inv.balance > 0 ? inv.balance : '');
    setPaymentMethod('Cash');
    setShowConfirmSettlement(false);
    setErrorMessage('');
  };

  const handlePaymentClick = (e) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      setErrorMessage('Please enter a valid payment amount.');
      return;
    }

    // If payment would fully settle remaining balance, trigger settlement confirmation dialog first
    if (activePaymentInvoice && amt >= activePaymentInvoice.balance) {
      setShowConfirmSettlement(true);
    } else {
      executeRecordPayment();
    }
  };

  const executeRecordPayment = async () => {
    if (!activePaymentInvoice) return;
    setSubmitting(true);
    setErrorMessage('');
    try {
      const invId = activePaymentInvoice._id || activePaymentInvoice.id;
      const res = await api.post(`/invoices/${invId}/payments`, {
        amount: Number(paymentAmount),
        method: paymentMethod,
      });

      setSuccessMessage(`Payment of ₹${paymentAmount} recorded successfully!`);
      setActivePaymentInvoice(null);
      setShowConfirmSettlement(false);
      // Re-fetch invoices to update status badges dynamically without page reload
      fetchInvoices();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <Wallet size={22} className="text-brand" /> Billing & Invoices
          </h2>
          <p className="text-sm text-ink-soft">Generate invoices and record patient payments</p>
        </div>

        <button
          onClick={() => {
            resetGenerateModal();
            setShowGenerateModal(true);
          }}
          className="btn-primary shrink-0"
        >
          <Plus size={18} />
          <span>Generate Invoice</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && !showGenerateModal && !activePaymentInvoice && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800 border border-rose-200">
          <AlertTriangle size={18} className="text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="card p-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            className="input-field pl-9 py-2 text-xs"
            placeholder="Search invoice by patient name, phone, or OP number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <select
            className="input-field py-2 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Payment Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* INVOICE LIST TABLE */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-soft">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Wallet size={36} className="mx-auto text-ink-soft/50" />
            <p className="font-display text-base font-semibold text-ink">No invoices found</p>
            <p className="text-sm text-ink-soft">
              {search || statusFilter ? 'Try clearing your filters.' : 'Click "Generate Invoice" to create a new bill.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Invoice Date</th>
                  <th className="px-5 py-3.5">Patient</th>
                  <th className="px-5 py-3.5">Doctor</th>
                  <th className="px-5 py-3.5">Total Amount</th>
                  <th className="px-5 py-3.5">Amount Paid</th>
                  <th className="px-5 py-3.5">Balance</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => {
                  const invId = inv._id || inv.id;
                  const patientName = inv.patient
                    ? `${inv.patient.firstName} ${inv.patient.lastName}`.trim()
                    : 'Walk-in Patient';
                  const docName = inv.doctor ? `Dr. ${inv.doctor.name}` : 'Unassigned';
                  const dateStr = inv.createdAt
                    ? new Date(inv.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'N/A';

                  return (
                    <tr key={invId} className="hover:bg-bg/60 transition-colors">
                      {/* Invoice Date */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-semibold text-ink text-xs">{dateStr}</div>
                        <div className="text-[11px] text-ink-soft font-mono">
                          ID: {invId.slice(-6).toUpperCase()}
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-ink">{patientName}</div>
                        <div className="text-xs text-brand font-mono">{inv.opNumber || inv.patient?.opNumber || '—'}</div>
                      </td>

                      {/* Doctor */}
                      <td className="px-5 py-4 text-xs text-ink-soft font-medium">
                        {docName}
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4 font-semibold text-ink">
                        ₹{inv.total?.toLocaleString() || 0}
                      </td>

                      {/* Paid */}
                      <td className="px-5 py-4 text-emerald-700 font-medium">
                        ₹{inv.amountPaid?.toLocaleString() || 0}
                      </td>

                      {/* Balance */}
                      <td className="px-5 py-4 font-semibold text-rose-600">
                        ₹{inv.balance?.toLocaleString() || 0}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        <span
                          className={`badge border ${
                            STATUS_BADGE_CLASSES[inv.paymentStatus] || 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedInvoiceDetail(inv)}
                          title="View Invoice Items"
                          className="inline-flex items-center gap-1 rounded-lg border border-border p-1.5 text-xs font-semibold text-ink-soft hover:bg-bg hover:text-ink"
                        >
                          <Eye size={14} /> View
                        </button>

                        {inv.paymentStatus !== 'Paid' && (
                          <button
                            onClick={() => openPaymentModal(inv)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                          >
                            <CreditCard size={14} /> Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GENERATE INVOICE MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="card w-full max-w-2xl p-6 space-y-5 bg-surface max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <FileText size={20} className="text-brand" /> Generate New Invoice
              </h3>
              <button onClick={resetGenerateModal} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleGenerateInvoice} className="space-y-5">
              {/* Patient & Doctor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Patient Search */}
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Select Patient *</label>
                  {selectedPatient ? (
                    <div className="flex items-center justify-between rounded-xl border border-brand bg-brand-light/20 p-3">
                      <div>
                        <p className="text-xs font-bold text-ink">
                          {selectedPatient.firstName} {selectedPatient.lastName}
                        </p>
                        <p className="text-[11px] text-ink-soft">
                          OP: <span className="font-mono text-brand">{selectedPatient.opNumber}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPatient(null)}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="Search patient name, OP, phone..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                      />
                      {patientOptions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-xl border border-border bg-surface shadow-card max-h-44 overflow-y-auto">
                          {patientOptions.map((p) => {
                            const pId = p._id || p.id;
                            return (
                              <div
                                key={pId}
                                onClick={() => {
                                  setSelectedPatient(p);
                                  setPatientSearch('');
                                  setPatientOptions([]);
                                }}
                                className="p-2.5 text-xs border-b border-border/50 hover:bg-brand-light/30 cursor-pointer"
                              >
                                <span className="font-bold text-ink">{p.firstName} {p.lastName}</span>{' '}
                                <span className="text-brand font-mono">({p.opNumber})</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Doctor Select */}
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Attending Doctor</label>
                  <select
                    className="input-field text-xs"
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((d) => {
                      const docId = d._id || d.id;
                      return (
                        <option key={docId} value={docId}>
                          Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                    Treatment & Service Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto border border-border rounded-xl p-3 bg-bg/30">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-5">
                        <input
                          type="text"
                          list="receptionist-treatment-catalog-list"
                          className="input-field py-1.5 text-xs"
                          placeholder="Service / Procedure"
                          value={item.service}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleItemChange(idx, 'service', val);
                            const match = catalogItems.find((c) => c.name.toLowerCase() === val.toLowerCase());
                            if (match) {
                              if (match.defaultCost !== undefined) {
                                handleItemChange(idx, 'unitPrice', match.defaultCost);
                              }
                              if (match.category) {
                                handleItemChange(idx, 'treatment', match.category);
                              }
                            }
                          }}
                        />
                        <datalist id="receptionist-treatment-catalog-list">
                          {catalogItems.map((c) => (
                            <option key={c._id || c.id} value={c.name}>
                              {c.category ? `[${c.category}] ` : ''}₹{c.defaultCost || 0}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          className="input-field py-1.5 text-xs"
                          placeholder="Treatment"
                          value={item.treatment}
                          onChange={(e) => handleItemChange(idx, 'treatment', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          min="1"
                          className="input-field py-1.5 text-xs text-center"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0"
                          className="input-field py-1.5 text-xs"
                          placeholder="Price"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          disabled={items.length === 1}
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-ink-soft hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount, Tax, & Computed Total */}
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-ink-soft font-semibold mb-1">Discount Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="input-field py-1.5 text-xs"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-ink-soft font-semibold mb-1">Tax Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="input-field py-1.5 text-xs"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border text-sm font-bold">
                  <span className="text-ink">Calculated Total Amount:</span>
                  <span className="text-brand text-lg">₹{computedTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={resetGenerateModal}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {activePaymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="card w-full max-w-md p-6 space-y-4 bg-surface">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <CreditCard size={18} className="text-brand" /> Record Payment
              </h3>
              <button onClick={() => setActivePaymentInvoice(null)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Summary card */}
            <div className="rounded-xl border border-border bg-bg p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-soft font-semibold">Patient:</span>
                <span className="font-bold text-ink">
                  {activePaymentInvoice.patient?.firstName} {activePaymentInvoice.patient?.lastName} ({activePaymentInvoice.opNumber})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft font-semibold">Invoice Total:</span>
                <span className="font-bold text-ink">₹{activePaymentInvoice.total?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft font-semibold">Remaining Balance:</span>
                <span className="font-bold text-rose-600">₹{activePaymentInvoice.balance?.toLocaleString()}</span>
              </div>
            </div>

            {/* Confirmation Alert if payment settles full balance */}
            {showConfirmSettlement ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    Confirm Full Settlement
                  </div>
                  <p>
                    Recording this payment of <strong>₹{paymentAmount}</strong> will fully settle the remaining balance and update the status to <span className="badge bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold">Paid</span>.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => setShowConfirmSettlement(false)}
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={executeRecordPayment}
                    className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
                  >
                    {submitting ? 'Submitting...' : 'Confirm & Settle Invoice'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePaymentClick} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Payment Method *</label>
                  <select
                    className="input-field"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setActivePaymentInvoice(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Submit Payment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* VIEW INVOICE ITEMS DETAIL MODAL */}
      {selectedInvoiceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="card w-full max-w-lg p-6 space-y-4 bg-surface">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink">
                Invoice Breakdown Details
              </h3>
              <button onClick={() => setSelectedInvoiceDetail(null)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <div>
                  <p className="font-bold text-ink text-sm">
                    {selectedInvoiceDetail.patient?.firstName} {selectedInvoiceDetail.patient?.lastName}
                  </p>
                  <p className="text-ink-soft">OP: {selectedInvoiceDetail.opNumber}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`badge border ${
                      STATUS_BADGE_CLASSES[selectedInvoiceDetail.paymentStatus] || ''
                    }`}
                  >
                    {selectedInvoiceDetail.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1">
                <p className="font-semibold text-ink-soft uppercase text-[10px]">Line Items</p>
                <div className="divide-y divide-border border rounded-xl overflow-hidden bg-bg/40">
                  {selectedInvoiceDetail.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between p-2.5">
                      <div>
                        <p className="font-semibold text-ink">{it.service || 'Service'}</p>
                        <p className="text-[11px] text-ink-soft">{it.treatment}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-ink">
                          {it.quantity} x ₹{it.unitPrice}
                        </p>
                        <p className="font-bold text-ink">₹{(it.quantity * it.unitPrice).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments History */}
              {selectedInvoiceDetail.payments?.length > 0 && (
                <div className="space-y-1">
                  <p className="font-semibold text-ink-soft uppercase text-[10px]">Recorded Payments</p>
                  <div className="divide-y divide-border border rounded-xl overflow-hidden bg-bg/40 p-2 space-y-1">
                    {selectedInvoiceDetail.payments.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1">
                        <span>
                          ₹{p.amount} via <strong className="text-brand">{p.method}</strong>
                        </span>
                        <span className="text-ink-soft">
                          {p.date ? new Date(p.date).toLocaleDateString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="border-t border-border pt-3 space-y-1 text-right">
                <p className="text-ink-soft">Discount: -₹{selectedInvoiceDetail.discount || 0}</p>
                <p className="text-ink-soft">Tax: +₹{selectedInvoiceDetail.tax || 0}</p>
                <p className="font-bold text-sm text-ink">Total: ₹{selectedInvoiceDetail.total?.toLocaleString()}</p>
                <p className="text-emerald-700 font-semibold">Amount Paid: ₹{selectedInvoiceDetail.amountPaid?.toLocaleString()}</p>
                <p className="text-rose-600 font-bold">Balance: ₹{selectedInvoiceDetail.balance?.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button className="btn-secondary text-xs" onClick={() => setSelectedInvoiceDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
