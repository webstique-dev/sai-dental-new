import { ClipboardList, Users, Grid3x3, Bell } from 'lucide-react';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function DoctorDashboard() {
  const { user } = useAuth();

  const stats = [
    { label: 'Patients in Queue', value: '—', icon: ClipboardList, tone: 'brand' },
    { label: "Today's Consultations", value: '—', icon: Users, tone: 'info' },
    { label: 'Active Treatment Plans', value: '—', icon: Grid3x3, tone: 'success' },
    { label: 'Follow-Ups Due', value: '—', icon: Bell, tone: 'warning' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Welcome, Dr. {user.name.split(' ').pop()}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Clinical workspace. Tooth charting and consultation notes arrive in Phase 2.
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
          <button className="btn-primary">Start Next Consultation</button>
          <button className="btn-secondary">View My Queue</button>
        </div>
      </div>
    </div>
  );
}
