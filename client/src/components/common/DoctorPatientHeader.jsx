import { useState, useEffect } from 'react';
import {
  UserSquare2, Stethoscope, ChevronRight, Activity, AlertCircle, Phone, Heart, ClipboardList,
} from 'lucide-react';
import api from '../../api/axios.js';

export default function DoctorPatientHeader({ title, description, icon: Icon, onPatientChange }) {
  const [queueEntries, setQueueEntries] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load Today's Queue & Patient Directory
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [qRes, pRes] = await Promise.all([
          api.get('/consultations/queue/today').catch(() => ({ data: { queueEntries: [] } })),
          api.get('/patients').catch(() => ({ data: { patients: [] } })),
        ]);

        const qList = qRes.data?.queueEntries || [];
        const pList = pRes.data?.patients || [];

        setQueueEntries(qList);
        setPatients(pList);

        // Default to active queue patient if one exists, else first patient
        if (qList.length > 0) {
          const firstQPatient = qList[0].patient;
          const pId = firstQPatient?._id || firstQPatient?.id || firstQPatient;
          if (pId) setSelectedPatientId(pId);
        } else if (pList.length > 0) {
          const firstPId = pList[0]._id || pList[0].id;
          if (firstPId) setSelectedPatientId(firstPId);
        }
      } catch (err) {
        console.error('Failed to load doctor patient header data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Sync consultation & patient whenever selectedPatientId changes
  useEffect(() => {
    async function syncPatientContext() {
      if (!selectedPatientId) return;
      try {
        // Find consultation for this patient
        const res = await api.post('/consultations/find-or-create', { patientId: selectedPatientId });
        const c = res.data?.consultation;
        setActiveConsultation(c || null);

        const p = c?.patient || patients.find((item) => (item._id || item.id) === selectedPatientId);
        setSelectedPatient(p || null);

        if (onPatientChange) {
          onPatientChange(selectedPatientId, c);
        }
      } catch (err) {
        console.error('Failed to sync patient consultation context:', err);
      }
    }
    syncPatientContext();
  }, [selectedPatientId]);

  return (
    <div className="space-y-4">
      {/* Page Title & Select Patient Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            {Icon && <Icon size={26} className="text-brand" />} {title}
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">{description}</p>
        </div>

        {/* SELECT PATIENT CONTROL */}
        <div className="w-full sm:w-96">
          <label className="block text-xs font-bold text-ink mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <UserSquare2 size={14} className="text-brand" /> Select Patient Workspace:
            </span>
            {queueEntries.length > 0 && (
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {queueEntries.length} Active in Queue
              </span>
            )}
          </label>

          <select
            disabled={loading}
            className="input-field py-2 text-xs font-bold text-ink bg-surface shadow-sm border-brand/40 focus:ring-brand"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
          >
            {/* Active Queue Patients Section */}
            {queueEntries.length > 0 && (
              <optgroup label="🟢 Today's Active Queue Patients">
                {queueEntries.map((q) => {
                  const p = q.patient || {};
                  const pId = p._id || p.id;
                  return (
                    <option key={`q-${q._id}`} value={pId}>
                      Token #{q.token || 1} — {p.firstName} {p.lastName} (OP: {p.opNumber || 'N/A'}) [{q.status}]
                    </option>
                  );
                })}
              </optgroup>
            )}

            {/* All Patients Section */}
            <optgroup label="👥 All Patients Directory">
              {patients.map((p) => {
                const pId = p._id || p.id;
                return (
                  <option key={`p-${pId}`} value={pId}>
                    {p.firstName} {p.lastName} (OP: {p.opNumber || 'N/A'}) {p.phone ? `• ${p.phone}` : ''}
                  </option>
                );
              })}
            </optgroup>
          </select>
        </div>
      </div>

      {/* PATIENT OVERVIEW SUMMARY CARD */}
      {selectedPatient && (
        <div className="card p-4 bg-surface border-brand/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center font-bold text-lg">
                <UserSquare2 size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-ink">
                    {[selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(' ') || 'Patient'}
                  </h2>
                  <span className="badge bg-brand-light/40 text-brand-dark font-mono font-bold text-[10px] border border-brand/30">
                    OP #{selectedPatient.opNumber || 'N/A'}
                  </span>
                  {activeConsultation?.status && (
                    <span className="badge bg-purple-100 text-purple-800 border border-purple-200 text-[10px]">
                      Consultation: {activeConsultation.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-soft mt-0.5">
                  Age: <strong className="text-ink">{selectedPatient.age !== undefined ? `${selectedPatient.age}y` : 'N/A'}</strong> • Sex:{' '}
                  <strong className="text-ink">{selectedPatient.sex || 'N/A'}</strong> • Phone:{' '}
                  <strong className="text-ink">{selectedPatient.phone || 'N/A'}</strong>
                </p>
              </div>
            </div>

            {selectedPatient.vitals && (
              <div className="flex items-center gap-3 text-xs bg-bg p-2 rounded-lg border border-border">
                <Heart size={16} className="text-rose-500 shrink-0" />
                <div>
                  <span className="text-ink-soft block text-[10px] font-semibold uppercase">Vitals</span>
                  <span className="font-mono font-bold text-ink">
                    BP: {selectedPatient.vitals.bp || '120/80'} | RBS: {selectedPatient.vitals.rbs || 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {selectedPatient.medicalHistory && (
            <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
              <AlertCircle size={15} className="text-amber-700 shrink-0" />
              <span>
                <strong>Medical Alerts & History:</strong>{' '}
                {Array.isArray(selectedPatient.medicalHistory)
                  ? selectedPatient.medicalHistory.join(', ')
                  : selectedPatient.medicalHistory}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
