import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserSquare2, Phone, Calendar, Stethoscope, FileText,
  Activity, Grid3x3, FileHeart, Pill, AlertTriangle, CheckCircle2, Search,
  Check, Lock, X, LogOut, ChevronDown, ChevronUp, HeartPulse, ShieldAlert, MapPin, Briefcase
} from 'lucide-react';
import api from '../../api/axios.js';
import ExaminationTab from './consultation/ExaminationTab.jsx';
import ToothChart from './consultation/ToothChart.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import DiagnosisTab from './consultation/DiagnosisTab.jsx';
import TreatmentPlanTab from './consultation/TreatmentPlanTab.jsx';
import PrescriptionsTab from './consultation/PrescriptionsTab.jsx';
import InvestigationsTab from './consultation/InvestigationsTab.jsx';

const CLINICAL_TABS = [
  { id: 'examination', label: 'Examination', icon: FileHeart },
  { id: 'tooth-chart', label: 'Tooth Chart', icon: Grid3x3 },
  { id: 'prescriptions', label: 'Prescription', icon: Pill },
  // { id: 'diagnosis', label: 'Diagnosis', icon: Stethoscope },
  // { id: 'investigations', label: 'Investigations', icon: Search },
  { id: 'treatment-plan', label: 'Treatment Plan', icon: Activity },
];

export default function Consultation() {
  const { consultationId } = useParams();
  const navigate = useNavigate();

  const [consultation, setConsultation] = useState(null);
  const [activeTab, setActiveTab] = useState('examination');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Accordion state: first 3 expanded by default, 4 & 5 collapsed by default
  const [accordions, setAccordions] = useState({
    details: true,
    contact: true,
    vitals: true,
    medical: false,
    dental: false,
  });

  const toggleAccordion = (key) => {
    setAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Close Consultation & Follow-Up Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [enableFollowUp, setEnableFollowUp] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [followUpForm, setFollowUpForm] = useState({
    recommendedDate: '',
    reason: '',
    instructions: '',
    treatmentStatus: '',
  });
  const [existingFollowUpId, setExistingFollowUpId] = useState(null);
  const [closeModalError, setCloseModalError] = useState('');
  const [closeSuccessMsg, setCloseSuccessMsg] = useState('');
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

  const formatDateForInput = (d) => {
    if (!d) return '';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toISOString().split('T')[0];
  };

  const handleOpenCloseModal = async () => {
    setCloseModalError('');
    setCloseSuccessMsg('');
    setCloseNotes('');

    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    const defaultDateStr = defaultDate.toISOString().split('T')[0];

    try {
      // Check if a follow-up already exists for this consultation
      const res = await api.get(`/follow-ups?consultation=${consultationId}`);
      const list = res.data?.followUps || [];
      if (list.length > 0) {
        const existing = list[0];
        setExistingFollowUpId(existing._id || existing.id);
        setEnableFollowUp(true);
        setFollowUpForm({
          recommendedDate: formatDateForInput(existing.recommendedDate) || defaultDateStr,
          reason: existing.reason || '',
          instructions: existing.instructions || '',
          treatmentStatus: existing.treatmentStatus || '',
        });
      } else {
        setExistingFollowUpId(null);
        setEnableFollowUp(false);
        setFollowUpForm({
          recommendedDate: defaultDateStr,
          reason: '',
          instructions: '',
          treatmentStatus: '',
        });
      }
    } catch (err) {
      console.error('Failed to check existing follow-up:', err);
      setExistingFollowUpId(null);
      setEnableFollowUp(false);
      setFollowUpForm({
        recommendedDate: defaultDateStr,
        reason: '',
        instructions: '',
        treatmentStatus: '',
      });
    }

    setShowCloseModal(true);
  };

  const handleConfirmClose = async (e) => {
    if (e) e.preventDefault();
    setCloseModalError('');
    setCloseSuccessMsg('');

    if (enableFollowUp) {
      if (!followUpForm.recommendedDate) {
        setCloseModalError('Please select a recommended follow-up date.');
        return;
      }
    }

    setClosing(true);
    try {
      const payload = {
        closeNotes: closeNotes.trim(),
        followUp: enableFollowUp
          ? {
            recommendedDate: followUpForm.recommendedDate,
            reason: followUpForm.reason.trim(),
            instructions: followUpForm.instructions.trim(),
            treatmentStatus: followUpForm.treatmentStatus.trim(),
          }
          : null,
      };

      const res = await api.post(`/consultations/${consultationId}/close`, payload);

      const savedFu = res.data?.followUp;
      let successStr = 'Consultation closed successfully.';
      if (savedFu && savedFu.recommendedDate) {
        const recDateStr = new Date(savedFu.recommendedDate).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        successStr = `Consultation closed • Follow-up scheduled for ${recDateStr}`;
      }

      setCloseSuccessMsg(successStr);

      setTimeout(() => {
        setShowCloseModal(false);
        navigate('/doctor/queue');
      }, 1400);
    } catch (err) {
      setCloseModalError(err.response?.data?.message || 'Failed to close consultation.');
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

  const dobStr = patient.dateOfBirth || patient.dob
    ? new Date(patient.dateOfBirth || patient.dob).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    })
    : 'N/A';

  const regDateStr = patient.registrationDate || patient.createdAt
    ? new Date(patient.registrationDate || patient.createdAt).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    })
    : 'N/A';

  const pType = patient.patientType || (patient.age !== undefined && patient.age !== null && Number(patient.age) < 12 ? 'child' : 'adult');

  const vitals = patient.vitals || {};
  const bp = vitals.bp || vitals.bloodPressure || '120/80 mmHg';
  const pulse = vitals.pulse || vitals.heartRate || '72 bpm';
  const temp = vitals.temperature || '98.6 °F';
  const bloodGroup = patient.bloodGroup || vitals.bloodGroup || 'O+';

  const medicalHistoryList = Array.isArray(patient.medicalHistory)
    ? patient.medicalHistory
    : patient.medicalHistory
      ? [patient.medicalHistory]
      : [];

  const dentalHistoryList = Array.isArray(patient.dentalHistory)
    ? patient.dentalHistory
    : patient.dentalHistory
      ? [patient.dentalHistory]
      : [];

  const allergiesList = Array.isArray(patient.allergies)
    ? patient.allergies
    : patient.allergies
      ? [patient.allergies]
      : [];

  const habitsList = Array.isArray(patient.habits)
    ? patient.habits
    : patient.habits
      ? [patient.habits]
      : [];

  return (
    <div className="space-y-6 max-w-7xl">
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
            onClick={handleOpenCloseModal}
            className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 text-xs font-bold"
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

      {/* TWO-COLUMN RESPONSIVE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PATIENT REGISTRATION DETAILS (FIXED/STICKY ON LAPTOP/DESKTOP >=1024px, HIDDEN SCROLLBAR, COLLAPSIBLE ACCORDIONS) */}
        <div className="lg:col-span-4 lg:order-2 space-y-3 lg:sticky lg:top-4 self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto scrollbar-none pr-0.5">
          {/* Card 1: Core Registration Profile & Demographics */}
          <div className="card bg-surface border-border overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleAccordion('details')}
              className="w-full p-4 flex items-center justify-between text-left font-display text-xs font-bold text-ink hover:bg-bg/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <UserSquare2 size={16} className="text-brand" /> Patient Details
              </span>
              {accordions.details ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
            </button>

            {accordions.details && (
              <div className="p-4 pt-0 space-y-4 text-xs border-t border-border/60">
                <div className="flex items-center gap-3.5 pt-3">
                  <div className="h-12 w-12 rounded-2xl bg-brand text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                    {fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink">{fullName}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="font-mono text-xs font-bold text-brand">OP #{patient.opNumber || 'N/A'}</span>
                      <span className={`badge text-[10px] py-0 px-1.5 font-bold ${pType === 'child' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {pType === 'child' ? 'Child' : 'Adult'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-bg/60 border border-border">
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Age / Sex</span>
                    <span className="font-semibold text-ink">{patient.age !== undefined ? `${patient.age} yrs` : 'N/A'} / {patient.sex || 'N/A'}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-bg/60 border border-border">
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Date of Birth</span>
                    <span className="font-medium text-ink">{dobStr}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Contact & Personal Information */}
          <div className="card bg-surface border-border overflow-hidden shadow-sm text-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('contact')}
              className="w-full p-4 flex items-center justify-between text-left font-display text-xs font-bold text-ink hover:bg-bg/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Phone size={15} className="text-brand" /> Contact Information
              </span>
              {accordions.contact ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
            </button>

            {accordions.contact && (
              <div className="p-4 pt-0 space-y-2.5 border-t border-border/60 pt-3">
                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Phone Number</span>
                  <span className="font-mono font-semibold text-ink text-xs">{patient.phone || 'N/A'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Occupation</span>
                  <span className="font-medium text-ink flex items-center gap-1">
                    <Briefcase size={12} className="text-ink-soft shrink-0" /> {patient.occupation || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Registration Date</span>
                  <span className="font-medium text-ink">{regDateStr}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Address</span>
                  <span className="font-medium text-ink leading-relaxed flex items-start gap-1">
                    <MapPin size={12} className="text-ink-soft shrink-0 mt-0.5" /> {patient.address || 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Clinical Vitals */}
          <div className="card bg-surface border-border overflow-hidden shadow-sm text-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('vitals')}
              className="w-full p-4 flex items-center justify-between text-left font-display text-xs font-bold text-ink hover:bg-bg/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <HeartPulse size={15} className="text-rose-600" /> Patient Vitals
              </span>
              {accordions.vitals ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
            </button>

            {accordions.vitals && (
              <div className="p-4 pt-0 border-t border-border/60 pt-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-bg border border-border">
                    <span className="text-[10px] text-ink-soft block font-semibold">Blood Pressure</span>
                    <span className="font-mono font-bold text-ink text-xs">{bp}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-bg border border-border">
                    <span className="text-[10px] text-ink-soft block font-semibold">Heart Rate</span>
                    <span className="font-mono font-bold text-ink text-xs">{pulse}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-bg border border-border">
                    <span className="text-[10px] text-ink-soft block font-semibold">Temperature</span>
                    <span className="font-mono font-bold text-ink text-xs">{temp}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-bg border border-border">
                    <span className="text-[10px] text-ink-soft block font-semibold">Blood Group</span>
                    <span className="font-mono font-bold text-brand text-xs">{bloodGroup}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Medical History & Allergies (Collapsed by default) */}
          <div className="card bg-surface border-border overflow-hidden shadow-sm text-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('medical')}
              className="w-full p-4 flex items-center justify-between text-left font-display text-xs font-bold text-ink hover:bg-bg/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-amber-600" /> Medical History & Allergies
              </span>
              {accordions.medical ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
            </button>

            {accordions.medical && (
              <div className="p-4 pt-0 space-y-3 border-t border-border/60 pt-3">
                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">Known Drug Allergies</span>
                  {allergiesList.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {allergiesList.map((alg, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-[11px]">
                          {alg}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-ink-soft/70 italic">No known drug allergies reported</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">Systemic Medical History</span>
                  {medicalHistoryList.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {medicalHistoryList.map((mItem, i) => (
                        <span key={i} className="badge bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                          {mItem}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-ink-soft/70 italic">No systemic conditions logged</span>
                  )}
                </div>

                {patient.currentMedications && (
                  <div>
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">Current Medications</span>
                    <p className="text-ink font-medium leading-relaxed bg-bg/50 p-2 rounded-lg border border-border">
                      {patient.currentMedications}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 5: Past Dental History & Personal Habits (Collapsed by default) */}
          <div className="card bg-surface border-border overflow-hidden shadow-sm text-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('dental')}
              className="w-full p-4 flex items-center justify-between text-left font-display text-xs font-bold text-ink hover:bg-bg/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Stethoscope size={15} className="text-brand" /> Dental History & Habits
              </span>
              {accordions.dental ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
            </button>

            {accordions.dental && (
              <div className="p-4 pt-0 space-y-3 border-t border-border/60 pt-3">
                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">Previous Dental Procedures</span>
                  {dentalHistoryList.length > 0 ? (
                    <p className="text-ink font-medium leading-relaxed bg-bg/50 p-2 rounded-lg border border-border">
                      {dentalHistoryList.join(', ')}
                    </p>
                  ) : (
                    <span className="text-ink-soft/70 italic">No past dental procedures on record</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">Personal Habits</span>
                  {habitsList.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {habitsList.map((hItem, i) => (
                        <span key={i} className="badge bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-semibold">
                          {hItem}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-ink-soft/70 italic">No personal habits reported</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAIN CLINICAL WORKSPACE COLUMN (BELOW ON MOBILE/TABLET <1024px, LEFT-SIDE ON LAPTOP/DESKTOP >=1024px) */}
        <div className="lg:col-span-8 lg:order-1 space-y-4">
          {/* CLINICAL TAB BAR */}
          <div className="flex border-b border-border space-x-1 overflow-x-auto scrollbar-none">
            {CLINICAL_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${isActive
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

          {/* CLINICAL TABS CONTENT - Kept persistently mounted to preserve unsaved form inputs & draft states */}
          <div className={activeTab === 'examination' ? 'block' : 'hidden'}>
            <ExaminationTab consultation={consultation} isReadOnly={isCompleted} />
          </div>

          <div className={activeTab === 'tooth-chart' ? 'block' : 'hidden'}>
            <ToothChart
              patientId={consultation.patient?._id || consultation.patient?.id}
              consultationId={consultation._id || consultation.id}
              isReadOnly={isCompleted}
              patient={consultation.patient}
            />
          </div>

          <div className={activeTab === 'prescriptions' ? 'block' : 'hidden'}>
            <PrescriptionsTab consultation={consultation} isReadOnly={isCompleted} />
          </div>

          <div className={activeTab === 'diagnosis' ? 'block' : 'hidden'}>
            <DiagnosisTab consultation={consultation} isReadOnly={isCompleted} />
          </div>

          <div className={activeTab === 'investigations' ? 'block' : 'hidden'}>
            <InvestigationsTab consultation={consultation} isReadOnly={isCompleted} />
          </div>

          <div className={activeTab === 'treatment-plan' ? 'block' : 'hidden'}>
            <TreatmentPlanTab consultation={consultation} isReadOnly={isCompleted} />
          </div>
        </div>
      </div>

      {/* 2-PART CLOSE CONSULTATION MODAL */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-xl max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-ink flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-600" /> Close Consultation
                </h3>
                <p className="text-xs text-ink-soft">
                  Review follow-up recommendation and add optional closing notes for this visit.
                </p>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="rounded-lg p-1 text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmClose} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                {closeSuccessMsg && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>{closeSuccessMsg}</span>
                  </div>
                )}

                {closeModalError && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    <span>{closeModalError}</span>
                  </div>
                )}

                {/* PART A: FOLLOW-UP SECTION */}
                <div className="rounded-xl border border-border bg-bg/40 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-brand" />
                      <span className="font-bold text-ink text-xs">Follow-Up Recommendation</span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableFollowUp}
                        onChange={(e) => setEnableFollowUp(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                      <span className="ml-2 text-xs font-semibold text-ink">
                        {enableFollowUp ? 'Follow-Up Recommended' : 'No Follow-Up Required'}
                      </span>
                    </label>
                  </div>

                  {existingFollowUpId && (
                    <p className="text-[11px] text-brand font-medium italic">
                      ℹ️ Pre-filled from existing follow-up created for this visit. Updating fields here will update the scheduled follow-up.
                    </p>
                  )}

                  {enableFollowUp && (
                    <div className="space-y-3 pt-2 border-t border-border/60 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <DatePicker
                            label="Recommended Date"
                            isRequired={enableFollowUp}
                            value={followUpForm.recommendedDate}
                            onChange={(date, dateStr) => setFollowUpForm({ ...followUpForm, recommendedDate: dateStr })}
                            minDate={new Date()}
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-ink-soft mb-1">
                            Reason for Follow-Up <span className="text-ink-soft/70 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            className="input-field py-1.5"
                            placeholder="e.g. Suture removal, Crown fit check (optional)"
                            value={followUpForm.reason}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, reason: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-ink-soft mb-1">Patient Instructions</label>
                        <textarea
                          rows={2}
                          className="input-field py-1.5"
                          placeholder="e.g. Continue warm saline rinses. Avoid chewing on right side."
                          value={followUpForm.instructions}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, instructions: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-ink-soft mb-1">Treatment Status Note (Optional)</label>
                        <input
                          type="text"
                          className="input-field py-1.5"
                          placeholder="e.g. Root canal step 1 completed, awaiting final obturation"
                          value={followUpForm.treatmentStatus}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, treatmentStatus: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* PART B: CONSULTATION SUMMARY SECTION */}
                <div className="space-y-2">
                  <label className="block font-semibold text-ink-soft">
                    Closing Summary Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    className="input-field py-1.5"
                    placeholder="Enter optional clinical summary, post-op care advice, or final diagnosis notes..."
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                  />
                  <p className="text-[11px] text-ink-soft">
                    Closing this consultation will complete the visit and lock clinical records for editing.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  className="btn-secondary text-xs py-1.5 px-3"
                  onClick={() => setShowCloseModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closing}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 px-4 font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>{closing ? 'Closing Consultation...' : 'Confirm & Close Consultation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
