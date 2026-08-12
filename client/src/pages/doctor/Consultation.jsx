import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, UserSquare2, Phone, Calendar, Stethoscope, FileText,
  Activity, Grid3x3, FileHeart, Pill, AlertTriangle, CheckCircle2, Search,
} from 'lucide-react';
import api from '../../api/axios.js';
import ExaminationTab from './consultation/ExaminationTab.jsx';

const CLINICAL_TABS = [
  { id: 'examination', label: 'Examination', icon: FileHeart },
  { id: 'tooth-chart', label: 'Tooth Chart', icon: Grid3x3 },
  { id: 'diagnosis', label: 'Diagnosis', icon: Stethoscope },
  { id: 'treatment-plan', label: 'Treatment Plan', icon: Activity },
  { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
  { id: 'investigations', label: 'Investigations', icon: Search },
];

export default function Consultation() {
  const { consultationId } = useParams();
  const [consultation, setConsultation] = useState(null);
  const [activeTab, setActiveTab] = useState('examination');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchConsultation() {
      try {
        setLoading(true);
        const res = await api.get(`/consultations/${consultationId}`);
        setConsultation(res.data?.consultation);
      } catch (err) {
        console.error('Failed to load consultation:', err);
        setError(err.response?.data?.message || 'Consultation not found.');
      } finally {
        setLoading(false);
      }
    }
    if (consultationId) {
      fetchConsultation();
    }
  }, [consultationId]);

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <p className="text-sm text-ink-soft">Loading clinical consultation workspace...</p>
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="space-y-4">
        <Link
          to="/doctor/queue"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
        >
          <ArrowLeft size={16} /> Back to Doctor Queue
        </Link>
        <div className="card p-6 text-center space-y-3">
          <AlertTriangle size={32} className="mx-auto text-rose-500" />
          <h3 className="font-display text-base font-bold text-ink">{error || 'Consultation record not found.'}</h3>
        </div>
      </div>
    );
  }

  const patient = consultation.patient || {};
  const fullName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back Link */}
      <div>
        <Link
          to="/doctor/queue"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline mb-1"
        >
          <ArrowLeft size={15} /> Back to My Queue
        </Link>
      </div>

      {/* Patient Header Card */}
      <div className="card p-5 space-y-4 bg-surface border-brand/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <UserSquare2 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-ink">{fullName}</h2>
                <span className="badge bg-purple-100 text-purple-800 border border-purple-200">
                  {consultation.status}
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                OP Number: <span className="font-mono font-bold text-brand">{patient.opNumber || 'N/A'}</span>
                {patient.phone ? ` • Phone: ${patient.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="text-xs text-ink-soft text-right">
            Started at:{' '}
            <span className="font-semibold text-ink">
              {consultation.startedAt ? new Date(consultation.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </span>
            <span className="block text-[11px]">Doctor: Dr. {consultation.doctor?.name}</span>
          </div>
        </div>

        {/* Quick Patient Metadata Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-ink-soft font-medium block">Age / Sex</span>
            <span className="font-semibold text-ink">{patient.age ? `${patient.age} yrs` : 'N/A'} {patient.sex ? `/ ${patient.sex}` : ''}</span>
          </div>

          <div>
            <span className="text-ink-soft font-medium block">Medical History</span>
            <span className="font-semibold text-ink">
              {patient.medicalHistory && patient.medicalHistory.length > 0
                ? patient.medicalHistory.join(', ')
                : 'None reported'}
            </span>
          </div>

          <div>
            <span className="text-ink-soft font-medium block">Vitals (BP / RBS)</span>
            <span className="font-semibold text-ink">
              {patient.vitals?.bp || 'N/A'} / {patient.vitals?.rbs || 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-ink-soft font-medium block">Current Medications</span>
            <span className="font-semibold text-ink truncate block">
              {patient.currentMedications || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* CLINICAL TAB BAR */}
      <div className="space-y-4">
        <div className="flex border-b border-border space-x-1 overflow-x-auto">
          {CLINICAL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-brand text-brand'
                    : 'border-transparent text-ink-soft hover:text-ink hover:border-border'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ACTIVE TAB CONTENT */}
        {activeTab === 'examination' ? (
          <ExaminationTab consultation={consultation} />
        ) : (
          <div className="card p-8 text-center space-y-3">
            <Stethoscope size={36} className="mx-auto text-brand/60" />
            <h3 className="font-display text-base font-bold text-ink">
              {CLINICAL_TABS.find((t) => t.id === activeTab)?.label} Module
            </h3>
            <p className="text-xs text-ink-soft max-w-md mx-auto">
              Clinical entries for {CLINICAL_TABS.find((t) => t.id === activeTab)?.label} reference Consultation ID{' '}
              <span className="font-mono text-brand font-bold">{consultation._id}</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
