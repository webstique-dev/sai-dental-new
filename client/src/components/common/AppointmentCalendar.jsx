import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const DEFAULT_STATUS_CLASSES = {
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  'No Show': 'bg-slate-100 text-slate-800 border-slate-200',
};

export default function AppointmentCalendar({
  calendarDate = new Date(),
  setCalendarDate = () => {},
  appointments = [],
  allowEdit = true,
  onEdit = () => {},
  statusBadgeClasses = DEFAULT_STATUS_CLASSES,
}) {
  return (
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
          <button onClick={() => setCalendarDate(new Date())} className="btn-secondary py-1 px-2.5 text-xs">
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
                  dayAppointments.map((apt) => {
                    const aptId = apt._id || apt.id;
                    const isLockedStatus = ['Completed', 'Cancelled', 'No Show'].includes(apt.status);
                    const canEdit = allowEdit && !isLockedStatus;

                    return (
                      <div
                        key={aptId}
                        onClick={() => canEdit && onEdit(apt)}
                        className={`rounded-lg border border-border bg-bg/80 p-2 text-xs transition-colors ${
                          canEdit ? 'cursor-pointer hover:border-brand' : 'opacity-80'
                        }`}
                      >
                        <div className="font-semibold text-ink truncate">
                          {apt.time || '—'} {apt.patient?.firstName}
                        </div>
                        <div className="text-[10px] text-ink-soft truncate">
                          Dr. {apt.doctor?.name?.split(' ')[0]}
                        </div>
                        <span
                          className={`badge text-[9px] px-1 py-0 mt-1 inline-block border ${
                            statusBadgeClasses[apt.status] || ''
                          }`}
                        >
                          {apt.status}
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
    </div>
  );
}
