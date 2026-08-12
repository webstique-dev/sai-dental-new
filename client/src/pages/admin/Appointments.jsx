import { useState, useEffect } from 'react';
import {
  CalendarDays, List, Search, Filter, AlertTriangle, CheckCircle2, X
} from 'lucide-react';
import api from '../../api/axios.js';
import AppointmentList from '../../components/common/AppointmentList.jsx';
import AppointmentCalendar from '../../components/common/AppointmentCalendar.jsx';

const STATUS_OPTIONS = [
  'Scheduled',
  'Checked-In',
  'In Consultation',
  'Completed',
  'Cancelled',
  'No Show',
];

export default function AdminAppointments() {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Notifications
  const [cancellingAppointment, setCancellingAppointment] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Calendar View helper
  const [calendarDate, setCalendarDate] = useState(new Date());

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

  const confirmCancelAppointment = async () => {
    if (!cancellingAppointment) return;
    try {
      await api.delete(`/appointments/${cancellingAppointment._id}`);
      setSuccessMessage('Appointment cancelled by Admin.');
      setCancellingAppointment(null);
      fetchAppointments();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header & View Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <CalendarDays size={26} className="text-brand" /> Clinic-Wide Appointment Calendar
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Read-only oversight across all doctor schedules with administrative cancellation rights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl border border-border bg-surface p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'list' ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <List size={15} /> List View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'calendar' ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <CalendarDays size={15} /> Calendar View
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 border border-rose-200">
          <AlertTriangle size={16} className="text-rose-600" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="ml-auto text-rose-600 hover:text-rose-800">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card p-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 bg-surface">
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

        <div>
          <input
            type="date"
            className="input-field py-2 text-xs font-mono"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

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

      {/* VIEW RENDER */}
      {viewMode === 'list' ? (
        <div className="card overflow-hidden">
          <AppointmentList
            appointments={appointments}
            loading={loading}
            allowEdit={false}
            allowCancel={true}
            onCancel={(apt) => setCancellingAppointment(apt)}
          />
        </div>
      ) : (
        <AppointmentCalendar
          calendarDate={calendarDate}
          setCalendarDate={setCalendarDate}
          appointments={appointments}
          allowEdit={false}
        />
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {cancellingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="card max-w-md w-full p-6 space-y-4 bg-surface animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertTriangle size={24} />
              <h3 className="font-display text-base font-bold">Cancel Appointment</h3>
            </div>
            <p className="text-xs text-ink-soft">
              Are you sure you want to cancel the appointment for{' '}
              <strong className="text-ink">
                {cancellingAppointment.patient?.firstName} {cancellingAppointment.patient?.lastName}
              </strong>{' '}
              with Dr. {cancellingAppointment.doctor?.name}?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setCancellingAppointment(null)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                No, Keep Appointment
              </button>
              <button
                onClick={confirmCancelAppointment}
                className="btn-primary bg-rose-600 hover:bg-rose-700 text-white border-transparent py-1.5 px-4 text-xs font-bold"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
