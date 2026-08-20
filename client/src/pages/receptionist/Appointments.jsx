import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays, List, Plus, Search, Filter, X, CheckCircle2, AlertTriangle,
  Clock, UserCheck, UserX, Trash2, Edit3, RefreshCw, ChevronRight,
} from 'lucide-react';
import api from '../../api/axios.js';
import AppointmentList from '../../components/common/AppointmentList.jsx';
import AppointmentCalendar from '../../components/common/AppointmentCalendar.jsx';
import PatientSearchInput from '../../components/common/PatientSearchInput.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import SplitTimeInput from '../../components/common/SplitTimeInput.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

// Helper to get today's date & exact current system time in 12-hour AM/PM format
function getInitialExactDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  let rawH = now.getHours();
  let m = now.getMinutes();
  const period = rawH >= 12 ? 'PM' : 'AM';
  let h12 = rawH % 12 === 0 ? 12 : rawH % 12;

  const hourStr = String(h12).padStart(2, '0');
  const minStr = String(m).padStart(2, '0');
  const timeStr = `${hourStr}:${minStr} ${period}`;

  return { dateStr, timeStr };
}

const TIME_SLOT_OPTIONS = [];
for (let h = 7; h <= 21; h++) {
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const hStr = String(h12).padStart(2, '0');
  for (let m of [0, 15, 30, 45]) {
    if (h === 21 && m > 0) break;
    const mStr = String(m).padStart(2, '0');
    TIME_SLOT_OPTIONS.push(`${hStr}:${mStr} ${period}`);
  }
}

// Status options permitted for receptionist edit modal
const RECEPTIONIST_STATUS_OPTIONS = [
  'Scheduled',
  'Checked-In',
  'Cancelled',
  'No Show',
  'Missed',
];

const ALL_STATUS_OPTIONS = [
  'Scheduled',
  'Checked-In',
  'In Consultation',
  'Completed',
  'Cancelled',
  'No Show',
  'Missed',
];

const STATUS_BADGE_CLASSES = {
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  'No Show': 'bg-slate-100 text-slate-800 border-slate-200',
  Missed: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function Appointments() {
  const { showSuccess, showError } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();

  // Main view state
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [primaryDoctor, setPrimaryDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilterPreset, setDateFilterPreset] = useState('today'); // 'all' | 'today' | 'upcoming' | 'custom'
  const [dateFilter, setDateFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [cancellingAppointment, setCancellingAppointment] = useState(null);
  const [checkingInAppointment, setCheckingInAppointment] = useState(null);
  const [noShowAppointment, setNoShowAppointment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Create Form state (Status defaults to Check-in / Checked-In)
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [formData, setFormData] = useState({
    patient: '',
    doctor: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:30',
    type: 'Walk-In',
    reason: '',
    status: 'Checked-In',
  });

  // Edit Form state
  const [editFormData, setEditFormData] = useState({
    doctor: '',
    date: '',
    time: '',
    type: 'Walk-In',
    reason: '',
    status: 'Scheduled',
  });

  // Calendar View Month/Week navigation helper
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Fetch doctors on mount
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await api.get('/users/doctors');
        const docList = res.data?.doctors || [];
        const primId = res.data?.primaryDoctorId;
        const primDoc = docList.find((d) => (d._id || d.id)?.toString() === primId?.toString())
                     || docList.find((d) => d.isPrimary)
                     || docList[0];
        setDoctors(docList);
        setPrimaryDoctor(primDoc || null);
        if (primDoc) {
          const pId = primDoc._id || primDoc.id;
          setFormData((prev) => ({ ...prev, doctor: prev.doctor || pId }));
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    }
    fetchDoctors();
  }, []);

  // Auto-open create modal if redirected from patient registration
  useEffect(() => {
    if (location.state?.autoOpenCreate && location.state?.newPatient) {
      const p = location.state.newPatient;
      setSelectedPatient(p);
      setPatientSearch(`${p.firstName || ''} ${p.lastName || ''}`.trim());
      const primDocId = primaryDoctor ? (primaryDoctor._id || primaryDoctor.id) : (doctors[0]?._id || doctors[0]?.id || '');
      const { dateStr, timeStr } = getInitialExactDateTime();
      setFormData({
        patient: p._id,
        doctor: primDocId,
        date: dateStr,
        time: timeStr,
        type: 'Appointment',
        reason: '',
        status: 'Checked-In',
      });
      setShowCreateModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, doctors, primaryDoctor, navigate]);

  // Fetch appointments based on filters
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (doctorFilter) params.append('doctor', doctorFilter);
      if (statusFilter) params.append('status', statusFilter);

      if (dateFilterPreset === 'today') {
        params.append('dateFilterPreset', 'today');
      } else if (dateFilterPreset === 'upcoming') {
        params.append('dateFilterPreset', 'upcoming');
      } else if (dateFilterPreset === 'custom' && dateFilter) {
        params.append('date', dateFilter);
      }

      const res = await api.get(`/appointments?${params.toString()}`);
      setAppointments(res.data?.appointments || []);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAppointments();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, dateFilterPreset, dateFilter, doctorFilter, statusFilter]);

  // Live patient search inside create modal
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

  const openCreateModal = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    const primDocId = primaryDoctor ? (primaryDoctor._id || primaryDoctor.id) : (doctors[0]?._id || doctors[0]?.id || '');
    const { dateStr, timeStr } = getInitialExactDateTime();
    setFormData({
      patient: '',
      doctor: primDocId,
      date: dateStr,
      time: timeStr,
      type: 'Appointment',
      reason: '',
      status: 'Checked-In',
    });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      const msg = 'Please search and select a patient.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    const docId = formData.doctor || (primaryDoctor ? (primaryDoctor._id || primaryDoctor.id) : (doctors[0]?._id || doctors[0]?.id || ''));
    if (!docId) {
      const msg = 'Please select an assigned doctor.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    try {
      const payload = {
        ...formData,
        doctor: docId,
        patient: selectedPatient._id,
        status: formData.status || 'Checked-In',
      };
      await api.post('/appointments', payload);
      const successMsg = formData.status === 'Scheduled'
        ? 'Appointment booked as Scheduled!'
        : 'Appointment checked in & sent directly to doctor queue as Checked-In!';
      showSuccess(successMsg);
      setShowCreateModal(false);
      fetchAppointments();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create appointment';
      showError(msg);
      setErrorMessage(msg);
    }
  };

  const openEditModal = (apt) => {
    setEditingAppointment(apt);
    setEditFormData({
      doctor: apt.doctor?._id || apt.doctor?.id || '',
      date: apt.date ? new Date(apt.date).toISOString().split('T')[0] : '',
      time: apt.time || '',
      type: apt.type || 'Appointment',
      reason: apt.reason || '',
      status: RECEPTIONIST_STATUS_OPTIONS.includes(apt.status) ? apt.status : 'Scheduled',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAppointment) return;
    try {
      await api.patch(`/appointments/${editingAppointment._id}`, editFormData);
      showSuccess('Appointment updated successfully!');
      setEditingAppointment(null);
      fetchAppointments();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update appointment');
    }
  };

  const handleCheckInAppointment = async (apt) => {
    setActionLoading(true);
    try {
      await api.patch(`/queue/${apt._id}/check-in`);
      showSuccess(`Patient ${apt.patient?.firstName || ''} checked in successfully! Added to queue.`);
      setCheckingInAppointment(null);
      fetchAppointments();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to check in appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkNoShow = async (apt) => {
    setActionLoading(true);
    try {
      await api.patch(`/appointments/${apt._id}`, { status: 'No Show' });
      showSuccess('Appointment marked as No Show.');
      setNoShowAppointment(null);
      fetchAppointments();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmCancelAppointment = async () => {
    if (!cancellingAppointment) return;
    setActionLoading(true);
    try {
      await api.delete(`/appointments/${cancellingAppointment._id}`);
      showSuccess('Appointment cancelled successfully.');
      setCancellingAppointment(null);
      fetchAppointments();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel appointment');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for formatting date display
  const formatDateDisplay = (dStr) => {
    if (!dStr) return 'N/A';
    return new Date(dStr).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Appointments Directory</h2>
          <p className="text-sm text-ink-soft">Complete scheduling records and patient appointments</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl border border-border bg-surface p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'list' ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <List size={15} /> List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'calendar' ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <CalendarDays size={15} /> Calendar
            </button>
          </div>

          <button onClick={openCreateModal} className="btn-primary">
            <Plus size={18} />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>


      {/* Filter Bar */}
      <div className="card p-4 space-y-3">
        {/* Preset Date Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-1.5 bg-bg p-1 rounded-xl border border-border">
            <button
              onClick={() => {
                setDateFilterPreset('today');
                setDateFilter('');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                dateFilterPreset === 'today' ? 'bg-brand text-white shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                setDateFilterPreset('upcoming');
                setDateFilter('');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                dateFilterPreset === 'upcoming' ? 'bg-brand text-white shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => {
                setDateFilterPreset('all');
                setDateFilter('');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                dateFilterPreset === 'all' ? 'bg-brand text-white shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              All Dates
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-ink-soft font-medium">Filtered count:</span>
            <span className="font-bold text-ink font-mono bg-bg px-2.5 py-1 rounded-lg border border-border">
              {appointments.length} Records
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              autoComplete="off"
              className="input-field pl-9 py-2 text-xs"
              placeholder="Search by Patient Name, Phone Number, or OP Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Specific Date Filter */}
          <div className="w-full">
            <DatePicker
              value={dateFilter}
              onChange={(date, dateStr) => {
                setDateFilter(dateStr);
                if (dateStr) {
                  setDateFilterPreset('custom');
                }
              }}
              placeholder="Select Specific Date"
              inputClassName="py-1 text-xs"
            />
          </div>

          {/* Doctor Filter */}
          <div>
            <select
              className="input-field py-2 text-xs font-medium"
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
            >
              <option value="">All Doctors</option>
              {doctors.map((d) => {
                const docId = d._id || d.id;
                return (
                  <option key={docId} value={docId}>
                    Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="input-field py-2 text-xs font-medium"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {ALL_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW: LIST */}
      {viewMode === 'list' && (
        <div className="card overflow-hidden">
          <AppointmentList
            appointments={appointments}
            loading={loading}
            allowEdit={true}
            allowCancel={true}
            onEdit={openEditModal}
            onCancel={(apt) => setCancellingAppointment(apt)}
            onCheckIn={(apt) => setCheckingInAppointment(apt)}
            onNoShow={(apt) => setNoShowAppointment(apt)}
            statusBadgeClasses={STATUS_BADGE_CLASSES}
            formatDateDisplay={formatDateDisplay}
          />
        </div>
      )}

      {/* VIEW: CALENDAR */}
      {viewMode === 'calendar' && (
        <AppointmentCalendar
          calendarDate={calendarDate}
          setCalendarDate={setCalendarDate}
          appointments={appointments}
          allowEdit={true}
          onEdit={openEditModal}
          statusBadgeClasses={STATUS_BADGE_CLASSES}
        />
      )}
      </div>

      {/* CREATE APPOINTMENT MODAL (Status input removed completely) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-3.5 bg-surface shrink-0">
              <h3 className="font-display text-base sm:text-lg font-bold text-ink">Book New Appointment</h3>
              <button onClick={() => setShowCreateModal(false)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} autoComplete="off" className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5">
                {/* Patient Selector */}
                <PatientSearchInput
                  selectedPatient={selectedPatient}
                  onSelect={setSelectedPatient}
                  required
                />

                {/* Doctor Selector */}
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Assigned Doctor</label>
                  <select
                    className="input-field font-semibold bg-surface"
                    value={formData.doctor || (primaryDoctor ? (primaryDoctor._id || primaryDoctor.id) : (doctors[0]?._id || doctors[0]?.id || ''))}
                    onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                  >
                    {doctors.map((d) => {
                      const docId = d._id || d.id;
                      const isPrimaryDoc = primaryDoctor && (primaryDoctor._id || primaryDoctor.id)?.toString() === docId?.toString();
                      return (
                        <option key={docId} value={docId}>
                          Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''} {isPrimaryDoc ? '• Primary Doctor' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Status / Initial Action */}
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Appointment Status / Action <span className="text-rose-600">*</span>
                  </label>
                  <select
                    className="input-field font-semibold"
                    value={formData.status || 'Checked-In'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Checked-In">Check-in</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                  <p className="text-[11px] text-ink-soft mt-1">
                    {formData.status === 'Scheduled'
                      ? 'Will appear under Scheduled appointments.'
                      : 'Status will be set to Checked-In and sent directly to the doctor queue.'}
                  </p>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <DatePicker
                      label="Date"
                      value={formData.date}
                      onChange={(date, dateStr) => setFormData({ ...formData, date: dateStr })}
                    />
                  </div>
                  <div>
                    <SplitTimeInput
                      label="Time"
                      value={formData.time}
                      onChange={(time12) => setFormData({ ...formData, time: time12 })}
                    />
                  </div>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Booking Source / Type</label>
                  <select
                    className="input-field"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Walk-In">Walk-In</option>
                    <option value="Phone Booking">Phone Booking</option>
                    <option value="Online Booking">Online Booking</option>
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Reason for Visit</label>
                  <input
                    type="text"
                    autoComplete="off"
                    className="input-field"
                    placeholder="e.g. Toothache, Scaling, Root Canal follow-up"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / RESCHEDULE MODAL */}
      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-lg max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base sm:text-lg font-bold text-ink">
                Reschedule / Update Appointment
              </h3>
              <button onClick={() => setEditingAppointment(null)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} autoComplete="off" className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5">
                <div className="rounded-xl bg-bg p-3 text-xs">
                  <span className="text-ink-soft font-semibold block">Patient</span>
                  <span className="font-bold text-ink text-sm">
                    {editingAppointment.patient?.firstName} {editingAppointment.patient?.lastName}
                  </span>{' '}
                  <span className="text-brand font-mono">({editingAppointment.patient?.opNumber})</span>
                </div>

                {/* Doctor */}
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Assigned Doctor</label>
                  <select
                    className="input-field"
                    value={editFormData.doctor}
                    onChange={(e) => setEditFormData({ ...editFormData, doctor: e.target.value })}
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((d) => {
                      const docId = d._id || d.id;
                      return (
                        <option key={docId} value={docId}>
                          Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <DatePicker
                      label="Date"
                      value={editFormData.date}
                      onChange={(date, dateStr) => setEditFormData({ ...editFormData, date: dateStr })}
                    />
                  </div>
                  <div>
                    <SplitTimeInput
                      label="Time"
                      value={editFormData.time}
                      onChange={(time12) => setEditFormData({ ...editFormData, time: time12 })}
                    />
                  </div>
                </div>

                {/* Type & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Booking Source / Type</label>
                    <select
                      className="input-field"
                      value={editFormData.type}
                      onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    >
                      <option value="Walk-In">Walk-In</option>
                      <option value="Phone Booking">Phone Booking</option>
                      <option value="Online Booking">Online Booking</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Status</label>
                    <select
                      className="input-field"
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    >
                      {RECEPTIONIST_STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Reason for Visit</label>
                  <input
                    type="text"
                    autoComplete="off"
                    className="input-field"
                    value={editFormData.reason}
                    onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setEditingAppointment(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECK-IN CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(checkingInAppointment)}
        onClose={() => setCheckingInAppointment(null)}
        onConfirm={() => handleCheckInAppointment(checkingInAppointment)}
        title="Confirm Patient Check-In"
        message={
          checkingInAppointment ? (
            <div className="space-y-2 text-xs">
              <p>
                Check in patient{' '}
                <strong className="text-ink font-bold">
                  {checkingInAppointment.patient?.firstName} {checkingInAppointment.patient?.lastName}
                </strong>{' '}
                for today's queue?
              </p>
              <p className="text-[11px] text-amber-800 italic">
                This will set status to "Checked-In", generate today's queue token, and display the patient in Check-In / Queue and doctor queue.
              </p>
            </div>
          ) : (
            'Are you sure you want to check in this patient?'
          )
        }
        confirmText="Confirm Check-In"
        cancelText="Cancel"
        variant="confirm"
        loading={actionLoading}
      />

      {/* MARK NO-SHOW CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(noShowAppointment)}
        onClose={() => setNoShowAppointment(null)}
        onConfirm={() => handleMarkNoShow(noShowAppointment)}
        title="Mark Patient as No-Show"
        message={
          noShowAppointment ? (
            <p className="text-xs">
              Are you sure you want to mark the appointment for{' '}
              <strong className="text-ink font-bold">
                {noShowAppointment.patient?.firstName} {noShowAppointment.patient?.lastName}
              </strong>{' '}
              as <strong className="text-slate-800 font-bold font-mono">No Show</strong>?
            </p>
          ) : (
            'Are you sure you want to mark as No Show?'
          )
        }
        confirmText="Mark No Show"
        cancelText="Cancel"
        variant="cancel"
        loading={actionLoading}
      />

      {/* CANCEL CONFIRMATION POPUP */}
      <ConfirmModal
        isOpen={Boolean(cancellingAppointment)}
        onClose={() => setCancellingAppointment(null)}
        onConfirm={confirmCancelAppointment}
        title="Confirm Appointment Cancellation"
        message={
          cancellingAppointment ? (
            <div className="space-y-2 text-xs">
              <p>
                Are you sure you want to cancel the appointment for{' '}
                <strong className="text-ink font-bold">
                  {cancellingAppointment.patient?.firstName} {cancellingAppointment.patient?.lastName}
                </strong>{' '}
                scheduled on{' '}
                <strong className="text-ink font-bold">
                  {formatDateDisplay(cancellingAppointment.date)} at {cancellingAppointment.time || 'TBD'}
                </strong>
                ?
              </p>
              <p className="text-[11px] text-rose-600 italic">
                This will update the appointment status to "Cancelled".
              </p>
            </div>
          ) : (
            'Are you sure you want to cancel this appointment?'
          )
        }
        confirmText="Yes, Cancel Appointment"
        cancelText="Keep Appointment"
        variant="danger"
        loading={actionLoading}
      />
    </>
  );
}
