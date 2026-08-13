import { useState, useEffect } from 'react';
import {
  CalendarDays, List, Plus, Search, Filter, X, CheckCircle2, AlertTriangle,
  Clock, User, Stethoscope, FileText, Trash2, Edit3, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../../api/axios.js';
import AppointmentList from '../../components/common/AppointmentList.jsx';
import AppointmentCalendar from '../../components/common/AppointmentCalendar.jsx';
import PatientSearchInput from '../../components/common/PatientSearchInput.jsx';

const STATUS_OPTIONS = [
  'Scheduled',
  'Checked-In',
  'In Consultation',
  'Completed',
  'Cancelled',
  'No Show',
];

const STATUS_BADGE_CLASSES = {
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  'No Show': 'bg-slate-100 text-slate-800 border-slate-200',
};

export default function Appointments() {
  // Main view state
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [cancellingAppointment, setCancellingAppointment] = useState(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Create/Edit Form state
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [formData, setFormData] = useState({
    patient: '',
    doctor: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    type: 'Appointment',
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
        setDoctors(res.data?.doctors || []);
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    }
    fetchDoctors();
  }, []);

  // Fetch appointments based on filters
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (dateFilter) params.append('date', dateFilter);
      if (doctorFilter) params.append('doctor', doctorFilter);
      if (statusFilter) params.append('status', statusFilter);

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
    }, 300);
    return () => clearTimeout(timer);
  }, [search, dateFilter, doctorFilter, statusFilter]);

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
    const firstDocId = doctors[0]?._id || doctors[0]?.id || '';
    setFormData({
      patient: '',
      doctor: firstDocId,
      date: new Date().toISOString().split('T')[0],
      time: '09:30',
      type: 'Appointment',
      reason: '',
      status: 'Scheduled',
    });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setErrorMessage('Please search and select a patient.');
      return;
    }
    try {
      const payload = {
        ...formData,
        patient: selectedPatient._id,
      };
      await api.post('/appointments', payload);
      setSuccessMessage('Appointment created successfully!');
      setShowCreateModal(false);
      fetchAppointments();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to create appointment');
    }
  };

  const openEditModal = (apt) => {
    setEditingAppointment(apt);
    setFormData({
      doctor: apt.doctor?._id || apt.doctor?.id || '',
      date: apt.date ? new Date(apt.date).toISOString().split('T')[0] : '',
      time: apt.time || '',
      type: apt.type || 'Appointment',
      reason: apt.reason || '',
      status: apt.status || 'Scheduled',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAppointment) return;
    try {
      await api.patch(`/appointments/${editingAppointment._id}`, formData);
      setSuccessMessage('Appointment updated successfully!');
      setEditingAppointment(null);
      fetchAppointments();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update appointment');
    }
  };

  const confirmCancelAppointment = async () => {
    if (!cancellingAppointment) return;
    try {
      await api.delete(`/appointments/${cancellingAppointment._id}`);
      setSuccessMessage('Appointment cancelled.');
      setCancellingAppointment(null);
      fetchAppointments();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to cancel appointment');
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
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Appointments</h2>
          <p className="text-sm text-ink-soft">Manage clinic scheduling and walk-ins</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl border border-border bg-surface p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'list'
                  ? 'bg-brand text-white'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              <List size={15} /> List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-brand text-white'
                  : 'text-ink-soft hover:text-ink'
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

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800 border border-rose-200">
          <AlertTriangle size={18} className="text-rose-600" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="ml-auto text-rose-600 hover:text-rose-800">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card p-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            className="input-field pl-9 py-2 text-xs"
            placeholder="Search patient name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Date Filter */}
        <div className="relative">
          <input
            type="date"
            className="input-field py-2 text-xs"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        {/* Doctor Filter */}
        <div>
          <select
            className="input-field py-2 text-xs"
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
            className="input-field py-2 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
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

      {/* CREATE APPOINTMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="card w-full max-w-lg p-6 space-y-5 bg-surface max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-bold text-ink">Book New Appointment</h3>
              <button onClick={() => setShowCreateModal(false)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
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
                  className="input-field"
                  value={formData.doctor}
                  onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
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
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Time</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 10:30 AM"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              {/* Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Type</label>
                  <select
                    className="input-field"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Appointment">Appointment</option>
                    <option value="Walk-in">Walk-in</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Status</label>
                  <select
                    className="input-field"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((st) => (
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
                  className="input-field"
                  placeholder="e.g. Toothache, Scaling, Root Canal follow-up"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / RESCHEDULE MODAL */}
      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="card w-full max-w-lg p-6 space-y-5 bg-surface max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-bold text-ink">
                Reschedule / Update Appointment
              </h3>
              <button onClick={() => setEditingAppointment(null)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
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
                  value={formData.doctor}
                  onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
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
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Time</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              {/* Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Type</label>
                  <select
                    className="input-field"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Appointment">Appointment</option>
                    <option value="Walk-in">Walk-in</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Status</label>
                  <select
                    className="input-field"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((st) => (
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
                  className="input-field"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingAppointment(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION DIALOG */}
      {cancellingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="card w-full max-w-md p-6 space-y-4 bg-surface">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-ink">
                  Confirm Appointment Cancellation
                </h3>
                <p className="mt-1 text-xs text-ink-soft">
                  Are you sure you want to cancel the appointment for{' '}
                  <span className="font-semibold text-ink">
                    {cancellingAppointment.patient?.firstName} {cancellingAppointment.patient?.lastName}
                  </span>{' '}
                  scheduled on{' '}
                  <span className="font-semibold text-ink">
                    {formatDateDisplay(cancellingAppointment.date)} at {cancellingAppointment.time || 'TBD'}
                  </span>
                  ?
                </p>
                <p className="mt-2 text-[11px] text-rose-600 italic">
                  This will update the appointment status to "Cancelled".
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCancellingAppointment(null)}
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={confirmCancelAppointment}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                Yes, Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
