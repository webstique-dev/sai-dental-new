import { useState, useEffect } from 'react';
import {
  CalendarDays, List, Plus, Search, Filter, X, CheckCircle2, AlertTriangle,
  Clock, User, Stethoscope, FileText, Trash2, Edit3, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../../api/axios.js';

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
    setFormData({
      patient: '',
      doctor: doctors[0]?._id || '',
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
      doctor: apt.doctor?._id || '',
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
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}
              </option>
            ))}
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
          {loading ? (
            <div className="p-8 text-center text-sm text-ink-soft">Loading appointments...</div>
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <CalendarDays size={36} className="mx-auto text-ink-soft/50" />
              <p className="font-display text-base font-semibold text-ink">No appointments found</p>
              <p className="text-sm text-ink-soft">Try clearing your search or date filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">Patient</th>
                    <th className="px-5 py-3.5">Doctor</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Reason</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {appointments.map((apt) => {
                    const patientName = apt.patient
                      ? `${apt.patient.firstName} ${apt.patient.lastName}`.trim()
                      : 'Unknown Patient';
                    const docName = apt.doctor ? `Dr. ${apt.doctor.name}` : 'Unassigned';

                    return (
                      <tr key={apt._id} className="hover:bg-bg/60 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-semibold text-ink text-xs">
                            {formatDateDisplay(apt.date)}
                          </div>
                          <div className="text-xs text-ink-soft flex items-center gap-1 mt-0.5">
                            <Clock size={12} /> {apt.time || '—'}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-ink">{patientName}</div>
                          {apt.patient?.opNumber && (
                            <div className="text-xs text-brand font-mono">{apt.patient.opNumber}</div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-ink-soft text-xs">
                          {docName}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <span
                            className={`badge ${
                              apt.type === 'Walk-in'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {apt.type}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-ink-soft max-w-[200px] truncate">
                          {apt.reason || '—'}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`badge border ${
                              STATUS_BADGE_CLASSES[apt.status] || 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap space-x-1">
                          <button
                            onClick={() => openEditModal(apt)}
                            title="Reschedule / Edit"
                            className="inline-flex items-center gap-1 rounded-lg border border-border p-1.5 text-xs font-semibold text-ink-soft hover:bg-bg hover:text-ink"
                          >
                            <Edit3 size={14} /> Edit
                          </button>

                          {apt.status !== 'Cancelled' && (
                            <button
                              onClick={() => setCancellingAppointment(apt)}
                              title="Cancel Appointment"
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              <Trash2 size={14} /> Cancel
                            </button>
                          )}
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

      {/* VIEW: CALENDAR */}
      {viewMode === 'calendar' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <CalendarDays size={18} className="text-brand" /> Calendar Overview
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const prev = new Date(calendarDate);
                  prev.setDate(prev.getDate() - 7);
                  setCalendarDate(prev);
                }}
                className="btn-secondary py-1 px-2.5 text-xs"
              >
                <ChevronLeft size={16} /> Prev Week
              </button>
              <button
                onClick={() => setCalendarDate(new Date())}
                className="btn-secondary py-1 px-2.5 text-xs"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const next = new Date(calendarDate);
                  next.setDate(next.getDate() + 7);
                  setCalendarDate(next);
                }}
                className="btn-secondary py-1 px-2.5 text-xs"
              >
                Next Week <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* 7-day grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, idx) => {
              const currentDay = new Date(calendarDate);
              const dayOfWeek = currentDay.getDay(); // 0 is Sun
              const startOfWeek = new Date(currentDay);
              startOfWeek.setDate(currentDay.getDate() - dayOfWeek + idx);

              const dateStr = startOfWeek.toISOString().split('T')[0];
              const dayAppointments = appointments.filter((a) => {
                if (!a.date) return false;
                const aDateStr = new Date(a.date).toISOString().split('T')[0];
                return aDateStr === dateStr;
              });

              const isToday = dateStr === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={dateStr}
                  className={`rounded-xl border p-3 flex flex-col min-h-[180px] ${
                    isToday ? 'border-brand bg-brand-light/10' : 'border-border bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
                    <span className="text-xs font-semibold text-ink-soft">
                      {startOfWeek.toLocaleDateString(undefined, { weekday: 'short' })}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        isToday ? 'bg-brand text-white rounded-full h-5 w-5 flex items-center justify-center' : 'text-ink'
                      }`}
                    >
                      {startOfWeek.getDate()}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5 overflow-y-auto">
                    {dayAppointments.length === 0 ? (
                      <p className="text-[11px] text-ink-soft italic pt-2">No slots</p>
                    ) : (
                      dayAppointments.map((apt) => (
                        <div
                          key={apt._id}
                          onClick={() => openEditModal(apt)}
                          className="rounded-lg border border-border bg-bg/80 p-2 text-xs cursor-pointer hover:border-brand transition-colors"
                        >
                          <div className="font-semibold text-ink truncate">
                            {apt.time || '—'} {apt.patient?.firstName}
                          </div>
                          <div className="text-[10px] text-ink-soft truncate">
                            Dr. {apt.doctor?.name?.split(' ')[0]}
                          </div>
                          <span
                            className={`badge text-[9px] px-1 py-0 mt-1 inline-block border ${
                              STATUS_BADGE_CLASSES[apt.status] || ''
                            }`}
                          >
                            {apt.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Select Patient
                </label>
                {selectedPatient ? (
                  <div className="flex items-center justify-between rounded-xl border border-brand bg-brand-light/20 p-3">
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </p>
                      <p className="text-xs text-ink-soft">
                        OP: {selectedPatient.opNumber} | Phone: {selectedPatient.phone || 'N/A'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Type patient name, OP number or phone..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                    />
                    {patientOptions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-xl border border-border bg-surface shadow-card max-h-48 overflow-y-auto">
                        {patientOptions.map((p) => (
                          <div
                            key={p._id}
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientSearch('');
                              setPatientOptions([]);
                            }}
                            className="p-3 text-xs border-b border-border/50 hover:bg-brand-light/30 cursor-pointer"
                          >
                            <span className="font-bold text-ink">{p.firstName} {p.lastName}</span>{' '}
                            <span className="text-brand font-mono">({p.opNumber})</span> — {p.phone || 'No phone'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Doctor Selector */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">Assigned Doctor</label>
                <select
                  className="input-field"
                  value={formData.doctor}
                  onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}
                    </option>
                  ))}
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
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}
                    </option>
                  ))}
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
