import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserSquare2, Phone, Calendar, Stethoscope, FileText,
  Activity, Grid3x3, FileHeart, Pill, AlertTriangle, CheckCircle2, Search,
  Check, Lock, X, LogOut,
} from 'lucide-react';
import api from '../../api/axios.js';
import ExaminationTab from './consultation/ExaminationTab.jsx';
import ToothChart from './consultation/ToothChart.jsx';
import DiagnosisTab from './consultation/DiagnosisTab.jsx';
import TreatmentPlanTab from './consultation/TreatmentPlanTab.jsx';
import PrescriptionsTab from './consultation/PrescriptionsTab.jsx';
import InvestigationsTab from './consultation/InvestigationsTab.jsx';

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
  const navigate = useNavigate();

  const [consultation, setConsultation] = useState(null);
  const [activeTab, setActiveTab] = useState('examination');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Close Consultation Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closing, setClosing] = useState(false);

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

  const handleConfirmClose = async () => {
    setClosing(true);
    try {
      await api.post(`/consultations/${consultationId}/close`);
      setShowCloseModal(false);
      navigate('/doctor/queue');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close consultation.');
    } finally {
      setClosing(false);
    }
  };

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
  const isCompleted = consultation.status === 'Completed';

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header Navigation & Action Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/doctor/queue"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
        >
          <ArrowLeft size={15} /> Back to My Queue
        </Link>

        {!isCompleted ? (
          <button
            onClick={() => setShowCloseModal(true)}
            className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 text-xs"
          >
            <CheckCircle2 size={16} /> Close Consultation
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <Lock size={14} className="text-emerald-600" /> Closed & Read-Only
          </div>
        )}
      </div>

      {/* Read-Only Notice Banner if Completed */}
      {isCompleted && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-900 border border-amber-200">
          <Lock size={16} className="text-amber-700 shrink-0" />
          <span>
            This consultation was completed and closed on{' '}
            {consultation.closedAt ? new Date(consultation.closedAt).toLocaleString() : 'earlier visit'}. Clinical records are locked and cannot be edited.
          </span>
        </div>
      )}

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
                <span
                  className={`badge border ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-purple-100 text-purple-800 border-purple-200'
                  }`}
                >
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
            <span className="text-ink-soft font-medium block">Age / Sex / DOB</span>
            <span className="font-semibold text-ink">
              {patient.age !== undefined && patient.age !== null ? `${patient.age} yrs` : 'N/A'} {patient.sex ? `/ ${patient.sex}` : ''}
            </span>
            {patient.dateOfBirth && (
              <span className="text-[11px] text-ink-soft block">
                DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
              </span>
            )}
          </div>

          <div>
            <span className="text-ink-soft font-medium block">Occupation & Address</span>
            <span className="font-semibold text-ink block truncate">
              {patient.occupation || 'No occupation listed'}
            </span>
            <span className="text-[11px] text-ink-soft block truncate">
              {patient.address || 'No address listed'}
            </span>
          </div>

          <div>
            <span className="text-ink-soft font-medium block">Vitals & Lifestyle</span>
            <span className="font-semibold text-ink block">
              BP: {patient.vitals?.bp || 'N/A'} | RBS: {patient.vitals?.rbs || 'N/A'}
            </span>
            <span className="text-[11px] text-ink-soft block truncate">
              Habits: {patient.habits && patient.habits.length > 0 ? (Array.isArray(patient.habits) ? patient.habits.join(', ') : patient.habits) : 'None'}
            </span>
          </div>

          <div>
            <span className="text-ink-soft font-medium block">Medical History & Rx</span>
            <span className="font-semibold text-amber-800 block truncate">
              {patient.medicalHistory && patient.medicalHistory.length > 0
                ? (Array.isArray(patient.medicalHistory) ? patient.medicalHistory.join(', ') : patient.medicalHistory)
                : 'No alerts'}
            </span>
            <span className="text-[11px] text-ink-soft block truncate">
              Meds: {patient.currentMedications || 'None'}
            </span>
          </div>
        </div>

        {patient.dentalHistory && (
          <div className="pt-2 border-t border-border/60 text-xs">
            <span className="text-ink-soft font-semibold block">Dental History & Registration Complaints:</span>
            <p className="text-ink font-medium text-[11px] bg-bg/50 p-2 rounded border border-border mt-1">
              {patient.dentalHistory}
            </p>
          </div>
        )}
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
          <ExaminationTab consultation={consultation} isReadOnly={isCompleted} />
        ) : activeTab === 'tooth-chart' ? (
          <ToothChart
            patientId={consultation.patient?._id || consultation.patient?.id}
            consultationId={consultation._id || consultation.id}
            isReadOnly={isCompleted}
          />
        ) : activeTab === 'diagnosis' ? (
          <DiagnosisTab consultation={consultation} isReadOnly={isCompleted} />
        ) : activeTab === 'treatment-plan' ? (
          <TreatmentPlanTab consultation={consultation} isReadOnly={isCompleted} />
        ) : activeTab === 'prescriptions' ? (
          <PrescriptionsTab consultation={consultation} isReadOnly={isCompleted} />
        ) : activeTab === 'investigations' ? (
          <InvestigationsTab consultation={consultation} isReadOnly={isCompleted} />
        ) : (
          <div className="card p-8 text-center space-y-3">
            <Stethoscope size={36} className="mx-auto text-brand/60" />
            <h3 className="font-display text-base font-bold text-ink">
              {CLINICAL_TABS.find((t) => t.id === activeTab)?.label} Module
            </h3>
          </div>
        )}
      </div>

      {/* CONFIRM CLOSE CONSULTATION DIALOG */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="card w-full max-w-md p-6 space-y-4 bg-surface">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-600" /> Close Consultation
              </h3>
              <button onClick={() => setShowCloseModal(false)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-ink space-y-2">
              <p className="font-semibold text-ink">Are you sure you want to close this consultation?</p>
              <p className="text-ink-soft">
                Closing this consultation will mark the visit as completed and lock clinical records for this patient. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => setShowCloseModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={closing}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                onClick={handleConfirmClose}
              >
                {closing ? 'Closing...' : 'Confirm & Close Consultation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
