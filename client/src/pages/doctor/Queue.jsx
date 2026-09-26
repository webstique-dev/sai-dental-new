import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ClipboardList, Play, Clock, UserSquare2, RefreshCw, Calendar, Search, Filter, X, Eye, FileText, CheckCircle2, UserCheck, UserX, XCircle, User, CalendarDays, AlertTriangle, List, ChevronDown, ChevronUp, Plus, UserPlus, Loader2, Edit3
} from 'lucide-react';
import { formatAge, formatPatientFullName } from '../../utils/formatters.js';

import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import AppointmentCalendar from '../../components/common/AppointmentCalendar.jsx';
import PatientDetailsEditModal from '../../components/common/PatientDetailsEditModal.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import CreateAppointmentModal from '../../components/common/CreateAppointmentModal.jsx';
import CompletedConsultationModal from '../../components/common/CompletedConsultationModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';
import { TableSkeleton } from '../../components/common/TableSkeleton.jsx';

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
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [isCreateAppointmentOpen, setIsCreateAppointmentOpen] = useState(false);

  // Active Tab: 'today' (default) | 'upcoming' | 'history'
  const [activeTab, setActiveTab] = useState(() => (tabParam && ['today', 'upcoming', 'history'].includes(tabParam) ? tabParam : 'today'));

  useEffect(() => {
    if (tabParam && ['today', 'upcoming', 'history'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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

  // MOBILE ACCORDION FILTER TOGGLE STATES
  const [isMobileTodayFilterOpen, setIsMobileTodayFilterOpen] = useState(false);
  const [isMobileUpcomingFilterOpen, setIsMobileUpcomingFilterOpen] = useState(false);
  const [isMobileCompletedTodayFilterOpen, setIsMobileCompletedTodayFilterOpen] = useState(false);
  const [isMobileHistoryFilterOpen, setIsMobileHistoryFilterOpen] = useState(false);

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

  // MOBILE ACCORDION EXPAND STATES
  const [expandedTodayId, setExpandedTodayId] = useState(null);
  const [expandedUpcomingId, setExpandedUpcomingId] = useState(null);
  const [expandedCompletedTodayId, setExpandedCompletedTodayId] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  const toggleExpandToday = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedTodayId((prev) => (prev === id ? null : id));
  };
  const toggleExpandUpcoming = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedUpcomingId((prev) => (prev === id ? null : id));
  };
  const toggleExpandCompletedToday = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedCompletedTodayId((prev) => (prev === id ? null : id));
  };
  const toggleExpandHistory = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedHistoryId((prev) => (prev === id ? null : id));
  };

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

      const combinedToday = [];
      queueList.forEach((q) => {
        if (q.status !== 'Completed') {
          combinedToday.push(q);
        }
      });

      todayApts.forEach((apt) => {
        const aptId = (apt._id || apt.id).toString();
        if (!checkedInAptIds.has(aptId) && apt.status !== 'Completed') {
          combinedToday.push({
            id: apt._id || apt.id,
            _id: apt._id || apt.id,
            token: '—',
            patient: apt.patient,
            doctor: apt.doctor,
            type: apt.type || 'Appointment',
            reason: apt.reason || (apt.status === 'In Consultation' ? 'In-Consultation Visit' : 'Scheduled Visit'),
            checkInTime: apt.checkInTime || null,
            status: apt.status,
            appointment: apt,
            isScheduledOnly: apt.status === 'Scheduled',
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

      const cList = cRes.data?.consultations || cRes.data?.visits || [];
      const aList = aRes.data?.appointments || [];
      const dList = dRes.data?.doctors || [];

      setDoctors(dList);

      const merged = [];
      const seenAppointmentIds = new Set();
      const seenPatientDates = new Set();

      cList.forEach((c) => {
        const cId = (c._id || c.id || '').toString();
        const aptId = c.appointment?._id || c.appointment?.id || c.appointment;
        if (aptId) {
          seenAppointmentIds.add(aptId.toString());
        }

        const patId = (c.patient?._id || c.patient?.id || c.patient || '').toString();
        const visitDateStr = new Date(c.visitDate || c.startedAt || c.createdAt).toDateString();
        if (patId) {
          seenPatientDates.add(`${patId}_${visitDateStr}`);
        }

        const apt = aList.find((a) => (a._id || a.id).toString() === (aptId ? aptId.toString() : ''));

        const checkIn = c.checkInTime || c.queueEntry?.checkInTime || c.queueEntry?.checked_in_at || apt?.createdAt || c.startedAt || c.createdAt;
        const startTime = c.startedAt || c.startTime || c.visitDate || c.createdAt;
        const endTime = c.closedAt || c.checkOutTime || c.endTime || null;

        merged.push({
          id: `consult-${c._id || c.id}`,
          consultationId: c._id || c.id,
          appointmentId: aptId ? aptId.toString() : null,
          patient: c.patient || apt?.patient,
          doctor: c.doctor || apt?.doctor,
          date: c.visitDate || c.startedAt || apt?.date || c.createdAt,
          checkInTime: checkIn,
          startTime: startTime,
          endTime: endTime,
          status: c.status === 'In Progress' ? 'In Consultation' : (c.status || 'Completed'),
          reason: c.reason || apt?.reason || (c.queueEntry?.type === 'Walk-in' ? 'Walk-in Consultation' : 'General Dental Visit'),
          notes: c.clinicalNotes || c.notes || '',
          diagnoses: c.diagnoses || [],
          prescriptions: c.prescriptions || [],
          treatmentPlans: c.treatmentPlans || [],
          examination: c.examination || null,
        });
      });

      aList.forEach((a) => {
        const aId = (a._id || a.id).toString();
        if (seenAppointmentIds.has(aId)) return;

        const patId = (a.patient?._id || a.patient?.id || a.patient || '').toString();
        const aDateStr = new Date(a.date || a.createdAt).toDateString();
        if (patId && seenPatientDates.has(`${patId}_${aDateStr}`) && (a.status === 'Completed' || a.status === 'In Consultation')) {
          return;
        }

        merged.push({
          id: a._id || a.id,
          _id: a._id || a.id,
          appointmentId: aId,
          type: 'Appointment',
          patient: a.patient,
          doctor: a.doctor,
          date: a.date || a.createdAt,
          checkInTime: a.createdAt,
          startTime: a.status === 'In Consultation' || a.status === 'Completed' ? a.createdAt : null,
          endTime: a.status === 'Completed' ? a.updatedAt : null,
          status: a.status || 'Scheduled',
          reason: a.reason || 'Scheduled Appointment',
          notes: '',
          diagnoses: [],
          prescriptions: [],
          treatmentPlans: [],
        });
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

  useSocketEvent('PATIENT_UPDATED', () => {
    refreshAll();
  });

  useEffect(() => {
    refreshAll();
  }, []);

  const cleanObjectId = (val) => {
    if (!val) return null;
    const str = typeof val === 'object' ? (val._id || val.id || '') : String(val);
    const cleaned = str.replace(/^(apt|queue|q|con|pat)-/, '').trim();
    return cleaned || null;
  };

  // Action Handler: Start or Continue Consultation (Launches consultation flow directly)
  const handleStartConsultation = async (entry) => {
    const rawActiveCId = entry.activeConsultationId || entry.consultation?._id || entry.consultation?.id || entry.consultation;
    const activeCId = cleanObjectId(rawActiveCId);
    if (activeCId) {
      navigate(`/doctor/consultation/${activeCId}`);
      return;
    }

    const itemId = cleanObjectId(entry._id || entry.id);
    const rawAptId = entry.appointment?._id || entry.appointment?.id || entry.appointmentId || (entry.type === 'Appointment' ? itemId : null);
    const aptId = cleanObjectId(rawAptId);
    const rawQId = entry.type !== 'Appointment' && !entry.appointment ? itemId : (entry.queueEntry?._id || entry.queueEntryId || null);
    const qId = cleanObjectId(rawQId);
    const patientId = cleanObjectId(entry.patient?._id || entry.patient?.id || entry.patient);

    try {
      setSubmittingId(entry._id || entry.id);
      let res;
      if (qId || aptId) {
        res = await api.post('/consultations/start', {
          queueEntryId: qId,
          appointmentId: aptId,
        });
      } else if (patientId) {
        res = await api.post('/consultations/find-or-create', {
          patientId,
          appointmentId: aptId,
        });
      }

      const consultation = res?.data?.consultation;
      if (consultation && (consultation._id || consultation.id)) {
        navigate(`/doctor/consultation/${consultation._id || consultation.id}`);
      } else {
        showError('Could not start consultation.');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to start consultation.');
    } finally {
      setSubmittingId(null);
    }
  };

  // Action Handler: Check In Patient (Scheduled -> Checked-In)
  const handleCheckInPatient = async (rawAptId) => {
    const aptId = cleanObjectId(rawAptId);
    if (!aptId) return;
    setSubmittingId(rawAptId);
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
    const aptId = cleanObjectId(noShowAppointment._id || noShowAppointment.id || noShowAppointment.appointmentId);
    if (!aptId) return;
    setSubmittingId(noShowAppointment._id || noShowAppointment.id);
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
    const aptId = cleanObjectId(cancellingAppointment._id || cancellingAppointment.id || cancellingAppointment.appointmentId);
    if (!aptId) return;
    setSubmittingId(cancellingAppointment._id || cancellingAppointment.id);
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
        {/* WORKFLOW 1: SCHEDULED -> Check-In, No Show */}
        {displayStatus === 'Scheduled' && (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleCheckInPatient(itemId)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Check in patient to queue"
            >
              {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
              <span>{isSubmitting ? 'Checking In...' : 'Check In'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setNoShowAppointment(item)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Mark patient as No Show"
            >
              <UserX size={13} />
              <span>No Show</span>
            </button>
          </>
        )}

        {/* WORKFLOW 2: CHECKED-IN -> Start Consultation, No Show */}
        {displayStatus === 'Checked-In' && (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleStartConsultation(item)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-brand text-white hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
              <span>{isSubmitting ? 'Starting...' : 'Start Consultation'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setNoShowAppointment(item)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Mark patient as No Show"
            >
              <UserX size={13} />
              <span>No Show</span>
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

        {/* EDIT PATIENT REGISTRATION DETAILS ACTION */}
        {item.patient && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPatientForEdit(item.patient);
              setAppointmentForEdit(item.appointment?._id || item.appointment?.id || item.appointment || item._id || null);
            }}
            className="btn-secondary py-1.5 px-2.5 text-xs font-semibold inline-flex items-center gap-1.5 hover:border-brand hover:text-brand transition-colors"
            title="Edit Patient Registration Details"
          >
            <Edit3 size={13} className="text-amber-600" />
            <span>Edit</span>
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

  // Filtered Today Entries (STRICTLY NON-COMPLETED STATUS ONLY)
  const filteredTodayEntries = useMemo(() => {
    let entries = queueEntries.filter((item) => item.status !== 'Completed');
    if (!todaySearch.trim()) return entries;
    const q = todaySearch.trim().toLowerCase();
    return entries.filter((item) => {
      const p = item.patient || {};
      const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').toLowerCase();
      const primaryPhone = (p.primaryPhone || p.phone || '').toLowerCase();
      const secondaryPhone = (p.secondaryPhone || '').toLowerCase();
      const op = (p.opNumber || '').toLowerCase();
      const reason = (item.reason || '').toLowerCase();
      return fullName.includes(q) || op.includes(q) || primaryPhone.includes(q) || secondaryPhone.includes(q) || reason.includes(q);
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
        const primaryPhone = (p.primaryPhone || p.phone || '').toLowerCase();
        const secondaryPhone = (p.secondaryPhone || '').toLowerCase();
        const op = (p.opNumber || '').toLowerCase();
        const reason = (item.reason || '').toLowerCase();
        return fullName.includes(q) || op.includes(q) || primaryPhone.includes(q) || secondaryPhone.includes(q) || reason.includes(q);
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

  // Scheduled Upcoming Count
  const scheduledUpcomingCount = useMemo(() => {
    return upcomingAppointments.filter((item) => item.status === 'Scheduled').length;
  }, [upcomingAppointments]);

  // Filtered History Log Items (STRICTLY COMPLETED, MISSED, AND NO SHOW ONLY)
  const filteredHistoryItems = useMemo(() => {
    const ALLOWED_HISTORY_STATUSES = new Set(['Completed', 'Missed', 'No Show']);
    let result = rawHistoryItems.filter((item) => ALLOWED_HISTORY_STATUSES.has(item.status));

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        const p = item.patient || {};
        const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').toLowerCase();
        const primaryPhone = (p.primaryPhone || p.phone || '').toLowerCase();
        const secondaryPhone = (p.secondaryPhone || '').toLowerCase();
        const op = (p.opNumber || '').toLowerCase();
        return fullName.includes(q) || op.includes(q) || primaryPhone.includes(q) || secondaryPhone.includes(q);
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
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const isDateToday = (d) => {
      if (!d) return false;
      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) return false;
      return (
        parsed.getFullYear() === todayYear &&
        parsed.getMonth() === todayMonth &&
        parsed.getDate() === todayDate
      );
    };

    const currentDoctorId = (user?._id || user?.id || '').toString();

    let result = rawHistoryItems.filter((item) => {
      // Must be status 'Completed'
      if (item.status !== 'Completed') return false;

      // Doctor role must only see their own completed consultations
      if (user?.role === 'doctor' && currentDoctorId) {
        const itemDocId = (item.doctor?._id || item.doctor?.id || item.doctor || item.appointment?.doctor?._id || item.appointment?.doctor || '').toString();
        if (itemDocId && itemDocId !== currentDoctorId) {
          return false;
        }
      }

      // Must be completed / visited today
      const itemDate = item.endTime || item.startTime || item.date || item.checkInTime;
      return isDateToday(itemDate);
    });

    // Deduplicate to guarantee each appointment appears only once
    const uniqueMap = new Map();
    result.forEach((item) => {
      const pId = (item.patient?._id || item.patient?.id || item.patient || '').toString();
      const key = item.consultationId
        ? `c_${item.consultationId}`
        : item.appointmentId
        ? `a_${item.appointmentId}`
        : `p_${pId}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });
    result = Array.from(uniqueMap.values());

    if (completedTodaySearch) {
      const q = completedTodaySearch.toLowerCase();
      result = result.filter((item) => {
        const p = item.patient || {};
        const pName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
        const primaryPhone = (p.primaryPhone || p.phone || '').toLowerCase();
        const secondaryPhone = (p.secondaryPhone || '').toLowerCase();
        const op = (p.opNumber || '').toLowerCase();
        const reason = (item.reason || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();
        return pName.includes(q) || op.includes(q) || primaryPhone.includes(q) || secondaryPhone.includes(q) || reason.includes(q) || notes.includes(q);
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
    <div className="space-y-6 max-w-7xl w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-ink flex items-center gap-2 min-w-0 leading-tight">
            <CalendarDays size={24} className="text-brand shrink-0" />
            <span className="truncate sm:whitespace-normal">My Appointments</span>
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed break-words">
            View appointments, check in patients, and manage your clinical schedule directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto">
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

          <Link
            to="/doctor/patients/register"
            className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 shadow-sm"
          >
            <UserPlus size={14} />
            <span>Add Patient</span>
          </Link>

          <button
            onClick={() => setIsCreateAppointmentOpen(true)}
            className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 shadow-sm"
          >
            <Plus size={14} />
            <span>Book Appointment</span>
          </button>

          <button
            onClick={refreshAll}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
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
          statusBadgeClasses={STATUS_BADGE_CLASSES}
        />
      ) : (
        <>

          {/* TABS NAVIGATION (Horizontally scrollable within container on mobile) */}
          <div className="w-full max-w-full min-w-0 overflow-x-auto scrollbar-none no-scrollbar border-b border-border py-1">
            <div className="flex items-center space-x-1 sm:space-x-2 text-xs font-bold whitespace-nowrap min-w-max">
              {/* TAB 1: Today's Appointments */}
              <button
                type="button"
                onClick={() => setActiveTab('today')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'today'
                  ? 'border-brand text-brand font-bold bg-brand-light/20 rounded-t-lg'
                  : 'border-transparent text-ink-soft hover:text-ink hover:border-border'
                  }`}
              >
                <CalendarDays size={16} />
                <span>Today's Appointments</span>
                {filteredTodayEntries.length > 0 && (
                  <span className="badge bg-brand-light/50 text-brand-dark font-mono text-[10px]">
                    {filteredTodayEntries.length}
                  </span>
                )}
              </button>

              {/* TAB 2: Upcoming Appointments */}
              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'upcoming'
                  ? 'border-brand text-brand font-bold bg-brand-light/20 rounded-t-lg'
                  : 'border-transparent text-ink-soft hover:text-ink hover:border-border'
                  }`}
              >
                <Clock size={16} />
                <span>Upcoming Appointments</span>
                {scheduledUpcomingCount > 0 && (
                  <span className="badge bg-blue-100 text-blue-800 font-mono text-[10px]">
                    {scheduledUpcomingCount}
                  </span>
                )}
              </button>

              {/* TAB 3: Completed Today */}
              <button
                type="button"
                onClick={() => setActiveTab('completed-today')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'completed-today'
                  ? 'border-brand text-brand font-bold bg-brand-light/20 rounded-t-lg'
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
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'history'
                  ? 'border-brand text-brand font-bold bg-brand-light/20 rounded-t-lg'
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
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: TODAY'S APPOINTMENTS */}
          {/* ========================================================================= */}
          {activeTab === 'today' && (
            <div className="space-y-4">
              {/* Desktop Filter Bar (≥768px) */}
              <div className="hidden md:flex card p-3.5 bg-surface border-border flex-row items-center justify-between gap-2.5">
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

              {/* Mobile Collapsible Filter Accordion (<768px down to 320px) */}
              <div className="block md:hidden card p-3 bg-surface border border-border shadow-xs space-y-3 rounded-2xl max-w-full overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsMobileTodayFilterOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-bold text-ink gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
                      <Filter size={14} />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="font-bold text-ink">Filters & Search</span>
                      {todaySearch && (
                        <span className="badge bg-brand text-white text-[10px] py-0.5 px-2 font-bold shrink-0 truncate max-w-[120px]">
                          "{todaySearch}"
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-ink-soft font-semibold shrink-0">
                    <span>{isMobileTodayFilterOpen ? 'Hide' : 'Filter'}</span>
                    {isMobileTodayFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isMobileTodayFilterOpen && (
                  <div className="pt-2 border-t border-border/70 space-y-3 animate-in fade-in duration-150 text-xs">
                    <div className="relative w-full">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                      <input
                        type="text"
                        className="input-field pl-9 py-1.5 text-xs w-full"
                        placeholder="Filter today's appointments..."
                        value={todaySearch}
                        onChange={(e) => setTodaySearch(e.target.value)}
                      />
                      {todaySearch && (
                        <button onClick={() => setTodaySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] text-ink-soft font-medium">
                      Showing {filteredTodayEntries.length} record(s) for today
                    </div>
                  </div>
                )}
              </div>

              <div className="card overflow-hidden">
                {loadingToday ? (
                  <TableSkeleton rows={5} cols={7} />
                ) : filteredTodayEntries.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center space-y-3">
                    <UserSquare2 size={36} className="mx-auto text-ink-soft/50" />
                    <p className="font-display text-base font-semibold text-ink">No appointments found for today</p>
                    <p className="text-sm text-ink-soft">
                      Appointments scheduled for today will automatically show up here.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View (≥768px) */}
                    <div className="hidden md:block overflow-x-auto">
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
                            const patientName = formatPatientFullName(entry.patient) || 'Patient';
                            const timeDisplay = entry.checkInTime
                              ? new Date(entry.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : (entry.appointment?.time || 'Today');

                            const displayStatus = entry.status === 'With Doctor' ? 'In Consultation' : entry.status;

                            return (
                              <tr
                                key={entryId}
                                className="hover:bg-bg/60 transition-colors"
                              >
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
                                    {entry.patient?.age !== undefined && entry.patient?.age !== null && entry.patient?.age !== '' ? `${formatAge(entry.patient.age)}y` : ''} {entry.patient?.sex ? `/ ${entry.patient.sex}` : ''} {(entry.patient?.primaryPhone || entry.patient?.phone) ? `• ${entry.patient.primaryPhone || entry.patient.phone}${entry.patient.secondaryPhone ? ` / ${entry.patient.secondaryPhone}` : ''}` : ''}
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

                    {/* Mobile Accordion Cards View (<768px down to 320px) */}
                    <div className="block md:hidden divide-y divide-border">
                      {filteredTodayEntries.map((entry) => {
                        const entryId = entry._id || entry.id;
                        const patientName = formatPatientFullName(entry.patient) || 'Patient';
                        const timeDisplay = entry.checkInTime
                          ? new Date(entry.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : (entry.appointment?.time || 'Today');

                        const displayStatus = entry.status === 'With Doctor' ? 'In Consultation' : entry.status;
                        const pType = entry.patient?.patientType || (entry.patient?.age !== undefined && entry.patient?.age !== null && Number(entry.patient.age) < 12 ? 'child' : 'adult');
                        const isExpanded = expandedTodayId === entryId;

                        return (
                          <div key={entryId} className="p-3.5 space-y-3 hover:bg-bg/40 transition-colors">
                            {/* Collapsed Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand font-mono text-xs font-bold border border-brand/20 mt-0.5">
                                  {entry.token !== '—' ? `#${entry.token}` : '—'}
                                </span>
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-ink text-sm truncate">{patientName}</span>
                                    <span className={`badge border text-[10px] font-bold py-0.5 px-2 shrink-0 ${STATUS_BADGE_CLASSES[displayStatus] || 'bg-slate-100 text-slate-800'}`}>
                                      {displayStatus}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs font-mono text-ink-soft flex-wrap">
                                    {entry.patient?.opNumber && <span className="font-bold text-brand">#{entry.patient.opNumber}</span>}
                                    {timeDisplay && <span className="flex items-center gap-1 text-ink font-sans font-medium"><Clock size={12} className="text-brand" /> {timeDisplay}</span>}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => toggleExpandToday(entryId, e)}
                                className="p-1.5 rounded-lg border border-border text-ink-soft hover:text-ink hover:bg-bg shrink-0 mt-0.5"
                                aria-label={isExpanded ? 'Collapse entry' : 'Expand entry'}
                              >
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="pt-2 border-t border-border/70 space-y-3 text-xs animate-in fade-in duration-150">
                                <div className="grid grid-cols-2 gap-2 text-ink-soft bg-bg/50 p-2.5 rounded-xl border border-border">
                                  <div>
                                    <span className="block text-[10px] font-semibold uppercase text-ink-soft">Demographics</span>
                                    <span className="font-medium text-ink">
                                      {entry.patient?.age !== undefined && entry.patient?.age !== null && entry.patient?.age !== '' ? `${formatAge(entry.patient.age)}y` : ''} {entry.patient?.sex ? `/ ${entry.patient.sex}` : ''} ({pType === 'child' ? 'Child' : 'Adult'})
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-[10px] font-semibold uppercase text-ink-soft">Phone</span>
                                    <span className="font-mono font-medium text-ink">{entry.patient?.primaryPhone || entry.patient?.phone || '—'}{entry.patient?.secondaryPhone ? ` / ${entry.patient.secondaryPhone}` : ''}</span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="block text-[10px] font-semibold uppercase text-ink-soft">Reason / Visit Type</span>
                                    <span className="font-medium text-ink">{entry.appointment?.reason || entry.reason || entry.type || 'Appointment'}</span>
                                  </div>
                                </div>

                                {/* Action Controls */}
                                <div className="pt-1 flex items-center justify-end">
                                  {renderRowActions(entry)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: UPCOMING APPOINTMENTS */}
          {/* ========================================================================= */}
          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              {/* Desktop Filter Bar (≥768px) */}
              <div className="hidden md:block card p-4 bg-surface border-border space-y-3">
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

                <div className="grid grid-cols-3 gap-3 text-xs">
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

              {/* Mobile Collapsible Filter Accordion (<768px down to 320px) */}
              <div className="block md:hidden card p-3.5 bg-surface border border-border shadow-xs space-y-3 rounded-2xl max-w-full overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsMobileUpcomingFilterOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-bold text-ink gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
                      <Filter size={14} />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="font-bold text-ink">Filters & Search</span>
                      {hasActiveUpcomingFilters && (
                        <span className="badge bg-brand text-white text-[10px] py-0.5 px-2 font-bold shrink-0">
                          Active Filters
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-ink-soft font-semibold shrink-0">
                    <span>{isMobileUpcomingFilterOpen ? 'Hide' : 'Filter'}</span>
                    {isMobileUpcomingFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isMobileUpcomingFilterOpen && (
                  <div className="pt-2 border-t border-border/70 space-y-3 animate-in fade-in duration-150 text-xs">
                    <div className="relative w-full">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                      <input
                        type="text"
                        className="input-field pl-9 py-1.5 text-xs w-full"
                        placeholder="Search upcoming appointments..."
                        value={upcomingSearch}
                        onChange={(e) => setUpcomingSearch(e.target.value)}
                      />
                      {upcomingSearch && (
                        <button onClick={() => setUpcomingSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <DatePicker
                        placeholder="From Date"
                        value={upcomingDateFrom}
                        onChange={(d, dStr) => setUpcomingDateFrom(dStr)}
                        inputClassName="py-1.5 text-xs w-full"
                      />
                      <DatePicker
                        placeholder="To Date"
                        value={upcomingDateTo}
                        onChange={(d, dStr) => setUpcomingDateTo(dStr)}
                        inputClassName="py-1.5 text-xs w-full"
                      />
                      <select
                        className="input-field py-1.5 text-xs font-semibold w-full"
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

                    {hasActiveUpcomingFilters && (
                      <button
                        onClick={handleResetUpcomingFilters}
                        className="btn-secondary w-full py-1.5 text-xs text-rose-600 font-semibold flex items-center justify-center gap-1"
                      >
                        <X size={13} /> Clear Filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="card overflow-hidden">
                {loadingUpcoming ? (
                  <TableSkeleton rows={5} cols={7} />
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
                  <>
                    {/* Desktop Table View (≥768px) */}
                    <div className="hidden md:block overflow-x-auto">
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
                            const patientName = formatPatientFullName(apt.patient) || 'Patient';
                            const pType = apt.patient?.patientType || (apt.patient?.age !== undefined && apt.patient?.age !== null && Number(apt.patient.age) < 12 ? 'child' : 'adult');
                            const dateStr = apt.date
                              ? new Date(apt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                              : 'N/A';

                            return (
                              <tr
                                key={aptId}
                                className="hover:bg-bg/60 transition-colors"
                              >
                                <td className="px-5 py-4">
                                  <div className="font-bold text-ink">{patientName}</div>
                                  <div className="text-xs text-ink-soft flex items-center gap-1.5 flex-wrap mt-0.5">
                                    <span>
                                      {apt.patient?.age !== undefined && apt.patient?.age !== null && apt.patient?.age !== '' ? `${formatAge(apt.patient.age)}y` : ''} {apt.patient?.sex ? `/ ${apt.patient.sex}` : ''}
                                    </span>
                                    <span className={`badge text-[9px] py-0 px-1.5 font-bold ${pType === 'child' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                      {pType === 'child' ? 'Child' : 'Adult'}
                                    </span>
                                    {(apt.patient?.primaryPhone || apt.patient?.phone) && <span>• {apt.patient.primaryPhone || apt.patient.phone}{apt.patient.secondaryPhone ? ` / ${apt.patient.secondaryPhone}` : ''}</span>}
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

                    {/* Mobile Accordion Cards View (<768px down to 320px) */}
                    <div className="block md:hidden divide-y divide-border">
                      {filteredUpcomingEntries.map((apt) => {
                        const aptId = apt._id || apt.id;
                        const patientName = formatPatientFullName(apt.patient) || 'Patient';
                        const pType = apt.patient?.patientType || (apt.patient?.age !== undefined && apt.patient?.age !== null && Number(apt.patient.age) < 12 ? 'child' : 'adult');
                        const dateStr = apt.date
                          ? new Date(apt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                          : 'N/A';
                        const isExpanded = expandedUpcomingId === aptId;

                        return (
                          <div key={aptId} className="p-3.5 space-y-3 hover:bg-bg/40 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-ink text-sm truncate">{patientName}</span>
                                  <span className={`badge border text-[10px] font-bold py-0.5 px-2 shrink-0 ${STATUS_BADGE_CLASSES[apt.status] || 'bg-blue-100 text-blue-800'}`}>
                                    {apt.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono text-ink-soft flex-wrap">
                                  {apt.patient?.opNumber && <span className="font-bold text-brand">#{apt.patient.opNumber}</span>}
                                  <span className="text-ink font-sans font-medium">• {dateStr} at {apt.time || 'Scheduled'}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => toggleExpandUpcoming(aptId, e)}
                                className="p-1.5 rounded-lg border border-border text-ink-soft hover:text-ink hover:bg-bg shrink-0 mt-0.5"
                                aria-label={isExpanded ? 'Collapse entry' : 'Expand entry'}
                              >
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="pt-2 border-t border-border/70 space-y-3 text-xs animate-in fade-in duration-150">
                                <div className="grid grid-cols-2 gap-2 text-ink-soft bg-bg/50 p-2.5 rounded-xl border border-border">
                                  <div>
                                    <span className="block text-[10px] font-semibold uppercase text-ink-soft">Demographics</span>
                                    <span className="font-medium text-ink">
                                      {apt.patient?.age !== undefined && apt.patient?.age !== null && apt.patient?.age !== '' ? `${formatAge(apt.patient.age)}y` : ''} {apt.patient?.sex ? `/ ${apt.patient.sex}` : ''} ({pType === 'child' ? 'Child' : 'Adult'})
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-[10px] font-semibold uppercase text-ink-soft">Phone</span>
                                    <span className="font-mono font-medium text-ink">{apt.patient?.primaryPhone || apt.patient?.phone || '—'}{apt.patient?.secondaryPhone ? ` / ${apt.patient.secondaryPhone}` : ''}</span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="block text-[10px] font-semibold uppercase text-ink-soft">Reason / Type</span>
                                    <span className="font-medium text-ink">{apt.reason || apt.type || 'Appointment'}</span>
                                  </div>
                                </div>

                                <div className="pt-1 flex items-center justify-end">
                                  {renderRowActions(apt)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: COMPLETED TODAY */}
          {/* ========================================================================= */}
          {activeTab === 'completed-today' && (
            <div className="space-y-4">
              {/* Desktop Filter Bar (≥768px) */}
              <div className="hidden md:block card p-4 bg-surface border-border space-y-3 shadow-sm">
                <div className="flex flex-row items-center justify-between gap-3">
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
                    {user?.role !== 'doctor' && (
                      <select
                        className="input-field py-1.5 text-xs font-semibold w-full sm:w-auto"
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
                    )}

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

              {/* Mobile Collapsible Filter Accordion (<768px down to 320px) */}
              <div className="block md:hidden card p-3.5 bg-surface border border-border shadow-xs space-y-3 rounded-2xl max-w-full overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsMobileCompletedTodayFilterOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-bold text-ink gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
                      <Filter size={14} />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="font-bold text-ink">Filters & Search</span>
                      {hasActiveCompletedTodayFilters && (
                        <span className="badge bg-brand text-white text-[10px] py-0.5 px-2 font-bold shrink-0">
                          Active Filters
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-ink-soft font-semibold shrink-0">
                    <span>{isMobileCompletedTodayFilterOpen ? 'Hide' : 'Filter'}</span>
                    {isMobileCompletedTodayFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isMobileCompletedTodayFilterOpen && (
                  <div className="pt-2 border-t border-border/70 space-y-3 animate-in fade-in duration-150 text-xs">
                    <div className="relative w-full">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                      <input
                        type="text"
                        className="input-field pl-9 py-1.5 text-xs w-full"
                        placeholder="Search completed today..."
                        value={completedTodaySearch}
                        onChange={(e) => setCompletedTodaySearch(e.target.value)}
                      />
                      {completedTodaySearch && (
                        <button onClick={() => setCompletedTodaySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {user?.role !== 'doctor' && (
                      <select
                        className="input-field py-1.5 text-xs font-semibold w-full"
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
                    )}

                    {hasActiveCompletedTodayFilters && (
                      <button
                        onClick={handleResetCompletedTodayFilters}
                        className="btn-secondary w-full py-1.5 text-xs text-rose-600 font-semibold flex items-center justify-center gap-1"
                      >
                        <X size={13} /> Clear Filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* TABLE OF COMPLETED TODAY APPOINTMENTS */}
              <div className="card overflow-hidden">
                {loadingHistory ? (
                  <TableSkeleton rows={5} cols={7} />
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
                  <>
                    {/* Desktop Table View (≥768px) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                          <tr>
                            <th className="px-5 py-3.5 min-w-[220px]">Patient Details</th>
                            <th className="px-5 py-3.5 w-36">OP Number</th>
                            <th className="px-5 py-3.5 min-w-[200px]">Visit / Reason</th>
                            <th className="px-5 py-3.5 min-w-[200px]">Timings</th>
                            <th className="px-5 py-3.5 w-36 text-center">Status</th>
                            <th className="px-5 py-3.5 w-28 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredCompletedTodayItems.map((item) => {
                            const patient = item.patient || {};
                            const patientName = formatPatientFullName(patient) || 'Patient';
                            const pType = patient.patientType || (patient.age !== undefined && Number(patient.age) < 12 ? 'child' : 'adult');

                            const dateStr = item.date
                              ? new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                              : 'Today';

                            const formatTimingVal = (d) => {
                              if (!d) return '—';
                              const parsed = new Date(d);
                              if (isNaN(parsed.getTime())) return '—';
                              return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            };

                            const checkInStr = formatTimingVal(item.checkInTime);
                            const startStr = formatTimingVal(item.startTime);
                            const endStr = formatTimingVal(item.endTime);

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
                                    {patient.age !== undefined && patient.age !== null && patient.age !== '' ? `${formatAge(patient.age)}y` : ''} {patient.sex ? `/ ${patient.sex}` : ''} {(patient.primaryPhone || patient.phone) ? `• ${patient.primaryPhone || patient.phone}${patient.secondaryPhone ? ` / ${patient.secondaryPhone}` : ''}` : ''}
                                  </div>
                                </td>

                                <td className="px-5 py-4 font-mono font-bold text-brand">
                                  {patient.opNumber ? `#${patient.opNumber}` : '—'}
                                </td>

                                <td className="px-5 py-4 font-medium text-ink">
                                  <div>{item.reason || 'General Visit'}</div>
                                  <div className="text-[10px] text-ink-soft">{dateStr}</div>
                                </td>

                                <td className="px-5 py-4 text-ink-soft space-y-0.5 font-mono text-[11px]">
                                  <div>Check-In: <span className="font-semibold text-ink">{checkInStr}</span></div>
                                  <div>Start: <span className="font-semibold text-ink">{startStr}</span> • End: <span className="font-semibold text-emerald-700 font-bold">{endStr}</span></div>
                                </td>

                                <td className="px-5 py-4 text-center whitespace-nowrap">
                                  <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
                                    Completed Today
                                  </span>
                                </td>

                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedVisitSummary(item)}
                                    className="btn-secondary py-1.5 px-3 text-xs font-semibold inline-flex items-center gap-1.5 hover:border-brand/40 hover:text-brand transition-colors"
                                  >
                                    <Eye size={13} /> View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Accordion Cards View (<768px down to 320px) */}
                    <div className="block md:hidden divide-y divide-border">
                      {filteredCompletedTodayItems.map((item) => {
                        const patient = item.patient || {};
                        const patientName = formatPatientFullName(patient) || 'Patient';
                        
                        const formatTimingVal = (d) => {
                          if (!d) return '—';
                          const parsed = new Date(d);
                          if (isNaN(parsed.getTime())) return '—';
                          return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        };

                        const checkInStr = formatTimingVal(item.checkInTime);
                        const startStr = formatTimingVal(item.startTime);
                        const endStr = formatTimingVal(item.endTime);
                        const isExpanded = expandedCompletedTodayId === item.id;

                        return (
                          <div key={item.id} className="p-3.5 space-y-3 hover:bg-bg/40 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-ink text-sm truncate">{patientName}</span>
                                  <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                                    Completed Today
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono text-ink-soft flex-wrap">
                                  {patient.opNumber && <span className="font-bold text-brand">#{patient.opNumber}</span>}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVisitSummary(item);
                                  }}
                                  className="btn-secondary py-1 px-2.5 text-xs font-semibold inline-flex items-center gap-1"
                                >
                                  <Eye size={12} /> View
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => toggleExpandCompletedToday(item.id, e)}
                                  className="p-1.5 rounded-lg border border-border text-ink-soft hover:text-ink hover:bg-bg shrink-0"
                                  aria-label={isExpanded ? 'Collapse entry' : 'Expand entry'}
                                >
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="pt-2 border-t border-border/70 space-y-3 text-xs animate-in fade-in duration-150">
                                <div className="grid grid-cols-2 gap-2 text-ink-soft bg-bg/50 p-2.5 rounded-xl border border-border">
                                  <div>
                                    <span className="block text-[10px] font-semibold uppercase text-ink-soft">Contact</span>
                                    <span className="font-mono font-medium text-ink">{patient.primaryPhone || patient.phone || '—'}{patient.secondaryPhone ? ` / ${patient.secondaryPhone}` : ''}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[10px] font-semibold uppercase text-ink-soft">Reason</span>
                                    <span className="font-medium text-ink">{item.reason || 'General Visit'}</span>
                                  </div>
                                  <div className="col-span-2 space-y-0.5 font-mono text-[11px]">
                                    <span className="block text-[10px] font-semibold uppercase text-ink-soft font-sans">Timings</span>
                                    <div>Check-In: <span className="font-semibold text-ink">{checkInStr}</span></div>
                                    <div>Start: <span className="font-semibold text-ink">{startStr}</span> • End: <span className="font-bold text-emerald-700">{endStr}</span></div>
                                  </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedVisitSummary(item);
                                    }}
                                    className="btn-secondary w-full py-1.5 px-3 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                                  >
                                    <Eye size={13} /> View Completed Consultation Summary
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: ALL APPOINTMENTS LOG (HISTORY) */}
          {/* ========================================================================= */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Desktop Filter Bar (≥768px) */}
              <div className="hidden md:block card p-4 space-y-3 bg-surface border-border">
                <div className="flex flex-row items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
                    <input
                      type="text"
                      className="input-field pl-10 py-2 text-xs"
                      placeholder="Search by Patient Name, Phone Number, or OP Number..."
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

                <div className="grid grid-cols-4 gap-3 text-xs">
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

              {/* Mobile Collapsible Filter Accordion (<768px down to 320px) */}
              <div className="block md:hidden card p-3.5 bg-surface border border-border shadow-xs space-y-3 rounded-2xl max-w-full overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsMobileHistoryFilterOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-bold text-ink gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
                      <Filter size={14} />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="font-bold text-ink">Filters & Search</span>
                      {hasActiveHistoryFilters && (
                        <span className="badge bg-brand text-white text-[10px] py-0.5 px-2 font-bold shrink-0">
                          Active Filters
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-ink-soft font-semibold shrink-0">
                    <span>{isMobileHistoryFilterOpen ? 'Hide' : 'Filter'}</span>
                    {isMobileHistoryFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isMobileHistoryFilterOpen && (
                  <div className="pt-2 border-t border-border/70 space-y-3 animate-in fade-in duration-150 text-xs">
                    <div className="relative w-full">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                      <input
                        type="text"
                        className="input-field pl-9 py-1.5 text-xs w-full"
                        placeholder="Search history by name, phone, OP#..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <DatePicker
                        placeholder="From Date"
                        value={dateFrom}
                        onChange={(d, dStr) => setDateFrom(dStr)}
                        inputClassName="py-1.5 text-xs w-full"
                      />
                      <DatePicker
                        placeholder="To Date"
                        value={dateTo}
                        onChange={(d, dStr) => setDateTo(dStr)}
                        inputClassName="py-1.5 text-xs w-full"
                      />
                      <select
                        className="input-field py-1.5 text-xs font-semibold w-full"
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
                      <select
                        className="input-field py-1.5 text-xs font-semibold w-full"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">All Statuses</option>
                        <option value="Completed">Completed</option>
                        <option value="Missed">Missed</option>
                        <option value="No Show">No Show</option>
                      </select>
                    </div>

                    {hasActiveHistoryFilters && (
                      <button
                        onClick={handleResetHistoryFilters}
                        className="btn-secondary w-full py-1.5 text-xs text-rose-600 font-semibold flex items-center justify-center gap-1"
                      >
                        <X size={13} /> Clear Filters
                      </button>
                    )}
                  </div>
                )}
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
                  <>
                    {/* Desktop Table View (≥768px) */}
                    <div className="hidden md:block overflow-x-auto">
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
                            const patientName = formatPatientFullName(p) || 'Patient';
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

                    {/* Mobile Accordion Cards View (<768px down to 320px) */}
                    <div className="block md:hidden divide-y divide-border">
                      {filteredHistoryItems.map((item) => {
                        const p = item.patient || {};
                        const patientName = formatPatientFullName(p) || 'Patient';
                        const docObj = item.doctor || item.appointment?.doctor;
                        const docName = docObj?.name ? `Dr. ${docObj.name}` : 'Unassigned';
                        const dateStr = item.date
                          ? new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'N/A';
                        const isExpanded = expandedHistoryId === item.id;

                        return (
                          <div key={item.id} className="p-3.5 space-y-3 hover:bg-bg/40 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-ink text-sm truncate">{patientName}</span>
                                  <span className={`badge border text-[10px] font-bold py-0.5 px-2 shrink-0 ${STATUS_BADGE_CLASSES[item.status] || 'bg-slate-100 text-slate-800'}`}>
                                    {item.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono text-ink-soft flex-wrap">
                                  {p.opNumber && <span className="font-bold text-brand">#{p.opNumber}</span>}
                                  <span className="text-ink font-sans font-medium">• {dateStr}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => toggleExpandHistory(item.id, e)}
                                className="p-1.5 rounded-lg border border-border text-ink-soft hover:text-ink hover:bg-bg shrink-0 mt-0.5"
                                aria-label={isExpanded ? 'Collapse entry' : 'Expand entry'}
                              >
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="pt-2 border-t border-border/70 space-y-3 text-xs animate-in fade-in duration-150">
                                <div className="grid grid-cols-2 gap-2 text-ink-soft bg-bg/50 p-2.5 rounded-xl border border-border">
                                  <div>
                                    <span className="block text-[10px] font-semibold uppercase text-ink-soft">Doctor</span>
                                    <span className="font-semibold text-ink">{docName}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[10px] font-semibold uppercase text-ink-soft">Phone</span>
                                    <span className="font-mono font-medium text-ink">{p.primaryPhone || p.phone || '—'}{p.secondaryPhone ? ` / ${p.secondaryPhone}` : ''}</span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="block text-[10px] font-semibold uppercase text-ink-soft">Reason</span>
                                    <span className="font-medium text-ink">{item.reason || 'Consultation'}</span>
                                  </div>
                                </div>

                                <div className="pt-1 flex items-center justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedVisitSummary(item)}
                                    className="btn-secondary py-1.5 px-3 text-xs w-full justify-center font-semibold"
                                  >
                                    <Eye size={14} /> View Visit Summary
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
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
                {formatPatientFullName(cancellingAppointment.patient) || 'this patient'}
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
                {formatPatientFullName(noShowAppointment.patient) || 'this patient'}
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
      {/* COMPLETED CONSULTATION COMPLETE DETAILS MODAL */}
      {/* ========================================================================= */}
      <CompletedConsultationModal
        isOpen={Boolean(selectedVisitSummary)}
        item={selectedVisitSummary}
        onClose={() => setSelectedVisitSummary(null)}
      />

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

      {/* CONFIRM MODAL: NO SHOW */}
      <ConfirmModal
        isOpen={Boolean(noShowAppointment)}
        onClose={() => setNoShowAppointment(null)}
        onConfirm={handleConfirmNoShow}
        loading={Boolean(submittingId)}
        title="Confirm No Show"
        message={
          noShowAppointment ? (
            <span>
              Are you sure you want to mark the appointment for{' '}
              <strong className="text-ink font-bold">
                {formatPatientFullName(noShowAppointment.patient) || 'this patient'}
              </strong>{' '}
              as <strong className="text-amber-700 font-bold">No Show</strong>? Non-applicable actions will be disabled after updating.
            </span>
          ) : ''
        }
        confirmText="Mark as No Show"
        cancelText="Keep Appointment"
        variant="warning"
      />

      {/* CONFIRM MODAL: CANCEL */}
      <ConfirmModal
        isOpen={Boolean(cancellingAppointment)}
        onClose={() => setCancellingAppointment(null)}
        onConfirm={handleConfirmCancel}
        loading={Boolean(submittingId)}
        title="Confirm Cancellation"
        message={
          cancellingAppointment ? (
            <span>
              Are you sure you want to cancel the appointment for{' '}
              <strong className="text-ink font-bold">
                {formatPatientFullName(cancellingAppointment.patient) || 'this patient'}
              </strong>?
            </span>
          ) : ''
        }
        confirmText="Cancel Appointment"
        cancelText="Keep Appointment"
        variant="danger"
      />

      {/* CREATE APPOINTMENT MODAL */}
      <CreateAppointmentModal
        isOpen={isCreateAppointmentOpen}
        onClose={() => setIsCreateAppointmentOpen(false)}
        initialDoctorId={user?._id || user?.id}
        onSuccess={() => {
          setIsCreateAppointmentOpen(false);
          refreshAll();
        }}
      />
    </div>
  );
}
