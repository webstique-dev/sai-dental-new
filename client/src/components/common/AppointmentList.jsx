import { Clock, Edit3, Trash2, CalendarDays } from 'lucide-react';

const DEFAULT_STATUS_CLASSES = {
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  'No Show': 'bg-slate-100 text-slate-800 border-slate-200',
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
  statusBadgeClasses = DEFAULT_STATUS_CLASSES,
  formatDateDisplay = defaultFormatDate,
}) {
  if (loading) {
    return <div className="p-8 text-center text-sm text-ink-soft">Loading appointments...</div>;
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
            {(allowEdit || allowCancel) && <th className="px-5 py-3.5 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {appointments.map((apt) => {
            const aptId = apt._id || apt.id;
            const patientName = apt.patient
              ? `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}`.trim()
              : 'Unknown Patient';
            const docName = apt.doctor ? `Dr. ${apt.doctor.name}` : 'Unassigned';
            const isLockedStatus = ['Completed', 'Cancelled', 'No Show'].includes(apt.status);

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
                  {apt.patient?.opNumber && (
                    <div className="text-xs text-brand font-mono">{apt.patient.opNumber}</div>
                  )}
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

                {(allowEdit || allowCancel) && (
                  <td className="px-5 py-4 text-right whitespace-nowrap space-x-1">
                    {allowEdit && !isLockedStatus && (
                      <button
                        onClick={() => onEdit(apt)}
                        title="Reschedule / Edit"
                        className="inline-flex items-center gap-1 rounded-lg border border-border p-1.5 text-xs font-semibold text-ink-soft hover:bg-bg hover:text-ink"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                    )}

                    {allowCancel && !isLockedStatus && (
                      <button
                        onClick={() => onCancel(apt)}
                        title="Cancel Appointment"
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 size={14} /> Cancel
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
