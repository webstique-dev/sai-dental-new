import { useState, useEffect } from 'react';
import {
  FileBarChart, TrendingUp, DollarSign, Stethoscope, UserCheck, Download, Calendar, Filter,
  Users, UserPlus, RotateCcw, CheckCircle2, XCircle, AlertCircle, CreditCard, Wallet, Activity, RefreshCw
} from 'lucide-react';
import api from '../../api/axios.js';
import StatCard from '../../components/common/StatCard.jsx';

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

export default function Reports() {
  const [activeTab, setActiveTab] = useState('performance');

  // Shared Date Range Filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Data states for 4 tabs
  const [performanceData, setPerformanceData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [treatmentData, setTreatmentData] = useState(null);
  const [doctorData, setDoctorData] = useState(null);

  const [loading, setLoading] = useState(false);

  // Quick Date Range Preset Selector
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
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <FileBarChart size={26} className="text-brand" /> Reports & Clinic Analytics
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Operational summaries, financial metrics, procedure rankings, and doctor productivity.
          </p>
        </div>
      </div>

      {/* Date Filter & Quick Presets Bar */}
      <div className="card p-4 bg-surface space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <Filter size={15} className="text-brand" /> Range Filter
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-ink-soft text-[11px] font-medium mr-1">Quick Presets:</span>
            <button onClick={() => applyPreset(7)} className="btn-secondary py-1 px-2 text-[11px]">Last 7 Days</button>
            <button onClick={() => applyPreset(30)} className="btn-secondary py-1 px-2 text-[11px]">Last 30 Days</button>
            <button onClick={() => applyPreset(90)} className="btn-secondary py-1 px-2 text-[11px]">Last 90 Days</button>
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-ink-soft hover:text-brand underline text-[11px] ml-1">Clear</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-ink-soft mb-1">From Date</label>
            <input
              type="date"
              className="input-field py-1.5 text-xs font-mono"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-soft mb-1">To Date</label>
            <input
              type="date"
              className="input-field py-1.5 text-xs font-mono"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchReports}
              className="btn-primary w-full py-1.5 text-xs flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Apply Range Filter
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border space-x-4 text-sm font-medium">
        <button
          onClick={() => setActiveTab('performance')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'performance'
              ? 'border-brand text-brand font-bold'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Activity size={16} /> Clinic Performance
        </button>

        <button
          onClick={() => setActiveTab('financial')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'financial'
              ? 'border-brand text-brand font-bold'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <DollarSign size={16} /> Financial Metrics
        </button>

        <button
          onClick={() => setActiveTab('treatment')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'treatment'
              ? 'border-brand text-brand font-bold'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Stethoscope size={16} /> Treatment Analytics
        </button>

        <button
          onClick={() => setActiveTab('doctor')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'doctor'
              ? 'border-brand text-brand font-bold'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <UserCheck size={16} /> Doctor Analytics
        </button>
      </div>

      {/* TAB 1: CLINIC PERFORMANCE */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-ink">Operational Summary</h2>
            <button onClick={handleExportPerformance} className="btn-secondary text-xs flex items-center gap-1.5">
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Appointments Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-bg p-4 rounded-lg border border-border space-y-1">
                <div className="text-ink-soft font-semibold">Total Appointments</div>
                <div className="text-2xl font-bold text-ink">{performanceData?.appointments ?? 0}</div>
                <div className="text-[11px] text-ink-soft">Scheduled in range</div>
              </div>

              <div className="bg-rose-50/50 p-4 rounded-lg border border-rose-200/60 space-y-1">
                <div className="text-rose-700 font-semibold flex items-center gap-1">
                  <XCircle size={14} /> Cancelled Appointments
                </div>
                <div className="text-2xl font-bold text-rose-800">{performanceData?.cancelledAppointments ?? 0}</div>
                <div className="text-[11px] text-rose-600">Patient or staff cancellations</div>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200/60 space-y-1">
                <div className="text-amber-700 font-semibold flex items-center gap-1">
                  <AlertCircle size={14} /> No-Show Appointments
                </div>
                <div className="text-2xl font-bold text-amber-800">{performanceData?.noShows ?? 0}</div>
                <div className="text-[11px] text-amber-600">Missed without notice</div>
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

            {/* Daily Revenue Table */}
            <div className="card p-5 space-y-3">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Daily Revenue Log</h3>
              <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
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

          {/* Ranked Treatments Table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border font-bold text-xs text-ink uppercase tracking-wider">
              Procedure Rankings by Volume & Revenue
            </div>
            <div className="overflow-x-auto">
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
          </div>
        </div>
      )}

      {/* TAB 4: DOCTOR ANALYTICS */}
      {activeTab === 'doctor' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-ink">Doctor Productivity & Case Analytics</h2>
            <button onClick={handleExportDoctors} className="btn-secondary text-xs flex items-center gap-1.5">
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
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
          </div>
        </div>
      )}
    </div>
  );
}
