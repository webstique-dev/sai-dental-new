import { useState } from 'react';
import { Clock, Edit3, Trash2, CalendarDays, UserCheck, UserX, ChevronDown, ChevronUp } from 'lucide-react';
import { TableSkeleton } from './TableSkeleton.jsx';
import { formatPatientFullName } from '../../utils/formatters.js';

const DEFAULT_STATUS_CLASSES = {
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  'No Show': 'bg-slate-100 text-slate-800 border-slate-200',
  Missed: 'bg-rose-100 text-rose-800 border-rose-200',
};

const defaultFormatDate = (dStr) => {
  if (!dStr) return 'N/A';
  return new Date(dStr).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function AppointmentList({
  appointments = [],
  loading = false,
  allowEdit = true,
  allowCancel = true,
  onEdit = () => {},
  onCancel = () => {},
  onCheckIn = null,
  onNoShow = null,
  statusBadgeClasses = DEFAULT_STATUS_CLASSES,
  formatDateDisplay = defaultFormatDate,
}) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return <TableSkeleton rows={6} cols={7} />;
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center space-y-3">
        <CalendarDays size={36} className="mx-auto text-ink-soft/50" />
        <p className="font-display text-base font-semibold text-ink">No appointments found</p>
        <p className="text-sm text-ink-soft">Try clearing search or filter criteria.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View (≥768px) */}
      <div className="hidden md:block overflow-x-auto">
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
              const aptId = apt._id || apt.id;
              const patientName = formatPatientFullName(apt.patient) || 'Unknown Patient';
              const docName = apt.doctor ? `Dr. ${apt.doctor.name}` : 'Unassigned';
              const isScheduled = apt.status === 'Scheduled';
              const isCanCheckIn = isScheduled && onCheckIn;
              const isLockedStatus = ['Completed', 'Cancelled', 'No Show', 'Missed'].includes(apt.status);

              const pType = apt.patient?.patientType || (apt.patient?.age !== undefined && apt.patient?.age !== null && Number(apt.patient.age) < 12 ? 'child' : 'adult');

              return (
                <tr key={aptId} className="hover:bg-bg/60 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="font-semibold text-ink text-xs">{formatDateDisplay(apt.date)}</div>
                    <div className="text-xs text-ink-soft flex items-center gap-1 mt-0.5">
                      <Clock size={12} /> {apt.time || '—'}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-medium text-ink">{patientName}</div>
                    <div className="text-xs text-ink-soft flex items-center gap-1.5 flex-wrap mt-0.5">
                      {apt.patient?.opNumber && (
                        <span className="text-brand font-mono font-bold">{apt.patient.opNumber}</span>
                      )}
                      <span className={`badge text-[10px] py-0 px-1.5 font-bold ${pType === 'child' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {pType === 'child' ? 'Child' : 'Adult'}
                      </span>
                      {(apt.patient?.primaryPhone || apt.patient?.phone) && <span>{apt.patient.primaryPhone || apt.patient.phone}{apt.patient.secondaryPhone ? ` / ${apt.patient.secondaryPhone}` : ''}</span>}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-ink-soft text-xs">{docName}</td>

                  <td className="px-5 py-4 text-xs">
                    <span
                      className={`badge ${
                        apt.type === 'Walk-in' ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {apt.type || 'Appointment'}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-xs text-ink-soft max-w-[200px] truncate">
                    {apt.reason || '—'}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`badge border ${
                        statusBadgeClasses[apt.status] || 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* 1. Check-In action for Scheduled appointments */}
                      {isCanCheckIn && (
                        <button
                          onClick={() => onCheckIn(apt)}
                          title="Check In Patient"
                          className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                        >
                          <UserCheck size={13} /> Check-In
                        </button>
                      )}

                      {/* 2. Cancel action */}
                      {allowCancel && !isLockedStatus && (
                        <button
                          onClick={() => onCancel(apt)}
                          title="Cancel Appointment"
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 size={13} /> Cancel
                        </button>
                      )}

                      {/* 3. No Show action for Scheduled appointments */}
                      {isScheduled && onNoShow && (
                        <button
                          onClick={() => onNoShow(apt)}
                          title="Mark No Show"
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          <UserX size={13} /> No Show
                        </button>
                      )}

                      {/* Edit action */}
                      {allowEdit && !isLockedStatus && (
                        <button
                          onClick={() => onEdit(apt)}
                          title="Reschedule / Edit"
                          className="inline-flex items-center gap-1 rounded-xl border border-border p-1.5 text-xs font-semibold text-ink-soft hover:bg-bg hover:text-ink transition-colors"
                        >
                          <Edit3 size={13} /> Edit
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
        {appointments.map((apt) => {
          const aptId = apt._id || apt.id;
          const patientName = formatPatientFullName(apt.patient) || 'Unknown Patient';
          const docName = apt.doctor ? `Dr. ${apt.doctor.name}` : 'Unassigned Doctor';
          const isScheduled = apt.status === 'Scheduled';
          const isCanCheckIn = isScheduled && onCheckIn;
          const isLockedStatus = ['Completed', 'Cancelled', 'No Show', 'Missed'].includes(apt.status);
          const isExpanded = expandedId === aptId;

          const pType = apt.patient?.patientType || (apt.patient?.age !== undefined && apt.patient?.age !== null && Number(apt.patient.age) < 12 ? 'child' : 'adult');

          return (
            <div key={aptId} className="p-3.5 space-y-2.5 hover:bg-bg/40 transition-colors">
              {/* Collapsed Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink text-sm truncate">{patientName}</span>
                    <span className={`badge border text-[10px] font-bold py-0.5 px-2 shrink-0 ${statusBadgeClasses[apt.status] || 'bg-slate-100 text-slate-800'}`}>
                      {apt.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                    {apt.patient?.opNumber && <span className="font-bold text-brand">{apt.patient.opNumber}</span>}
                    {(apt.patient?.primaryPhone || apt.patient?.phone) && <span className="text-ink-soft">• {apt.patient.primaryPhone || apt.patient.phone}{apt.patient.secondaryPhone ? ` / ${apt.patient.secondaryPhone}` : ''}</span>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => toggleExpand(aptId, e)}
                  className="p-1.5 rounded-lg border border-border text-ink-soft hover:text-ink hover:bg-bg shrink-0 mt-0.5"
                  aria-label={isExpanded ? 'Collapse appointment details' : 'Expand appointment details'}
                >
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

              {/* Expanded Accordion Content */}
              {isExpanded && (
                <div className="pt-2 border-t border-border/70 space-y-3 text-xs animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-2 text-ink-soft">
                    <div>
                      <span className="block text-[10px] font-semibold text-ink-soft uppercase">Date & Time</span>
                      <span className="font-semibold text-ink">{formatDateDisplay(apt.date)} at {apt.time || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-ink-soft uppercase">Assigned Doctor</span>
                      <span className="font-semibold text-ink">{docName}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-ink-soft uppercase">Booking Type</span>
                      <span className="font-medium text-ink">{apt.type || 'Appointment'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-ink-soft uppercase">Reason</span>
                      <span className="font-medium text-ink">{apt.reason || '—'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex flex-wrap items-center justify-end gap-2">
                    {isCanCheckIn && (
                      <button
                        onClick={() => onCheckIn(apt)}
                        className="btn-primary py-1.5 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold flex-1 justify-center"
                      >
                        <UserCheck size={14} /> Check-In
                      </button>
                    )}

                    {allowEdit && !isLockedStatus && (
                      <button
                        onClick={() => onEdit(apt)}
                        className="btn-secondary py-1.5 px-3 text-xs flex-1 justify-center"
                      >
                        <Edit3 size={14} /> Edit / Reschedule
                      </button>
                    )}

                    {isScheduled && onNoShow && (
                      <button
                        onClick={() => onNoShow(apt)}
                        className="btn-secondary py-1.5 px-2.5 text-xs text-slate-700 justify-center"
                      >
                        <UserX size={14} /> No Show
                      </button>
                    )}

                    {allowCancel && !isLockedStatus && (
                      <button
                        onClick={() => onCancel(apt)}
                        className="btn-secondary py-1.5 px-2.5 text-xs text-rose-700 border-rose-200 hover:bg-rose-50 justify-center"
                      >
                        <Trash2 size={14} /> Cancel
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
  );
}

