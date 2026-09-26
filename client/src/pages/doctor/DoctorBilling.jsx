import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Search, Eye, Filter, Calendar, X,
  CheckCircle2, AlertCircle, CreditCard, Clock, UserSquare2,
  ChevronDown, ChevronUp, Stethoscope, Printer
} from 'lucide-react';
import { formatAge, formatPatientFullName } from '../../utils/formatters.js';
import { openBillPrintWindow } from '../../utils/billPdfGenerator.js';
import api from '../../api/axios.js';
import StatCard from '../../components/common/StatCard.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import { TableSkeleton } from '../../components/common/TableSkeleton.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';

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

export default function DoctorBilling() {
  // Query & Filter State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Invoices & Details Modal State
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch real invoices from API
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get(`/invoices?${params.toString()}`);
      setInvoices(res.data?.invoices || []);
    } catch (err) {
      console.error('Failed to load billing records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [debouncedSearch, statusFilter, dateFrom, dateTo]);

  // Real-time updates
  useSocketEvent('INVOICE_UPDATED', () => fetchInvoices());
  useSocketEvent('INVOICE_CREATED', () => fetchInvoices());
  useSocketEvent('PAYMENT_RECORDED', () => fetchInvoices());

  // Aggregate stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
  const totalBalance = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = Boolean(searchInput || statusFilter || dateFrom || dateTo);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <Wallet size={26} className="text-brand" /> Clinic Billing & Invoices
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Read-only financial records, invoice summaries, and payment statuses for clinical reference.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced"
          value={`₹${totalInvoiced.toLocaleString()}`}
          sub={`${invoices.length} billing records`}
          icon={CreditCard}
          tone="brand"
        />
        <StatCard
          title="Collected Revenue"
          value={`₹${totalPaid.toLocaleString()}`}
          sub="Payments received"
          icon={CheckCircle2}
          tone="success"
        />
        <div className={totalBalance > 0 ? 'rounded-2xl ring-2 ring-rose-400/50' : ''}>
          <StatCard
            title="Pending Balances"
            value={`₹${totalBalance.toLocaleString()}`}
            sub={totalBalance > 0 ? 'Outstanding patient dues' : 'Fully settled'}
            icon={AlertCircle}
            tone={totalBalance > 0 ? 'danger' : 'success'}
          />
        </div>
        <StatCard
          title="Total Invoices"
          value={String(invoices.length)}
          sub="Total billing files"
          icon={Wallet}
          tone="info"
        />
      </div>

      {/* Desktop Filter Bar (≥768px) */}
      <div className="hidden md:block card p-4 bg-surface border-border space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              placeholder="Search patient, OP #, phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input-field pl-9 py-2 text-xs w-full"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="input-field py-2 text-xs font-semibold w-full"
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

          {/* Date From */}
          <div>
            <DatePicker
              value={dateFrom}
              onChange={(date, dateStr) => setDateFrom(dateStr)}
              placeholder="From Date"
              inputClassName="py-1.5 text-xs w-full"
            />
          </div>

          {/* Date To */}
          <div>
            <DatePicker
              value={dateTo}
              onChange={(date, dateStr) => setDateTo(dateStr)}
              placeholder="To Date"
              inputClassName="py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end pt-1">
            <button
              onClick={clearFilters}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <X size={13} /> Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Mobile Collapsible Filter Accordion (<768px) */}
      <div className="block md:hidden card p-3.5 bg-surface border border-border shadow-xs space-y-3 rounded-2xl max-w-full overflow-hidden">
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-ink gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
              <Filter size={14} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="font-bold text-ink">Filters & Search</span>
              {hasActiveFilters && (
                <span className="badge bg-brand text-white text-[10px] py-0.5 px-2 font-bold shrink-0">
                  Active Filters
                </span>
              )}
            </div>
          </div>
          {isMobileFilterOpen ? <ChevronUp size={16} className="text-ink-soft shrink-0" /> : <ChevronDown size={16} className="text-ink-soft shrink-0" />}
        </button>

        {isMobileFilterOpen && (
          <div className="space-y-2.5 pt-2 border-t border-border/60 animate-fadeIn text-xs">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="text"
                placeholder="Search patient, OP #, phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input-field pl-9 py-2 text-xs w-full"
              />
            </div>

            <select
              className="input-field py-2 text-xs font-semibold w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
            </select>

            <div className="grid grid-cols-2 gap-2">
              <DatePicker
                value={dateFrom}
                onChange={(date, dateStr) => setDateFrom(dateStr)}
                placeholder="From Date"
                inputClassName="py-1.5 text-xs w-full"
              />
              <DatePicker
                value={dateTo}
                onChange={(date, dateStr) => setDateTo(dateStr)}
                placeholder="To Date"
                inputClassName="py-1.5 text-xs w-full"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="btn-secondary w-full py-1.5 text-xs text-rose-600 font-semibold flex items-center justify-center gap-1"
              >
                <X size={13} /> Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* TABLE-BASED ROW LAYOUT */}
      <div className="card bg-surface border-border overflow-hidden shadow-sm">
        {loading ? (
          <TableSkeleton rows={6} cols={9} />
        ) : invoices.length > 0 ? (
          <>
            {/* Desktop & Tablet Table (≥768px) */}
            <div className="hidden md:block overflow-x-auto scrollbar-none no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider">
                    <th className="py-3.5 px-4">OP Number</th>
                    <th className="py-3.5 px-4">Patient Details</th>
                    <th className="py-3.5 px-4">Doctor</th>
                    <th className="py-3.5 px-4">Invoice Date</th>
                    <th className="py-3.5 px-4">Services / Treatment</th>
                    <th className="py-3.5 px-4 text-right">Total (₹)</th>
                    <th className="py-3.5 px-4 text-right">Paid (₹)</th>
                    <th className="py-3.5 px-4 text-right">Balance (₹)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoices.map((inv, idx) => {
                    const invId = inv._id || inv.id || idx;
                    const patient = inv.patient || {};
                    const patientName = formatPatientFullName(patient) || 'Unknown Patient';
                    const docName = inv.doctor ? `Dr. ${inv.doctor.name}` : 'Unassigned';
                    const itemsSummary = (inv.items || [])
                      .map((item) => (item.service || item.treatment || '').trim())
                      .filter(Boolean)
                      .join(', ') || 'Dental Services';
                    const statusClass = STATUS_BADGE_CLASSES[inv.paymentStatus] || 'bg-slate-100 text-slate-800 border-slate-200';

                    return (
                      <tr key={invId} className="hover:bg-bg/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-brand whitespace-nowrap">
                          {inv.opNumber || patient.opNumber || '—'}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-ink text-xs">{patientName}</div>
                          <div className="text-[11px] text-ink-soft">
                            {patient.age !== undefined && patient.age !== null ? `${formatAge(patient.age, 'y')}` : ''} {patient.sex || ''} {patient.primaryPhone || patient.phone ? `• ${patient.primaryPhone || patient.phone}` : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-ink-soft whitespace-nowrap font-medium">
                          {docName}
                        </td>

                        <td className="py-3.5 px-4 text-ink whitespace-nowrap">
                          {formatReadableDate(inv.createdAt)}
                        </td>

                        <td className="py-3.5 px-4 text-ink-soft max-w-xs truncate" title={itemsSummary}>
                          <span className="text-ink font-medium">{itemsSummary}</span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-ink whitespace-nowrap">
                          ₹{(inv.total || 0).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                          ₹{(inv.amountPaid || 0).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                          <span className={inv.balance > 0 ? 'text-rose-600' : 'text-slate-600'}>
                            ₹{(inv.balance || 0).toLocaleString()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`badge border text-[10px] font-bold py-0.5 px-2 ${statusClass}`}>
                            {inv.paymentStatus || 'Pending'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(inv)}
                              className="btn-secondary py-1.5 px-3 text-xs font-semibold inline-flex items-center gap-1.5 text-brand hover:underline shadow-2xs cursor-pointer"
                              title="View Complete Billing Details"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openBillPrintWindow({ invoice: inv }, true)}
                              className="btn-secondary py-1.5 px-3 text-xs font-semibold inline-flex items-center gap-1.5 hover:border-brand/50 hover:text-brand shadow-2xs cursor-pointer"
                              title="Print Bill / Invoice"
                            >
                              <Printer size={13} />
                              <span>Print</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View (<768px) */}
            <div className="md:hidden divide-y divide-border/60">
              {invoices.map((inv, idx) => {
                const invId = inv._id || inv.id || idx;
                const patient = inv.patient || {};
                const patientName = formatPatientFullName(patient) || 'Unknown Patient';
                const docName = inv.doctor ? `Dr. ${inv.doctor.name}` : 'Unassigned';
                const itemsSummary = (inv.items || [])
                  .map((item) => (item.service || item.treatment || '').trim())
                  .filter(Boolean)
                  .join(', ') || 'Dental Services';
                const statusClass = STATUS_BADGE_CLASSES[inv.paymentStatus] || 'bg-slate-100 text-slate-800 border-slate-200';

                return (
                  <div key={invId} className="p-4 space-y-3">
                    {/* Header: Patient Name & OP # & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-ink text-sm">{patientName}</span>
                          <span className="font-mono text-xs font-bold text-brand bg-brand-light px-1.5 py-0.5 rounded">
                            {inv.opNumber || patient.opNumber || '—'}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-soft flex items-center gap-2 mt-0.5">
                          <span>{docName}</span>
                          <span>•</span>
                          <span>{formatReadableDate(inv.createdAt)}</span>
                        </div>
                      </div>
                      <span className={`badge border text-[10px] font-bold py-0.5 px-2 shrink-0 ${statusClass}`}>
                        {inv.paymentStatus || 'Pending'}
                      </span>
                    </div>

                    {/* Services summary */}
                    <div className="text-xs text-ink-soft bg-bg/40 p-2 rounded-lg border border-border/50">
                      <span className="font-semibold text-ink">Services: </span>
                      {itemsSummary}
                    </div>

                    {/* 3-Column Financial Grid */}
                    <div className="grid grid-cols-3 gap-2 text-xs bg-bg/60 p-2.5 rounded-xl border border-border/60">
                      <div>
                        <span className="text-[10px] text-ink-soft uppercase block font-semibold">Total</span>
                        <span className="font-mono font-bold text-ink">₹{(inv.total || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-soft uppercase block font-semibold">Paid</span>
                        <span className="font-mono font-semibold text-emerald-700">₹{(inv.amountPaid || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-soft uppercase block font-semibold">Balance</span>
                        <span className={`font-mono font-bold ${inv.balance > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                          ₹{(inv.balance || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(inv)}
                        className="btn-secondary py-1.5 px-3.5 text-xs font-bold flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 text-brand"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openBillPrintWindow({ invoice: inv }, true)}
                        className="btn-secondary py-1.5 px-3.5 text-xs font-bold flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 hover:border-brand/50 hover:text-brand"
                      >
                        <Printer size={14} />
                        <span>Print Bill</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-xs text-ink-soft space-y-3">
            <Wallet size={36} className="mx-auto text-ink-soft/40" />
            <h3 className="font-display text-base font-bold text-ink">No Billing Records Found</h3>
            <p className="text-xs max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No invoices match your active search or filter criteria. Try resetting filters.'
                : 'No clinic invoices or billing records have been generated yet.'}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn-secondary py-1.5 px-3 text-xs font-semibold">
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* COMPLETE BILLING DETAILS MODAL POPUP */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-xs animate-fadeIn overflow-hidden">
          <div className="card w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center font-bold text-sm">
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">
                    Invoice Details & Breakdown
                  </h3>
                  <p className="text-xs text-ink-soft">
                    Complete itemized billing record for OP #{selectedInvoice.opNumber || selectedInvoice.patient?.opNumber || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-bg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto scrollbar-none no-scrollbar p-5 space-y-4 text-xs">
              {/* Patient & Doctor Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-bg/60 border border-border/80">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block">Patient Information</span>
                  <div className="font-bold text-ink text-sm">
                    {formatPatientFullName(selectedInvoice.patient)}
                  </div>
                  <div className="font-mono text-xs text-brand font-bold">
                    OP #{selectedInvoice.opNumber || selectedInvoice.patient?.opNumber || 'N/A'}
                  </div>
                  <div className="text-[11px] text-ink-soft">
                    {selectedInvoice.patient?.age !== undefined && selectedInvoice.patient?.age !== null ? `${formatAge(selectedInvoice.patient?.age, 'yrs')}` : 'N/A'} • {selectedInvoice.patient?.sex || 'N/A'} • Phone: {selectedInvoice.patient?.primaryPhone || selectedInvoice.patient?.phone || 'N/A'}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block">Visit & Doctor Details</span>
                  <div className="font-bold text-ink text-sm">
                    {selectedInvoice.doctor ? `Dr. ${selectedInvoice.doctor.name}` : 'Unassigned Doctor'}
                  </div>
                  <div className="text-xs text-ink-soft">
                    Date: {formatReadableDate(selectedInvoice.createdAt)}
                  </div>
                  <div className="pt-0.5">
                    <span className={`badge border text-[10px] font-bold py-0.5 px-2 ${STATUS_BADGE_CLASSES[selectedInvoice.paymentStatus] || 'bg-slate-100 text-slate-800'}`}>
                      {selectedInvoice.paymentStatus || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Procedures Breakdown */}
              <div className="space-y-2">
                <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope size={14} className="text-brand" /> Itemized Treatment Procedures
                </h4>
                <div className="card overflow-hidden border border-border shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft">
                      <tr>
                        <th className="py-2.5 px-4">Procedure / Description</th>
                        <th className="py-2.5 px-4 text-center">Qty</th>
                        <th className="py-2.5 px-4 text-right">Unit Price</th>
                        <th className="py-2.5 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(selectedInvoice.items || []).length > 0 ? (
                        selectedInvoice.items.map((item, idx) => {
                          const qty = item.quantity || 1;
                          const price = item.unitPrice || 0;
                          const sub = qty * price;
                          return (
                            <tr key={idx} className="hover:bg-bg/30">
                              <td className="py-2.5 px-4 font-medium text-ink">
                                {item.service || item.treatment || 'Dental Procedure'}
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono text-ink-soft">
                                {qty}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-ink">
                                ₹{price.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-ink">
                                ₹{sub.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-3 px-4 text-center text-ink-soft italic">
                            General Dental Consultation & Services
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment History Log (if any) */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={14} className="text-emerald-700" /> Payment & Collection History
                  </h4>
                  <div className="space-y-1.5">
                    {selectedInvoice.payments.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-bg/50 border border-border font-medium text-xs">
                        <div>
                          <span className="font-bold text-emerald-800">{p.method || 'Payment'} Collection</span>
                          <span className="text-[11px] text-ink-soft block mt-0.5">
                            {new Date(p.date || Date.now()).toLocaleString()} {p.recordedBy?.name ? `• Staff: ${p.recordedBy.name}` : ''}
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
                {(() => {
                  const itemsSubtotal = (selectedInvoice.items || []).reduce(
                    (sum, item) => sum + (item.quantity || 1) * (item.unitPrice || 0),
                    0
                  );
                  return (
                    <>
                      <div className="flex justify-between font-semibold text-ink-soft">
                        <span>Items Subtotal:</span>
                        <span className="font-mono text-ink font-bold">₹{itemsSubtotal.toLocaleString()}</span>
                      </div>
                      {selectedInvoice.discount > 0 && (
                        <div className="flex justify-between text-ink-soft">
                          <span>Discount Applied:</span>
                          <span className="font-mono text-emerald-700">-₹{selectedInvoice.discount.toLocaleString()}</span>
                        </div>
                      )}
                      {selectedInvoice.tax > 0 && (
                        <div className="flex justify-between text-ink-soft">
                          <span>Tax:</span>
                          <span className="font-mono">+₹{selectedInvoice.tax.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-ink border-t border-border/60 pt-2">
                        <span>Total Invoice Amount:</span>
                        <span className="font-mono text-brand font-bold text-sm">₹{(selectedInvoice.total || 0).toLocaleString()}</span>
                      </div>
                    </>
                  );
                })()}
                <div className="flex justify-between text-emerald-800 font-semibold border-t border-border/60 pt-2">
                  <span>Amount Paid / Received:</span>
                  <span className="font-mono font-bold">₹{(selectedInvoice.amountPaid || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold border-t border-border/80 pt-2">
                  <span className="text-ink">Balance Due:</span>
                  <span className={`font-mono text-base ${selectedInvoice.balance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                    ₹{(selectedInvoice.balance || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-border bg-bg/40 shrink-0">
              {selectedInvoice.patient ? (
                <Link
                  to={`/doctor/patients/${selectedInvoice.patient._id || selectedInvoice.patient.id || selectedInvoice.patient}`}
                  className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1.5"
                >
                  <UserSquare2 size={14} />
                  <span>Open Full Patient EMR</span>
                </Link>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5 hover:border-brand/50 hover:text-brand cursor-pointer"
                  onClick={() => openBillPrintWindow({ invoice: selectedInvoice }, true)}
                >
                  <Printer size={14} />
                  <span>Print Bill</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary py-2 px-4 text-xs font-bold cursor-pointer"
                  onClick={() => setSelectedInvoice(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
