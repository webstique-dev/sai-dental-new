import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Wallet, Search, Eye, Filter, Calendar, X,
  CheckCircle2, AlertCircle, CreditCard, Clock, UserSquare2,
  ChevronDown, ChevronUp, Stethoscope, Printer, ArrowLeft,
  Edit3, RefreshCw, ChevronRight, FileText
} from 'lucide-react';
import { formatAge, formatPatientFullName, formatDoctorName } from '../../utils/formatters.js';
import { openBillPrintWindow } from '../../utils/billPdfGenerator.js';
import api from '../../api/axios.js';
import StatCard from '../../components/common/StatCard.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import { TableSkeleton } from '../../components/common/TableSkeleton.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';
import PatientBillingSummary from '../../components/common/PatientBillingSummary.jsx';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const patientIdParam = searchParams.get('patientId') || searchParams.get('patient');

  // Query & Filter State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Invoices & Selected Patient State
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(location.state?.patient || null);

  // Mobile Accordion expand state for directory
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const toggleExpandPatient = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedPatientId((prev) => (prev === id ? null : id));
  };

  // Sync selected patient with URL query params or location state
  useEffect(() => {
    if (location.state?.patient) {
      setSelectedPatient(location.state.patient);
    } else if (patientIdParam) {
      if (!selectedPatient || (selectedPatient._id !== patientIdParam && selectedPatient.id !== patientIdParam)) {
        api.get(`/patients/${patientIdParam}`)
          .then((res) => {
            if (res.data?.patient) {
              setSelectedPatient(res.data.patient);
            }
          })
          .catch((err) => {
            console.error('Failed to load patient for billing history:', err);
          });
      }
    } else {
      setSelectedPatient(null);
    }
  }, [patientIdParam, location.state]);

  const handleBackToDirectory = () => {
    setSelectedPatient(null);
    if (patientIdParam) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('patientId');
      nextParams.delete('patient');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    const pId = p._id || p.id;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('patientId', pId);
    setSearchParams(nextParams);
  };

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

  // Group invoices by unique Patient (similar to Prescriptions Directory)
  const patientBillingGroups = useMemo(() => {
    const map = new Map();

    (invoices || []).forEach((inv) => {
      if (!inv.patient) return;
      const p = inv.patient;
      const pId = (p._id || p.id || p).toString();

      if (!map.has(pId)) {
        map.set(pId, {
          patient: typeof p === 'object' ? p : { _id: pId, name: 'Patient' },
          invoices: [],
          totalInvoiced: 0,
          totalPaid: 0,
          totalBalance: 0,
          latestInvoiceDate: inv.date || inv.createdAt,
          latestDoctor: inv.doctor,
          latestServices: '',
          latestInvoice: inv,
        });
      }

      const group = map.get(pId);
      group.invoices.push(inv);
      group.totalInvoiced += Number(inv.total) || 0;
      group.totalPaid += Number(inv.amountPaid) || 0;
      group.totalBalance += Number(inv.balance) || 0;

      const thisDate = new Date(inv.date || inv.createdAt);
      if (!group.latestInvoiceDate || thisDate > new Date(group.latestInvoiceDate)) {
        group.latestInvoiceDate = inv.date || inv.createdAt;
        if (inv.doctor) group.latestDoctor = inv.doctor;
        if (inv.itemsSummary) group.latestServices = inv.itemsSummary;
        group.latestInvoice = inv;
      }
    });

    return Array.from(map.values()).map((g) => {
      let overallStatus = 'Pending';
      if (g.totalBalance <= 0 && g.totalInvoiced > 0) {
        overallStatus = 'Paid';
      } else if (g.totalPaid > 0) {
        overallStatus = 'Partially Paid';
      }
      return {
        ...g,
        overallStatus,
      };
    });
  }, [invoices]);

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

  // If a Patient is selected to view & edit their complete billing workspace
  if (selectedPatient) {
    const p = selectedPatient;
    const patientName = formatPatientFullName(p) || 'Patient';
    const patientId = p._id || p.id;

    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToDirectory}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to Billing Directory
          </button>

          <span className="badge border text-xs bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold">
            Patient Financial & Billing History
          </span>
        </div>

        {/* Patient Banner */}
        <div className="card p-4 bg-surface border-brand/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center font-bold text-lg">
              <UserSquare2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-ink">{patientName}</h2>
                <span className="badge bg-brand-light/40 text-brand-dark font-mono font-bold text-[10px]">
                  OP #{p.opNumber || 'N/A'}
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                {p.age !== undefined && p.age !== null && p.age !== '' ? `Age: ${formatAge(p.age, 'yrs')}` : ''} {p.sex ? `• Sex: ${p.sex}` : ''} {(p.primaryPhone || p.phone) ? `• Contact: ${p.primaryPhone || p.phone}${p.secondaryPhone ? ` / ${p.secondaryPhone}` : ''}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Complete Patient Financial & Billing Summary Panel (View, Edit, Pay, Add, Print) */}
        <PatientBillingSummary
          patientId={patientId}
          onInvoiceUpdated={fetchInvoices}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <Wallet size={26} className="text-brand" /> My Billing & Invoices
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Directory of patient billing records, single invoice balances, payment histories, and edit workflows.
          </p>
        </div>
        <button
          onClick={fetchInvoices}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced"
          value={`₹${totalInvoiced.toLocaleString()}`}
          sub={`${patientBillingGroups.length} patients billed`}
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
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="input-field py-2 text-xs font-semibold w-full cursor-pointer"
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
              className="input-field py-2 text-xs font-semibold w-full cursor-pointer"
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
                className="btn-secondary w-full py-1.5 text-xs text-rose-600 font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <X size={13} /> Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* UNIQUE PATIENT BILLING TABLE DIRECTORY */}
      <div className="card bg-surface border-border overflow-hidden shadow-sm">
        {loading ? (
          <TableSkeleton rows={6} cols={10} />
        ) : patientBillingGroups.length > 0 ? (
          <>
            {/* Desktop & Tablet Table (≥768px) */}
            <div className="hidden md:block overflow-x-auto scrollbar-none no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">OP Number</th>
                    <th className="py-3.5 px-4">Patient Details</th>
                    <th className="py-3.5 px-4">Doctor</th>
                    <th className="py-3.5 px-4">Latest Invoice Date</th>
                    <th className="py-3.5 px-4">Services / Treatment</th>
                    <th className="py-3.5 px-4 text-right">Total (₹)</th>
                    <th className="py-3.5 px-4 text-right">Paid (₹)</th>
                    <th className="py-3.5 px-4 text-right">Balance (₹)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {patientBillingGroups.map((group) => {
                    const p = group.patient;
                    const pId = p._id || p.id;
                    const patientName = formatPatientFullName(p) || 'Patient';
                    const docName = formatDoctorName(group.latestDoctor?.name) || 'Dentist';
                    const statusClass = STATUS_BADGE_CLASSES[group.overallStatus] || 'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <tr
                        key={pId}
                        onClick={() => handleSelectPatient(p)}
                        className="hover:bg-bg/60 cursor-pointer transition-colors group"
                      >
                        {/* OP Number */}
                        <td className="py-3.5 px-4 font-mono font-bold text-brand whitespace-nowrap">
                          {p.opNumber ? `#${p.opNumber}` : '—'}
                        </td>

                        {/* Patient Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <UserSquare2 size={16} className="text-brand shrink-0" />
                            <div>
                              <span className="font-bold text-ink group-hover:text-brand transition-colors block">
                                {patientName}
                              </span>
                              <span className="text-[11px] text-ink-soft block mt-0.5">
                                {p.age !== undefined && p.age !== null && p.age !== '' ? `${p.age}y` : ''} {p.sex ? `• ${p.sex}` : ''} {(p.primaryPhone || p.phone) ? `• ${p.primaryPhone || p.phone}` : ''}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Doctor */}
                        <td className="py-3.5 px-4 text-ink-soft whitespace-nowrap">
                          <span className="font-medium text-ink flex items-center gap-1.5">
                            <Stethoscope size={13} className="text-brand shrink-0" />
                            {docName}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-ink-soft whitespace-nowrap">
                          <span className="font-medium text-ink flex items-center gap-1.5">
                            <Calendar size={13} className="text-ink-soft shrink-0" />
                            {formatReadableDate(group.latestInvoiceDate)}
                          </span>
                        </td>

                        {/* Services / Treatments */}
                        <td className="py-3.5 px-4 text-ink-soft max-w-xs truncate" title={group.latestServices}>
                          <span className="font-medium text-ink">
                            {group.latestServices || (group.invoices.length > 1 ? `${group.invoices.length} Invoices / Treatments` : 'General Dental Treatment')}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-ink whitespace-nowrap">
                          ₹{group.totalInvoiced.toLocaleString()}
                        </td>

                        {/* Paid */}
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                          ₹{group.totalPaid.toLocaleString()}
                        </td>

                        {/* Balance */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                          <span className={group.totalBalance > 0 ? 'text-rose-600' : 'text-slate-600'}>
                            ₹{group.totalBalance.toLocaleString()}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`badge border text-[10px] font-bold py-0.5 px-2.5 ${statusClass}`}>
                            {group.overallStatus}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleSelectPatient(p)}
                              className="btn-primary py-1 px-2.5 text-xs font-semibold inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="View & Edit Patient Billing"
                            >
                              <Edit3 size={13} />
                              <span>View & Edit</span>
                            </button>
                            {group.latestInvoice && (
                              <button
                                type="button"
                                onClick={() => openBillPrintWindow({ invoice: group.latestInvoice }, true)}
                                className="btn-secondary py-1 px-2 text-xs font-semibold inline-flex items-center gap-1 text-ink hover:text-brand shadow-2xs cursor-pointer"
                                title="Print Latest Invoice"
                              >
                                <Printer size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards / Accordion View (<768px) */}
            <div className="block md:hidden divide-y divide-border">
              {patientBillingGroups.map((group) => {
                const p = group.patient;
                const pId = p._id || p.id;
                const patientName = formatPatientFullName(p) || 'Patient';
                const docName = formatDoctorName(group.latestDoctor?.name) || 'Dentist';
                const statusClass = STATUS_BADGE_CLASSES[group.overallStatus] || 'bg-slate-100 text-slate-700 border-slate-200';
                const isExpanded = expandedPatientId === pId;

                return (
                  <div key={pId} className="p-3.5 space-y-2.5">
                    <div
                      className="flex items-start justify-between gap-2 cursor-pointer"
                      onClick={(e) => toggleExpandPatient(pId, e)}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
                          <UserSquare2 size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-ink text-xs truncate">{patientName}</span>
                            <span className="font-mono text-[10px] text-brand font-bold shrink-0">
                              {p.opNumber ? `#${p.opNumber}` : ''}
                            </span>
                          </div>
                          <span className="text-[11px] text-ink-soft block">
                            {p.primaryPhone || p.phone || 'No phone'}
                          </span>
                        </div>
                      </div>
                      <span className={`badge border text-[10px] font-bold py-0.5 px-2 shrink-0 ${statusClass}`}>
                        {group.overallStatus}
                      </span>
                    </div>

                    {/* Financial Figures Bar */}
                    <div className="grid grid-cols-3 gap-2 text-xs bg-bg/50 p-2 rounded-xl border border-border/60">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-soft block">Total</span>
                        <span className="font-mono font-bold text-ink">₹{group.totalInvoiced.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-soft block">Paid</span>
                        <span className="font-mono font-semibold text-emerald-700">₹{group.totalPaid.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-soft block">Balance</span>
                        <span className={`font-mono font-bold ${group.totalBalance > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                          ₹{group.totalBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="space-y-2 pt-1 border-t border-border/50 text-xs text-ink-soft">
                        <div className="flex justify-between">
                          <span>Doctor:</span>
                          <span className="font-semibold text-ink">{docName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Latest Date:</span>
                          <span className="font-semibold text-ink">{formatReadableDate(group.latestInvoiceDate)}</span>
                        </div>
                        {group.latestServices && (
                          <div className="flex justify-between">
                            <span>Services:</span>
                            <span className="font-semibold text-ink max-w-[200px] truncate">{group.latestServices}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      <button
                        type="button"
                        onClick={(e) => toggleExpandPatient(pId, e)}
                        className="text-[11px] text-ink-soft hover:text-ink flex items-center gap-1 font-semibold"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <span>{isExpanded ? 'Less' : 'Details'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {group.latestInvoice && (
                          <button
                            type="button"
                            onClick={() => openBillPrintWindow({ invoice: group.latestInvoice }, true)}
                            className="btn-secondary py-1 px-2 text-xs font-semibold inline-flex items-center gap-1 text-ink hover:text-brand"
                          >
                            <Printer size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSelectPatient(p)}
                          className="btn-primary py-1 px-3 text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Edit3 size={13} />
                          <span>View & Edit Billing</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-12 text-center space-y-3">
            <Wallet size={36} className="mx-auto text-ink-soft/40" />
            <p className="font-display text-base font-semibold text-ink">No billing records found.</p>
            <p className="text-xs text-ink-soft">
              {hasActiveFilters ? 'Try adjusting your search or status filter criteria.' : 'Patient invoices and payment transactions will appear here.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
