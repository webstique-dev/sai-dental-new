import { useState, useEffect } from 'react';
import {
  Wallet, Search, Filter, RefreshCcw, DollarSign, CheckCircle2, AlertTriangle, X,
  CreditCard, Eye, ShieldAlert
} from 'lucide-react';
import api from '../../api/axios.js';
import InvoiceList from '../../components/common/InvoiceList.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';

export default function AdminBilling() {
  const [invoices, setInvoices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals & Actions
  const [refundingInvoice, setRefundingInvoice] = useState(null);
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' });
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await api.get('/users/doctors');
        setDoctors(res.data?.doctors || []);
      } catch (err) {
        console.error('Failed to load doctors list:', err);
      }
    }
    fetchDoctors();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (doctorFilter) params.append('doctor', doctorFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get(`/invoices?${params.toString()}`);
      setInvoices(res.data?.invoices || []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, doctorFilter, dateFrom, dateTo]);

  // Aggregate stats
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
  const totalPending = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const refundedCount = invoices.filter((inv) => inv.paymentStatus === 'Refunded').length;

  const handleOpenRefund = (inv) => {
    setRefundingInvoice(inv);
    setRefundForm({
      amount: inv.amountPaid > 0 ? inv.amountPaid : inv.total || 0,
      reason: 'Administrative Refund',
    });
    setErrorMessage('');
  };

  const handleExecuteRefund = async (e) => {
    e.preventDefault();
    if (!refundingInvoice) return;

    const amt = Number(refundForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid refund amount greater than zero.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const invId = refundingInvoice._id || refundingInvoice.id;
      await api.post(`/invoices/${invId}/refund`, {
        amount: amt,
        reason: refundForm.reason.trim(),
      });

      setSuccessMessage('Invoice refund processed successfully and status set to Refunded.');
      setRefundingInvoice(null);
      fetchInvoices();
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to issue refund. Check Admin permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <Wallet size={26} className="text-brand" /> Clinic Billing & Refund Oversight
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Read-only financial oversight with administrative refund authorization per clinic controls.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 border border-rose-200">
          <AlertTriangle size={16} className="text-rose-600" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="ml-auto text-rose-600 hover:text-rose-800">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced Value"
          value={`₹${totalInvoiced.toLocaleString()}`}
          sub={`${invoices.length} invoices in view`}
          icon={CreditCard}
        />
        <StatCard
          title="Collected Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          sub="Payments received"
          icon={DollarSign}
        />
        <StatCard
          title="Pending Balances"
          value={`₹${totalPending.toLocaleString()}`}
          sub="Uncollected patient dues"
          icon={Wallet}
        />
        <StatCard
          title="Refunded Invoices"
          value={String(refundedCount)}
          sub="Processed refunds"
          icon={RefreshCcw}
        />
      </div>

      {/* Filter Bar */}
      <div className="card p-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 bg-surface">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            className="input-field pl-9 py-2 text-xs"
            placeholder="Search OP #, patient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <select
            className="input-field py-2 text-xs"
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
          >
            <option value="">All Doctors</option>
            {doctors.map((d) => (
              <option key={d._id || d.id} value={d._id || d.id}>
                Dr. {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            className="input-field py-2 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>

        <div>
          <DatePicker
            value={dateFrom}
            onChange={(date, dateStr) => setDateFrom(dateStr)}
            placeholder="From Date"
            inputClassName="py-1 text-xs"
          />
        </div>

        <div>
          <DatePicker
            value={dateTo}
            onChange={(date, dateStr) => setDateTo(dateStr)}
            placeholder="To Date"
            inputClassName="py-1 text-xs"
          />
        </div>
      </div>

      {/* INVOICE LIST TABLE */}
      <div className="card overflow-hidden">
        <InvoiceList
          invoices={invoices}
          loading={loading}
          allowPayment={false}
          allowRefund={true}
          onRefund={handleOpenRefund}
          onViewDetail={(inv) => setSelectedInvoiceDetail(inv)}
        />
      </div>

      {/* ADMIN REFUND MODAL */}
      {refundingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
          <div className="card max-w-md w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-rose-700 flex items-center gap-2">
                <RefreshCcw size={18} /> Issue Administrative Refund
              </h3>
              <button onClick={() => setRefundingInvoice(null)} className="p-1 text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteRefund} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 text-xs">
                <div className="bg-rose-50 p-3 rounded-lg border border-rose-200 text-xs text-rose-800 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <ShieldAlert size={14} /> Admin Authorization Required
                  </p>
                  <p>
                    Refunding will mark invoice <strong className="font-mono">OP #{refundingInvoice.opNumber}</strong> as{' '}
                    <strong>Refunded</strong> and append a negative refund entry to payment history.
                  </p>
                </div>
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Refund Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="input-field py-1.5 font-mono"
                    value={refundForm.amount}
                    onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Reason for Refund</label>
                  <textarea
                    rows={2}
                    required
                    className="input-field py-1.5"
                    placeholder="State reason (e.g. Service cancellation, billing correction)..."
                    value={refundForm.reason}
                    onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setRefundingInvoice(null)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary bg-rose-600 hover:bg-rose-700 py-1.5 px-4 text-xs font-bold"
                >
                  {submitting ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW INVOICE DETAIL MODAL */}
      {selectedInvoiceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
          <div className="card max-w-lg w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <div>
                <span className="badge bg-brand/10 text-brand font-mono font-bold text-xs mb-1 inline-block">
                  OP #{selectedInvoiceDetail.opNumber}
                </span>
                <h3 className="font-display text-base font-bold text-ink">Invoice Breakdown</h3>
              </div>
              <button onClick={() => setSelectedInvoiceDetail(null)} className="p-1 text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs space-y-4">

              <div className="text-xs space-y-2">
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-ink-soft font-semibold">Patient Name:</span>
                  <span className="font-bold text-ink">
                    {selectedInvoiceDetail.patient?.firstName} {selectedInvoiceDetail.patient?.lastName}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-ink-soft font-semibold">Doctor:</span>
                  <span className="font-bold text-ink">Dr. {selectedInvoiceDetail.doctor?.name || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-ink-soft font-semibold">Payment Status:</span>
                  <span className="font-bold text-brand">{selectedInvoiceDetail.paymentStatus}</span>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2 border-t border-border pt-2">
                <h4 className="font-bold text-xs text-ink uppercase tracking-wider">Line Items</h4>
                <div className="space-y-1 text-xs">
                  {(selectedInvoiceDetail.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-bg rounded">
                      <span>
                        {item.service} {item.treatment ? `(${item.treatment})` : ''} x{item.quantity || 1}
                      </span>
                      <span className="font-mono font-bold">₹{((item.quantity || 1) * (item.unitPrice || 0)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments History */}
              <div className="space-y-2 border-t border-border pt-2">
                <h4 className="font-bold text-xs text-ink uppercase tracking-wider">Payment / Refund Log</h4>
                <div className="space-y-1 text-xs">
                  {(!selectedInvoiceDetail.payments || selectedInvoiceDetail.payments.length === 0) ? (
                    <p className="text-ink-soft italic">No payments logged yet.</p>
                  ) : (
                    selectedInvoiceDetail.payments.map((p, idx) => (
                      <div key={idx} className="flex justify-between p-2 bg-bg rounded">
                        <span>
                          {p.method} {p.reason ? `— ${p.reason}` : ''} ({new Date(p.date).toLocaleDateString()})
                        </span>
                        <span className={`font-mono font-bold ${p.amount < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                          ₹{p.amount.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-between border-t border-border pt-3 font-bold text-sm text-ink">
                  <span>Grand Total:</span>
                  <span className="text-brand">₹{selectedInvoiceDetail.total?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
              <button
                onClick={() => setSelectedInvoiceDetail(null)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
