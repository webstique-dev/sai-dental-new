import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Play, Clock, UserSquare2, RefreshCw,
} from 'lucide-react';
import api from '../../api/axios.js';
import { useNotification } from '../../context/NotificationContext.jsx';

const STATUS_BADGE_CLASSES = {
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export default function DoctorQueue() {
  const navigate = useNavigate();
  const { showError } = useNotification();
  const [queueEntries, setQueueEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);

  const fetchDoctorQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/consultations/queue/today');
      setQueueEntries(res.data?.queueEntries || []);
    } catch (err) {
      console.error('Failed to fetch doctor queue:', err);
      showError(err.response?.data?.message || 'Failed to load today queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorQueue();
  }, []);

  const handleStartConsultation = async (entry) => {
    const entryId = entry._id || entry.id;
    if (entry.activeConsultationId) {
      navigate(`/doctor/consultation/${entry.activeConsultationId}`);
      return;
    }

    setSubmittingId(entryId);
    try {
      const res = await api.post('/consultations/start', { queueEntryId: entryId });
      const consultation = res.data?.consultation;
      if (consultation && (consultation._id || consultation.id)) {
        const cId = consultation._id || consultation.id;
        navigate(`/doctor/consultation/${cId}`);
      } else {
        fetchDoctorQueue();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to start consultation.');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <ClipboardList size={22} className="text-brand" /> My Clinical Queue
          </h2>
          <p className="text-sm text-ink-soft">Today's checked-in patients waiting for consultation</p>
        </div>

        <button
          onClick={fetchDoctorQueue}
          className="btn-secondary text-xs shrink-0 flex items-center gap-1.5"
        >
          <RefreshCw size={14} /> Refresh Queue
        </button>
      </div>

      {/* Queue Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-soft">Loading today's queue...</div>
        ) : queueEntries.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <UserSquare2 size={36} className="mx-auto text-ink-soft/50" />
            <p className="font-display text-base font-semibold text-ink">No active patients waiting in your queue</p>
            <p className="text-sm text-ink-soft">
              Checked-in patients assigned to you will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Token</th>
                  <th className="px-5 py-3.5">Patient</th>
                  <th className="px-5 py-3.5">OP No</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Check-in Time</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {queueEntries.map((entry) => {
                  const entryId = entry._id || entry.id;
                  const patientName = entry.patient
                    ? `${entry.patient.firstName} ${entry.patient.lastName}`.trim()
                    : 'Patient';
                  const checkInTimeStr = entry.checkInTime
                    ? new Date(entry.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'N/A';

                  const displayStatus = entry.status === 'With Doctor' ? 'In Consultation' : entry.status;
                  const isConsulting = displayStatus === 'In Consultation' || entry.activeConsultationId;

                  return (
                    <tr key={entryId} className="hover:bg-bg/60 transition-colors">
                      {/* Token */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-mono text-base font-bold shadow-sm">
                          #{entry.token || 1}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink">{patientName}</div>
                        <div className="text-xs text-ink-soft">
                          {entry.patient?.age ? `${entry.patient.age}y` : ''} {entry.patient?.sex ? `/ ${entry.patient.sex}` : ''} {entry.patient?.phone ? `• ${entry.patient.phone}` : ''}
                        </div>
                      </td>

                      {/* OP No */}
                      <td className="px-5 py-4 font-mono font-bold text-brand text-xs">
                        {entry.patient?.opNumber || '—'}
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4 text-xs">
                        <span
                          className={`badge ${
                            entry.type === 'Walk-in'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {entry.type}
                        </span>
                      </td>

                      {/* Check-in Time */}
                      <td className="px-5 py-4 text-xs text-ink-soft whitespace-nowrap">
                        <div className="flex items-center gap-1 font-medium text-ink">
                          <Clock size={13} className="text-brand" /> {checkInTimeStr}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`badge border ${
                            STATUS_BADGE_CLASSES[displayStatus] || 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          disabled={submittingId === entryId}
                          onClick={() => handleStartConsultation(entry)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                            isConsulting
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-brand text-white hover:bg-brand-dark'
                          }`}
                        >
                          <Play size={14} fill="currentColor" />
                          <span>
                            {submittingId === entryId
                              ? 'Loading...'
                              : isConsulting
                              ? 'Continue Consultation'
                              : 'Start Consultation'}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
