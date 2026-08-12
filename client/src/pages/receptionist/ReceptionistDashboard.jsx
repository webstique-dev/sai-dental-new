import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardList, UserPlus, Bell } from 'lucide-react';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/axios.js';

export default function ReceptionistDashboard() {
  const { user } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const res = await api.get('/reports/reception-summary');
        setSummaryData(res.data);
      } catch (err) {
        console.error('Failed to load reception summary:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  const skeleton = <span className="inline-block h-7 w-12 rounded bg-border animate-pulse" />;

  const stats = [
    {
      label: "Today's Appointments",
      value: loading ? skeleton : summaryData?.todaysAppointments ?? 0,
      icon: CalendarDays,
      tone: 'brand',
    },
    {
      label: 'Patients Waiting',
      value: loading ? skeleton : summaryData?.patientsWaiting ?? 0,
      icon: ClipboardList,
      tone: 'warning',
    },
    {
      label: 'New Registrations',
      value: loading ? skeleton : summaryData?.newRegistrations ?? 0,
      icon: UserPlus,
      tone: 'info',
    },
    {
      label: 'Follow-Ups Due',
      value: loading ? skeleton : summaryData?.followUpsDue ?? 0,
      icon: Bell,
      tone: 'danger',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Good to see you, {user?.name ? user.name.split(' ')[0] : 'Receptionist'}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Front desk operations overview & summary.
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
          <Link to="/reception/appointments" className="btn-secondary">Book Appointment</Link>
          <Link to="/reception/queue" className="btn-secondary">Check In Patient</Link>
        </div>
      </div>
    </div>
  );
}
