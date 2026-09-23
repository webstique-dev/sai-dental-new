import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Stethoscope,
  FileText,
  X,
} from 'lucide-react';

const DEFAULT_STATUS_CLASSES = {
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  'No Show': 'bg-slate-100 text-slate-800 border-slate-200',
};

function getLocalDateStr(dInput) {
  if (!dInput) return '';
  const d = new Date(dInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AppointmentCalendar({
  calendarDate = new Date(),
  setCalendarDate = () => {},
  appointments = [],
  statusBadgeClasses = DEFAULT_STATUS_CLASSES,
}) {
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Deduplicate appointments by primary ID, linked appointment ID, or composite patient+date+time key
  const uniqueAppointments = useMemo(() => {
    const seen = new Set();
    const result = [];

    (appointments || []).forEach((apt) => {
      if (!apt) return;

      const mainId = (apt._id || apt.id || apt.consultationId || '').toString();
      const linkedAptId = (
        apt.appointment?._id ||
        apt.appointment?.id ||
        apt.appointmentId ||
        (typeof apt.appointment === 'string' ? apt.appointment : '')
      ).toString();

      const patientId = (apt.patient?._id || apt.patient?.id || (typeof apt.patient === 'string' ? apt.patient : '')).toString();
      const dateVal = getLocalDateStr(apt.date);
      const timeVal = (apt.time || '').toString().trim().toLowerCase();

      const compositeKey = patientId && dateVal ? `${patientId}_${dateVal}_${timeVal}` : null;

      const isDuplicate =
        (mainId && seen.has(mainId)) ||
        (linkedAptId && seen.has(linkedAptId)) ||
        (compositeKey && seen.has(compositeKey));

      if (!isDuplicate) {
        if (mainId) seen.add(mainId);
        if (linkedAptId) seen.add(linkedAptId);
        if (compositeKey) seen.add(compositeKey);
        result.push(apt);
      }
    });

    return result;
  }, [appointments]);

  const todayStr = getLocalDateStr(new Date());

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
          <CalendarDays size={18} className="text-brand" /> Calendar Overview
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
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
            type="button"
            onClick={() => setCalendarDate(new Date())}
            className="btn-secondary py-1 px-2.5 text-xs"
          >
            Today
          </button>
          <button
            type="button"
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

          const dateStr = getLocalDateStr(startOfWeek);
          const dayAppointments = uniqueAppointments.filter((a) => {
            if (!a.date) return false;
            const aDateStr = getLocalDateStr(a.date);
            return aDateStr === dateStr;
          });

          const isToday = dateStr === todayStr;

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
                  dayAppointments.map((apt) => {
                    const aptId = apt._id || apt.id;
                    const patientName = [apt.patient?.firstName, apt.patient?.lastName].filter(Boolean).join(' ') ||
                      (typeof apt.patient === 'string' ? apt.patient : 'Patient');
                    const docName = apt.doctor?.name ? apt.doctor.name.split(' ')[0] : 'Dentist';

                    return (
                      <div
                        key={aptId}
                        onClick={() => setSelectedAppointment(apt)}
                        className="rounded-lg border border-border bg-bg/80 hover:bg-brand-light/20 p-2 text-xs transition-all cursor-pointer hover:border-brand hover:shadow-xs select-none"
                        title="Click to view appointment details"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedAppointment(apt);
                          }
                        }}
                      >
                        <div className="font-semibold text-ink truncate">
                          {apt.time || '—'} {patientName}
                        </div>
                        <div className="text-[10px] text-ink-soft truncate">
                          Dr. {docName}
                        </div>
                        <span
                          className={`badge text-[9px] px-1 py-0 mt-1 inline-block border ${
                            statusBadgeClasses[apt.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {apt.status || 'Scheduled'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* APPOINTMENT DETAILS POPUP MODAL */}
      {selectedAppointment && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150 !m-0 !mt-0"
          onClick={() => setSelectedAppointment(null)}
        >
          <div
            className="card w-full max-w-lg bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/80 px-5 py-4 bg-surface shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-brand-light text-brand flex items-center justify-center font-bold shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink leading-tight">
                    Appointment Details
                  </h3>
                  <p className="text-xs text-ink-soft">
                    {selectedAppointment.date ? new Date(selectedAppointment.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }) : 'Date not set'}{selectedAppointment.time ? ` • ${selectedAppointment.time}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="rounded-lg p-1.5 text-ink-soft hover:text-ink hover:bg-bg transition-colors"
                title="Close"
                aria-label="Close appointment details"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3.5 max-h-[calc(85vh-100px)] overflow-y-auto text-xs">
              {/* Status and Type Summary Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-bg/60 border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">Status</span>
                  <span
                    className={`badge text-xs px-2.5 py-0.5 font-bold border ${
                      statusBadgeClasses[selectedAppointment.status] || 'bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    {selectedAppointment.status || 'Scheduled'}
                  </span>
                </div>
                {selectedAppointment.type && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">Type</span>
                    <span className="badge text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                      {selectedAppointment.type}
                    </span>
                  </div>
                )}
              </div>

              {/* Patient Information Section */}
              <div className="space-y-2 p-3.5 rounded-xl border border-border bg-surface">
                <div className="flex items-center gap-2 text-ink font-bold text-xs">
                  <User size={14} className="text-brand shrink-0" />
                  <span>Patient Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 pl-5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">Full Name</span>
                    <span className="font-semibold text-ink">
                      {[selectedAppointment.patient?.firstName, selectedAppointment.patient?.lastName].filter(Boolean).join(' ') ||
                        (typeof selectedAppointment.patient === 'string' ? selectedAppointment.patient : 'Not recorded')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">OP Number</span>
                    <span className="font-mono font-bold text-brand">
                      {selectedAppointment.patient?.opNumber ? `#${selectedAppointment.patient.opNumber}` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">Primary Phone</span>
                    <span className="font-mono font-medium text-ink">
                      {selectedAppointment.patient?.primaryPhone ||
                        selectedAppointment.patient?.phone ||
                        'Not recorded'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">Age / Sex</span>
                    <span className="font-medium text-ink">
                      {selectedAppointment.patient?.age !== undefined && selectedAppointment.patient?.age !== null && selectedAppointment.patient?.age !== ''
                        ? `${selectedAppointment.patient.age} yrs`
                        : 'Not recorded'} / {selectedAppointment.patient?.sex || 'Not recorded'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Doctor / Specialist Section */}
              <div className="space-y-2 p-3.5 rounded-xl border border-border bg-surface">
                <div className="flex items-center gap-2 text-ink font-bold text-xs">
                  <Stethoscope size={14} className="text-brand shrink-0" />
                  <span>Assigned Doctor</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 pl-5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">Doctor Name</span>
                    <span className="font-semibold text-ink">
                      Dr. {selectedAppointment.doctor?.name || (typeof selectedAppointment.doctor === 'string' ? selectedAppointment.doctor : 'Not assigned')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">Specialization</span>
                    <span className="font-medium text-ink">
                      {selectedAppointment.doctor?.specialization || 'General Dentist'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visit Schedule Section */}
              <div className="space-y-2 p-3.5 rounded-xl border border-border bg-surface">
                <div className="flex items-center gap-2 text-ink font-bold text-xs">
                  <Clock size={14} className="text-brand shrink-0" />
                  <span>Visit Timing</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 pl-5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">Date</span>
                    <span className="font-medium text-ink">
                      {selectedAppointment.date
                        ? new Date(selectedAppointment.date).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">Time Slot</span>
                    <span className="font-mono font-bold text-ink">
                      {selectedAppointment.time || 'Not specified'}
                    </span>
                  </div>
                  {(selectedAppointment.token || selectedAppointment.queue_token) && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-soft block">Queue Token</span>
                      <span className="badge bg-amber-100 text-amber-900 border border-amber-300 font-mono font-bold text-xs">
                        Token #{selectedAppointment.token || selectedAppointment.queue_token}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reason & Notes Section */}
              {(selectedAppointment.reason || selectedAppointment.notes || selectedAppointment.cancellationReason) && (
                <div className="space-y-2 p-3.5 rounded-xl border border-border bg-surface">
                  <div className="flex items-center gap-2 text-ink font-bold text-xs">
                    <FileText size={14} className="text-brand shrink-0" />
                    <span>Reason & Clinical Notes</span>
                  </div>
                  <div className="space-y-2 pt-1 pl-5">
                    {selectedAppointment.reason && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-soft block">Reason for Visit</span>
                        <p className="font-medium text-ink leading-relaxed">
                          {selectedAppointment.reason}
                        </p>
                      </div>
                    )}
                    {selectedAppointment.notes && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-soft block">Notes</span>
                        <p className="font-medium text-ink leading-relaxed bg-bg/50 p-2 rounded-lg border border-border">
                          {selectedAppointment.notes}
                        </p>
                      </div>
                    )}
                    {selectedAppointment.cancellationReason && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-rose-600 block">Cancellation Reason</span>
                        <p className="font-medium text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200 leading-relaxed">
                          {selectedAppointment.cancellationReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-5 py-3 border-t border-border bg-bg/30">
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="btn-secondary py-1.5 px-5 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

