import { Users, CalendarDays, Wallet, Stethoscope } from 'lucide-react';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminDashboard() {
  const { user } = useAuth();

  // Placeholder figures — Phase 2 wires these to /api/reports/overview.
  const stats = [
    { label: "Today's Appointments", value: '—', icon: CalendarDays, tone: 'brand' },
    { label: 'Active Patients', value: '—', icon: Users, tone: 'info' },
    { label: 'Revenue This Month', value: '—', icon: Wallet, tone: 'success' },
    { label: 'Doctors On Duty', value: '—', icon: Stethoscope, tone: 'warning' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Welcome back, {user.name.split(' ')[0]}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Here's the clinic overview. Full analytics arrive in Phase 2.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-display text-sm font-bold text-ink">Quick actions</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-secondary">Add User</button>
            <button className="btn-secondary">View Audit Log</button>
            <button className="btn-secondary">Clinic Settings</button>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-display text-sm font-bold text-ink">System status</h3>
          <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
            <span className="h-2 w-2 rounded-full bg-state-success" />
            Connected as <span className="font-semibold text-ink">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
