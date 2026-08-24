import { useState, useEffect } from 'react';
import {
  FileBarChart, TrendingUp, DollarSign, Stethoscope, UserCheck, Download, Calendar, CalendarDays, Filter,
  Users, UserPlus, RotateCcw, CheckCircle2, XCircle, AlertCircle, CreditCard, Wallet, Activity, RefreshCw,
  ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../api/axios.js';
import StatCard from '../../components/common/StatCard.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import { ReportSkeleton } from '../../components/common/TableSkeleton.jsx';

// CSV Helper utility function
function downloadCSV(filename, headers, rows) {
  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = cell === null || cell === undefined ? '' : String(cell);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('performance');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isRangeFilterOpen, setIsRangeFilterOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [treatmentData, setTreatmentData] = useState(null);
  const [doctorData, setDoctorData] = useState(null);

  const applyPreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(end.toISOString().split('T')[0]);
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      if (activeTab === 'performance') {
        const res = await api.get(`/reports/clinic-performance?${params.toString()}`);
        setPerformanceData(res.data);
      } else if (activeTab === 'financial') {
        const res = await api.get(`/reports/financial?${params.toString()}`);
        setFinancialData(res.data);
      } else if (activeTab === 'treatment') {
        const res = await api.get(`/reports/treatment-analytics?${params.toString()}`);
        setTreatmentData(res.data);
      } else if (activeTab === 'doctor') {
        const res = await api.get(`/reports/doctor-analytics?${params.toString()}`);
        setDoctorData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, dateFrom, dateTo]);

  // Export handlers per section
  const handleExportPerformance = () => {
    if (!performanceData) return;
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Patients (Database)', performanceData.totalPatients],
      ['New Patients (Period)', performanceData.newPatients],
      ['Returning Patients', performanceData.returningPatients],
      ['Total Appointments Scheduled', performanceData.appointments],
      ['Completed Consultations', performanceData.completedConsultations],
      ['Cancelled Appointments', performanceData.cancelledAppointments],
      ['No-Show Appointments', performanceData.noShows],
    ];
    downloadCSV(`Clinic_Performance_Report_${dateFrom || 'all'}_to_${dateTo || 'now'}.csv`, headers, rows);
  };

  const handleExportFinancial = () => {
    if (!financialData) return;
    const headers = ['Date', 'Revenue (Collected)', 'Invoices Count'];
    const rows = (financialData.dailyRevenue || []).map((item) => [
      item.date,
      item.revenue,
      item.invoiceCount,
    ]);
    downloadCSV(`Financial_Revenue_Report_${dateFrom || 'all'}_to_${dateTo || 'now'}.csv`, headers, rows);
  };

  const handleExportTreatments = () => {
    if (!treatmentData) return;
    const headers = ['Treatment Name', 'Times Planned / Performed', 'Estimated Revenue (₹)'];
    const rows = (treatmentData.rankedTreatments || []).map((t) => [
      t.treatment,
      t.count,
      t.estimatedRevenue,
    ]);
    downloadCSV(`Treatment_Analytics_Report_${dateFrom || 'all'}_to_${dateTo || 'now'}.csv`, headers, rows);
  };

  const handleExportDoctors = () => {
    if (!doctorData) return;
    const headers = ['Doctor Name', 'Specialization', 'Patients Handled', 'Consultations', 'Treatments', 'Follow-ups'];
    const rows = (doctorData.doctors || []).map((d) => [
      d.doctorName,
      d.specialization,
      d.patientsHandled,
      d.consultationsCount,
      d.treatmentsCount,
      d.followUpsCount,
    ]);
    downloadCSV(`Doctor_Analytics_Report_${dateFrom || 'all'}_to_${dateTo || 'now'}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6 max-w-7xl w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink flex items-center gap-2 min-w-0 leading-tight">
            <FileBarChart size={26} className="text-brand shrink-0" />
            <span className="truncate sm:whitespace-normal">Reports & Clinic Analytics</span>
          </h1>
          <p className="text-xs text-ink-soft mt-1 leading-relaxed break-words">
            Operational summaries, financial metrics, procedure rankings, and doctor productivity.
          </p>
        </div>
      </div>

      {/* Desktop Range Filter Bar (≥768px) */}
      <div className="hidden md:block card p-4 bg-surface space-y-3 w-full max-w-full overflow-hidden">
        <div className="flex flex-row items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-ink">
            <Filter size={15} className="text-brand shrink-0" /> Range Filter
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-ink-soft text-[11px] font-medium mr-1">Quick Presets:</span>
            <button type="button" onClick={() => applyPreset(7)} className="btn-secondary py-1 px-2.5 text-[11px] font-semibold">Last 7 Days</button>
            <button type="button" onClick={() => applyPreset(30)} className="btn-secondary py-1 px-2.5 text-[11px] font-semibold">Last 30 Days</button>
            <button type="button" onClick={() => applyPreset(90)} className="btn-secondary py-1 px-2.5 text-[11px] font-semibold">Last 90 Days</button>
            <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-ink-soft hover:text-brand underline text-[11px] font-semibold ml-1">Clear</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <DatePicker
              label="From Date"
              value={dateFrom}
              onChange={(date, dateStr) => setDateFrom(dateStr)}
              inputClassName="py-1.5 text-xs w-full"
            />
          </div>

          <div>
            <DatePicker
              label="To Date"
              value={dateTo}
              onChange={(date, dateStr) => setDateTo(dateStr)}
              inputClassName="py-1.5 text-xs w-full"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={fetchReports}
              className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5 font-bold"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Apply Range Filter
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Collapsible Range Filter Accordion (<768px down to 320px) */}
      <div className="block md:hidden card p-3.5 bg-surface border border-border shadow-xs space-y-3 rounded-2xl max-w-full overflow-hidden">
        {/* Accordion Toggle Header */}
        <button
          type="button"
          onClick={() => setIsRangeFilterOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-ink gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
              <Filter size={14} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="font-bold text-ink">Range Filter</span>
              {(dateFrom || dateTo) && (
                <span className="badge bg-brand text-white text-[10px] py-0.5 px-2 font-bold shrink-0 truncate max-w-[140px]">
                  {dateFrom || 'Start'} → {dateTo || 'Today'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-ink-soft font-semibold shrink-0">
            <span>{isRangeFilterOpen ? 'Hide' : 'Filter Date'}</span>
            {isRangeFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {/* Collapsible Body */}
        {isRangeFilterOpen && (
          <div className="pt-2 border-t border-border/70 space-y-3 animate-in fade-in duration-150 text-xs">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => applyPreset(7)} className="btn-secondary py-1.5 px-2.5 text-xs font-semibold shrink-0">Last 7 Days</button>
                <button type="button" onClick={() => applyPreset(30)} className="btn-secondary py-1.5 px-2.5 text-xs font-semibold shrink-0">Last 30 Days</button>
                <button type="button" onClick={() => applyPreset(90)} className="btn-secondary py-1.5 px-2.5 text-xs font-semibold shrink-0">Last 90 Days</button>
                <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-ink-soft hover:text-brand underline text-xs font-semibold ml-1 py-1 shrink-0">Clear</button>
              </div>
            </div>

            {/* From Date & To Date Inputs & Apply Button */}
            <div className="space-y-3 pt-1">
              <div>
                <DatePicker
                  label="From Date"
                  value={dateFrom}
                  onChange={(date, dateStr) => setDateFrom(dateStr)}
                  inputClassName="py-1.5 text-xs w-full"
                />
              </div>

              <div>
                <DatePicker
                  label="To Date"
                  value={dateTo}
                  onChange={(date, dateStr) => setDateTo(dateStr)}
                  inputClassName="py-1.5 text-xs w-full"
                />
              </div>

              <button
                type="button"
                onClick={fetchReports}
                className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 mt-1"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Apply Range Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category Navigation Tabs (Horizontally scrollable from 768px down to 320px) */}
      <div className="w-full max-w-full min-w-0 overflow-x-auto scrollbar-none no-scrollbar border-b border-border py-1">
        <div className="flex items-center space-x-1.5 sm:space-x-3 text-xs sm:text-sm font-semibold whitespace-nowrap min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-2.5 flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all rounded-t-lg shrink-0 ${activeTab === 'performance'
              ? 'border-brand text-brand font-bold bg-brand-light/30'
              : 'border-transparent text-ink-soft hover:text-ink hover:bg-bg/60'
              }`}
          >
            <Activity size={16} className={activeTab === 'performance' ? 'text-brand' : 'text-ink-soft'} /> Clinic Performance
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`px-3 py-2.5 flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all rounded-t-lg shrink-0 ${activeTab === 'financial'
              ? 'border-brand text-brand font-bold bg-brand-light/30'
              : 'border-transparent text-ink-soft hover:text-ink hover:bg-bg/60'
              }`}
          >
            <DollarSign size={16} className={activeTab === 'financial' ? 'text-brand' : 'text-ink-soft'} /> Financial Metrics
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('treatment')}
            className={`px-3 py-2.5 flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all rounded-t-lg shrink-0 ${activeTab === 'treatment'
              ? 'border-brand text-brand font-bold bg-brand-light/30'
              : 'border-transparent text-ink-soft hover:text-ink hover:bg-bg/60'
              }`}
          >
            <Stethoscope size={16} className={activeTab === 'treatment' ? 'text-brand' : 'text-ink-soft'} /> Treatment Analytics
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('doctor')}
            className={`px-3 py-2.5 flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all rounded-t-lg shrink-0 ${activeTab === 'doctor'
              ? 'border-brand text-brand font-bold bg-brand-light/30'
              : 'border-transparent text-ink-soft hover:text-ink hover:bg-bg/60'
              }`}
          >
            <UserCheck size={16} className={activeTab === 'doctor' ? 'text-brand' : 'text-ink-soft'} /> Doctor Analytics
          </button>
        </div>
      </div>

      {loading ? (
        <ReportSkeleton />
      ) : (
        <>
          {/* TAB 1: CLINIC PERFORMANCE */}
      {activeTab === 'performance' && (
        <div className="space-y-5 sm:space-y-6 w-full max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink">Operational Summary</h2>
              <p className="text-[11px] sm:text-xs text-ink-soft">Key operational metrics for patient intake and consultations.</p>
            </div>
            <button onClick={handleExportPerformance} className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 py-1.5 px-3">
              <Download size={14} /> Export CSV
            </button>
          </div>

          {/* Stat Cards Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full max-w-full">
            <StatCard
              title="Total Clinic Patients"
              value={performanceData?.totalPatients ?? '—'}
              sub="All-time registered"
              icon={Users}
            />
            <StatCard
              title="New Patients"
              value={performanceData?.newPatients ?? '—'}
              sub="Registered in period"
              icon={UserPlus}
            />
            <StatCard
              title="Returning Patients"
              value={performanceData?.returningPatients ?? '—'}
              sub="Multi-visit patients"
              icon={RotateCcw}
            />
            <StatCard
              title="Completed Consultations"
              value={performanceData?.completedConsultations ?? '—'}
              sub="Doctor consultations"
              icon={CheckCircle2}
            />
          </div>

          {/* Appointments Overview Card */}
          <div className="card p-4 sm:p-5 space-y-4 w-full max-w-full overflow-hidden rounded-2xl border border-border shadow-xs bg-surface">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <CalendarDays size={16} className="text-brand shrink-0" /> Appointments Overview
              </h3>
              <span className="badge bg-bg text-ink-soft border border-border text-[10px] font-bold">
                Period Summary
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs w-full max-w-full">
              <div className="bg-bg/70 p-3.5 sm:p-4 rounded-xl border border-border space-y-1.5 w-full max-w-full overflow-hidden transition-all hover:border-border/80">
                <div className="text-ink-soft font-semibold text-xs truncate">Total Appointments</div>
                <div className="text-xl sm:text-2xl font-bold text-ink font-mono">{performanceData?.appointments ?? 0}</div>
                <div className="text-[11px] text-ink-soft truncate">Scheduled in selected range</div>
              </div>

              <div className="bg-rose-50/60 p-3.5 sm:p-4 rounded-xl border border-rose-200/80 space-y-1.5 w-full max-w-full overflow-hidden transition-all hover:border-rose-300">
                <div className="text-rose-700 font-semibold text-xs flex items-center gap-1.5 min-w-0">
                  <XCircle size={15} className="shrink-0 text-rose-600" />
                  <span className="truncate">Cancelled Appointments</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-rose-800 font-mono">{performanceData?.cancelledAppointments ?? 0}</div>
                <div className="text-[11px] text-rose-600 truncate">Patient or staff cancellations</div>
              </div>

              <div className="bg-amber-50/60 p-3.5 sm:p-4 rounded-xl border border-amber-200/80 space-y-1.5 w-full max-w-full overflow-hidden transition-all hover:border-amber-300">
                <div className="text-amber-700 font-semibold text-xs flex items-center gap-1.5 min-w-0">
                  <AlertCircle size={15} className="shrink-0 text-amber-600" />
                  <span className="truncate">No-Show Appointments</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-amber-800 font-mono">{performanceData?.noShows ?? 0}</div>
                <div className="text-[11px] text-amber-600 truncate">Missed without prior notice</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FINANCIAL METRICS */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-ink">Financial Breakdown</h2>
            <button onClick={handleExportFinancial} className="btn-secondary text-xs flex items-center gap-1.5">
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Collected Revenue"
              value={`₹${(financialData?.totalRevenue || 0).toLocaleString()}`}
              sub="Total payments received"
              icon={DollarSign}
            />
            <StatCard
              title="Pending Balance"
              value={`₹${(financialData?.pendingPaymentsTotal || 0).toLocaleString()}`}
              sub="Uncollected patient balances"
              icon={Wallet}
            />
            <StatCard
              title="Total Invoiced Value"
              value={`₹${(financialData?.treatmentRevenue || 0).toLocaleString()}`}
              sub={`${financialData?.totalInvoicesCount || 0} total invoices`}
              icon={CreditCard}
            />
          </div>

          {/* Payment Method Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-5 space-y-3">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Payment Method Breakdown</h3>
              <div className="space-y-2.5 text-xs">
                {Object.entries(financialData?.paymentMethodBreakdown || { Cash: 0, Card: 0, UPI: 0, Other: 0 }).map(
                  ([method, amount]) => {
                    const total = financialData?.totalRevenue || 1;
                    const pct = Math.round((amount / (total || 1)) * 100);
                    return (
                      <div key={method} className="space-y-1">
                        <div className="flex justify-between font-semibold text-ink">
                          <span>{method}</span>
                          <span>₹{amount.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-bg h-2 rounded-full overflow-hidden border border-border">
                          <div
                            className="bg-brand h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Daily Revenue Log */}
            <div className="card p-4 sm:p-5 space-y-3 w-full max-w-full overflow-hidden">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Daily Revenue Log</h3>
              
              {/* Desktop Table View (≥768px) */}
              <div className="hidden md:block max-h-60 overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg border-b border-border sticky top-0 font-semibold text-ink-soft">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Invoices</th>
                      <th className="px-3 py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(!financialData?.dailyRevenue || financialData.dailyRevenue.length === 0) ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-ink-soft">No revenue recorded in range.</td>
                      </tr>
                    ) : (
                      financialData.dailyRevenue.map((d) => (
                        <tr key={d.date} className="hover:bg-bg/40">
                          <td className="px-3 py-2 font-mono text-ink-soft">{d.date}</td>
                          <td className="px-3 py-2 text-right font-semibold text-ink">{d.invoiceCount}</td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-700">₹{d.revenue.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (<768px down to 320px) */}
              <div className="block md:hidden max-h-60 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-bg/40">
                {(!financialData?.dailyRevenue || financialData.dailyRevenue.length === 0) ? (
                  <div className="p-4 text-center text-ink-soft text-xs">No revenue recorded in range.</div>
                ) : (
                  financialData.dailyRevenue.map((d) => (
                    <div key={d.date} className="p-3 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-mono text-ink font-semibold block text-xs">{d.date}</span>
                        <span className="text-[10px] text-ink-soft">{d.invoiceCount} {d.invoiceCount === 1 ? 'invoice' : 'invoices'}</span>
                      </div>
                      <span className="font-bold text-emerald-700 font-mono text-xs">₹{d.revenue.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TREATMENT ANALYTICS */}
      {activeTab === 'treatment' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-ink">Treatment Analytics & Procedure Frequency</h2>
            <button onClick={handleExportTreatments} className="btn-secondary text-xs flex items-center gap-1.5">
              <Download size={14} /> Export CSV
            </button>
          </div>

          {/* Specific Core Procedure Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { title: 'RCT (Root Canal)', count: treatmentData?.specificCounts?.RCT ?? 0 },
              { title: 'Crown & Bridge', count: treatmentData?.specificCounts?.Crown ?? 0 },
              { title: 'Filling / Composite', count: treatmentData?.specificCounts?.Filling ?? 0 },
              { title: 'Extraction', count: treatmentData?.specificCounts?.Extraction ?? 0 },
              { title: 'Implant', count: treatmentData?.specificCounts?.Implant ?? 0 },
            ].map((item) => (
              <div key={item.title} className="card p-3 text-center space-y-1">
                <div className="text-[11px] font-semibold text-ink-soft truncate">{item.title}</div>
                <div className="text-xl font-bold text-brand">{item.count}</div>
              </div>
            ))}
          </div>

          {/* Ranked Treatments Table / Cards */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border font-bold text-xs text-ink uppercase tracking-wider">
              Procedure Rankings by Volume & Revenue
            </div>

            {/* Desktop Table View (≥768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg border-b border-border font-semibold text-ink-soft">
                  <tr>
                    <th className="px-4 py-2.5">Rank</th>
                    <th className="px-4 py-2.5">Treatment / Procedure</th>
                    <th className="px-4 py-2.5 text-center">Frequency</th>
                    <th className="px-4 py-2.5 text-right">Est. Total Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(!treatmentData?.rankedTreatments || treatmentData.rankedTreatments.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-ink-soft">No treatments recorded in date range.</td>
                    </tr>
                  ) : (
                    treatmentData.rankedTreatments.map((t, idx) => (
                      <tr key={t.treatment} className="hover:bg-bg/40">
                        <td className="px-4 py-2.5 font-bold text-ink-soft">#{idx + 1}</td>
                        <td className="px-4 py-2.5 font-bold text-ink">{t.treatment}</td>
                        <td className="px-4 py-2.5 text-center font-semibold text-brand">{t.count}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-700">₹{(t.estimatedRevenue || 0).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Accordion Cards View (<768px down to 320px) */}
            <div className="block md:hidden divide-y divide-border">
              {(!treatmentData?.rankedTreatments || treatmentData.rankedTreatments.length === 0) ? (
                <div className="p-6 text-center text-ink-soft text-xs">No treatments recorded in date range.</div>
              ) : (
                treatmentData.rankedTreatments.map((t, idx) => (
                  <div key={t.treatment} className="p-3.5 space-y-2 hover:bg-bg/40 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-6 w-6 rounded-lg bg-brand-light/40 text-brand-dark font-bold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-ink text-sm truncate">{t.treatment}</span>
                      </div>
                      <span className="badge bg-brand/10 text-brand font-bold text-xs shrink-0">
                        {t.count} {t.count === 1 ? 'case' : 'cases'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                      <span className="text-ink-soft font-medium">Est. Revenue:</span>
                      <span className="font-bold text-emerald-700 font-mono">₹{(t.estimatedRevenue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DOCTOR ANALYTICS */}
      {activeTab === 'doctor' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-ink">Doctor Productivity & Case Analytics</h2>
            <button type="button" onClick={handleExportDoctors} className="btn-secondary text-xs flex items-center gap-1.5">
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="card overflow-hidden">
            {/* Desktop Table View (≥768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg border-b border-border font-semibold text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Specialization</th>
                    <th className="px-4 py-3 text-center">Patients Handled</th>
                    <th className="px-4 py-3 text-center">Consultations</th>
                    <th className="px-4 py-3 text-center">Treatments Planned</th>
                    <th className="px-4 py-3 text-center">Follow-ups Scheduled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(!doctorData?.doctors || doctorData.doctors.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-ink-soft">No doctor activity found.</td>
                    </tr>
                  ) : (
                    doctorData.doctors.map((doc) => (
                      <tr key={doc.doctorId} className="hover:bg-bg/40">
                        <td className="px-4 py-3">
                          <div className="font-bold text-ink">{doc.doctorName}</div>
                          <div className="text-[10px] text-ink-soft">{doc.email}</div>
                        </td>
                        <td className="px-4 py-3 text-ink-soft font-medium">
                          {doc.specialization}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-ink">
                          {doc.patientsHandled}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-brand">
                          {doc.consultationsCount}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-indigo-700">
                          {doc.treatmentsCount}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-emerald-700">
                          {doc.followUpsCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Accordion Cards View (<768px down to 320px) */}
            <div className="block md:hidden divide-y divide-border">
              {(!doctorData?.doctors || doctorData.doctors.length === 0) ? (
                <div className="p-6 text-center text-ink-soft text-xs">No doctor activity found.</div>
              ) : (
                doctorData.doctors.map((doc) => (
                  <div key={doc.doctorId} className="p-3.5 space-y-2.5 hover:bg-bg/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-ink text-sm truncate">{doc.doctorName}</div>
                        <div className="text-[11px] text-ink-soft truncate">{doc.email}</div>
                      </div>
                      <span className="badge bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold shrink-0">
                        {doc.specialization || 'General Doctor'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-bg/50 p-2.5 rounded-xl border border-border">
                      <div>
                        <span className="block text-[10px] font-bold text-ink-soft uppercase">Patients</span>
                        <span className="font-bold text-ink">{doc.patientsHandled}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-ink-soft uppercase">Consultations</span>
                        <span className="font-bold text-brand">{doc.consultationsCount}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-ink-soft uppercase">Treatments</span>
                        <span className="font-semibold text-indigo-700">{doc.treatmentsCount}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-ink-soft uppercase">Follow-Ups</span>
                        <span className="font-semibold text-emerald-700">{doc.followUpsCount}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
