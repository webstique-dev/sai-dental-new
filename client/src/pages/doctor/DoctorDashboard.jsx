import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CalendarDays, Clock, ClipboardList, Play, ArrowRight, RefreshCw } from 'lucide-react';
import StatCard from '../../components/common/StatCard.jsx';
import PatientDetailsEditModal from '../../components/common/PatientDetailsEditModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/axios.js';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState(null);

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

  const handleStartNextConsultation = () => {
    if (!summary?.nextInQueue?.patient) return;
    setSelectedPatientForEdit(summary.nextInQueue.patient);
  };

  const nextPatient = summary?.nextInQueue;
  const nextPatientName = nextPatient?.patient
    ? `${nextPatient.patient.firstName || ''} ${nextPatient.patient.lastName || ''}`.trim()
    : 'Patient';

  const stats = [
    {
      label: "Today's Appointments",
      value: loading ? '...' : String(summary?.todaysAppointments ?? summary?.patientsInQueue ?? 0),
      sub: 'Scheduled & checked in today',
      icon: CalendarDays,
      onClick: () => navigate('/doctor/queue?tab=today'),
    },
    {
      label: 'Upcoming Appointments',
      value: loading ? '...' : String(summary?.upcomingAppointments ?? 0),
      sub: 'Future scheduled visits',
      icon: Clock,
      onClick: () => navigate('/doctor/queue?tab=upcoming'),
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* QUICK ACTIONS CARD */}
      <div className="card p-5 space-y-4 bg-surface border-brand/20">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-ink">Quick Actions</h3>
          <Link to="/doctor/queue" className="text-xs text-brand font-semibold hover:underline flex items-center gap-1">
            View My Appointments <ArrowRight size={13} />
          </Link>
        </div>

        {nextPatient ? (
          <div className="p-4 rounded-2xl bg-brand-light/30 border border-brand/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-brand text-white font-mono font-bold text-lg flex items-center justify-center shadow-sm shrink-0">
                #{nextPatient.token || 1}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Next Waiting Patient</span>
                  {nextPatient.patient?.opNumber && (
                    <span className="font-mono text-[11px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                      #{nextPatient.patient.opNumber}
                    </span>
                  )}
                </div>
                <div className="font-display text-base font-bold text-ink flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>{nextPatientName}</span>
                  <span className="text-xs text-ink-soft font-medium font-sans">
                    ({nextPatient.patient?.age ? `${nextPatient.patient.age} yrs` : 'Age N/A'}
                    {nextPatient.patient?.sex ? ` • ${nextPatient.patient.sex}` : ''})
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartNextConsultation}
              disabled={starting}
              className="btn-primary text-xs py-2.5 px-4 font-bold flex items-center justify-center gap-2 shrink-0 shadow-sm"
            >
              <Play size={15} className="fill-current" />
              {starting
                ? 'Starting Consultation...'
                : `Start: ${nextPatientName} — Age ${nextPatient.patient?.age ? `${nextPatient.patient.age}y` : 'N/A'} — Token #${nextPatient.token}`}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-bg border border-border">
            <p className="text-xs text-ink-soft italic">No checked-in patients currently waiting in your queue.</p>
            <Link to="/doctor/queue" className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5 self-start sm:self-auto font-semibold">
              <ClipboardList size={14} /> Open My Appointments
            </Link>
          </div>
        )}
      </div>

      <PatientDetailsEditModal
        isOpen={Boolean(selectedPatientForEdit)}
        patient={selectedPatientForEdit}
        appointmentId={summary?.nextInQueue?.appointment?._id || summary?.nextInQueue?.appointment?.id || summary?.nextInQueue?.appointment}
        onClose={() => setSelectedPatientForEdit(null)}
      />
    </div>
  );
}
