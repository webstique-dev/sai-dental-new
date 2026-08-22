import { useState, useEffect } from 'react';
import { Users, CalendarDays, Wallet, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/common/StatCard.jsx';
import { ReceptionistDashboardSkeleton } from '../../components/common/TableSkeleton.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';
import api from '../../api/axios.js';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({
    todaysAppointments: 0,
    activePatients: 0,
    revenueThisMonth: 0,
    doctorsOnDuty: 0,
  });

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/admin-overview');
      if (res.data) {
        setOverview(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin overview stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useSocketEvent('APPOINTMENT_UPDATED', () => {
    fetchOverview();
  });

  useSocketEvent('QUEUE_UPDATED', () => {
    fetchOverview();
  });

  if (loading) {
    return <ReceptionistDashboardSkeleton />;
  }

  const stats = [
    {
      label: "Today's Appointments",
      value: String(overview.todaysAppointments ?? 0),
      icon: CalendarDays,
      tone: 'brand',
    },
    {
      label: 'Active Patients',
      value: String(overview.activePatients ?? 0),
      icon: Users,
      tone: 'info',
    },
    {
      label: 'Revenue This Month',
      value: `₹${(overview.revenueThisMonth ?? 0).toLocaleString()}`,
      icon: Wallet,
      tone: 'success',
    },
    {
      label: 'Doctors On Duty',
      value: String(overview.doctorsOnDuty ?? 0),
      icon: Stethoscope,
      tone: 'warning',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Welcome back, {user?.name?.split(' ')[0] || 'Admin'}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Here is your real-time clinic overview and key operational metrics.
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
            <button onClick={() => navigate('/admin/users')} className="btn-secondary">
              Add User
            </button>
            <button onClick={() => navigate('/admin/audit-logs')} className="btn-secondary">
              View Audit Log
            </button>
            <button onClick={() => navigate('/admin/settings')} className="btn-secondary">
              Clinic Settings
            </button>
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
