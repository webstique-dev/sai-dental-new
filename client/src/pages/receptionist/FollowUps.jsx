import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays, Plus, Search, Calendar, Phone, CheckCircle2, UserCheck, X, Clock, AlertTriangle, User, List, ChevronDown, ChevronUp, Filter, XCircle, AlertCircle
} from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import SplitTimeInput from '../../components/common/SplitTimeInput.jsx';
import PatientSearchInput from '../../components/common/PatientSearchInput.jsx';
import AppointmentCalendar from '../../components/common/AppointmentCalendar.jsx';
import EditableCombobox from '../../components/common/EditableCombobox.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';
import { TableSkeleton } from '../../components/common/TableSkeleton.jsx';
import { TOOTH_CONDITIONS } from '../../constants/toothConditions.js';
import { FOLLOW_UP_REASONS } from '../../constants/followUpOptions.js';

const STATUS_BADGE_CLASSES = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  'No Show': 'bg-slate-100 text-slate-800 border-slate-200',
  Missed: 'bg-purple-100 text-purple-800 border-purple-200',
};

function getInitialTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  const strMinutes = String(minutes).padStart(2, '0');
  return `${strHours}:${strMinutes} ${ampm}`;
}

export default function FollowUps() {
  const { showSuccess, showError } = useNotification();

  const [followUps, setFollowUps] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & View Mode state
  const [activeTab, setActiveTab] = useState('Scheduled');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Add Follow-Up Form state
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [addFormData, setAddFormData] = useState({
    doctor: '',
    recommendedDate: new Date().toISOString().split('T')[0],
    time: getInitialTime(),
    reason: '',
    notes: '',
  });

  // Schedule Appointment Form state
  const [scheduleFormData, setScheduleFormData] = useState({
    doctor: '',
    date: new Date().toISOString().split('T')[0],
    time: getInitialTime(),
    type: 'Appointment',
    reason: '',
  });

  // Fetch doctors list on mount
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await api.get('/users/doctors');
        setDoctors(res.data?.doctors || []);
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    }
    fetchDoctors();
  }, []);

  // Fetch follow-up records
  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'All') {
        params.append('status', activeTab);
      }
      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      const res = await api.get(`/follow-ups?${params.toString()}`);
      setFollowUps(res.data?.followUps || []);
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFollowUps();
    }, 250);
    return () => clearTimeout(timer);
  }, [activeTab, search]);

  const selectPatient = async (patient) => {
    setSelectedPatient(patient);
    setErrorMessage('');
    if (!patient) {
      setAddFormData((prev) => ({ ...prev, doctor: '' }));
      return;
    }

    // Auto-suggest patient's most recent treating doctor
    try {
      const pId = patient._id || patient.id;
      const res = await api.get(`/follow-ups/patient-last-doctor/${pId}`);
      if (res.data?.doctor) {
        const docId = res.data.doctor._id || res.data.doctor.id;
        setAddFormData((prev) => ({ ...prev, doctor: docId }));
      }
    } catch (err) {
      console.error('Failed to fetch last doctor for patient:', err);
    }
  };

  const resetAddModal = () => {
    setShowAddModal(false);
    setSelectedPatient(null);
    setErrorMessage('');
    setAddFormData({
      doctor: '',
      recommendedDate: new Date().toISOString().split('T')[0],
      time: getInitialTime(),
      reason: '',
      notes: '',
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedPatient) {
      const msg = 'Please search and select a patient.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    if (!addFormData.doctor) {
      const msg = 'Assigned doctor is required.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    if (!addFormData.recommendedDate) {
      const msg = 'Follow-Up Date is required.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    if (!addFormData.time) {
      const msg = 'Follow-Up Time is required.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    if (!addFormData.reason || !addFormData.reason.trim()) {
      const msg = 'Reason / Procedure is required.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patient: selectedPatient._id || selectedPatient.id,
        ...addFormData,
      };

      await api.post('/follow-ups', payload);
      showSuccess('Follow-up scheduled and appointment created successfully!');
      resetAddModal();
      fetchFollowUps();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create follow-up appointment.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openScheduleModal = async (item) => {
    setSchedulingFollowUp(item);
    setErrorMessage('');
    const recDate = item.recommendedDate
      ? new Date(item.recommendedDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    let initialDoctor = item.doctor?._id || item.doctor?.id || (typeof item.doctor === 'string' ? item.doctor : '');

    // If doctor is unassigned, auto-suggest last treating doctor
    if (!initialDoctor && item.patient) {
      const pId = item.patient._id || item.patient.id || item.patient;
      try {
        const res = await api.get(`/follow-ups/patient-last-doctor/${pId}`);
        if (res.data?.doctor) {
          initialDoctor = res.data.doctor._id || res.data.doctor.id;
        }
      } catch (err) {
        console.error('Failed to fetch last doctor:', err);
      }
    }

    setScheduleFormData({
      doctor: initialDoctor || (doctors[0]?._id || doctors[0]?.id || ''),
      date: recDate,
      time: getInitialTime(),
      type: 'Appointment',
      reason: item.reason || 'Follow-Up Consultation',
    });
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!schedulingFollowUp) return;

    if (!scheduleFormData.doctor) {
      const msg = 'Doctor selection is required to book an appointment.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setSubmitting(true);
    try {
      const followUpId = schedulingFollowUp._id || schedulingFollowUp.id;
      await api.post(`/follow-ups/${followUpId}/schedule`, scheduleFormData);

      showSuccess('Appointment booked successfully and follow-up status updated to Scheduled!');
      setSchedulingFollowUp(null);
      fetchFollowUps();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to schedule follow-up appointment.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Real-Time Socket Event Listeners
  useSocketEvent('APPOINTMENT_UPDATED', () => fetchFollowUps());
  useSocketEvent('QUEUE_UPDATED', () => fetchFollowUps());
  useSocketEvent('CONSULTATION_STARTED', () => fetchFollowUps());
  useSocketEvent('CONSULTATION_COMPLETED', () => fetchFollowUps());
  useSocketEvent('PATIENT_UPDATED', () => fetchFollowUps());

  // Check-In and Cancellation State & Handlers
  const [checkingInId, setCheckingInId] = useState(null);
  const [cancellingFollowUp, setCancellingFollowUp] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelModalError, setCancelModalError] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const handleCheckInFollowUp = async (followUpId) => {
    if (!followUpId) return;
    try {
      setCheckingInId(followUpId);
      await api.post(`/follow-ups/${followUpId}/check-in`);
      showSuccess('Patient checked in successfully! Added to live queue.');
      fetchFollowUps();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to check in follow-up.');
    } finally {
      setCheckingInId(null);
    }
  };

  const openCancelModal = (item) => {
    setCancellingFollowUp(item);
    setCancellationReason('');
    setCancelModalError('');
  };

  const handleCancelSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!cancellingFollowUp) return;

    const reasonTrimmed = cancellationReason.trim();
    if (!reasonTrimmed) {
      setCancelModalError('Please enter a cancellation reason.');
      return;
    }

    try {
      setCancelSubmitting(true);
      setCancelModalError('');
      const targetId = cancellingFollowUp._id || cancellingFollowUp.id;
      await api.post(`/follow-ups/${targetId}/cancel`, {
        cancellationReason: reasonTrimmed,
      });

      showSuccess('Follow-up cancelled successfully.');
      setCancellingFollowUp(null);
      setCancellationReason('');
      fetchFollowUps();
    } catch (err) {
      setCancelModalError(err.response?.data?.message || 'Failed to cancel follow-up.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
        {/* Header & Primary Action */}
        <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between w-full max-w-full">
          <div className="space-y-1 min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-bold text-ink">Follow-Up Reminders</h2>
            <p className="text-xs sm:text-sm text-ink-soft leading-relaxed break-words">
              Directly schedule follow-up appointments and track patient visits
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto shrink-0">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl border border-border bg-surface p-1 shadow-2xs justify-center shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'list' ? 'bg-brand text-white shadow-xs' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <List size={15} /> List View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'calendar' ? 'bg-brand text-white shadow-xs' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <CalendarDays size={15} /> Calendar View
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="btn-primary w-full sm:w-auto justify-center text-xs sm:text-sm py-2 px-3.5 shrink-0"
            >
              <Plus size={18} />
              <span>Add Follow-Up Appointment</span>
            </button>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <AppointmentCalendar
            calendarDate={calendarDate}
            setCalendarDate={setCalendarDate}
            appointments={followUps.map((fu) => ({
              _id: fu._id || fu.id,
              date: fu.recommendedDate,
              time: fu.scheduledAppointment?.time || '10:00 AM',
              status: fu.status,
              patient: fu.patient,
              doctor: fu.createdBy || { name: 'Staff Doctor' },
            }))}
            allowEdit={true}
            onEdit={(fuApt) => {
              const matched = followUps.find((f) => (f._id || f.id) === fuApt._id);
              if (matched && matched.status === 'Pending') {
                openScheduleModal(matched);
              }
            }}
          />
        ) : (
          <>

        {/* Desktop View Filters (≥768px) */}
        <div className="hidden md:flex flex-row items-center justify-between gap-3 w-full max-w-full min-w-0">
          {/* Status Filter Tabs */}
          <div className="overflow-x-auto scrollbar-none no-scrollbar py-0.5 max-w-full">
            <div className="inline-flex items-center gap-1 bg-surface border border-border p-1 rounded-2xl whitespace-nowrap min-w-max">
              {['All', 'Scheduled', 'Pending', 'Checked-In', 'Completed', 'Missed', 'Cancelled'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    activeTab === tab
                      ? 'bg-brand text-white shadow-xs'
                      : 'text-ink-soft hover:text-ink hover:bg-bg'
                  }`}
                >
                  {tab === 'Pending' ? 'Pending Callbacks' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-72 min-w-0 shrink-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft shrink-0" />
            <input
              type="text"
              className="input-field pl-9 py-1.5 text-xs w-full min-w-0 truncate"
              placeholder="Search by Patient Name, Phone Number, or OP Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Mobile Collapsible Filter Accordion (<768px) */}
        <div className="block md:hidden card p-3 bg-surface border border-border shadow-xs space-y-3 rounded-2xl max-w-full overflow-hidden">
          {/* Accordion Header Toggle */}
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-bold text-ink gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
                <Filter size={14} />
              </div>
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="font-bold text-ink">Filters & Search</span>
                {(activeTab !== 'All' || search) && (
                  <span className="badge bg-brand text-white text-[10px] py-0.5 px-2 font-bold shrink-0">
                    Active Filter: {activeTab === 'Pending' ? 'Pending Callbacks' : activeTab}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-ink-soft font-semibold shrink-0">
              <span>{isFilterOpen ? 'Hide' : 'Filter & Search'}</span>
              {isFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {/* Collapsible Content */}
          {isFilterOpen && (
            <div className="pt-2 border-t border-border/70 space-y-3 animate-in fade-in duration-150">
              {/* Search Bar */}
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft shrink-0" />
                <input
                  type="text"
                  className="input-field pl-9 py-2 text-xs w-full"
                  placeholder="Search Patient Name, Phone, or OP..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Tabs Bar - Responsive & Adaptable Wrap Pills */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                    Status Filter
                  </span>
                  {activeTab !== 'All' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('All')}
                      className="text-[10px] font-bold text-brand hover:underline"
                    >
                      Reset to All
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {['All', 'Scheduled', 'Pending', 'Checked-In', 'Completed', 'Missed', 'Cancelled'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                        activeTab === tab
                          ? 'bg-brand text-white shadow-xs font-bold'
                          : 'bg-bg text-ink-soft hover:text-ink border border-border hover:bg-surface'
                      }`}
                    >
                      {tab === 'Pending' ? 'Pending Callbacks' : tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Follow-Up Records Table / Cards */}
        <div className="card overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : followUps.length === 0 ? (
            <div className="p-8 sm:p-12 text-center space-y-3">
              <CalendarDays size={36} className="mx-auto text-ink-soft/40" />
              <p className="font-display text-base font-semibold text-ink">No follow-ups found</p>
              <p className="text-xs text-ink-soft">
                {activeTab === 'Pending'
                  ? 'No pending recall callbacks scheduled.'
                  : 'Try adjusting your search or tab filter.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View (≥768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Follow-Up Date</th>
                      <th className="px-5 py-3.5">Patient Details</th>
                      <th className="px-5 py-3.5">Assigned Doctor</th>
                      <th className="px-5 py-3.5">Reason / Procedure</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Scheduled Appt</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {followUps.map((item) => {
                      const itemId = item._id || item.id;
                      const patient = item.patient || {};
                      const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';
                      const isPending = item.status === 'Pending';
                      const docObj = item.doctor || item.scheduledAppointment?.doctor;
                      const recDateStr = item.recommendedDate
                        ? new Date(item.recommendedDate).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'N/A';

                      return (
                        <tr key={itemId} className="hover:bg-bg/40 transition-colors">
                          <td className="px-5 py-4 whitespace-nowrap font-bold text-ink">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={14} className="text-brand shrink-0" />
                              <span>{recDateStr}</span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-semibold text-ink text-sm">{patientName}</div>
                            <div className="flex items-center gap-2 text-ink-soft text-[11px] mt-0.5">
                              {patient.opNumber && (
                                <span className="font-mono font-bold text-brand">{patient.opNumber}</span>
                              )}
                              {(patient.primaryPhone || patient.phone) && (
                                <span className="flex items-center gap-1">
                                  <Phone size={11} /> {patient.primaryPhone || patient.phone}{patient.secondaryPhone ? ` / ${patient.secondaryPhone}` : ''}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            {docObj ? (
                              <span className="font-medium text-ink">Dr. {docObj.name}</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Unassigned
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 font-medium text-ink max-w-xs">
                            {item.reason}
                            {item.notes && <span className="block text-[11px] text-ink-soft italic font-normal">{item.notes}</span>}
                          </td>

                          <td className="px-5 py-4">
                            <span className={`badge border ${STATUS_BADGE_CLASSES[item.status] || 'bg-slate-100 text-slate-800'}`}>
                              {item.status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-ink-soft">
                            {item.scheduledAppointment ? (
                              <div className="space-y-0.5">
                                <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block text-[11px] w-fit">
                                  {new Date(item.scheduledAppointment.date).toLocaleDateString()} @ {item.scheduledAppointment.time || '—'}
                                </span>
                                {item.scheduledAppointment.doctor && (
                                  <span className="text-[10px] block">
                                    Dr. {item.scheduledAppointment.doctor.name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>

                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {['Scheduled', 'Pending'].includes(item.status) && (
                                <button
                                  type="button"
                                  disabled={checkingInId === (item._id || item.id)}
                                  onClick={() => handleCheckInFollowUp(item._id || item.id)}
                                  className="btn-primary py-1 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 shadow-2xs"
                                  title="Check In patient for visit"
                                >
                                  <UserCheck size={13} />
                                  <span>{checkingInId === (item._id || item.id) ? '...' : 'Check-In'}</span>
                                </button>
                              )}

                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => openScheduleModal(item)}
                                  className="btn-primary text-xs py-1 px-2.5 inline-flex items-center gap-1 shadow-2xs"
                                >
                                  <UserCheck size={13} /> Schedule Appt
                                </button>
                              )}

                              {!['Completed', 'Cancelled'].includes(item.status) && (
                                <button
                                  type="button"
                                  onClick={() => openCancelModal(item)}
                                  className="btn-secondary py-1 px-2.5 text-xs font-bold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 inline-flex items-center gap-1 shadow-2xs"
                                  title="Cancel Follow-Up"
                                >
                                  <XCircle size={13} className="text-rose-600" />
                                  <span>Cancel</span>
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

              {/* Mobile Accordion Cards View (<768px down to 320px) */}
              <div className="block md:hidden divide-y divide-border">
                {followUps.map((item) => {
                  const itemId = item._id || item.id;
                  const patient = item.patient || {};
                  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';
                  const isPending = item.status === 'Pending';
                  const docObj = item.doctor || item.scheduledAppointment?.doctor;
                  const isExpanded = expandedId === itemId;

                  const recDateStr = item.recommendedDate
                    ? new Date(item.recommendedDate).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'N/A';

                  return (
                    <div key={itemId} className="p-3.5 space-y-2.5 hover:bg-bg/40 transition-colors w-full max-w-full overflow-hidden">
                      {/* Collapsed Header */}
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 space-y-1 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-ink text-sm truncate max-w-[180px] sm:max-w-full">{patientName}</span>
                            <span className={`badge border text-[10px] font-bold py-0.5 px-2 shrink-0 ${STATUS_BADGE_CLASSES[item.status] || 'bg-slate-100 text-slate-800'}`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs flex-wrap font-mono">
                            <span className="font-bold text-brand">{recDateStr}</span>
                            {patient.opNumber && <span className="text-ink-soft font-semibold">• #{patient.opNumber}</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => toggleExpand(itemId, e)}
                          className="p-1.5 rounded-lg border border-border text-ink-soft hover:text-ink hover:bg-bg shrink-0 mt-0.5"
                          aria-label={isExpanded ? 'Collapse follow-up details' : 'Expand follow-up details'}
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-border/70 space-y-3 text-xs animate-in fade-in duration-150">
                          <div className="grid grid-cols-2 gap-2 text-ink-soft bg-bg/50 p-2.5 rounded-xl border border-border">
                            <div>
                              <span className="block text-[10px] font-semibold text-ink-soft uppercase">Assigned Doctor</span>
                              <span className="font-semibold text-ink">{docObj ? `Dr. ${docObj.name}` : 'Unassigned'}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-semibold text-ink-soft uppercase">Phone</span>
                              <span className="font-medium text-ink font-mono">{patient.primaryPhone || patient.phone || '—'}{patient.secondaryPhone ? ` / ${patient.secondaryPhone}` : ''}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="block text-[10px] font-semibold text-ink-soft uppercase">Reason / Procedure</span>
                              <span className="font-medium text-ink">{item.reason || '—'}</span>
                              {item.notes && <span className="block text-[11px] text-ink-soft italic">{item.notes}</span>}
                            </div>
                            {item.scheduledAppointment && (
                              <div className="col-span-2 text-emerald-800 font-medium bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                                Scheduled Visit: <strong>{new Date(item.scheduledAppointment.date).toLocaleDateString()} @ {item.scheduledAppointment.time || '—'}</strong>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="pt-1 flex items-center justify-end gap-2 flex-wrap">
                            {['Scheduled', 'Pending'].includes(item.status) && (
                              <button
                                type="button"
                                disabled={checkingInId === itemId}
                                onClick={() => handleCheckInFollowUp(itemId)}
                                className="btn-primary py-1.5 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex-1 justify-center flex items-center gap-1"
                              >
                                <UserCheck size={14} /> {checkingInId === itemId ? 'Checking In...' : 'Check-In'}
                              </button>
                            )}
                            {isPending && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openScheduleModal(item);
                                }}
                                className="btn-primary py-1.5 px-3 text-xs flex-1 justify-center font-bold flex items-center gap-1"
                              >
                                <UserCheck size={14} /> Schedule Appt
                              </button>
                            )}
                            {!['Completed', 'Cancelled'].includes(item.status) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCancelModal(item);
                                }}
                                className="btn-secondary py-1.5 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 border-rose-200 flex-1 justify-center flex items-center gap-1"
                              >
                                <XCircle size={14} className="text-rose-600" /> Cancel
                              </button>
                            )}
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
      </>
      )}
      </div>

      {/* ADD FOLLOW-UP MODAL */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden !mt-0">
          <div className="card w-full max-w-lg max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Plus size={18} className="text-brand" /> Add Follow-Up Appointment
              </h3>
              <button onClick={resetAddModal} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Patient Search */}
                <PatientSearchInput
                  selectedPatient={selectedPatient}
                  onSelect={selectPatient}
                  required
                />

                {/* Assigned Doctor (Required) */}
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Assigned Doctor <span className="text-rose-600">*</span>
                  </label>
                  <select
                    required
                    className="input-field text-xs"
                    value={addFormData.doctor}
                    onChange={(e) => setAddFormData((prev) => ({ ...prev, doctor: e.target.value }))}
                  >
                    <option value="">Select Doctor *</option>
                    {doctors.map((d) => (
                      <option key={d._id || d.id} value={d._id || d.id}>
                        Dr. {d.name} ({d.specialization || 'Dental Specialist'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Follow-Up Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <DatePicker
                      label="Follow-Up Date *"
                      value={addFormData.recommendedDate}
                      onChange={(date, dateStr) => setAddFormData((prev) => ({ ...prev, recommendedDate: dateStr }))}
                      minDate={new Date()}
                    />
                  </div>

                  <div>
                    <SplitTimeInput
                      label="Time *"
                      value={addFormData.time}
                      onChange={(time12) => setAddFormData((prev) => ({ ...prev, time: time12 }))}
                    />
                  </div>
                </div>

                {/* Reason / Procedure */}
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Reason / Procedure <span className="text-rose-600">*</span>
                  </label>
                  <EditableCombobox
                    required
                    options={TOOTH_CONDITIONS}
                    placeholder="e.g. Caries, RCT, Crown, Mobility..."
                    value={addFormData.reason}
                    onChange={(val) => setAddFormData((prev) => ({ ...prev, reason: val }))}
                    inputClassName="text-xs"
                  />
                </div>

                {/* Notes (Optional) */}
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Notes <span className="font-normal text-ink-soft/70">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    className="input-field text-xs"
                    placeholder="Additional notes for doctor or staff..."
                    value={addFormData.notes}
                    onChange={(e) => setAddFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button type="button" className="btn-secondary text-xs" onClick={resetAddModal}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? 'Scheduling...' : 'Schedule Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* SCHEDULE APPOINTMENT MODAL (FOR PENDING ROWS) */}
      {schedulingFollowUp && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden !mt-0">
          <div className="card w-full max-w-md max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <UserCheck size={18} className="text-brand" /> Schedule Follow-Up Appointment
              </h3>
              <button onClick={() => setSchedulingFollowUp(null)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-bg border border-border space-y-1">
                  <span className="text-[10px] font-bold uppercase text-ink-soft block">Patient</span>
                  <span className="font-bold text-ink text-sm">
                    {schedulingFollowUp.patient?.firstName} {schedulingFollowUp.patient?.lastName}
                  </span>
                  <span className="text-xs text-brand font-mono font-bold block">{schedulingFollowUp.patient?.opNumber}</span>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Assign Doctor <span className="text-rose-600">*</span>
                  </label>
                  <select
                    required
                    className="input-field text-xs"
                    value={scheduleFormData.doctor}
                    onChange={(e) => setScheduleFormData((prev) => ({ ...prev, doctor: e.target.value }))}
                  >
                    <option value="">Select Doctor *</option>
                    {doctors.map((d) => (
                      <option key={d._id || d.id} value={d._id || d.id}>
                        Dr. {d.name} ({d.specialization || 'Dental Specialist'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <DatePicker
                      label="Date *"
                      value={scheduleFormData.date}
                      onChange={(date, dateStr) => setScheduleFormData((prev) => ({ ...prev, date: dateStr }))}
                    />
                  </div>

                  <div>
                    <SplitTimeInput
                      label="Time *"
                      value={scheduleFormData.time}
                      onChange={(time12) => setScheduleFormData((prev) => ({ ...prev, time: time12 }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Reason / Notes</label>
                  <EditableCombobox
                    options={TOOTH_CONDITIONS}
                    placeholder="e.g. Suture removal, RCT follow-up, Mobility..."
                    value={scheduleFormData.reason}
                    onChange={(val) => setScheduleFormData((prev) => ({ ...prev, reason: val }))}
                    inputClassName="text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setSchedulingFollowUp(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? 'Scheduling...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CANCELLATION CONFIRMATION MODAL (REASON REQUIRED) */}
      {cancellingFollowUp && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-3 sm:p-4 backdrop-blur-xs overflow-hidden !mt-0 animate-fadeIn">
          <div className="card w-full max-w-md bg-surface p-5 sm:p-6 shadow-2xl border border-border space-y-4 rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">Cancel Follow-Up</h3>
                  <p className="text-xs text-ink-soft">
                    Please provide a reason to confirm the cancellation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellingFollowUp(null)}
                className="p-1 rounded-lg text-ink-soft hover:text-ink hover:bg-bg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {cancelModalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <span>{cancelModalError}</span>
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="space-y-1.5 text-xs">
                <label className="block font-bold text-ink">
                  Reason for Cancellation <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  className="input-field w-full text-xs py-2"
                  placeholder="e.g. Patient called to cancel, patient rescheduled, symptoms resolved..."
                  value={cancellationReason}
                  onChange={(e) => {
                    setCancellationReason(e.target.value);
                    if (cancelModalError) setCancelModalError('');
                  }}
                  autoFocus
                />
                <p className="text-[11px] text-ink-soft">
                  * A valid cancellation reason is required to maintain audit records.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCancellingFollowUp(null)}
                  disabled={cancelSubmitting}
                  className="btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  Keep Follow-Up
                </button>
                <button
                  type="submit"
                  disabled={cancelSubmitting || !cancellationReason.trim()}
                  className="btn-primary py-2 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle size={14} />
                  <span>{cancelSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
