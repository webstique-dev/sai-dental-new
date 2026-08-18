import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Play, Clock, UserSquare2, RefreshCw, Calendar, Search, Filter, X, Eye, FileText, CheckCircle2, UserCheck, UserX, XCircle, User, CalendarDays, AlertTriangle, List
} from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import AppointmentCalendar from '../../components/common/AppointmentCalendar.jsx';
import PatientDetailsEditModal from '../../components/common/PatientDetailsEditModal.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';

const STATUS_BADGE_CLASSES = {
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  'No Show': 'bg-slate-100 text-slate-800 border-slate-200',
  Missed: 'bg-rose-100 text-rose-800 border-rose-200',
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function DoctorQueue() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  // Active Tab: 'today' (default) | 'upcoming' | 'history'
  const [activeTab, setActiveTab] = useState('today');

  // VIEW MODE: 'list' (default) | 'calendar'
  const [viewMode, setViewMode] = useState('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // DATA STATES
  const [queueEntries, setQueueEntries] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [rawHistoryItems, setRawHistoryItems] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // LOADING STATES
  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);

  // SEARCH & FILTER STATES
  const [todaySearch, setTodaySearch] = useState('');
  const [upcomingSearch, setUpcomingSearch] = useState('');
  const [upcomingDateFrom, setUpcomingDateFrom] = useState('');
  const [upcomingDateTo, setUpcomingDateTo] = useState('');
  const [upcomingDoctorFilter, setUpcomingDoctorFilter] = useState('');

  const [completedTodaySearch, setCompletedTodaySearch] = useState('');
  const [completedTodayDoctorFilter, setCompletedTodayDoctorFilter] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleResetUpcomingFilters = () => {
    setUpcomingSearch('');
    setUpcomingDateFrom('');
    setUpcomingDateTo('');
    setUpcomingDoctorFilter('');
  };

  const hasActiveUpcomingFilters = Boolean(
    upcomingSearch || upcomingDateFrom || upcomingDateTo || upcomingDoctorFilter
  );

  const handleResetCompletedTodayFilters = () => {
    setCompletedTodaySearch('');
    setCompletedTodayDoctorFilter('');
  };

  const hasActiveCompletedTodayFilters = Boolean(completedTodaySearch || completedTodayDoctorFilter);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return <span className="text-[10px] text-brand ml-1 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  };

  // MODAL STATES
  const [selectedVisitSummary, setSelectedVisitSummary] = useState(null);
  const [cancellingAppointment, setCancellingAppointment] = useState(null);
  const [noShowAppointment, setNoShowAppointment] = useState(null);
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState(null);
  const [appointmentForEdit, setAppointmentForEdit] = useState(null);

  // 1. Fetch Today's Appointments & Queue
  const fetchDoctorToday = async () => {
    try {
      setLoadingToday(true);
      const [qRes, aRes] = await Promise.all([
        api.get('/consultations/queue/today').catch(() => ({ data: { queueEntries: [] } })),
        api.get('/appointments?dateFilterPreset=today').catch(() => ({ data: { appointments: [] } })),
      ]);

      const queueList = qRes.data?.queueEntries || [];
      const todayApts = aRes.data?.appointments || [];

      const checkedInAptIds = new Set(
        queueList
          .map((q) => (q.appointment?._id || q.appointment?.id || q.appointment || '').toString())
          .filter(Boolean)
      );

      const combinedToday = [...queueList];
      todayApts.forEach((apt) => {
        const aptId = (apt._id || apt.id).toString();
        if (!checkedInAptIds.has(aptId) && apt.status === 'Scheduled') {
          combinedToday.push({
            id: apt._id || apt.id,
            _id: apt._id || apt.id,
            token: '—',
            patient: apt.patient,
            doctor: apt.doctor,
            type: apt.type || 'Appointment',
            reason: apt.reason || 'Scheduled Visit',
            checkInTime: null,
            status: 'Scheduled',
            appointment: apt,
            isScheduledOnly: true,
          });
        }
      });

      setQueueEntries(combinedToday);
    } catch (err) {
      console.error('Failed to fetch doctor today data:', err);
      showError(err.response?.data?.message || 'Failed to load today appointments.');
    } finally {
      setLoadingToday(false);
    }
  };

  // 2. Fetch Upcoming Appointments
  const fetchUpcomingAppointments = async () => {
    try {
      setLoadingUpcoming(true);
      const res = await api.get('/appointments?dateFilterPreset=upcoming');
      setUpcomingAppointments(res.data?.appointments || []);
    } catch (err) {
      console.error('Failed to fetch upcoming appointments:', err);
    } finally {
      setLoadingUpcoming(false);
    }
  };

  // 3. Fetch Appointment History & Doctors List
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

      merged.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRawHistoryItems(merged);
    } catch (err) {
      console.error('Failed to fetch appointment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchDoctorToday().catch(() => {}),
      fetchUpcomingAppointments().catch(() => {}),
      fetchAppointmentHistory().catch(() => {}),
    ]);
  };

  const handleRefreshAll = refreshAll;

  // Real-Time Socket Event Listeners for Doctor Workspace
  useSocketEvent('APPOINTMENT_UPDATED', () => {
    refreshAll();
  });

  useSocketEvent('QUEUE_UPDATED', () => {
    refreshAll();
  });

  useSocketEvent('CONSULTATION_STARTED', () => {
    refreshAll();
  });

  useSocketEvent('CONSULTATION_COMPLETED', () => {
    refreshAll();
  });

  useEffect(() => {
    refreshAll();
  }, []);

  // Action Handler: Start or Continue Consultation
  const handleStartConsultation = async (entry) => {
    if (entry.activeConsultationId) {
      navigate(`/doctor/consultation/${entry.activeConsultationId}`);
      return;
    }

    if (entry.patient) {
      setSelectedPatientForEdit(entry.patient);
      setAppointmentForEdit(entry.appointment?._id || entry.appointment?.id || entry.appointment || null);
    }
  };

  // Action Handler: Check In Patient (Scheduled -> Checked-In)
  const handleCheckInPatient = async (aptId) => {
    setSubmittingId(aptId);
    try {
      await api.patch(`/queue/${aptId}/check-in`);
      showSuccess('Patient checked in successfully! Added to live queue.');
      await refreshAll();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to check in patient.');
    } finally {
      setSubmittingId(null);
    }
  };

  // Action Handler: Mark as No Show (Scheduled -> No Show)
  const handleConfirmNoShow = async () => {
    if (!noShowAppointment) return;
    const aptId = noShowAppointment._id || noShowAppointment.id;
    setSubmittingId(aptId);
    try {
      await api.patch(`/appointments/${aptId}`, { status: 'No Show' });
      showSuccess('Appointment marked as No Show.');
      setNoShowAppointment(null);
      await refreshAll();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update appointment status.');
    } finally {
      setSubmittingId(null);
    }
  };

  // Action Handler: Cancel Appointment (Scheduled/Checked-In -> Cancelled)
  const handleConfirmCancel = async () => {
    if (!cancellingAppointment) return;
    const aptId = cancellingAppointment._id || cancellingAppointment.id;
    setSubmittingId(aptId);
    try {
      await api.delete(`/appointments/${aptId}`);
      showSuccess('Appointment cancelled successfully.');
      setCancellingAppointment(null);
      await refreshAll();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel appointment.');
    } finally {
      setSubmittingId(null);
    }
  };

  // Status-based Action Button Renderer
  const renderRowActions = (item, options = {}) => {
    const itemId = item._id || item.id;
    const isSubmitting = submittingId === itemId;
    const displayStatus = item.status === 'With Doctor' ? 'In Consultation' : item.status;
    const isConsulting = displayStatus === 'In Consultation' || item.activeConsultationId;

    return (
      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        {/* WORKFLOW 1: SCHEDULED OR MISSED -> Check-In / Late Check-In, No Show, Cancel */}
        {(displayStatus === 'Scheduled' || displayStatus === 'Missed') && (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleCheckInPatient(itemId)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors shadow-sm ${displayStatus === 'Missed'
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              title={displayStatus === 'Missed' ? 'Late Arrival Check-In patient to queue' : 'Check in patient to queue'}
            >
              <UserCheck size={13} />
              <span>
                {isSubmitting
                  ? 'Checking In...'
                  : displayStatus === 'Missed'
                    ? 'Late Check-In'
                    : 'Check In'}
              </span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setNoShowAppointment(item)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors"
              title="Mark patient as No Show"
            >
              <UserX size={13} />
              <span>No Show</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setCancellingAppointment(item)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
              title="Cancel appointment"
            >
              <XCircle size={13} />
              <span>Cancel</span>
            </button>
          </>
        )}

        {/* WORKFLOW 2: CHECKED-IN -> Start Consultation, Cancel */}
        {displayStatus === 'Checked-In' && (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleStartConsultation(item)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-brand text-white hover:bg-brand-dark transition-colors shadow-sm"
            >
              <Play size={13} fill="currentColor" />
              <span>{isSubmitting ? 'Starting...' : 'Start Consultation'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setCancellingAppointment(item)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
              title="Cancel appointment"
            >
              <XCircle size={13} />
              <span>Cancel</span>
            </button>
          </>
        )}

        {/* WORKFLOW 3: IN CONSULTATION -> Continue Consultation */}
        {isConsulting && displayStatus !== 'Checked-In' && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleStartConsultation(item)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm"
          >
            <Play size={13} fill="currentColor" />
            <span>Continue Consultation</span>
          </button>
        )}

        {/* WORKFLOW 4: COMPLETED OR HISTORY SUMMARY */}
        {(displayStatus === 'Completed' || options.alwaysShowSummary) && (
          <button
            type="button"
            onClick={() => setSelectedVisitSummary(item)}
            className="btn-secondary py-1 px-2.5 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Eye size={13} /> Summary
          </button>
        )}
      </div>
    );
  };

  // Filtered Today Entries
  const filteredTodayEntries = useMemo(() => {
    if (!todaySearch.trim()) return queueEntries;
    const q = todaySearch.trim().toLowerCase();
    return queueEntries.filter((item) => {
      const p = item.patient || {};
      const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').toLowerCase();
      const op = (p.opNumber || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      return fullName.includes(q) || op.includes(q) || phone.includes(q);
    });
  }, [queueEntries, todaySearch]);

  // Filtered Upcoming Entries (STRICTLY SCHEDULED STATUS ONLY)
  const filteredUpcomingEntries = useMemo(() => {
    // Show ONLY appointments with 'Scheduled' status
    let result = upcomingAppointments.filter((item) => item.status === 'Scheduled');

    if (upcomingSearch.trim()) {
      const q = upcomingSearch.trim().toLowerCase();
      result = result.filter((item) => {
        const p = item.patient || {};
        const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').toLowerCase();
        const op = (p.opNumber || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        const reason = (item.reason || '').toLowerCase();
        return fullName.includes(q) || op.includes(q) || phone.includes(q) || reason.includes(q);
      });
    }

    if (upcomingDoctorFilter) {
      result = result.filter((item) => {
        const docId = item.doctor?._id || item.doctor?.id || item.doctor;
        return docId && docId.toString() === upcomingDoctorFilter.toString();
      });
    }

    if (upcomingDateFrom) {
      const fromD = new Date(upcomingDateFrom);
      fromD.setHours(0, 0, 0, 0);
      result = result.filter((item) => new Date(item.date) >= fromD);
    }

    if (upcomingDateTo) {
      const toD = new Date(upcomingDateTo);
      toD.setHours(23, 59, 59, 999);
      result = result.filter((item) => new Date(item.date) <= toD);
    }

    return result;
  }, [upcomingAppointments, upcomingSearch, upcomingDoctorFilter, upcomingDateFrom, upcomingDateTo]);

  // Filtered History Log Items (STRICTLY COMPLETED, MISSED, AND NO SHOW ONLY)
  const filteredHistoryItems = useMemo(() => {
    const ALLOWED_HISTORY_STATUSES = new Set(['Completed', 'Missed', 'No Show']);
    let result = rawHistoryItems.filter((item) => ALLOWED_HISTORY_STATUSES.has(item.status));

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

    result.sort((a, b) => {
      let valA, valB;
      if (sortField === 'patient') {
        const pA = a.patient || {};
        const pB = b.patient || {};
        valA = [pA.firstName, pA.lastName].filter(Boolean).join(' ').toLowerCase();
        valB = [pB.firstName, pB.lastName].filter(Boolean).join(' ').toLowerCase();
      } else if (sortField === 'opNumber') {
        valA = (a.patient?.opNumber || '').toLowerCase();
        valB = (b.patient?.opNumber || '').toLowerCase();
      } else if (sortField === 'date') {
        valA = a.date ? new Date(a.date).getTime() : 0;
        valB = b.date ? new Date(b.date).getTime() : 0;
      } else if (sortField === 'checkInTime') {
        valA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
        valB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
      } else if (sortField === 'startTime') {
        valA = a.startTime ? new Date(a.startTime).getTime() : 0;
        valB = b.startTime ? new Date(b.startTime).getTime() : 0;
      } else if (sortField === 'endTime') {
        valA = a.endTime ? new Date(a.endTime).getTime() : 0;
        valB = b.endTime ? new Date(b.endTime).getTime() : 0;
      } else if (sortField === 'doctor') {
        valA = (a.doctor?.name || a.appointment?.doctor?.name || '').toLowerCase();
        valB = (b.doctor?.name || b.appointment?.doctor?.name || '').toLowerCase();
      } else if (sortField === 'status') {
        valA = (a.status || '').toLowerCase();
        valB = (b.status || '').toLowerCase();
      } else {
        valA = 0;
        valB = 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [rawHistoryItems, searchQuery, doctorFilter, statusFilter, dateFrom, dateTo, sortField, sortDirection]);

  // COMPLETED TODAY FILTERED ITEMS
  const filteredCompletedTodayItems = useMemo(() => {
    const todayStr = new Date().toDateString();

    let result = rawHistoryItems.filter((item) => {
      // Must be status 'Completed'
      if (item.status !== 'Completed') return false;

      // Must be completed / visited today
      const itemDate = item.date || item.endTime || item.startTime || item.checkInTime;
      if (!itemDate) return false;
      const d = new Date(itemDate);
      return d.toDateString() === todayStr;
    });

    if (completedTodaySearch) {
      const q = completedTodaySearch.toLowerCase();
      result = result.filter((item) => {
        const pName = item.patient
          ? `${item.patient.firstName} ${item.patient.lastName}`.toLowerCase()
          : '';
        const op = (item.patient?.opNumber || '').toLowerCase();
        const phone = (item.patient?.phone || '').toLowerCase();
        const reason = (item.reason || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();
        return pName.includes(q) || op.includes(q) || phone.includes(q) || reason.includes(q) || notes.includes(q);
      });
    }

    if (completedTodayDoctorFilter) {
      result = result.filter((item) => {
        const docId = item.doctor?._id || item.doctor?.id || item.doctor || item.appointment?.doctor?._id || item.appointment?.doctor;
        return docId && docId.toString() === completedTodayDoctorFilter.toString();
      });
    }

    result.sort((a, b) => {
      const timeA = a.endTime ? new Date(a.endTime).getTime() : (a.date ? new Date(a.date).getTime() : 0);
      const timeB = b.endTime ? new Date(b.endTime).getTime() : (b.date ? new Date(b.date).getTime() : 0);
      return timeB - timeA;
    });

    return result;
  }, [rawHistoryItems, completedTodaySearch, completedTodayDoctorFilter]);

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
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <CalendarDays size={22} className="text-brand" /> My Appointments
          </h2>
          <p className="text-sm text-ink-soft">
            View appointments, check in patients, and manage your clinical schedule directly.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl border border-border bg-surface p-1 shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-brand text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
            >
              <List size={15} /> List View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'calendar' ? 'bg-brand text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
            >
              <CalendarDays size={15} /> Calendar View
            </button>
          </div>

          <button
            onClick={refreshAll}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loadingToday || loadingHistory ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <AppointmentCalendar
          calendarDate={calendarDate}
          setCalendarDate={setCalendarDate}
          appointments={rawHistoryItems.length > 0 ? rawHistoryItems : upcomingAppointments}
          allowEdit={true}
          onEdit={(apt) => {
            if (apt.status === 'Checked-In') {
              handleCheckIn(apt);
            }
          }}
        />
      ) : (
        <>

          {/* TABS NAVIGATION */}
          <div className="flex flex-wrap items-center border-b border-border gap-1 sm:gap-2">
            {/* TAB 1: Today's Appointments */}
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${activeTab === 'today'
                ? 'border-brand text-brand font-bold'
                : 'border-transparent text-ink-soft hover:text-ink hover:border-border'
                }`}
            >
              <CalendarDays size={16} />
              <span>Today's Appointments</span>
              {queueEntries.length > 0 && (
                <span className="badge bg-brand-light/50 text-brand-dark font-mono text-[10px]">
                  {queueEntries.length}
                </span>
              )}
            </button>

            {/* TAB 2: Upcoming Appointments */}
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${activeTab === 'upcoming'
                ? 'border-brand text-brand font-bold'
                : 'border-transparent text-ink-soft hover:text-ink hover:border-border'
                }`}
            >
              <Clock size={16} />
              <span>Upcoming Appointments</span>
              {upcomingAppointments.length > 0 && (
                <span className="badge bg-blue-100 text-blue-800 font-mono text-[10px]">
                  {upcomingAppointments.length}
                </span>
              )}
            </button>

            {/* TAB 3: Completed Today */}
            <button
              type="button"
              onClick={() => setActiveTab('completed-today')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${activeTab === 'completed-today'
                ? 'border-brand text-brand font-bold'
                : 'border-transparent text-ink-soft hover:text-ink hover:border-border'
                }`}
            >
              <CheckCircle2 size={16} className={activeTab === 'completed-today' ? 'text-brand' : 'text-emerald-600'} />
              <span>Completed Today</span>
              {filteredCompletedTodayItems.length > 0 && (
                <span className="badge bg-emerald-100 text-emerald-800 font-mono text-[10px]">
                  {filteredCompletedTodayItems.length}
                </span>
              )}
            </button>

            {/* TAB 4: All Appointments Log */}
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${activeTab === 'history'
                ? 'border-brand text-brand font-bold'
                : 'border-transparent text-ink-soft hover:text-ink hover:border-border'
                }`}
            >
              <Calendar size={16} />
              <span>All Appointments Log</span>
              <span className="badge bg-slate-100 text-slate-700 font-mono text-[10px]">
                {filteredHistoryItems.length}
              </span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: TODAY'S APPOINTMENTS */}
          {/* ========================================================================= */}
          {activeTab === 'today' && (
            <div className="space-y-4">
              <div className="card p-3.5 bg-surface border-border flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                  <input
                    type="text"
                    className="input-field pl-9 py-1.5 text-xs w-full"
                    placeholder="Filter today's appointments by patient name, OP#, phone..."
                    value={todaySearch}
                    onChange={(e) => setTodaySearch(e.target.value)}
                  />
                  {todaySearch && (
                    <button onClick={() => setTodaySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <span className="text-xs text-ink-soft font-medium">
                  Showing {filteredTodayEntries.length} record(s) for today
                </span>
              </div>

              <div className="card overflow-hidden">
                {loadingToday ? (
                  <div className="p-8 text-center text-sm text-ink-soft">Loading today's schedule...</div>
                ) : filteredTodayEntries.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <UserSquare2 size={36} className="mx-auto text-ink-soft/50" />
                    <p className="font-display text-base font-semibold text-ink">No appointments found for today</p>
                    <p className="text-sm text-ink-soft">
                      Appointments scheduled for today will automatically show up here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-3.5">Token</th>
                          <th className="px-5 py-3.5">Patient Name</th>
                          <th className="px-5 py-3.5">OP Number</th>
                          <th className="px-5 py-3.5">Reason / Visit Type</th>
                          <th className="px-5 py-3.5">Time / Check-In</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredTodayEntries.map((entry) => {
                          const entryId = entry._id || entry.id;
                          const patientName = entry.patient
                            ? `${entry.patient.firstName} ${entry.patient.lastName}`.trim()
                            : 'Patient';
                          const timeDisplay = entry.checkInTime
                            ? new Date(entry.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : (entry.appointment?.time || 'Today');

                          const displayStatus = entry.status === 'With Doctor' ? 'In Consultation' : entry.status;

                          return (
                            <tr key={entryId} className="hover:bg-bg/60 transition-colors">
                              <td className="px-5 py-4 whitespace-nowrap">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand font-mono text-sm font-bold border border-brand/20">
                                  {entry.token !== '—' ? `#${entry.token}` : '—'}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-bold text-ink flex items-center gap-1.5">
                                  <span>{patientName}</span>
                                  <span className={`badge font-semibold text-[10px] px-1.5 py-0.5 border ${
                                    (entry.patient?.patientType === 'child' || (entry.patient?.age !== undefined && entry.patient?.age !== null && Number(entry.patient.age) < 12))
                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                      : 'bg-blue-50 text-blue-800 border-blue-200'
                                  }`}>
                                    {(entry.patient?.patientType === 'child' || (entry.patient?.age !== undefined && entry.patient?.age !== null && Number(entry.patient.age) < 12)) ? 'Child' : 'Adult'}
                                  </span>
                                </div>
                                <div className="text-xs text-ink-soft">
                                  {entry.patient?.age ? `${entry.patient.age}y` : ''} {entry.patient?.sex ? `/ ${entry.patient.sex}` : ''} {entry.patient?.phone ? `• ${entry.patient.phone}` : ''}
                                </div>
                              </td>

                              <td className="px-5 py-4 font-mono font-bold text-brand text-xs">
                                {entry.patient?.opNumber ? `#${entry.patient.opNumber}` : '—'}
                              </td>

                              <td className="px-5 py-4 text-xs font-medium text-ink">
                                <span className="badge bg-orange-50 text-orange-800 border border-orange-200">
                                  {entry.appointment?.reason || entry.reason || entry.type || 'Appointment'}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-xs text-ink-soft whitespace-nowrap">
                                <div className="flex items-center gap-1 font-medium text-ink">
                                  <Clock size={13} className="text-brand" /> {timeDisplay}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <span className={`badge border ${STATUS_BADGE_CLASSES[displayStatus] || 'bg-slate-100 text-slate-800'}`}>
                                  {displayStatus}
                                </span>
                              </td>

                              {/* STATUS-BASED ACTIONS */}
                              <td className="px-5 py-4 text-right whitespace-nowrap">
                                {renderRowActions(entry)}
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

          {/* ========================================================================= */}
          {/* TAB 2: UPCOMING APPOINTMENTS */}
          {/* ========================================================================= */}
          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              {/* FILTER BAR FOR UPCOMING APPOINTMENTS */}
              <div className="card p-4 bg-surface border-border space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                    <input
                      type="text"
                      className="input-field pl-9 py-1.5 text-xs w-full"
                      placeholder="Search upcoming appointments by patient name, OP#, phone, reason..."
                      value={upcomingSearch}
                      onChange={(e) => setUpcomingSearch(e.target.value)}
                    />
                    {upcomingSearch && (
                      <button onClick={() => setUpcomingSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {hasActiveUpcomingFilters && (
                    <button
                      onClick={handleResetUpcomingFilters}
                      className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold shrink-0"
                    >
                      <X size={13} /> Reset Filters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <DatePicker
                      placeholder="From Date"
                      value={upcomingDateFrom}
                      onChange={(d, dStr) => setUpcomingDateFrom(dStr)}
                      inputClassName="py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <DatePicker
                      placeholder="To Date"
                      value={upcomingDateTo}
                      onChange={(d, dStr) => setUpcomingDateTo(dStr)}
                      inputClassName="py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <select
                      className="input-field py-1.5 text-xs font-semibold"
                      value={upcomingDoctorFilter}
                      onChange={(e) => setUpcomingDoctorFilter(e.target.value)}
                    >
                      <option value="">All Attending Doctors</option>
                      {doctors.map((d) => (
                        <option key={d._id || d.id} value={d._id || d.id}>
                          Dr. {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="card overflow-hidden">
                {loadingUpcoming ? (
                  <div className="p-8 text-center text-sm text-ink-soft">Loading upcoming schedule...</div>
                ) : filteredUpcomingEntries.length === 0 ? (
                  <div className="p-12 text-center space-y-3 border border-dashed border-border rounded-xl">
                    <Calendar size={36} className="mx-auto text-ink-soft/40" />
                    <p className="font-display text-base font-semibold text-ink">No upcoming appointments found</p>
                    <p className="text-xs text-ink-soft">
                      {hasActiveUpcomingFilters
                        ? 'No upcoming appointments match your selected date, doctor, or status filters.'
                        : 'Scheduled appointments for future dates will automatically show up here.'}
                    </p>
                    {hasActiveUpcomingFilters && (
                      <button
                        onClick={handleResetUpcomingFilters}
                        className="btn-secondary text-xs py-1.5 px-3 font-semibold mx-auto inline-flex items-center gap-1"
                      >
                        <RefreshCw size={13} /> Reset Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-3.5">Patient Details</th>
                          <th className="px-5 py-3.5">OP Number</th>
                          <th className="px-5 py-3.5">Scheduled Date</th>
                          <th className="px-5 py-3.5">Time</th>
                          <th className="px-5 py-3.5">Reason / Type</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredUpcomingEntries.map((apt) => {
                          const aptId = apt._id || apt.id;
                          const patientName = apt.patient
                            ? `${apt.patient.firstName} ${apt.patient.lastName}`.trim()
                            : 'Patient';
                          const pType = apt.patient?.patientType || (apt.patient?.age !== undefined && apt.patient?.age !== null && Number(apt.patient.age) < 12 ? 'child' : 'adult');
                          const dateStr = apt.date
                            ? new Date(apt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                            : 'N/A';

                          return (
                            <tr key={aptId} className="hover:bg-bg/60 transition-colors">
                              <td className="px-5 py-4">
                                <div className="font-bold text-ink">{patientName}</div>
                                <div className="text-xs text-ink-soft flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span>
                                    {apt.patient?.age ? `${apt.patient.age}y` : ''} {apt.patient?.sex ? `/ ${apt.patient.sex}` : ''}
                                  </span>
                                  <span className={`badge text-[9px] py-0 px-1.5 font-bold ${pType === 'child' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                    {pType === 'child' ? 'Child' : 'Adult'}
                                  </span>
                                  {apt.patient?.phone && <span>• {apt.patient.phone}</span>}
                                </div>
                              </td>
                              <td className="px-5 py-4 font-mono font-bold text-brand text-xs">
                                {apt.patient?.opNumber ? `#${apt.patient.opNumber}` : '—'}
                              </td>
                              <td className="px-5 py-4 text-xs font-semibold text-ink">
                                {dateStr}
                              </td>
                              <td className="px-5 py-4 text-xs font-mono text-ink">
                                {apt.time || 'Scheduled'}
                              </td>
                              <td className="px-5 py-4 text-xs font-medium text-ink">
                                <span className="badge bg-blue-50 text-blue-800 border border-blue-200">
                                  {apt.reason || apt.type || 'Appointment'}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`badge border ${STATUS_BADGE_CLASSES[apt.status] || 'bg-blue-100 text-blue-800'}`}>
                                  {apt.status}
                                </span>
                              </td>

                              {/* STATUS-BASED ACTIONS */}
                              <td className="px-5 py-4 text-right whitespace-nowrap">
                                {renderRowActions(apt)}
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

          {/* ========================================================================= */}
          {/* TAB 3: COMPLETED TODAY */}
          {/* ========================================================================= */}
          {activeTab === 'completed-today' && (
            <div className="space-y-4">
              {/* SEARCH & FILTER BAR */}
              <div className="card p-4 bg-surface border-border space-y-3 shadow-sm">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  {/* Search Field */}
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                    <input
                      type="text"
                      className="input-field pl-9 py-1.5 text-xs w-full"
                      placeholder="Search completed today by patient name, OP#, phone, reason..."
                      value={completedTodaySearch}
                      onChange={(e) => setCompletedTodaySearch(e.target.value)}
                    />
                    {completedTodaySearch && (
                      <button
                        onClick={() => setCompletedTodaySearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Filter Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Doctor Select Filter */}
                    <select
                      className="input-field py-1.5 text-xs w-auto min-w-[170px]"
                      value={completedTodayDoctorFilter}
                      onChange={(e) => setCompletedTodayDoctorFilter(e.target.value)}
                    >
                      <option value="">All Attending Doctors</option>
                      {doctors.map((doc) => {
                        const dId = doc._id || doc.id;
                        return (
                          <option key={dId} value={dId}>
                            Dr. {doc.name}
                          </option>
                        );
                      })}
                    </select>

                    {/* Reset Filters Button */}
                    {hasActiveCompletedTodayFilters && (
                      <button
                        onClick={handleResetCompletedTodayFilters}
                        className="btn-secondary py-1.5 px-3 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1 font-semibold"
                      >
                        <X size={14} /> Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-ink-soft font-medium border-t border-border/60 pt-2 flex items-center justify-between">
                  <span>Showing {filteredCompletedTodayItems.length} appointment(s) completed today</span>
                  {hasActiveCompletedTodayFilters && (
                    <span className="badge bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
                      Filtered List
                    </span>
                  )}
                </div>
              </div>

              {/* TABLE OF COMPLETED TODAY APPOINTMENTS */}
              <div className="card overflow-hidden">
                {loadingHistory ? (
                  <div className="p-8 text-center text-sm text-ink-soft">Loading completed appointments...</div>
                ) : filteredCompletedTodayItems.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <CheckCircle2 size={36} className="mx-auto text-emerald-500/60" />
                    <p className="font-display text-base font-semibold text-ink">No completed appointments today</p>
                    <p className="text-sm text-ink-soft">
                      {hasActiveCompletedTodayFilters
                        ? 'No completed appointments match your filter criteria.'
                        : 'Appointments completed today will automatically appear here once closed.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-3.5">Patient Details</th>
                          <th className="px-5 py-3.5">OP Number</th>
                          <th className="px-5 py-3.5">Attending Doctor</th>
                          <th className="px-5 py-3.5">Visit / Reason</th>
                          <th className="px-5 py-3.5">Timings</th>
                          <th className="px-5 py-3.5">Status</th>
                          {/* <th className="px-5 py-3.5 text-right">Actions</th> */}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredCompletedTodayItems.map((item) => {
                          const patient = item.patient || {};
                          const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';
                          const pType = patient.patientType || (patient.age !== undefined && Number(patient.age) < 12 ? 'child' : 'adult');

                          const docName = item.doctor?.name ? `Dr. ${item.doctor.name}` : (item.appointment?.doctor?.name ? `Dr. ${item.appointment.doctor.name}` : 'Doctor');
                          const pId = patient._id || patient.id;

                          const dateStr = item.date
                            ? new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Today';

                          const checkInStr = item.checkInTime
                            ? new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—';

                          const startStr = item.startTime
                            ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—';

                          const endStr = item.endTime
                            ? new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Today';

                          return (
                            <tr key={item.id} className="hover:bg-bg/60 transition-colors text-xs">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-ink text-sm">{patientName}</span>
                                  <span className={`badge text-[10px] py-0 px-1.5 font-bold ${pType === 'child' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                    {pType === 'child' ? 'Child' : 'Adult'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-ink-soft">
                                  {patient.age ? `${patient.age}y` : ''} {patient.sex ? `/ ${patient.sex}` : ''} {patient.phone ? `• ${patient.phone}` : ''}
                                </div>
                              </td>

                              <td className="px-5 py-4 font-mono font-bold text-brand">
                                {patient.opNumber ? `#${patient.opNumber}` : '—'}
                              </td>

                              <td className="px-5 py-4 font-semibold text-ink">
                                {docName}
                              </td>

                              <td className="px-5 py-4 font-medium text-ink">
                                <div>{item.reason || 'General Visit'}</div>
                                <div className="text-[10px] text-ink-soft">{dateStr}</div>
                              </td>

                              <td className="px-5 py-4 text-ink-soft space-y-0.5 font-mono text-[11px]">
                                <div>Check-In: <span className="font-semibold text-ink">{checkInStr}</span></div>
                                <div>Start: <span className="font-semibold text-ink">{startStr}</span> • End: <span className="font-semibold text-emerald-700 font-bold">{endStr}</span></div>
                              </td>

                              <td className="px-5 py-4 whitespace-nowrap">
                                <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
                                  Completed Today
                                </span>
                              </td>

                              {/* <td className="px-5 py-4 text-right whitespace-nowrap">
                                {pId ? (
                                  <button
                                    onClick={() => navigate(`/doctor/patient-emr/${pId}`)}
                                    className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1 text-brand font-semibold hover:bg-brand-light/30"
                                  >
                                    <Eye size={13} /> View
                                  </button>
                                ) : (
                                  <span className="text-ink-soft">—</span>
                                )}
                              </td> */}
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

          {/* ========================================================================= */}
          {/* TAB 4: ALL APPOINTMENTS LOG (HISTORY) */}
          {/* ========================================================================= */}
          {activeTab === 'history' && (
            <div className="space-y-4">
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
                      <option value="Missed">Missed</option>
                      <option value="No Show">No Show</option>
                    </select>
                  </div>
                </div>
              </div>

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
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-3.5 cursor-pointer hover:text-ink transition-colors select-none" onClick={() => handleSort('patient')}>
                            Patient {renderSortIndicator('patient')}
                          </th>
                          <th className="px-5 py-3.5 cursor-pointer hover:text-ink transition-colors select-none" onClick={() => handleSort('opNumber')}>
                            OP Number {renderSortIndicator('opNumber')}
                          </th>
                          <th className="px-5 py-3.5 cursor-pointer hover:text-ink transition-colors select-none" onClick={() => handleSort('date')}>
                            Date {renderSortIndicator('date')}
                          </th>
                          <th className="px-5 py-3.5 cursor-pointer hover:text-ink transition-colors select-none" onClick={() => handleSort('checkInTime')}>
                            Check-In {renderSortIndicator('checkInTime')}
                          </th>
                          <th className="px-5 py-3.5 cursor-pointer hover:text-ink transition-colors select-none" onClick={() => handleSort('startTime')}>
                            Start Time {renderSortIndicator('startTime')}
                          </th>
                          <th className="px-5 py-3.5 cursor-pointer hover:text-ink transition-colors select-none" onClick={() => handleSort('endTime')}>
                            End Time {renderSortIndicator('endTime')}
                          </th>
                          <th className="px-5 py-3.5 cursor-pointer hover:text-ink transition-colors select-none" onClick={() => handleSort('doctor')}>
                            Attending Doctor {renderSortIndicator('doctor')}
                          </th>
                          <th className="px-5 py-3.5 cursor-pointer hover:text-ink transition-colors select-none" onClick={() => handleSort('status')}>
                            Status {renderSortIndicator('status')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredHistoryItems.map((item) => {
                          const p = item.patient || {};
                          const patientName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Patient';
                          const pType = p.patientType || (p.age !== undefined && p.age !== null && Number(p.age) < 12 ? 'child' : 'adult');

                          const docObj = item.doctor || item.appointment?.doctor;
                          const docName = docObj?.name ? `Dr. ${docObj.name}` : 'Unassigned';

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
                              <td className="px-5 py-4 font-bold text-ink">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
                                    <User size={14} />
                                  </div>
                                  <div>
                                    <span className="group-hover:text-brand transition-colors block">{patientName}</span>
                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                      <span className="text-[10px] text-ink-soft font-normal">
                                        {p.age ? `${p.age}y` : ''} {p.sex ? `/ ${p.sex}` : ''}
                                      </span>
                                      <span className={`badge text-[9px] py-0 px-1.5 font-bold ${pType === 'child' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                        {pType === 'child' ? 'Child' : 'Adult'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4 font-mono font-bold text-brand whitespace-nowrap">
                                {p.opNumber ? `#${p.opNumber}` : '—'}
                              </td>

                              <td className="px-5 py-4 text-ink font-semibold whitespace-nowrap">
                                {dateStr}
                              </td>

                              <td className="px-5 py-4 font-mono text-ink-soft whitespace-nowrap">
                                {checkInTimeStr}
                              </td>

                              <td className="px-5 py-4 font-mono text-ink-soft whitespace-nowrap">
                                {startTimeStr}
                              </td>

                              <td className="px-5 py-4 font-mono text-ink-soft whitespace-nowrap">
                                {endTimeStr}
                              </td>

                              <td className="px-5 py-4 text-xs font-semibold text-ink whitespace-nowrap">
                                {docName}
                              </td>

                              <td className="px-5 py-4 whitespace-nowrap">
                                <span className={`badge border text-[10px] ${STATUS_BADGE_CLASSES[item.status] || 'bg-slate-100 text-slate-800'}`}>
                                  {item.status}
                                </span>
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
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CANCEL APPOINTMENT CONFIRMATION */}
      {/* ========================================================================= */}
      {cancellingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="card w-full max-w-md bg-surface p-6 space-y-4 shadow-2xl border-rose-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center font-bold">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-display text-base font-bold text-ink">Cancel Appointment</h3>
            </div>

            <p className="text-xs text-ink-soft leading-relaxed">
              Are you sure you want to cancel the appointment for{' '}
              <strong className="text-ink">
                {[cancellingAppointment.patient?.firstName, cancellingAppointment.patient?.lastName].filter(Boolean).join(' ') || 'this patient'}
              </strong>
              ? This action will mark the appointment as cancelled.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={submittingId === (cancellingAppointment._id || cancellingAppointment.id)}
                onClick={() => setCancellingAppointment(null)}
                className="btn-secondary py-1.5 px-4 text-xs font-semibold"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                disabled={submittingId === (cancellingAppointment._id || cancellingAppointment.id)}
                onClick={handleConfirmCancel}
                className="btn-primary py-1.5 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
              >
                {submittingId === (cancellingAppointment._id || cancellingAppointment.id) ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NO SHOW CONFIRMATION */}
      {/* ========================================================================= */}
      {noShowAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="card w-full max-w-md bg-surface p-6 space-y-4 shadow-2xl border-amber-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center font-bold">
                <UserX size={20} />
              </div>
              <h3 className="font-display text-base font-bold text-ink">Mark as No Show</h3>
            </div>

            <p className="text-xs text-ink-soft leading-relaxed">
              Mark appointment for{' '}
              <strong className="text-ink">
                {[noShowAppointment.patient?.firstName, noShowAppointment.patient?.lastName].filter(Boolean).join(' ') || 'this patient'}
              </strong>{' '}
              as <strong className="text-amber-700">No Show</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={submittingId === (noShowAppointment._id || noShowAppointment.id)}
                onClick={() => setNoShowAppointment(null)}
                className="btn-secondary py-1.5 px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingId === (noShowAppointment._id || noShowAppointment.id)}
                onClick={handleConfirmNoShow}
                className="btn-primary py-1.5 px-4 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
              >
                {submittingId === (noShowAppointment._id || noShowAppointment.id) ? 'Updating...' : 'Mark No Show'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BRIEF VISIT SUMMARY MODAL */}
      {/* ========================================================================= */}
      {selectedVisitSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-150">
          <div className="card w-full max-w-lg max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-2xl border-brand/20">
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

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
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

              {selectedVisitSummary.notes && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-1">
                  <span className="font-bold text-[10px] uppercase tracking-wider block text-amber-800">
                    Visit Notes:
                  </span>
                  <p className="whitespace-pre-wrap text-xs">{selectedVisitSummary.notes}</p>
                </div>
              )}
            </div>

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

      <PatientDetailsEditModal
        isOpen={Boolean(selectedPatientForEdit)}
        patient={selectedPatientForEdit}
        appointmentId={appointmentForEdit}
        onClose={() => {
          setSelectedPatientForEdit(null);
          setAppointmentForEdit(null);
        }}
        onSuccess={() => refreshAll()}
      />
    </div>
  );
}
