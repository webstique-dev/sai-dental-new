import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ClipboardList, Users, Activity, Bell, Play, ArrowRight, RefreshCw } from 'lucide-react';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/axios.js';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const fetchDoctorSummary = async () => {
    try {
      setError('');
      const res = await api.get('/consultations/doctor-summary');
      setSummary(res.data || null);
    } catch (err) {
      console.error('Failed to load doctor dashboard summary:', err);
      setError('Unable to load queue summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorSummary();
    // 60-second background polling interval to keep queue counts fresh
    const interval = setInterval(() => {
      fetchDoctorSummary();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleStartNextConsultation = async () => {
    if (!summary?.nextInQueue) return;

    const qId = summary.nextInQueue._id || summary.nextInQueue.id;
    setStarting(true);
    setError('');

    try {
      const res = await api.post('/consultations/start', { queueEntryId: qId });
      const consultId = res.data?.consultation?._id || res.data?.consultation?.id;
      if (consultId) {
        navigate(`/doctor/consultation/${consultId}`);
      } else {
        navigate('/doctor/queue');
      }
    } catch (err) {
      console.error('Failed to start consultation:', err);
      setError(err.response?.data?.message || 'Failed to start consultation.');
    } finally {
      setStarting(false);
    }
  };

  const nextPatient = summary?.nextInQueue;
  const nextPatientName = nextPatient?.patient
    ? `${nextPatient.patient.firstName || ''} ${nextPatient.patient.lastName || ''}`.trim()
    : 'Patient';

  const stats = [
    {
      label: 'Patients in Queue',
      value: loading ? '...' : String(summary?.patientsInQueue ?? 0),
      sub: 'Waiting or checked in today',
      icon: ClipboardList,
    },
    {
      label: "Today's Consultations",
      value: loading ? '...' : String(summary?.todaysConsultations ?? 0),
      sub: 'Started & completed today',
      icon: Users,
    },
    {
      label: 'Active Treatment Plans',
      value: loading ? '...' : String(summary?.activeTreatmentPlans ?? 0),
      sub: 'Planned or in progress',
      icon: Activity,
    },
    {
      label: 'Follow-Ups Due',
      value: loading ? '...' : String(summary?.followUpsDue ?? 0),
      sub: 'Pending return visits',
      icon: Bell,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Welcome, Dr. {user?.name ? user.name.split(' ').pop() : 'Doctor'}
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Clinical workspace — manage patient intake queue, active consultations, and treatment plans.
          </p>
        </div>

        <button
          onClick={fetchDoctorSummary}
          className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Workspace
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* STAT CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* QUICK ACTIONS CARD */}
      <div className="card p-5 space-y-3 bg-surface border-brand/20">
        <h3 className="font-display text-sm font-bold text-ink">Quick Actions</h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleStartNextConsultation}
            disabled={starting || !nextPatient}
            className="btn-primary text-xs py-2.5 px-4 font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={15} className="fill-current" />
            {starting
              ? 'Starting Consultation...'
              : nextPatient
                ? `Start: Token #${nextPatient.token} — ${nextPatientName}`
                : 'No Patients Waiting'}
          </button>

          <Link to="/doctor/queue" className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-1.5">
            View My Queue <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
