import { useState, useEffect } from 'react';
import {
  FileBarChart, TrendingUp, DollarSign, Stethoscope, UserCheck, Download, Calendar, CalendarDays, Filter,
  Users, UserPlus, RotateCcw, CheckCircle2, XCircle, AlertCircle, CreditCard, Wallet, Activity, RefreshCw,
  ChevronDown, ChevronUp, Clock, Hourglass, Phone, Globe, ShieldAlert, ArrowUpRight, ArrowDownRight, Tag,
  ClipboardList, Bell, Search, X, FileSpreadsheet
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import { ReportSkeleton } from '../../components/common/TableSkeleton.jsx';
import { exportReportsToExcel } from '../../utils/excelExport.js';

const STATUS_BADGE_CLASSES = {
  'Scheduled': 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Checked In': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  'Completed': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Cancelled': 'bg-rose-100 text-rose-800 border-rose-200',
  'No Show': 'bg-amber-100 text-amber-800 border-amber-200',
  'No-Show': 'bg-amber-100 text-amber-800 border-amber-200',
  'Missed': 'bg-amber-100 text-amber-800 border-amber-200',
  'Pending': 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function AdminReports() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';

  const [activeTab, setActiveTab] = useState('performance');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctorsList, setDoctorsList] = useState([]);
  const [isRangeFilterOpen, setIsRangeFilterOpen] = useState(false);

  // Tab-specific filters & search
  const [aptSearch, setAptSearch] = useState('');
  const [aptStatusFilter, setAptStatusFilter] = useState('');
  const [followUpSearch, setFollowUpSearch] = useState('');
  const [followUpStatusFilter, setFollowUpStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [treatmentData, setTreatmentData] = useState(null);
  const [doctorData, setDoctorData] = useState(null);
  const [appointmentsData, setAppointmentsData] = useState(null);
  const [followUpsData, setFollowUpsData] = useState(null);

  // Fetch doctors list for Admin dropdown filter
  useEffect(() => {
    if (!isDoctor) {
      api.get('/users/doctors')
        .then((res) => {
          setDoctorsList(res.data?.doctors || []);
        })
        .catch(() => setDoctorsList([]));
    }
  }, [isDoctor]);

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
      if (!isDoctor && selectedDoctorId) params.append('doctorId', selectedDoctorId);

      if (activeTab === 'performance') {
        const res = await api.get(`/reports/clinic-performance?${params.toString()}`);
        setPerformanceData(res.data);
      } else if (activeTab === 'appointments') {
        if (aptStatusFilter) params.append('status', aptStatusFilter);
        const res = await api.get(`/reports/appointments?${params.toString()}`);
        setAppointmentsData(res.data);
      } else if (activeTab === 'follow-ups') {
        if (followUpStatusFilter) params.append('status', followUpStatusFilter);
        const res = await api.get(`/reports/follow-ups?${params.toString()}`);
        setFollowUpsData(res.data);
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
  }, [activeTab, dateFrom, dateTo, selectedDoctorId, aptStatusFilter, followUpStatusFilter]);

  const formatTimingVal = (d) => {
    if (!d) return '—';
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateVal = (d) => {
    if (!d) return '—';
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Export current tab to Excel
  const handleExportCurrentTabExcel = async () => {
    setExportingExcel(true);
    try {
      const prefix = isDoctor ? 'My_Doctor_Report' : 'Clinic_Report';
      const rangeSuffix = `${dateFrom || 'all'}_to_${dateTo || 'now'}`;

      await exportReportsToExcel({
        filename: `${prefix}_${activeTab}_${rangeSuffix}.xlsx`,
        isDoctor,
        dateFrom,
        dateTo,
        performanceData: activeTab === 'performance' ? performanceData : null,
        appointmentsData: activeTab === 'appointments' ? { appointments: filteredAppointments } : null,
        followUpsData: activeTab === 'follow-ups' ? { followUps: filteredFollowUps } : null,
        financialData: activeTab === 'financial' ? financialData : null,
        treatmentData: activeTab === 'treatment' ? treatmentData : null,
        doctorData: activeTab === 'doctor' ? doctorData : null,
        activeTab,
      });
    } catch (err) {
      console.error('Failed to export Excel report:', err);
    } finally {
      setExportingExcel(false);
    }
  };

  // Export comprehensive multi-sheet Excel workbook with all datasets
  const handleExportAllTabsExcel = async () => {
    setExportingExcel(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (!isDoctor && selectedDoctorId) params.append('doctorId', selectedDoctorId);

      const [perfRes, aptsRes, fUpsRes, finRes, treatRes, docRes] = await Promise.all([
        api.get(`/reports/clinic-performance?${params.toString()}`).catch(() => ({ data: null })),
        api.get(`/reports/appointments?${params.toString()}`).catch(() => ({ data: null })),
        api.get(`/reports/follow-ups?${params.toString()}`).catch(() => ({ data: null })),
        api.get(`/reports/financial?${params.toString()}`).catch(() => ({ data: null })),
        api.get(`/reports/treatment-analytics?${params.toString()}`).catch(() => ({ data: null })),
        api.get(`/reports/doctor-analytics?${params.toString()}`).catch(() => ({ data: null })),
      ]);

      const prefix = isDoctor ? 'My_Comprehensive_Clinical_Report' : 'Comprehensive_Clinic_Report';
      const rangeSuffix = `${dateFrom || 'all'}_to_${dateTo || 'now'}`;

      await exportReportsToExcel({
        filename: `${prefix}_${rangeSuffix}.xlsx`,
        isDoctor,
        dateFrom,
        dateTo,
        performanceData: perfRes.data,
        appointmentsData: aptsRes.data,
        followUpsData: fUpsRes.data,
        financialData: finRes.data,
        treatmentData: treatRes.data,
        doctorData: docRes.data,
      });
    } catch (err) {
      console.error('Failed to export comprehensive Excel report:', err);
    } finally {
      setExportingExcel(false);
    }
  };

  // Filtered Appointments
  const filteredAppointments = (appointmentsData?.appointments || []).filter((item) => {
    if (!aptSearch.trim()) return true;
    const q = aptSearch.trim().toLowerCase();
    return (
      (item.patientName || '').toLowerCase().includes(q) ||
      (item.opNumber || '').toLowerCase().includes(q) ||
      (item.phone || '').toLowerCase().includes(q) ||
      (item.reason || '').toLowerCase().includes(q) ||
      (item.doctorName || '').toLowerCase().includes(q)
    );
  });

  // Filtered Follow-Ups
  const filteredFollowUps = (followUpsData?.followUps || []).filter((item) => {
    if (!followUpSearch.trim()) return true;
    const q = followUpSearch.trim().toLowerCase();
    return (
      (item.patientName || '').toLowerCase().includes(q) ||
      (item.opNumber || '').toLowerCase().includes(q) ||
      (item.phone || '').toLowerCase().includes(q) ||
      (item.reason || '').toLowerCase().includes(q) ||
      (item.instructions || '').toLowerCase().includes(q) ||
      (item.doctorName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink flex items-center gap-2 min-w-0 leading-tight">
            <FileBarChart size={26} className="text-brand shrink-0" />
            <span className="truncate sm:whitespace-normal">
              {isDoctor ? 'My Clinical Reports & Analytics' : 'Reports & Clinic Analytics'}
            </span>
          </h1>
          <p className="text-xs text-ink-soft mt-1 leading-relaxed break-words">
            {isDoctor
              ? 'Your personal appointments, follow-ups, clinical consultations, procedure frequencies, and financial metrics.'
              : 'Real-time appointments log, follow-up recalls, financial summaries, operational turnaround times, and doctor productivity.'}
          </p>
        </div>

        <button
          type="button"
          disabled={exportingExcel}
          onClick={handleExportAllTabsExcel}
          className="btn-primary text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 py-2 px-3.5 font-bold shadow-sm"
        >
          <FileSpreadsheet size={15} className={exportingExcel ? 'animate-spin' : ''} />
          <span>{exportingExcel ? 'Exporting Excel...' : 'Export Complete Workbook (Excel)'}</span>
        </button>
      </div>

      {/* Desktop Range Filter Bar (≥768px) */}
      <div className="hidden md:block card p-4 bg-surface space-y-3 w-full max-w-full overflow-hidden">
        <div className="flex flex-row items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-ink">
            <Filter size={15} className="text-brand shrink-0" /> Date Range Filter
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-ink-soft text-[11px] font-medium mr-1">Quick Presets:</span>
            <button type="button" onClick={() => applyPreset(7)} className="btn-secondary py-1 px-2.5 text-[11px] font-semibold">Last 7 Days</button>
            <button type="button" onClick={() => applyPreset(30)} className="btn-secondary py-1 px-2.5 text-[11px] font-semibold">Last 30 Days</button>
            <button type="button" onClick={() => applyPreset(90)} className="btn-secondary py-1 px-2.5 text-[11px] font-semibold">Last 90 Days</button>
            <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-ink-soft hover:text-brand underline text-[11px] font-semibold ml-1">All Time</button>
          </div>
        </div>

        <div className={`grid ${isDoctor ? 'grid-cols-3' : 'grid-cols-4'} gap-3 text-xs`}>
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

          {!isDoctor && (
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Attending Doctor</label>
              <select
                className="input-field py-1.5 text-xs w-full font-medium"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
              >
                <option value="">All Attending Doctors</option>
                {doctorsList.map((doc) => {
                  const dId = doc._id || doc.id;
                  return (
                    <option key={dId} value={dId}>
                      Dr. {doc.name}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              type="button"
              onClick={fetchReports}
              className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5 font-bold"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh & Apply
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Collapsible Range Filter Accordion (<768px down to 320px) */}
      <div className="block md:hidden card p-3.5 bg-surface border border-border shadow-xs space-y-3 rounded-2xl max-w-full overflow-hidden">
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
              <span className="font-bold text-ink">Date Filter</span>
              {(dateFrom || dateTo) && (
                <span className="badge bg-brand text-white text-[10px] py-0.5 px-2 font-bold shrink-0 truncate max-w-[140px]">
                  {dateFrom || 'Start'} → {dateTo || 'Today'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-ink-soft font-semibold shrink-0">
            <span>{isRangeFilterOpen ? 'Hide' : 'Filter'}</span>
            {isRangeFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {isRangeFilterOpen && (
          <div className="pt-2 border-t border-border/70 space-y-3 animate-in fade-in duration-150 text-xs">
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => applyPreset(7)} className="btn-secondary py-1.5 px-2.5 text-xs font-semibold shrink-0">7 Days</button>
                <button type="button" onClick={() => applyPreset(30)} className="btn-secondary py-1.5 px-2.5 text-xs font-semibold shrink-0">30 Days</button>
                <button type="button" onClick={() => applyPreset(90)} className="btn-secondary py-1.5 px-2.5 text-xs font-semibold shrink-0">90 Days</button>
                <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-ink-soft hover:text-brand underline text-xs font-semibold ml-1 py-1 shrink-0">Clear</button>
              </div>
            </div>

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

              {!isDoctor && (
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">Attending Doctor</label>
                  <select
                    className="input-field py-1.5 text-xs w-full font-medium"
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                  >
                    <option value="">All Attending Doctors</option>
                    {doctorsList.map((doc) => {
                      const dId = doc._id || doc.id;
                      return (
                        <option key={dId} value={dId}>
                          Dr. {doc.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

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

      {/* Category Navigation Tabs */}
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
            <Activity size={16} className={activeTab === 'performance' ? 'text-brand' : 'text-ink-soft'} /> Operations & Turnaround
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            className={`px-3 py-2.5 flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all rounded-t-lg shrink-0 ${activeTab === 'appointments'
              ? 'border-brand text-brand font-bold bg-brand-light/30'
              : 'border-transparent text-ink-soft hover:text-ink hover:bg-bg/60'
              }`}
          >
            <CalendarDays size={16} className={activeTab === 'appointments' ? 'text-brand' : 'text-ink-soft'} /> Appointments Report
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('follow-ups')}
            className={`px-3 py-2.5 flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all rounded-t-lg shrink-0 ${activeTab === 'follow-ups'
              ? 'border-brand text-brand font-bold bg-brand-light/30'
              : 'border-transparent text-ink-soft hover:text-ink hover:bg-bg/60'
              }`}
          >
            <Bell size={16} className={activeTab === 'follow-ups' ? 'text-brand' : 'text-ink-soft'} /> Follow-Ups Report
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`px-3 py-2.5 flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all rounded-t-lg shrink-0 ${activeTab === 'financial'
              ? 'border-brand text-brand font-bold bg-brand-light/30'
              : 'border-transparent text-ink-soft hover:text-ink hover:bg-bg/60'
              }`}
          >
            <DollarSign size={16} className={activeTab === 'financial' ? 'text-brand' : 'text-ink-soft'} /> Financial & Revenue
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('treatment')}
            className={`px-3 py-2.5 flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all rounded-t-lg shrink-0 ${activeTab === 'treatment'
              ? 'border-brand text-brand font-bold bg-brand-light/30'
              : 'border-transparent text-ink-soft hover:text-ink hover:bg-bg/60'
              }`}
          >
            <Stethoscope size={16} className={activeTab === 'treatment' ? 'text-brand' : 'text-ink-soft'} /> Clinical & Treatments
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('doctor')}
            className={`px-3 py-2.5 flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all rounded-t-lg shrink-0 ${activeTab === 'doctor'
              ? 'border-brand text-brand font-bold bg-brand-light/30'
              : 'border-transparent text-ink-soft hover:text-ink hover:bg-bg/60'
              }`}
          >
            <UserCheck size={16} className={activeTab === 'doctor' ? 'text-brand' : 'text-ink-soft'} /> {isDoctor ? 'My Productivity' : 'Doctor Productivity'}
          </button>
        </div>
      </div>

      {loading ? (
        <ReportSkeleton />
      ) : (
        <>
          {/* ========================================================================= */}
          {/* TAB 1: OPERATIONS & CLINIC PERFORMANCE */}
          {/* ========================================================================= */}
          {activeTab === 'performance' && (
            <div className="space-y-5 sm:space-y-6 w-full max-w-full overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-ink">
                    {isDoctor ? 'My Operational Throughput & Turnaround' : 'Operational Throughput & Clinic Turnaround'}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-ink-soft">
                    {isDoctor
                      ? 'Your patient intake volume, average wait times, and consultation durations.'
                      : 'Real patient intake metrics, queue timings, and consultation flow.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={exportingExcel}
                  onClick={handleExportCurrentTabExcel}
                  className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 py-1.5 px-3 font-semibold"
                >
                  <FileSpreadsheet size={14} className={exportingExcel ? 'animate-spin' : 'text-emerald-700'} />
                  <span>Export Excel (.xlsx)</span>
                </button>
              </div>

              {/* Stat Cards Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full max-w-full">
                <StatCard
                  title={isDoctor ? 'My Total Patients' : 'Total Clinic Patients'}
                  value={performanceData?.totalPatients ?? '—'}
                  sub={isDoctor ? 'Unique patients handled' : 'All-time registered patients'}
                  icon={Users}
                />
                <StatCard
                  title="New Patients"
                  value={performanceData?.newPatients ?? '—'}
                  sub="First visit in period"
                  icon={UserPlus}
                />
                <StatCard
                  title="Returning Patients"
                  value={performanceData?.returningPatients ?? '—'}
                  sub="Multi-visit patient count"
                  icon={RotateCcw}
                />
                <StatCard
                  title="Completed Consultations"
                  value={performanceData?.completedConsultations ?? '—'}
                  sub="Successfully closed visits"
                  icon={CheckCircle2}
                />
              </div>

              {/* Timing & Turnaround Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card p-4 sm:p-5 space-y-2 border-l-4 border-l-brand bg-surface rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                      <Hourglass size={15} className="text-brand" /> Avg. Patient Wait Time
                    </span>
                    <span className="badge bg-brand-light/40 text-brand-dark text-[10px] font-bold">Queue to Chair</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-mono font-bold text-ink">
                      {performanceData?.avgWaitMinutes ?? 0}
                    </span>
                    <span className="text-xs text-ink-soft font-semibold">minutes</span>
                  </div>
                  <p className="text-[11px] text-ink-soft">Average elapsed time between patient check-in and starting consultation.</p>
                </div>

                <div className="card p-4 sm:p-5 space-y-2 border-l-4 border-l-purple-500 bg-surface rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                      <Clock size={15} className="text-purple-600" /> Avg. Consultation Duration
                    </span>
                    <span className="badge bg-purple-100 text-purple-800 text-[10px] font-bold">Chair Time</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-mono font-bold text-ink">
                      {performanceData?.avgConsultationMinutes ?? 0}
                    </span>
                    <span className="text-xs text-ink-soft font-semibold">minutes</span>
                  </div>
                  <p className="text-[11px] text-ink-soft">Average active clinical consultation time from start to completion.</p>
                </div>
              </div>

              {/* Appointments & Intake Channels Overview Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Appointments Breakdown */}
                <div className="card p-4 sm:p-5 space-y-3 bg-surface rounded-2xl border border-border shadow-xs">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2 border-b border-border/70 pb-2">
                    <CalendarDays size={16} className="text-brand shrink-0" /> Appointments Breakdown
                  </h3>

                  <div className="grid grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-bg/70 p-3 rounded-xl border border-border space-y-1 text-center">
                      <div className="text-ink-soft text-[10px] font-semibold uppercase">Total Scheduled</div>
                      <div className="text-lg font-bold font-mono text-ink">{performanceData?.appointments ?? 0}</div>
                    </div>

                    <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200/80 space-y-1 text-center">
                      <div className="text-rose-700 text-[10px] font-semibold uppercase">Cancelled</div>
                      <div className="text-lg font-bold font-mono text-rose-800">{performanceData?.cancelledAppointments ?? 0}</div>
                    </div>

                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 space-y-1 text-center">
                      <div className="text-amber-700 text-[10px] font-semibold uppercase">No-Shows</div>
                      <div className="text-lg font-bold font-mono text-amber-800">{performanceData?.noShows ?? 0}</div>
                    </div>
                  </div>
                </div>

                {/* Intake Channels */}
                <div className="card p-4 sm:p-5 space-y-3 bg-surface rounded-2xl border border-border shadow-xs">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2 border-b border-border/70 pb-2">
                    <Users size={16} className="text-brand shrink-0" /> Patient Intake Channels
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="font-semibold text-ink flex items-center gap-1.5"><Users size={14} className="text-brand" /> Walk-In Queue</span>
                      <span className="font-bold font-mono text-ink">{performanceData?.intakeChannels?.walkIns || 0} visits</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-border/50">
                      <span className="font-semibold text-ink flex items-center gap-1.5"><Phone size={14} className="text-emerald-600" /> Phone Booking</span>
                      <span className="font-bold font-mono text-ink">{performanceData?.intakeChannels?.phoneBookings || 0} visits</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-border/50">
                      <span className="font-semibold text-ink flex items-center gap-1.5"><Globe size={14} className="text-indigo-600" /> Online Booking</span>
                      <span className="font-bold font-mono text-ink">{performanceData?.intakeChannels?.onlineBookings || 0} visits</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: APPOINTMENTS REPORT */}
          {/* ========================================================================= */}
          {activeTab === 'appointments' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-ink">
                    {isDoctor ? 'My Appointments Log' : 'Clinic Appointments Log & Details'}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-ink-soft">
                    Real-time appointment schedule, check-in timestamps, consultation start and end times.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={exportingExcel}
                  onClick={handleExportCurrentTabExcel}
                  className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 py-1.5 px-3 font-semibold"
                >
                  <FileSpreadsheet size={14} className={exportingExcel ? 'animate-spin' : 'text-emerald-700'} />
                  <span>Export Excel (.xlsx)</span>
                </button>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard
                  title="Total"
                  value={appointmentsData?.totalCount ?? 0}
                  sub="All in period"
                  icon={CalendarDays}
                />
                <StatCard
                  title="Scheduled"
                  value={appointmentsData?.scheduledCount ?? 0}
                  sub="Pending visit"
                  icon={Clock}
                />
                <StatCard
                  title="Checked In"
                  value={appointmentsData?.checkedInCount ?? 0}
                  sub="In waiting area"
                  icon={Users}
                />
                <StatCard
                  title="Completed"
                  value={appointmentsData?.completedCount ?? 0}
                  sub="Finished visits"
                  icon={CheckCircle2}
                />
                <StatCard
                  title="Cancelled"
                  value={appointmentsData?.cancelledCount ?? 0}
                  sub="Patient / clinic"
                  icon={XCircle}
                />
                <StatCard
                  title="No Show"
                  value={appointmentsData?.noShowCount ?? 0}
                  sub="Missed bookings"
                  icon={AlertCircle}
                />
              </div>

              {/* Filter and Search Bar */}
              <div className="card p-3.5 bg-surface border border-border space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                    <input
                      type="text"
                      className="input-field pl-9 py-1.5 text-xs w-full"
                      placeholder="Search appointments by patient, OP#, phone, reason..."
                      value={aptSearch}
                      onChange={(e) => setAptSearch(e.target.value)}
                    />
                    {aptSearch && (
                      <button onClick={() => setAptSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      className="input-field py-1.5 text-xs font-semibold w-full sm:w-auto"
                      value={aptStatusFilter}
                      onChange={(e) => setAptStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Checked-In">Checked-In</option>
                      <option value="In Consultation">In Consultation</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="No Show">No Show</option>
                    </select>

                    {(aptSearch || aptStatusFilter) && (
                      <button
                        onClick={() => { setAptSearch(''); setAptStatusFilter(''); }}
                        className="btn-secondary py-1.5 px-3 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1 font-semibold shrink-0"
                      >
                        <X size={14} /> Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-ink-soft font-medium border-t border-border/60 pt-2 flex items-center justify-between">
                  <span>Showing {filteredAppointments.length} appointment(s)</span>
                  {(aptSearch || aptStatusFilter) && (
                    <span className="badge bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
                      Filtered List
                    </span>
                  )}
                </div>
              </div>

              {/* Appointments Table */}
              <div className="card overflow-hidden">
                {filteredAppointments.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <CalendarDays size={36} className="mx-auto text-ink-soft/50" />
                    <p className="font-display text-sm font-semibold text-ink">No appointments found in this range</p>
                    <p className="text-xs text-ink-soft">Try adjusting your date range or filter criteria.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-bg border-b border-border font-semibold text-ink-soft uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3 min-w-[200px]">Patient Details</th>
                            <th className="px-4 py-3 w-32">OP Number</th>
                            {!isDoctor && <th className="px-4 py-3 min-w-[150px]">Doctor</th>}
                            <th className="px-4 py-3 min-w-[150px]">Appointment Date & Time</th>
                            <th className="px-4 py-3 min-w-[180px]">Type / Reason</th>
                            <th className="px-4 py-3 min-w-[200px]">Timings (Check-In / Start / End)</th>
                            <th className="px-4 py-3 text-center w-32">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {filteredAppointments.map((apt) => (
                            <tr key={apt.id} className="hover:bg-bg/40 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-bold text-ink text-sm flex items-center gap-1.5">
                                  <span>{apt.patientName}</span>
                                  <span className={`badge text-[9px] py-0 px-1.5 font-bold ${apt.patientType === 'child' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                    {apt.patientType === 'child' ? 'Child' : 'Adult'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-ink-soft font-mono mt-0.5">{apt.phone}</div>
                              </td>

                              <td className="px-4 py-3 font-mono font-bold text-brand">
                                {apt.opNumber ? `#${apt.opNumber}` : '—'}
                              </td>

                              {!isDoctor && (
                                <td className="px-4 py-3 text-ink font-medium">
                                  {apt.doctorName}
                                </td>
                              )}

                              <td className="px-4 py-3 text-ink">
                                <div className="font-semibold">{formatDateVal(apt.date)}</div>
                                <div className="text-[11px] text-ink-soft font-mono">{apt.time || 'Scheduled'}</div>
                              </td>

                              <td className="px-4 py-3 text-ink">
                                <div className="font-medium">{apt.reason || 'General Dental Visit'}</div>
                                <div className="text-[10px] text-ink-soft capitalize">{apt.type}</div>
                              </td>

                              <td className="px-4 py-3 text-ink-soft font-mono text-[11px] space-y-0.5">
                                <div>Check-In: <span className="font-semibold text-ink">{formatTimingVal(apt.checkInTime)}</span></div>
                                <div>Start: <span className="font-semibold text-ink">{formatTimingVal(apt.startTime)}</span> • End: <span className="font-semibold text-emerald-700">{formatTimingVal(apt.endTime)}</span></div>
                              </td>

                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <span className={`badge text-[10px] font-bold border ${STATUS_BADGE_CLASSES[apt.status] || 'bg-slate-100 text-slate-700'}`}>
                                  {apt.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden divide-y divide-border">
                      {filteredAppointments.map((apt) => (
                        <div key={apt.id} className="p-3.5 space-y-2.5 hover:bg-bg/40 transition-colors text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-ink text-sm">{apt.patientName}</div>
                              <div className="text-[11px] text-ink-soft font-mono">
                                {apt.opNumber ? `#${apt.opNumber}` : ''} {apt.phone ? `• ${apt.phone}` : ''}
                              </div>
                            </div>
                            <span className={`badge text-[10px] font-bold border ${STATUS_BADGE_CLASSES[apt.status] || 'bg-slate-100 text-slate-700'}`}>
                              {apt.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-bg/50 p-2.5 rounded-xl border border-border">
                            <div>
                              <span className="block text-[10px] font-bold text-ink-soft uppercase">Schedule</span>
                              <span className="font-semibold text-ink">{formatDateVal(apt.date)} at {apt.time || '—'}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-ink-soft uppercase">Reason</span>
                              <span className="font-medium text-ink truncate block">{apt.reason}</span>
                            </div>
                            <div className="col-span-2 border-t border-border/50 pt-1.5 font-mono text-[11px] text-ink-soft">
                              <span>Check-In: <strong className="text-ink">{formatTimingVal(apt.checkInTime)}</strong></span>
                              <span className="ml-2">Start: <strong className="text-ink">{formatTimingVal(apt.startTime)}</strong></span>
                              <span className="ml-2">End: <strong className="text-emerald-700">{formatTimingVal(apt.endTime)}</strong></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: FOLLOW-UPS REPORT */}
          {/* ========================================================================= */}
          {activeTab === 'follow-ups' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-ink">
                    {isDoctor ? 'My Follow-Up Recalls' : 'Clinic Follow-Up & Recall Log'}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-ink-soft">
                    Patient recall pipeline, follow-up dates, procedure review statuses, and clinical notes.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={exportingExcel}
                  onClick={handleExportCurrentTabExcel}
                  className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 py-1.5 px-3 font-semibold"
                >
                  <FileSpreadsheet size={14} className={exportingExcel ? 'animate-spin' : 'text-emerald-700'} />
                  <span>Export Excel (.xlsx)</span>
                </button>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard
                  title="Total Recalls"
                  value={followUpsData?.totalCount ?? 0}
                  sub="All follow-ups"
                  icon={Bell}
                />
                <StatCard
                  title="Pending Due"
                  value={followUpsData?.pendingCount ?? 0}
                  sub="Awaiting scheduling"
                  icon={Hourglass}
                />
                <StatCard
                  title="Scheduled"
                  value={followUpsData?.scheduledCount ?? 0}
                  sub="Appointment booked"
                  icon={CalendarDays}
                />
                <StatCard
                  title="Completed"
                  value={followUpsData?.completedCount ?? 0}
                  sub="Review finished"
                  icon={CheckCircle2}
                />
                <StatCard
                  title="Missed / Cancelled"
                  value={(followUpsData?.cancelledCount || 0) + (followUpsData?.missedCount || 0)}
                  sub="Action required"
                  icon={AlertCircle}
                />
              </div>

              {/* Filter and Search Bar */}
              <div className="card p-3.5 bg-surface border border-border space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                    <input
                      type="text"
                      className="input-field pl-9 py-1.5 text-xs w-full"
                      placeholder="Search follow-ups by patient, OP#, phone, reason, instructions..."
                      value={followUpSearch}
                      onChange={(e) => setFollowUpSearch(e.target.value)}
                    />
                    {followUpSearch && (
                      <button onClick={() => setFollowUpSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      className="input-field py-1.5 text-xs font-semibold w-full sm:w-auto"
                      value={followUpStatusFilter}
                      onChange={(e) => setFollowUpStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Missed">Missed</option>
                    </select>

                    {(followUpSearch || followUpStatusFilter) && (
                      <button
                        onClick={() => { setFollowUpSearch(''); setFollowUpStatusFilter(''); }}
                        className="btn-secondary py-1.5 px-3 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1 font-semibold shrink-0"
                      >
                        <X size={14} /> Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-ink-soft font-medium border-t border-border/60 pt-2 flex items-center justify-between">
                  <span>Showing {filteredFollowUps.length} follow-up record(s)</span>
                  {(followUpSearch || followUpStatusFilter) && (
                    <span className="badge bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
                      Filtered List
                    </span>
                  )}
                </div>
              </div>

              {/* Follow-Ups Table */}
              <div className="card overflow-hidden">
                {filteredFollowUps.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <Bell size={36} className="mx-auto text-ink-soft/50" />
                    <p className="font-display text-sm font-semibold text-ink">No follow-ups found in this range</p>
                    <p className="text-xs text-ink-soft">Try adjusting your date range or filter criteria.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-bg border-b border-border font-semibold text-ink-soft uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3 min-w-[180px]">Patient Details</th>
                            <th className="px-4 py-3 w-32">OP Number</th>
                            {!isDoctor && <th className="px-4 py-3 min-w-[140px]">Doctor</th>}
                            <th className="px-4 py-3 min-w-[140px]">Follow-Up Date</th>
                            <th className="px-4 py-3 min-w-[160px]">Reason for Follow-Up</th>
                            <th className="px-4 py-3 min-w-[160px]">Treatment Status</th>
                            <th className="px-4 py-3 min-w-[200px]">Instructions / Notes</th>
                            <th className="px-4 py-3 text-center w-28">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {filteredFollowUps.map((f) => (
                            <tr key={f.id} className="hover:bg-bg/40 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-bold text-ink text-sm">{f.patientName}</div>
                                <div className="text-[11px] text-ink-soft font-mono mt-0.5">{f.phone}</div>
                              </td>

                              <td className="px-4 py-3 font-mono font-bold text-brand">
                                {f.opNumber ? `#${f.opNumber}` : '—'}
                              </td>

                              {!isDoctor && (
                                <td className="px-4 py-3 text-ink font-medium">
                                  {f.doctorName}
                                </td>
                              )}

                              <td className="px-4 py-3 text-ink">
                                <div className="font-semibold">{formatDateVal(f.date)}</div>
                                <div className="text-[11px] text-ink-soft font-mono">{f.time !== '—' ? f.time : 'Flexible'}</div>
                              </td>

                              <td className="px-4 py-3 text-ink font-medium">
                                {f.reason}
                              </td>

                              <td className="px-4 py-3">
                                <span className="badge bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-semibold">
                                  {f.treatmentStatus}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-ink-soft italic max-w-xs truncate">
                                {f.instructions}
                              </td>

                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <span className={`badge text-[10px] font-bold border ${STATUS_BADGE_CLASSES[f.status] || 'bg-slate-100 text-slate-700'}`}>
                                  {f.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden divide-y divide-border">
                      {filteredFollowUps.map((f) => (
                        <div key={f.id} className="p-3.5 space-y-2.5 hover:bg-bg/40 transition-colors text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-ink text-sm">{f.patientName}</div>
                              <div className="text-[11px] text-ink-soft font-mono">
                                {f.opNumber ? `#${f.opNumber}` : ''} {f.phone ? `• ${f.phone}` : ''}
                              </div>
                            </div>
                            <span className={`badge text-[10px] font-bold border ${STATUS_BADGE_CLASSES[f.status] || 'bg-slate-100 text-slate-700'}`}>
                              {f.status}
                            </span>
                          </div>

                          <div className="space-y-1.5 bg-bg/50 p-2.5 rounded-xl border border-border">
                            <div className="flex justify-between">
                              <span className="text-ink-soft font-semibold">Recall Date:</span>
                              <span className="font-bold text-ink">{formatDateVal(f.date)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-ink-soft font-semibold">Reason:</span>
                              <span className="font-medium text-ink truncate">{f.reason}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-ink-soft font-semibold">Treatment Status:</span>
                              <span className="font-semibold text-brand">{f.treatmentStatus}</span>
                            </div>
                            {f.instructions !== '—' && (
                              <div className="pt-1 border-t border-border/50 text-[11px] text-ink-soft italic">
                                "{f.instructions}"
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: FINANCIAL METRICS */}
          {/* ========================================================================= */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-ink">
                    {isDoctor ? 'My Financial & Revenue Summary' : 'Financial & Revenue Analytics'}
                  </h2>
                  <p className="text-[11px] text-ink-soft">
                    {isDoctor
                      ? 'Billed amounts, collections, and pending balances from your consultations.'
                      : 'Real billing numbers, collection methods, and pending receivables across clinic.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={exportingExcel}
                  onClick={handleExportCurrentTabExcel}
                  className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 py-1.5 px-3 font-semibold"
                >
                  <FileSpreadsheet size={14} className={exportingExcel ? 'animate-spin' : 'text-emerald-700'} />
                  <span>Export Excel (.xlsx)</span>
                </button>
              </div>

              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Invoiced Value"
                  value={`₹${(financialData?.totalInvoiced || 0).toLocaleString()}`}
                  sub={`${financialData?.invoiceCounts?.total || 0} total invoices`}
                  icon={CreditCard}
                />
                <StatCard
                  title="Total Collected Revenue"
                  value={`₹${(financialData?.totalRevenue || 0).toLocaleString()}`}
                  sub="Net payments received"
                  icon={DollarSign}
                />
                <StatCard
                  title="Outstanding Receivables"
                  value={`₹${(financialData?.pendingPaymentsTotal || 0).toLocaleString()}`}
                  sub={`${financialData?.invoiceCounts?.pending || 0} pending invoices`}
                  icon={Wallet}
                />
                <StatCard
                  title="Discounts Granted"
                  value={`₹${(financialData?.totalDiscount || 0).toLocaleString()}`}
                  sub={`₹${(financialData?.totalTax || 0).toLocaleString()} taxes included`}
                  icon={Tag}
                />
              </div>

              {/* Payment Method Breakdown & Daily Revenue */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Methods */}
                <div className="card p-5 space-y-4">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Collections by Payment Method</h3>
                  <div className="space-y-3 text-xs">
                    {Object.entries(financialData?.paymentMethodBreakdown || { Cash: 0, UPI: 0, Card: 0, 'Bank Transfer': 0, Other: 0 }).map(
                      ([method, amount]) => {
                        const total = financialData?.totalRevenue || 1;
                        const pct = Math.round((amount / (total || 1)) * 100);
                        return (
                          <div key={method} className="space-y-1">
                            <div className="flex justify-between font-semibold text-ink">
                              <span>{method}</span>
                              <span className="font-mono">₹{amount.toLocaleString()} ({pct}%)</span>
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
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Daily Billing & Collection Log</h3>
                  
                  <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-bg border-b border-border sticky top-0 font-semibold text-ink-soft">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2 text-right">Invoiced</th>
                          <th className="px-3 py-2 text-right">Collected</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {(!financialData?.dailyRevenue || financialData.dailyRevenue.length === 0) ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-ink-soft">No revenue recorded in range.</td>
                          </tr>
                        ) : (
                          financialData.dailyRevenue.map((d) => (
                            <tr key={d.date} className="hover:bg-bg/40 font-mono">
                              <td className="px-3 py-2 font-sans font-medium text-ink">{d.date}</td>
                              <td className="px-3 py-2 text-right text-ink">₹{(d.invoiced || 0).toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-bold text-emerald-700">₹{(d.collected || d.revenue || 0).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Pending Receivables Aging Table */}
              {financialData?.pendingInvoicesList && financialData.pendingInvoicesList.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert size={15} className="text-amber-600" /> Pending Receivables ({financialData.pendingInvoicesList.length})
                    </h3>
                  </div>

                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-bg border-b border-border font-semibold text-ink-soft uppercase sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5">Patient</th>
                          <th className="px-4 py-2.5">OP #</th>
                          {!isDoctor && <th className="px-4 py-2.5">Doctor</th>}
                          <th className="px-4 py-2.5 text-right">Total Invoiced</th>
                          <th className="px-4 py-2.5 text-right">Paid</th>
                          <th className="px-4 py-2.5 text-right">Balance Due</th>
                          <th className="px-4 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {financialData.pendingInvoicesList.map((inv) => (
                          <tr key={inv.id} className="hover:bg-bg/40">
                            <td className="px-4 py-2.5 font-bold text-ink">{inv.patientName}</td>
                            <td className="px-4 py-2.5 font-mono text-brand font-semibold">#{inv.opNumber}</td>
                            {!isDoctor && <td className="px-4 py-2.5 text-ink-soft">{inv.doctorName}</td>}
                            <td className="px-4 py-2.5 text-right font-mono">₹{(inv.total || 0).toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-emerald-700 font-semibold">₹{(inv.amountPaid || 0).toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-700">₹{(inv.balance || 0).toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`badge text-[10px] font-bold ${inv.paymentStatus === 'Partially Paid' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                {inv.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: TREATMENT ANALYTICS */}
          {/* ========================================================================= */}
          {activeTab === 'treatment' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-ink">
                    {isDoctor ? 'My Clinical Treatment Analytics' : 'Clinical Treatment Analytics & Procedure Rankings'}
                  </h2>
                  <p className="text-[11px] text-ink-soft">
                    {isDoctor
                      ? 'Procedures performed and planned during your consultations.'
                      : 'Volume and financial breakdown of performed and planned procedures across the clinic.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={exportingExcel}
                  onClick={handleExportCurrentTabExcel}
                  className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 py-1.5 px-3 font-semibold"
                >
                  <FileSpreadsheet size={14} className={exportingExcel ? 'animate-spin' : 'text-emerald-700'} />
                  <span>Export Excel (.xlsx)</span>
                </button>
              </div>

              {/* Specific Procedure Frequency Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { title: 'Root Canal (RCT)', count: treatmentData?.specificCounts?.RCT ?? 0 },
                  { title: 'Crown & Bridge', count: treatmentData?.specificCounts?.Crown ?? 0 },
                  { title: 'Filling / Composite', count: treatmentData?.specificCounts?.Filling ?? 0 },
                  { title: 'Extractions', count: treatmentData?.specificCounts?.Extraction ?? 0 },
                  { title: 'Dental Implants', count: treatmentData?.specificCounts?.Implant ?? 0 },
                  { title: 'Cleaning & Scaling', count: treatmentData?.specificCounts?.Cleaning ?? 0 },
                ].map((item) => (
                  <div key={item.title} className="card p-3.5 text-center space-y-1 bg-surface border border-border shadow-xs">
                    <div className="text-[11px] font-semibold text-ink-soft truncate">{item.title}</div>
                    <div className="text-xl sm:text-2xl font-bold text-brand font-mono">{item.count}</div>
                  </div>
                ))}
              </div>

              {/* Ranked Treatments Table */}
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-border font-bold text-xs text-ink uppercase tracking-wider">
                  {isDoctor ? 'My Procedures Ranked by Volume & Total Value' : 'Procedure Rankings by Volume & Total Generated Revenue'}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bg border-b border-border font-semibold text-ink-soft">
                      <tr>
                        <th className="px-4 py-2.5">Rank</th>
                        <th className="px-4 py-2.5">Treatment / Procedure</th>
                        <th className="px-4 py-2.5 text-center">Frequency</th>
                        <th className="px-4 py-2.5 text-right">Total Revenue Value (₹)</th>
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
                            <td className="px-4 py-2.5 text-center font-semibold font-mono text-brand">{t.count}</td>
                            <td className="px-4 py-2.5 text-right font-bold font-mono text-emerald-700">₹{(t.totalRevenue || t.estimatedRevenue || 0).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
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
                          <span className="badge bg-brand/10 text-brand font-bold text-xs shrink-0 font-mono">
                            {t.count} cases
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                          <span className="text-ink-soft font-medium">Total Value:</span>
                          <span className="font-bold text-emerald-700 font-mono">₹{(t.totalRevenue || t.estimatedRevenue || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: DOCTOR ANALYTICS */}
          {/* ========================================================================= */}
          {activeTab === 'doctor' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-ink">
                    {isDoctor ? 'My Performance & Productivity Summary' : 'Doctor Productivity & Case Analytics'}
                  </h2>
                  <p className="text-[11px] text-ink-soft">
                    {isDoctor
                      ? 'Your patient volume, consultation counts, average duration, and financial revenue.'
                      : 'Performance, case volume, average consultation duration, and revenue generated per doctor.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={exportingExcel}
                  onClick={handleExportCurrentTabExcel}
                  className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 py-1.5 px-3 font-semibold"
                >
                  <FileSpreadsheet size={14} className={exportingExcel ? 'animate-spin' : 'text-emerald-700'} />
                  <span>Export Excel (.xlsx)</span>
                </button>
              </div>

              <div className="card overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bg border-b border-border font-semibold text-ink-soft">
                      <tr>
                        <th className="px-4 py-3">Doctor</th>
                        <th className="px-4 py-3">Specialization</th>
                        <th className="px-4 py-3 text-center">Patients Handled</th>
                        <th className="px-4 py-3 text-center">Consultations</th>
                        <th className="px-4 py-3 text-center">Avg Duration</th>
                        <th className="px-4 py-3 text-right">Billed Value (₹)</th>
                        <th className="px-4 py-3 text-right">Revenue Collected (₹)</th>
                        <th className="px-4 py-3 text-center">Follow-ups</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(!doctorData?.doctors || doctorData.doctors.length === 0) ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-ink-soft">No doctor activity found.</td>
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
                            <td className="px-4 py-3 text-center font-bold text-ink font-mono">
                              {doc.patientsHandled}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-brand font-mono">
                              {doc.consultationsCount}
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-purple-700 font-semibold">
                              {doc.avgConsultationMinutes || 0} mins
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-medium text-ink">
                              ₹{(doc.billedAmount || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-bold font-mono text-emerald-700">
                              ₹{(doc.revenueGenerated || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold font-mono text-emerald-700">
                              {doc.followUpsCount}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
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
                            <span className="font-bold text-ink font-mono">{doc.patientsHandled}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-ink-soft uppercase">Consultations</span>
                            <span className="font-bold text-brand font-mono">{doc.consultationsCount}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-ink-soft uppercase">Avg Duration</span>
                            <span className="font-semibold text-purple-700 font-mono">{doc.avgConsultationMinutes || 0} mins</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-ink-soft uppercase">Revenue Collected</span>
                            <span className="font-bold text-emerald-700 font-mono">₹{(doc.revenueGenerated || 0).toLocaleString()}</span>
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
