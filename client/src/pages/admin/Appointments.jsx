import { useState, useEffect } from 'react';
import {
  CalendarDays, List, Search, Filter, AlertTriangle, CheckCircle2, X, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../api/axios.js';
import AppointmentList from '../../components/common/AppointmentList.jsx';
import AppointmentCalendar from '../../components/common/AppointmentCalendar.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';
import { formatPatientFullName } from '../../utils/formatters.js';

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
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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

  const hasActiveFilters = Boolean(search || dateFilter || doctorFilter || statusFilter);

  return (
    <div className="space-y-6 max-w-7xl w-full max-w-full overflow-x-hidden min-w-0">
      {/* Top Header & View Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink flex items-center gap-2 min-w-0 leading-tight">
            <CalendarDays size={26} className="text-brand shrink-0" />
            <span className="truncate sm:whitespace-normal">Clinic-Wide Appointment Calendar</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed break-words">
            Read-only oversight across all doctor schedules with administrative cancellation rights.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
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
        </div>
      </div>

      {/* Desktop Filter Bar (≥768px) */}
      <div className="hidden md:block card p-4 bg-surface border-border space-y-3">
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              className="input-field pl-9 py-2 text-xs w-full"
              placeholder="Search by Patient Name, Phone, OP#..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink">
                <X size={14} />
              </button>
            )}
          </div>

          <div>
            <DatePicker
              value={dateFilter}
              onChange={(date, dateStr) => setDateFilter(dateStr)}
              placeholder="Filter by Date"
              inputClassName="py-1 text-xs w-full"
            />
          </div>

          <div>
            <select
              className="input-field py-2 text-xs font-semibold w-full"
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
              className="input-field py-2 text-xs font-semibold w-full"
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

        {hasActiveFilters && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearch('');
                setDateFilter('');
                setDoctorFilter('');
                setStatusFilter('');
              }}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold"
            >
              <X size={13} /> Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Mobile Collapsible Filter Accordion (<768px down to 320px) */}
      <div className="block md:hidden card p-3.5 bg-surface border border-border shadow-xs space-y-3 rounded-2xl max-w-full overflow-hidden">
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-ink gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
              <Filter size={14} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="font-bold text-ink">Filters & Search</span>
              {hasActiveFilters && (
                <span className="badge bg-brand text-white text-[10px] py-0.5 px-2 font-bold shrink-0">
                  Active Filters
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-ink-soft font-semibold shrink-0">
            <span>{isMobileFilterOpen ? 'Hide' : 'Filter'}</span>
            {isMobileFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {isMobileFilterOpen && (
          <div className="pt-2 border-t border-border/70 space-y-3 animate-in fade-in duration-150 text-xs">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="text"
                className="input-field pl-9 py-1.5 text-xs w-full"
                placeholder="Search appointments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              <DatePicker
                value={dateFilter}
                onChange={(date, dateStr) => setDateFilter(dateStr)}
                placeholder="Filter by Date"
                inputClassName="py-1.5 text-xs w-full"
              />

              <select
                className="input-field py-1.5 text-xs font-semibold w-full"
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

              <select
                className="input-field py-1.5 text-xs font-semibold w-full"
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

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearch('');
                  setDateFilter('');
                  setDoctorFilter('');
                  setStatusFilter('');
                }}
                className="btn-secondary w-full py-1.5 text-xs text-rose-600 font-semibold flex items-center justify-center gap-1"
              >
                <X size={13} /> Clear Filters
              </button>
            )}
          </div>
        )}
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
                {formatPatientFullName(cancellingAppointment.patient)}
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
