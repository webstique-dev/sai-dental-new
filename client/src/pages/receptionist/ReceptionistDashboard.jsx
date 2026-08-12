import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardList, UserPlus, Bell } from 'lucide-react';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ReceptionistDashboard() {
  const { user } = useAuth();

  const stats = [
    { label: "Today's Appointments", value: '—', icon: CalendarDays, tone: 'brand' },
    { label: 'Patients Waiting', value: '—', icon: ClipboardList, tone: 'warning' },
    { label: 'New Registrations', value: '—', icon: UserPlus, tone: 'info' },
    { label: 'Follow-Ups Due', value: '—', icon: Bell, tone: 'danger' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Good to see you, {user.name.split(' ')[0]}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Front desk overview.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-display text-sm font-bold text-ink">Quick actions</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/reception/patients/register" className="btn-primary">Register Patient</Link>
          <button className="btn-secondary">Book Appointment</button>
          <button className="btn-secondary">Check In Patient</button>
        </div>
      </div>
    </div>
  );
}
