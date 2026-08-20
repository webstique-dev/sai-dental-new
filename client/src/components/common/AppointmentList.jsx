import { Clock, Edit3, Trash2, CalendarDays, UserCheck, UserX } from 'lucide-react';
import { TableSkeleton } from './TableSkeleton.jsx';

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
  if (loading) {
    return <TableSkeleton rows={6} cols={7} />;
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="p-12 text-center space-y-3">
        <CalendarDays size={36} className="mx-auto text-ink-soft/50" />
        <p className="font-display text-base font-semibold text-ink">No appointments found</p>
        <p className="text-sm text-ink-soft">Try clearing search or filter criteria.</p>
      </div>
    );
  }

  return (
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
            const aptId = apt._id || apt.id;
            const patientName = apt.patient
              ? `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}`.trim()
              : 'Unknown Patient';
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
                    {apt.patient?.phone && <span>{apt.patient.phone}</span>}
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
  );
}
