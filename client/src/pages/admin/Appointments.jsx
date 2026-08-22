import { useState, useEffect } from 'react';
import {
  CalendarDays, List, Search, Filter, AlertTriangle, CheckCircle2, X
} from 'lucide-react';
import api from '../../api/axios.js';
import AppointmentList from '../../components/common/AppointmentList.jsx';
import AppointmentCalendar from '../../components/common/AppointmentCalendar.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';

const STATUS_OPTIONS = [
  'Scheduled',
  'Checked-In',
  'In Consultation',
  'Completed',
  'Cancelled',
  'No Show',
  'Missed',
];

export default function AdminAppointments() {
  const { showSuccess, showError } = useNotification();
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
  const [isCancelling, setIsCancelling] = useState(false);

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

  useSocketEvent('APPOINTMENT_UPDATED', () => {
    fetchAppointments();
  });

  useSocketEvent('QUEUE_UPDATED', () => {
    fetchAppointments();
  });

  const confirmCancelAppointment = async () => {
    if (!cancellingAppointment) return;
    setIsCancelling(true);
    try {
      await api.delete(`/appointments/${cancellingAppointment._id}`);
      showSuccess('Appointment cancelled successfully.');
      setCancellingAppointment(null);
      fetchAppointments();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel appointment');
    } finally {
      setIsCancelling(false);
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
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
                }`}
            >
              <List size={15} /> List View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'calendar' ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
                }`}
            >
              <CalendarDays size={15} /> Calendar View
            </button>
          </div>
        </div>
      </div>


      {/* Filter Bar */}
      <div className="card p-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 bg-surface">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            className="input-field pl-9 py-2 text-xs"
            placeholder="Search by Patient Name, Phone Number, or OP Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-40">
          <DatePicker
            value={dateFilter}
            onChange={(date, dateStr) => setDateFilter(dateStr)}
            placeholder="Filter by Date"
            inputClassName="py-1 text-xs"
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

      {/* REUSABLE CANCEL CONFIRMATION POPUP */}
      <ConfirmModal
        isOpen={Boolean(cancellingAppointment)}
        onClose={() => setCancellingAppointment(null)}
        onConfirm={confirmCancelAppointment}
        title="Confirm Appointment Cancellation"
        message={
          cancellingAppointment ? (
            <p>
              Are you sure you want to cancel the appointment for{' '}
              <strong className="text-ink font-bold">
                {cancellingAppointment.patient?.firstName} {cancellingAppointment.patient?.lastName}
              </strong>{' '}
              with Dr. {cancellingAppointment.doctor?.name}?
            </p>
          ) : (
            'Are you sure you want to cancel this appointment?'
          )
        }
        confirmText="Confirm Cancel"
        cancelText="No, Keep Appointment"
        variant="danger"
        loading={isCancelling}
      />
    </div>
  );
}
