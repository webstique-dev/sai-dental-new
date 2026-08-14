import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Play, Clock, UserSquare2, RefreshCw, Calendar, Search, Filter, X, Eye, FileText, CheckCircle2, User
} from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

const STATUS_BADGE_CLASSES = {
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  'No Show': 'bg-slate-100 text-slate-800 border-slate-200',
  Missed: 'bg-purple-100 text-purple-800 border-purple-200',
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function DoctorQueue() {
  const navigate = useNavigate();
  const { showError } = useNotification();

  // Active Tab: 'current' (default) | 'history'
  const [activeTab, setActiveTab] = useState('current');

  // TAB 1: CURRENT QUEUE STATE
  const [queueEntries, setQueueEntries] = useState([]);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);

  // TAB 2: APPOINTMENT HISTORY STATE
  const [rawHistoryItems, setRawHistoryItems] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedVisitSummary, setSelectedVisitSummary] = useState(null);

  // History Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch Current Today Queue
  const fetchDoctorQueue = async () => {
    try {
      setLoadingCurrent(true);
      const res = await api.get('/consultations/queue/today');
      setQueueEntries(res.data?.queueEntries || []);
    } catch (err) {
      console.error('Failed to fetch doctor queue:', err);
      showError(err.response?.data?.message || 'Failed to load today queue.');
    } finally {
      setLoadingCurrent(false);
    }
  };

  // Fetch Appointment History Logs & Doctors list
  const fetchAppointmentHistory = async () => {
    try {
      setLoadingHistory(true);
      const [cRes, aRes, dRes] = await Promise.all([
        api.get('/consultations').catch(() => ({ data: { consultations: [] } })),
        api.get('/appointments').catch(() => ({ data: { appointments: [] } })),
        api.get('/users/doctors').catch(() => ({ data: { doctors: [] } })),
      ]);

      const cList = cRes.data?.consultations || [];
      const aList = aRes.data?.appointments || [];
      const dList = dRes.data?.doctors || [];

      setDoctors(dList);

      const merged = [];
      const consultAptIds = new Set();

      cList.forEach((c) => {
        const aptId = c.appointment?._id || c.appointment?.id || c.appointment;
        if (aptId) consultAptIds.add(aptId.toString());

        merged.push({
          id: c._id || c.id,
          consultationId: c._id || c.id,
          patient: c.patient,
          doctor: c.doctor,
          date: c.visitDate || c.startedAt || c.createdAt,
          checkInTime: c.queueEntry?.checkInTime || c.startedAt || c.createdAt,
          startTime: c.startedAt || c.createdAt,
          endTime: c.closedAt || null,
          status: c.status === 'In Progress' ? 'In Consultation' : (c.status || 'Completed'),
          reason: c.appointment?.reason || c.queueEntry?.reason || (c.queueEntry?.type === 'Walk-in' ? 'Walk-in Consultation' : 'General Dental Visit'),
          notes: c.clinicalNotes || c.notes || '',
          diagnoses: c.diagnoses || [],
          prescriptions: c.prescriptions || [],
          treatmentPlans: c.treatmentPlans || [],
        });
      });

      aList.forEach((a) => {
        const aId = (a._id || a.id).toString();
        if (!consultAptIds.has(aId)) {
          merged.push({
            id: a._id || a.id,
            patient: a.patient,
            doctor: a.doctor,
            date: a.date || a.createdAt,
            checkInTime: a.createdAt,
            startTime: null,
            endTime: null,
            status: a.status || 'Scheduled',
            reason: a.reason || 'Scheduled Appointment',
            notes: '',
            diagnoses: [],
            prescriptions: [],
            treatmentPlans: [],
          });
        }
      });

      // Sort newest first
      merged.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRawHistoryItems(merged);
    } catch (err) {
      console.error('Failed to fetch appointment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchDoctorQueue();
    fetchAppointmentHistory();
  }, []);

  const handleStartConsultation = async (entry) => {
    const entryId = entry._id || entry.id;
    if (entry.activeConsultationId) {
      navigate(`/doctor/consultation/${entry.activeConsultationId}`);
      return;
    }

    setSubmittingId(entryId);
    try {
      const res = await api.post('/consultations/start', { queueEntryId: entryId });
      const consultation = res.data?.consultation;
      if (consultation && (consultation._id || consultation.id)) {
        const cId = consultation._id || consultation.id;
        navigate(`/doctor/consultation/${cId}`);
      } else {
        fetchDoctorQueue();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to start consultation.');
    } finally {
      setSubmittingId(null);
    }
  };

  // Filtered History Items
  const filteredHistoryItems = useMemo(() => {
    let result = [...rawHistoryItems];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        const p = item.patient || {};
        const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').toLowerCase();
        const op = (p.opNumber || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        return fullName.includes(q) || op.includes(q) || phone.includes(q);
      });
    }

    if (doctorFilter) {
      result = result.filter((item) => {
        const docId = item.doctor?._id || item.doctor?.id || item.doctor;
        return docId && docId.toString() === doctorFilter.toString();
      });
    }

    if (statusFilter) {
      result = result.filter((item) => item.status === statusFilter);
    }

    if (dateFrom) {
      const fromD = new Date(dateFrom);
      fromD.setHours(0, 0, 0, 0);
      result = result.filter((item) => new Date(item.date) >= fromD);
    }

    if (dateTo) {
      const toD = new Date(dateTo);
      toD.setHours(23, 59, 59, 999);
      result = result.filter((item) => new Date(item.date) <= toD);
    }

    return result;
  }, [rawHistoryItems, searchQuery, doctorFilter, statusFilter, dateFrom, dateTo]);

  const handleResetHistoryFilters = () => {
    setSearchQuery('');
    setDoctorFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveHistoryFilters = Boolean(searchQuery || doctorFilter || statusFilter || dateFrom || dateTo);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <ClipboardList size={22} className="text-brand" /> My Clinical Queue
          </h2>
          <p className="text-sm text-ink-soft">
            {activeTab === 'current'
              ? "Today's checked-in patients waiting for consultation"
              : 'Chronological log of past queue entries and completed/cancelled appointments'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (activeTab === 'current') fetchDoctorQueue();
              else fetchAppointmentHistory();
            }}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loadingCurrent || loadingHistory ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* TABS SEGMENT CONTROL */}
      <div className="flex items-center border-b border-border space-x-2">
        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'current'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-soft hover:text-ink hover:border-border'
          }`}
        >
          <ClipboardList size={16} />
          <span>Current Queue</span>
          {queueEntries.length > 0 && (
            <span className="badge bg-brand-light/50 text-brand-dark font-mono text-[10px]">
              {queueEntries.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-soft hover:text-ink hover:border-border'
          }`}
        >
          <Calendar size={16} />
          <span>Appointment History</span>
          <span className="badge bg-slate-100 text-slate-700 font-mono text-[10px]">
            {filteredHistoryItems.length}
          </span>
        </button>
      </div>

      {/* TAB 1: CURRENT QUEUE VIEW (DEFAULT LANDING VIEW) */}
      {activeTab === 'current' && (
        <div className="card overflow-hidden">
          {loadingCurrent ? (
            <div className="p-8 text-center text-sm text-ink-soft">Loading today's queue...</div>
          ) : queueEntries.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <UserSquare2 size={36} className="mx-auto text-ink-soft/50" />
              <p className="font-display text-base font-semibold text-ink">No active patients waiting in your queue</p>
              <p className="text-sm text-ink-soft">
                Checked-in patients assigned to you will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Token</th>
                    <th className="px-5 py-3.5">Patient</th>
                    <th className="px-5 py-3.5">OP No</th>
                    <th className="px-5 py-3.5">Reason / Type</th>
                    <th className="px-5 py-3.5">Check-In Time</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {queueEntries.map((entry) => {
                    const entryId = entry._id || entry.id;
                    const patientName = entry.patient
                      ? `${entry.patient.firstName} ${entry.patient.lastName}`.trim()
                      : 'Patient';
                    const checkInTimeStr = entry.checkInTime
                      ? new Date(entry.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'N/A';

                    const displayStatus = entry.status === 'With Doctor' ? 'In Consultation' : entry.status;
                    const isConsulting = displayStatus === 'In Consultation' || entry.activeConsultationId;

                    return (
                      <tr key={entryId} className="hover:bg-bg/60 transition-colors">
                        {/* Token */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-mono text-base font-bold shadow-sm">
                            #{entry.token || 1}
                          </span>
                        </td>

                        {/* Patient */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-ink">{patientName}</div>
                          <div className="text-xs text-ink-soft">
                            {entry.patient?.age ? `${entry.patient.age}y` : ''} {entry.patient?.sex ? `/ ${entry.patient.sex}` : ''} {entry.patient?.phone ? `• ${entry.patient.phone}` : ''}
                          </div>
                        </td>

                        {/* OP No */}
                        <td className="px-5 py-4 font-mono font-bold text-brand text-xs">
                          {entry.patient?.opNumber || '—'}
                        </td>

                        {/* Reason / Type */}
                        <td className="px-5 py-4 text-xs font-medium text-ink">
                          <span className="badge bg-orange-100 text-orange-800 border border-orange-200">
                            {entry.appointment?.reason || entry.type || 'Walk-in'}
                          </span>
                        </td>

                        {/* Check-In Time */}
                        <td className="px-5 py-4 text-xs text-ink-soft whitespace-nowrap">
                          <div className="flex items-center gap-1 font-medium text-ink">
                            <Clock size={13} className="text-brand" /> {checkInTimeStr}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`badge border ${
                              STATUS_BADGE_CLASSES[displayStatus] || 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {displayStatus}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <button
                            disabled={submittingId === entryId}
                            onClick={() => handleStartConsultation(entry)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                              isConsulting
                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                : 'bg-brand text-white hover:bg-brand-dark'
                            }`}
                          >
                            <Play size={14} fill="currentColor" />
                            <span>
                              {submittingId === entryId
                                ? 'Loading...'
                                : isConsulting
                                ? 'Continue Consultation'
                                : 'Start Consultation'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPOINTMENT HISTORY TAB VIEW */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* SEARCH & FILTER CONTROLS BAR */}
          <div className="card p-4 space-y-3 bg-surface border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="text"
                  className="input-field pl-10 py-2 text-xs"
                  placeholder="Search by Patient Name, OP Number, or Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {hasActiveHistoryFilters && (
                <button
                  onClick={handleResetHistoryFilters}
                  className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold shrink-0"
                >
                  <X size={13} /> Reset Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <DatePicker
                  placeholder="From Date"
                  value={dateFrom}
                  onChange={(d, dStr) => setDateFrom(dStr)}
                  inputClassName="py-1.5 text-xs"
                />
              </div>

              <div>
                <DatePicker
                  placeholder="To Date"
                  value={dateTo}
                  onChange={(d, dStr) => setDateTo(dStr)}
                  inputClassName="py-1.5 text-xs"
                />
              </div>

              <div>
                <select
                  className="input-field py-1.5 text-xs font-semibold"
                  value={doctorFilter}
                  onChange={(e) => setDoctorFilter(e.target.value)}
                >
                  <option value="">All Attending Doctors</option>
                  {doctors.map((d) => (
                    <option key={d._id || d.id} value={d._id || d.id}>
                      Dr. {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  className="input-field py-1.5 text-xs font-semibold"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="In Consultation">In Consultation</option>
                  <option value="Checked-In">Checked-In</option>
                  <option value="No Show">No Show</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* HISTORY TABLE */}
          <div className="card overflow-hidden">
            {loadingHistory ? (
              <div className="p-12 text-center text-xs text-ink-soft">Loading appointment history log...</div>
            ) : filteredHistoryItems.length === 0 ? (
              <div className="p-12 text-center space-y-3 border border-dashed border-border rounded-xl">
                <Calendar size={36} className="mx-auto text-ink-soft/40" />
                <p className="font-display text-base font-semibold text-ink">No appointment history records found</p>
                <p className="text-xs text-ink-soft">
                  {hasActiveHistoryFilters
                    ? 'No past appointment or queue entries match your selected date/doctor/status filters.'
                    : 'History entries will automatically accumulate as appointments and consultations occur.'}
                </p>
                {hasActiveHistoryFilters && (
                  <button
                    onClick={handleResetHistoryFilters}
                    className="btn-secondary text-xs py-1.5 px-3 font-semibold mx-auto inline-flex items-center gap-1"
                  >
                    <RefreshCw size={13} /> Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Patient Name</th>
                      <th className="px-5 py-3.5">OP Number</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Checked-In Time</th>
                      <th className="px-5 py-3.5">Consultation Start Time</th>
                      <th className="px-5 py-3.5">Consultation End Time</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredHistoryItems.map((item) => {
                      const p = item.patient || {};
                      const patientName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Patient';

                      const dateStr = item.date
                        ? new Date(item.date).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })
                        : 'N/A';

                      const checkInTimeStr = item.checkInTime
                        ? new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—';

                      const startTimeStr = item.startTime
                        ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—';

                      const endTimeStr = item.endTime
                        ? new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : (item.status === 'In Consultation' ? 'In Progress' : '—');

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedVisitSummary(item)}
                          className="hover:bg-bg/60 cursor-pointer transition-colors group"
                        >
                          {/* Patient Name */}
                          <td className="px-5 py-4 font-bold text-ink">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
                                <User size={14} />
                              </div>
                              <div>
                                <span className="group-hover:text-brand transition-colors block">{patientName}</span>
                                <span className="text-[10px] text-ink-soft font-normal">
                                  {p.age ? `${p.age}y` : ''} {p.sex ? `/ ${p.sex}` : ''}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* OP Number */}
                          <td className="px-5 py-4 font-mono font-bold text-brand whitespace-nowrap">
                            {p.opNumber ? `#${p.opNumber}` : '—'}
                          </td>

                          {/* Date */}
                          <td className="px-5 py-4 text-ink font-semibold whitespace-nowrap">
                            {dateStr}
                          </td>

                          {/* Checked-In Time */}
                          <td className="px-5 py-4 font-mono text-ink-soft whitespace-nowrap">
                            {checkInTimeStr}
                          </td>

                          {/* Consultation Start Time */}
                          <td className="px-5 py-4 font-mono text-ink-soft whitespace-nowrap">
                            {startTimeStr}
                          </td>

                          {/* Consultation End Time */}
                          <td className="px-5 py-4 font-mono text-ink-soft whitespace-nowrap">
                            {endTimeStr}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`badge border text-[10px] ${STATUS_BADGE_CLASSES[item.status] || 'bg-slate-100 text-slate-800'}`}>
                              {item.status}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVisitSummary(item);
                              }}
                              className="btn-secondary py-1 px-2.5 text-xs font-semibold inline-flex items-center gap-1.5"
                            >
                              <Eye size={13} /> View Summary
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BRIEF VISIT SUMMARY MODAL (APPOINTMENT HISTORY) */}
      {selectedVisitSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-150">
          <div className="card w-full max-w-lg max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-2xl border-brand/20">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand text-white flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">
                    Visit Summary
                  </h3>
                  <p className="text-xs text-ink-soft">
                    Date:{' '}
                    <strong className="text-ink">
                      {new Date(selectedVisitSummary.date).toLocaleDateString(undefined, {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedVisitSummary(null)}
                className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-bg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Patient Banner */}
              <div className="p-3.5 rounded-xl bg-bg border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-bold text-ink">
                    {[selectedVisitSummary.patient?.firstName, selectedVisitSummary.patient?.lastName].filter(Boolean).join(' ') || 'Patient'}
                  </span>
                  <span className={`badge border text-[10px] ${STATUS_BADGE_CLASSES[selectedVisitSummary.status] || 'bg-slate-100'}`}>
                    {selectedVisitSummary.status}
                  </span>
                </div>
                <div className="text-xs text-ink-soft">
                  OP Number: <strong className="font-mono text-brand font-bold">#{selectedVisitSummary.patient?.opNumber || 'N/A'}</strong>
                  {selectedVisitSummary.patient?.age ? ` • Age: ${selectedVisitSummary.patient.age}y` : ''}
                  {selectedVisitSummary.patient?.sex ? ` • Sex: ${selectedVisitSummary.patient.sex}` : ''}
                </div>
              </div>

              {/* Visit Details */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-surface">
                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-0.5">Attending Doctor</span>
                  <span className="font-semibold text-ink block">Dr. {selectedVisitSummary.doctor?.name || 'Staff Doctor'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-0.5">Reason / Type</span>
                  <span className="font-semibold text-brand block">{selectedVisitSummary.reason || 'General Consultation'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-0.5">Checked-In Time</span>
                  <span className="font-mono text-ink block">
                    {selectedVisitSummary.checkInTime ? new Date(selectedVisitSummary.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-0.5">Consultation Time</span>
                  <span className="font-mono text-ink block">
                    {selectedVisitSummary.startTime ? new Date(selectedVisitSummary.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}{' '}
                    to{' '}
                    {selectedVisitSummary.endTime ? new Date(selectedVisitSummary.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (selectedVisitSummary.status === 'In Consultation' ? 'In Progress' : '—')}
                  </span>
                </div>
              </div>

              {/* Notes or Clinical Summary */}
              {selectedVisitSummary.notes && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-1">
                  <span className="font-bold text-[10px] uppercase tracking-wider block text-amber-800">
                    Visit Notes:
                  </span>
                  <p className="whitespace-pre-wrap text-xs">{selectedVisitSummary.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-5 py-3 border-t border-border bg-bg/50 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedVisitSummary(null)}
                className="btn-secondary py-1.5 px-4 text-xs font-semibold"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
