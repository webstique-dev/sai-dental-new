import { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList, UserPlus, Search, CheckCircle2, AlertTriangle, X,
  User, Stethoscope, ChevronRight, ChevronLeft, ArrowRight, ShieldCheck,
  UserCheck, Loader2, RefreshCw, Clock, Calendar, Eye, FileText, Check, Filter
} from 'lucide-react';
import api from '../../api/axios.js';
import PatientSearchInput from '../../components/common/PatientSearchInput.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { validateName, validatePhone, validateAge } from '../../utils/validators.js';

const STATUS_BADGE_CLASSES = {
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  'No Show': 'bg-slate-100 text-slate-800 border-slate-200',
};

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Queue() {
  const { showSuccess, showError } = useNotification();

  // Active Tab: 'active' (default) | 'completed'
  const [activeTab, setActiveTab] = useState('active');

  // TAB 1: ACTIVE QUEUE STATE
  const [queueEntries, setQueueEntries] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [pendingCancelQueueEntry, setPendingCancelQueueEntry] = useState(null);
  const [cancellingQueue, setCancellingQueue] = useState(false);

  // TAB 2: COMPLETED TODAY QUEUE STATE
  const [completedEntries, setCompletedEntries] = useState([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [selectedVisitSummary, setSelectedVisitSummary] = useState(null);

  // Filters for Completed Queue Tab
  const [dateFilter, setDateFilter] = useState(getTodayString());
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State for 4-Step Walk-In Flow
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [step, setStep] = useState(1); // 1: Patient, 2: Doctor, 3: Confirm, 4: Success Token

  // Step 1 State: Existing or New Patient
  const [patientMode, setPatientMode] = useState('search'); // 'search' | 'new'
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [newPatientData, setNewPatientData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    sex: '',
    age: '',
  });

  // Step 2 State: Doctor & Reason
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [visitReason, setVisitReason] = useState('');

  // Step 4 State: Generated Token
  const [issuedToken, setIssuedToken] = useState(null);

  // Notifications inside modal
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch today's active queue
  const fetchTodayQueue = async () => {
    try {
      setLoadingActive(true);
      const res = await api.get('/queue/today');
      setQueueEntries(res.data?.queueEntries || []);
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoadingActive(false);
    }
  };

  // Fetch completed/history queue for selected date directly using queue_date
  const fetchCompletedQueue = async (selectedDate = dateFilter) => {
    try {
      setLoadingCompleted(true);
      const params = new URLSearchParams();
      params.append('includeAll', 'true');
      if (selectedDate) {
        params.append('date', selectedDate);
      }
      if (doctorFilter) {
        params.append('doctor', doctorFilter);
      }

      const res = await api.get(`/queue/today?${params.toString()}`);
      const rawList = res.data?.queueEntries || [];

      const mapped = rawList.map((q) => {
        const status = q.status === 'With Doctor' ? 'In Consultation' : q.status;
        return {
          id: q._id || q.id,
          token: q.queue_token || q.token || 1,
          patient: q.patient,
          doctor: q.doctor,
          type: q.type || (q.appointment ? 'Appointment' : 'Walk-in'),
          date: q.checked_in_at || q.checkInTime || q.date || q.createdAt,
          checkInTime: q.checked_in_at || q.checkInTime || q.createdAt,
          startTime: q.consultation_started_at || null,
          endTime: q.consultation_ended_at || q.completed_at || null,
          status: status === 'Closed' ? 'Completed' : status,
          reason: q.appointment?.reason || 'Clinical Consultation',
          notes: q.notes || '',
        };
      });

      setCompletedEntries(mapped);
    } catch (err) {
      console.error('Failed to load completed queue:', err);
    } finally {
      setLoadingCompleted(false);
    }
  };

  // Fetch doctors on mount
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await api.get('/users/doctors');
        const docs = res.data?.doctors || [];
        setDoctors(docs);
        if (docs.length > 0) {
          setSelectedDoctorId(docs[0]._id || docs[0].id);
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    }
    fetchDoctors();
    fetchTodayQueue();
  }, []);

  // Fetch completed queue when activeTab becomes 'completed' or filters change
  useEffect(() => {
    if (activeTab === 'completed') {
      fetchCompletedQueue(dateFilter);
    }
  }, [activeTab, dateFilter, doctorFilter]);

  // Live patient search in Step 1
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

  const handleRefresh = () => {
    if (activeTab === 'active') fetchTodayQueue();
    else fetchCompletedQueue(dateFilter);
  };

  const resetWalkInModal = () => {
    setStep(1);
    setPatientMode('search');
    setPatientSearch('');
    setPatientOptions([]);
    setSelectedPatient(null);
    setNewPatientData({ firstName: '', lastName: '', phone: '', sex: '', age: '' });
    setSelectedDoctorId(doctors[0]?._id || doctors[0]?.id || '');
    setVisitReason('');
    setIssuedToken(null);
    setErrorMessage('');
    setShowWalkInModal(false);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (patientMode === 'search' && !selectedPatient) {
        showError('Please search and select an existing patient, or switch to Register New Patient.');
        return;
      }
      if (patientMode === 'new') {
        const nameErr = validateName(newPatientData.firstName, 'First Name', true);
        if (nameErr) {
          showError(nameErr);
          return;
        }
        if (newPatientData.lastName) {
          const lastNameErr = validateName(newPatientData.lastName, 'Last Name', false);
          if (lastNameErr) {
            showError(lastNameErr);
            return;
          }
        }
        const phoneErr = validatePhone(newPatientData.phone, true);
        if (phoneErr) {
          showError(phoneErr);
          return;
        }
        if (newPatientData.age !== '' && newPatientData.age !== undefined && newPatientData.age !== null) {
          const ageErr = validateAge(newPatientData.age, false);
          if (ageErr) {
            showError(ageErr);
            return;
          }
        }
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedDoctorId) {
        showError('Please select a doctor to assign.');
        return;
      }
      setStep(3);
    }
  };

  const handleFinalizeWalkIn = async () => {
    setSubmitting(true);
    try {
      const payload = {
        doctorId: selectedDoctorId,
        reason: visitReason || 'Walk-in Consultation',
      };

      if (patientMode === 'search' && selectedPatient) {
        payload.patientId = selectedPatient._id;
      } else {
        payload.patientData = newPatientData;
      }

      const res = await api.post('/queue/walk-in', payload);
      const newEntry = res.data?.queueEntry;

      showSuccess(`Walk-in patient checked in successfully! Token #${newEntry?.tokenNumber || newEntry?.token || ''}`);
      setIssuedToken(newEntry);
      setStep(4);
      fetchTodayQueue();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to complete walk-in check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCancelQueueEntry = async () => {
    if (!pendingCancelQueueEntry) return;
    setCancellingQueue(true);
    try {
      await api.patch(`/queue/${pendingCancelQueueEntry._id}/status`, { status: 'Cancelled' });
      showSuccess('Queue check-in cancelled successfully.');
      setPendingCancelQueueEntry(null);
      fetchTodayQueue();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel queue entry.');
    } finally {
      setCancellingQueue(false);
    }
  };

  // Client-side filtering for Completed Today Tab
  const filteredCompletedEntries = useMemo(() => {
    let list = [...completedEntries];

    // Filter by completed status default
    if (!statusFilter) {
      list = list.filter((item) => ['Completed', 'No Show', 'Cancelled'].includes(item.status));
    } else {
      list = list.filter((item) => item.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((item) => {
        const p = item.patient || {};
        const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').toLowerCase();
        const op = (p.opNumber || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        return fullName.includes(q) || op.includes(q) || phone.includes(q);
      });
    }

    if (typeFilter) {
      list = list.filter((item) => item.type === typeFilter);
    }

    return list;
  }, [completedEntries, searchQuery, typeFilter, statusFilter]);

  const handleResetCompletedFilters = () => {
    setSearchQuery('');
    setDoctorFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setDateFilter(getTodayString());
  };

  const hasActiveCompletedFilters = Boolean(searchQuery || doctorFilter || typeFilter || statusFilter || (dateFilter !== getTodayString()));

  return (
    <>
      <div className="space-y-6 max-w-7xl">
      {/* Header & Main Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <ClipboardList size={22} className="text-brand" /> Front Desk Check-In & Queue Management
          </h2>
          <p className="text-sm text-ink-soft">
            {activeTab === 'active'
              ? 'Real-time active queue flow and patient check-in management'
              : "Review completed, cancelled, and no-show queue entries for today or prior dates"}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loadingActive || loadingCompleted ? 'animate-spin' : ''} /> Refresh Queue
          </button>

          <button
            onClick={() => {
              resetWalkInModal();
              setShowWalkInModal(true);
            }}
            className="btn-primary shrink-0"
          >
            <UserPlus size={18} />
            <span>Walk-In Patient</span>
          </button>
        </div>
      </div>

      {/* TABS SEGMENT CONTROL */}
      <div className="flex items-center border-b border-border space-x-2">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'active'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-soft hover:text-ink hover:border-border'
          }`}
        >
          <ClipboardList size={16} />
          <span>Active Queue</span>
          {queueEntries.length > 0 && (
            <span className="badge bg-brand-light/50 text-brand-dark font-mono text-[10px]">
              {queueEntries.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'completed'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-soft hover:text-ink hover:border-border'
          }`}
        >
          <CheckCircle2 size={16} />
          <span>Completed Today</span>
          <span className="badge bg-slate-100 text-slate-700 font-mono text-[10px]">
            {filteredCompletedEntries.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ACTIVE QUEUE TABLE (DEFAULT VIEW UNCHANGED) */}
      {activeTab === 'active' && (
        <div className="card overflow-hidden">
          <div className="border-b border-border bg-bg/40 px-5 py-3.5 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Active Queue Flow ({queueEntries.length} Patients Waiting / In Consultation)
            </span>
            <span className="text-xs text-brand font-semibold">
              Auto-derived from today's checked-in patients
            </span>
          </div>

          {loadingActive ? (
            <div className="p-8 text-center text-sm text-ink-soft">Loading active queue...</div>
          ) : queueEntries.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ClipboardList size={36} className="mx-auto text-ink-soft/50" />
              <p className="font-display text-base font-semibold text-ink">No active patients in queue today</p>
              <p className="text-sm text-ink-soft">
                Check in patients from Appointments or click "Walk-In Patient" to issue tokens.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Queue Token</th>
                    <th className="px-5 py-3.5">Patient</th>
                    <th className="px-5 py-3.5">Doctor</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Checked-In Time</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {queueEntries.map((entry) => {
                    const patientName = entry.patient
                      ? `${entry.patient.firstName} ${entry.patient.lastName}`.trim()
                      : 'Walk-in Patient';
                    const docName = entry.doctor ? `Dr. ${entry.doctor.name}` : 'Unassigned';
                    const timeStr = (entry.checked_in_at || entry.checkInTime)
                      ? new Date(entry.checked_in_at || entry.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : entry.appointment?.time || '—';

                    const displayStatus = entry.status === 'With Doctor' ? 'In Consultation' : entry.status;
                    const tokenNum = entry.queue_token || entry.token || 1;

                    return (
                      <tr key={entry._id} className="hover:bg-bg/60 transition-colors">
                        {/* Queue Token */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-mono text-base font-bold shadow-sm">
                            #{tokenNum}
                          </span>
                        </td>

                        {/* Patient */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-ink">{patientName}</div>
                          <div className="text-xs text-ink-soft flex items-center gap-2 mt-0.5">
                            {entry.patient?.opNumber && (
                              <span className="font-mono text-brand font-bold">{entry.patient.opNumber}</span>
                            )}
                            {entry.patient?.phone && <span>{entry.patient.phone}</span>}
                          </div>
                        </td>

                        {/* Doctor */}
                        <td className="px-5 py-4 text-ink font-medium text-xs">
                          {docName}
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4 text-xs">
                          <span
                            className={`badge ${
                              entry.type === 'Walk-in'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {entry.type}
                          </span>
                        </td>

                        {/* Time */}
                        <td className="px-5 py-4 text-xs text-ink-soft whitespace-nowrap">
                          <div className="flex items-center gap-1 font-medium text-ink">
                            <Clock size={13} className="text-brand" /> {timeStr}
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
                          <div className="flex items-center justify-end gap-2">
                            {displayStatus === 'Checked-In' && (
                              <button
                                onClick={() => setPendingCancelQueueEntry(entry)}
                                className="inline-flex items-center gap-1 rounded-xl bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                                title="Cancel Check-in"
                              >
                                <X size={13} />
                                Cancel Check-In
                              </button>
                            )}
                            {displayStatus === 'In Consultation' && (
                              <span className="text-xs text-purple-700 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                                Doctor Consulting
                              </span>
                            )}
                          </div>
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

      {/* TAB 2: COMPLETED TODAY QUEUE VIEW (NEW TAB) */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {/* SEARCH & FILTER CONTROLS BAR */}
          <div className="card p-4 space-y-3 bg-surface border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="text"
                  className="input-field pl-10 py-2 text-xs"
                  placeholder="Search by Patient Name or OP Number..."
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

              {hasActiveCompletedFilters && (
                <button
                  onClick={handleResetCompletedFilters}
                  className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold shrink-0"
                >
                  <X size={13} /> Reset Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <DatePicker
                  placeholder="Date (Default Today)"
                  value={dateFilter}
                  onChange={(d, dStr) => {
                    setDateFilter(dStr);
                    fetchCompletedQueue(dStr);
                  }}
                  inputClassName="py-1.5 text-xs font-semibold"
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
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">All Visit Types</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Appointment">Appointment</option>
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
                  <option value="No Show">No Show</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* COMPLETED QUEUE TABLE */}
          <div className="card overflow-hidden">
            {loadingCompleted ? (
              <div className="p-12 text-center text-xs text-ink-soft">Loading completed queue log...</div>
            ) : filteredCompletedEntries.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <CheckCircle2 size={36} className="mx-auto text-ink-soft/40" />
                <p className="font-display text-base font-semibold text-ink">No completed queue entries found</p>
                <p className="text-xs text-ink-soft">
                  {hasActiveCompletedFilters
                    ? 'No entries match your selected date, doctor, type, or status filters.'
                    : 'Completed, no-show, or cancelled queue entries for today will appear here.'}
                </p>
                {hasActiveCompletedFilters && (
                  <button
                    onClick={handleResetCompletedFilters}
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
                      <th className="px-5 py-3.5">Queue Token</th>
                      <th className="px-5 py-3.5">Patient</th>
                      <th className="px-5 py-3.5">Doctor</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Checked-In Time</th>
                      <th className="px-5 py-3.5">Consultation Start</th>
                      <th className="px-5 py-3.5">Consultation End</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCompletedEntries.map((item) => {
                      const p = item.patient || {};
                      const patientName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Patient';
                      const docName = item.doctor?.name ? `Dr. ${item.doctor.name}` : 'Staff Doctor';

                      const checkInTimeStr = item.checkInTime
                        ? new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—';

                      const startTimeStr = item.startTime
                        ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—';

                      const endTimeStr = item.endTime
                        ? new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—';

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedVisitSummary(item)}
                          className="hover:bg-bg/60 cursor-pointer transition-colors group"
                        >
                          {/* Queue Token */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light/40 text-brand-dark font-mono text-xs font-bold border border-brand/20">
                              #{item.token}
                            </span>
                          </td>

                          {/* Patient */}
                          <td className="px-5 py-4">
                            <div className="font-bold text-ink text-xs group-hover:text-brand transition-colors">
                              {patientName}
                            </div>
                            <div className="text-[11px] text-ink-soft font-mono">
                              {p.opNumber ? `#${p.opNumber}` : '—'} {p.phone ? `• ${p.phone}` : ''}
                            </div>
                          </td>

                          {/* Doctor */}
                          <td className="px-5 py-4 font-semibold text-ink whitespace-nowrap">
                            {docName}
                          </td>

                          {/* Type */}
                          <td className="px-5 py-4 text-xs whitespace-nowrap">
                            <span
                              className={`badge ${
                                item.type === 'Walk-in'
                                  ? 'bg-orange-100 text-orange-800 border-orange-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>

                          {/* Checked-In Time */}
                          <td className="px-5 py-4 font-mono text-ink-soft whitespace-nowrap">
                            {checkInTimeStr}
                          </td>

                          {/* Consultation Start */}
                          <td className="px-5 py-4 font-mono text-ink-soft whitespace-nowrap">
                            {startTimeStr}
                          </td>

                          {/* Consultation End */}
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
      </div>

      {/* BRIEF VISIT SUMMARY MODAL (COMPLETED QUEUE) */}
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
                    Front Desk Visit Summary
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
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
                  {selectedVisitSummary.patient?.phone ? ` • Phone: ${selectedVisitSummary.patient.phone}` : ''}
                </div>
              </div>

              {/* Visit Details Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-surface">
                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-0.5">Queue Token</span>
                  <span className="font-mono font-bold text-brand text-sm">#{selectedVisitSummary.token}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-0.5">Visit Type</span>
                  <span className="font-semibold text-ink block">{selectedVisitSummary.type}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-0.5">Assigned Doctor</span>
                  <span className="font-semibold text-ink block">Dr. {selectedVisitSummary.doctor?.name || 'Staff Doctor'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-0.5">Reason</span>
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
                    {selectedVisitSummary.endTime ? new Date(selectedVisitSummary.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              </div>

              {/* Notes */}
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

      {/* 4-STEP WALK-IN MODAL */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="card w-full max-w-xl my-auto flex flex-col bg-surface shadow-2xl rounded-2xl border border-border overflow-visible min-h-[480px] max-h-[calc(100vh-2rem)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-6 sm:py-4 bg-surface shrink-0 rounded-t-2xl">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-ink">Walk-In Patient Check-In</h3>
                <p className="text-xs text-ink-soft">
                  Step {step} of 4: {step === 1 ? 'Patient Selection' : step === 2 ? 'Assign Doctor' : step === 3 ? 'Confirmation' : 'Token Issued'}
                </p>
              </div>
              <button onClick={resetWalkInModal} className="rounded-lg p-1.5 text-ink-soft hover:bg-bg hover:text-ink transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 min-h-[360px]">
              {/* Error Banner inside Modal */}
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* STEP 1: Search or Register Patient */}
              {step === 1 && (
                <div className="flex flex-col gap-3.5 min-h-[300px]">
                  <div className="flex rounded-xl border border-border p-1 bg-bg">
                    <button
                      type="button"
                      onClick={() => setPatientMode('search')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        patientMode === 'search' ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      Search Existing Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => setPatientMode('new')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        patientMode === 'new' ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      Register New Patient
                    </button>
                  </div>

                  {patientMode === 'search' ? (
                    <div className="pb-12">
                      <PatientSearchInput
                        selectedPatient={selectedPatient}
                        onSelect={setSelectedPatient}
                        required
                      />
                    </div>
                  ) : (
                    /* New Patient Form */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-ink-soft font-semibold mb-1">First Name *</label>
                        <input
                          type="text"
                          required
                          className="input-field"
                          placeholder="e.g. Alex"
                          value={newPatientData.firstName}
                          onChange={(e) => setNewPatientData({ ...newPatientData, firstName: e.target.value.replace(/[^a-zA-Z\s'-]/g, '') })}
                        />
                      </div>
                      <div>
                        <label className="block text-ink-soft font-semibold mb-1">Last Name</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. Smith"
                          value={newPatientData.lastName}
                          onChange={(e) => setNewPatientData({ ...newPatientData, lastName: e.target.value.replace(/[^a-zA-Z\s'-]/g, '') })}
                        />
                      </div>
                      <div>
                        <label className="block text-ink-soft font-semibold mb-1">Phone Number</label>
                        <input
                          type="tel"
                          maxLength={10}
                          className="input-field font-mono"
                          placeholder="e.g. 9876543210"
                          value={newPatientData.phone}
                          onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        />
                      </div>
                      <div>
                        <label className="block text-ink-soft font-semibold mb-1">Sex</label>
                        <select
                          className="input-field"
                          value={newPatientData.sex}
                          onChange={(e) => setNewPatientData({ ...newPatientData, sex: e.target.value })}
                        >
                          <option value="">Select Sex</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Assign Doctor */}
              {step === 2 && (
                <div className="space-y-4 text-xs min-h-[300px]">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Assigned Doctor *</label>
                    <select
                      className="input-field font-semibold py-2.5 text-xs"
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map((d) => {
                        const docId = d._id || d.id;
                        return (
                          <option key={docId} value={docId}>
                            Dr. {d.name} {d.specialization ? `— ${d.specialization}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Reason for Visit</label>
                    <input
                      type="text"
                      className="input-field py-2.5 text-xs"
                      placeholder="e.g. Toothache, Urgent scaling, Walk-in consultation"
                      value={visitReason}
                      onChange={(e) => setVisitReason(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Confirm Details before Check-In */}
              {step === 3 && (
                <div className="space-y-4 text-xs">
                  <div className="rounded-xl border border-border bg-bg p-4 space-y-3">
                    <h4 className="font-display font-bold text-ink text-sm border-b border-border pb-2">
                      Walk-In Summary Review
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-ink">
                      <div>
                        <span className="text-ink-soft block font-medium">Patient Name</span>
                        <span className="font-bold text-sm">
                          {patientMode === 'search' && selectedPatient
                            ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                            : `${newPatientData.firstName} ${newPatientData.lastName}` || 'Unnamed Walk-in'}
                        </span>
                      </div>

                      <div>
                        <span className="text-ink-soft block font-medium">Phone / OP#</span>
                        <span>
                          {patientMode === 'search' && selectedPatient
                            ? `${selectedPatient.opNumber} | ${selectedPatient.phone || 'N/A'}`
                            : newPatientData.phone || 'New Patient'}
                        </span>
                      </div>

                      <div>
                        <span className="text-ink-soft block font-medium">Assigned Doctor</span>
                        <span className="font-semibold text-brand">
                          Dr. {doctors.find((d) => (d._id || d.id) === selectedDoctorId)?.name || 'Selected Doctor'}
                        </span>
                      </div>

                      <div>
                        <span className="text-ink-soft block font-medium">Reason</span>
                        <span>{visitReason || 'Walk-in Consultation'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-amber-900 border border-amber-200">
                    <ShieldCheck size={18} className="text-amber-600 shrink-0" />
                    <span>
                      Confirming will generate today's next sequential Token, create a Walk-in Appointment, and mark status as <strong>Checked-In</strong>.
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 4: Token Issued Success State */}
              {step === 4 && issuedToken && (
                <div className="text-center py-4 space-y-4">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white shadow-lg">
                    <span className="font-mono text-3xl font-extrabold">#{issuedToken.queue_token || issuedToken.token}</span>
                  </div>

                  <div>
                    <h4 className="font-display text-lg font-bold text-ink">
                      Token #{issuedToken.queue_token || issuedToken.token} Issued!
                    </h4>
                    <p className="text-xs text-ink-soft mt-1">
                      Patient <span className="font-semibold text-ink">{issuedToken.patient?.firstName} {issuedToken.patient?.lastName}</span> has been checked in for <span className="font-semibold text-brand">Dr. {issuedToken.doctor?.name}</span>.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Footer Navigation Buttons */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
              {step > 1 && step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="btn-secondary text-xs"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {step < 3 && (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="btn-primary text-xs"
                  >
                    Next Step
                  </button>
                )}

                {step === 3 && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleFinalizeWalkIn}
                    className="btn-primary text-xs"
                  >
                    {submitting ? 'Checking In...' : 'Confirm & Issue Token'}
                  </button>
                )}

                {step === 4 && (
                  <button
                    type="button"
                    onClick={resetWalkInModal}
                    className="btn-primary text-xs"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION POPUP */}
      <ConfirmModal
        isOpen={Boolean(pendingCancelQueueEntry)}
        onClose={() => setPendingCancelQueueEntry(null)}
        onConfirm={confirmCancelQueueEntry}
        title="Confirm Queue Cancellation"
        message={
          pendingCancelQueueEntry ? (
            <p className="text-xs">
              Are you sure you want to cancel the check-in for{' '}
              <strong className="text-ink font-bold">
                {pendingCancelQueueEntry.patient?.firstName} {pendingCancelQueueEntry.patient?.lastName}
              </strong>
              ?
            </p>
          ) : (
            'Are you sure you want to cancel this check-in entry?'
          )
        }
        confirmText="Yes, Cancel Check-In"
        cancelText="Keep in Queue"
        variant="cancel"
        loading={cancellingQueue}
      />
    </>
  );
}
