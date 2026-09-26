import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserSquare2, Phone, Calendar, Stethoscope, FileText,
  Activity, Grid3x3, FileHeart, Pill, AlertTriangle, CheckCircle2, Search,
  Check, Lock, X, LogOut, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, HeartPulse, ShieldAlert, MapPin, Briefcase,
  Wallet, Receipt, Info, Edit3
} from 'lucide-react';
import { formatAge, formatPatientFullName, capitalizeWords } from '../../utils/formatters.js';
import api from '../../api/axios.js';
import ExaminationTab from './consultation/ExaminationTab.jsx';
import ToothChart from './consultation/ToothChart.jsx';
import DiagnosisTab from './consultation/DiagnosisTab.jsx';
import TreatmentPlanTab from './consultation/TreatmentPlanTab.jsx';
import PrescriptionsTab from './consultation/PrescriptionsTab.jsx';
import InvestigationsTab from './consultation/InvestigationsTab.jsx';
import BillingTab from './consultation/BillingTab.jsx';
import PatientBillingSummary from '../../components/common/PatientBillingSummary.jsx';
import PatientSectionEditModal from '../../components/common/PatientSectionEditModal.jsx';

const CLINICAL_TABS = [
  { id: 'examination', label: 'Examination', icon: FileHeart },
  { id: 'tooth-chart', label: 'Tooth Chart', icon: Grid3x3 },
  { id: 'prescriptions', label: 'Prescription', icon: Pill },
  // { id: 'diagnosis', label: 'Diagnosis', icon: Stethoscope },
  // { id: 'investigations', label: 'Investigations', icon: Search },
  // { id: 'treatment-plan', label: 'Treatment Plan', icon: Activity },
  { id: 'billing', label: 'Billing', icon: Wallet },
];

export default function Consultation() {
  const { consultationId } = useParams();
  const navigate = useNavigate();

  const [consultation, setConsultation] = useState(null);
  const [activeTab, setActiveTab] = useState('examination');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Accordion state: all accordions closed by default
  const [accordions, setAccordions] = useState({
    details: false,
    contact: false,
    vitals: false,
    medical: false,
    dental: false,
  });

  const toggleAccordion = (key) => {
    setAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleAllAccordions = (openState) => {
    setAccordions({
      details: openState,
      contact: openState,
      vitals: openState,
      medical: openState,
      dental: openState,
    });
  };

  // State for direct section editing modal
  const [editingSection, setEditingSection] = useState(null);

  // Close Consultation Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [scheduledFollowUp, setScheduledFollowUp] = useState(null);
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

  const handleOpenCloseModal = async () => {
    setCloseModalError('');
    setCloseSuccessMsg('');
    setCloseNotes('');

    try {
      // Check if a follow-up is already scheduled for this consultation
      const res = await api.get(`/follow-ups?consultation=${consultationId}`);
      const list = res.data?.followUps || [];
      if (list.length > 0) {
        setScheduledFollowUp(list[0]);
      } else {
        setScheduledFollowUp(null);
      }
    } catch (err) {
      console.error('Failed to check existing follow-up:', err);
      setScheduledFollowUp(null);
    }

    setShowCloseModal(true);
  };

  const handleConfirmClose = async (e) => {
    if (e) e.preventDefault();
    setCloseModalError('');
    setCloseSuccessMsg('');
    setClosing(true);

    try {
      const payload = {
        closeNotes: capitalizeWords(closeNotes.trim()),
      };

      const res = await api.post(`/consultations/${consultationId}/close`, payload);

      const savedFu = res.data?.followUp || scheduledFollowUp;
      let successStr = 'Consultation closed successfully.';
      if (savedFu && savedFu.recommendedDate) {
        const recDateStr = new Date(savedFu.recommendedDate).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const timeStr = savedFu.scheduledAppointment?.time ? ` at ${savedFu.scheduledAppointment.time}` : '';
        successStr = `Consultation closed • Follow-up preserved for ${recDateStr}${timeStr}`;
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
      <div className="space-y-6 max-w-7xl animate-pulse">
        {/* Top Header & Patient Bar Skeleton */}
        <div className="card p-5 bg-surface border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-5 w-44 bg-slate-200 rounded" />
                <div className="h-3.5 w-60 bg-slate-200/70 rounded" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-28 bg-slate-200 rounded-xl" />
              <div className="h-9 w-36 bg-slate-200 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="flex gap-2 border-b border-border pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-28 bg-slate-200 rounded-lg" />
          ))}
        </div>

        {/* Workspace Main Area Skeleton */}
        <div className="card p-6 bg-surface border border-slate-200 shadow-sm space-y-4">
          <div className="h-6 w-56 bg-slate-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-slate-100 rounded-xl" />
            <div className="h-32 bg-slate-100 rounded-xl" />
          </div>
        </div>
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
  const fullName = formatPatientFullName(patient) || 'Patient';
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
  const bp = vitals.bp || vitals.bloodPressure || null;
  const pulse = vitals.pulse || vitals.heartRate || null;
  const temp = vitals.temperature || null;
  const rbs = vitals.rbs || null;
  const bloodGroup = patient.bloodGroup || vitals.bloodGroup || null;

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

      {/* PATIENT REGISTRATION & CLINICAL SUMMARY ACCORDIONS (ABOVE TABS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">
            Patient Summary & Clinical Records
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleToggleAllAccordions(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-brand bg-brand-light/60 hover:bg-brand-light border border-brand/20 transition-colors shadow-2xs"
              title="Open all sections"
            >
              <ChevronsDown size={12} /> Open All
            </button>
            <button
              type="button"
              onClick={() => handleToggleAllAccordions(false)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-ink-soft hover:text-ink bg-surface hover:bg-bg border border-border transition-colors shadow-2xs"
              title="Close all sections"
            >
              <ChevronsUp size={12} /> Close All
            </button>
          </div>
        </div>

        {/* Primary Patient Cards (Details, Contact, Vitals) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {/* Card 1: Core Registration Profile & Demographics */}
          <div className="card bg-surface border-border overflow-hidden shadow-sm">
            <div
              onClick={() => toggleAccordion('details')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left font-display text-xs font-bold text-ink hover:bg-bg/50 transition-colors cursor-pointer select-none"
            >
              <span className="flex items-center gap-2">
                <UserSquare2 size={16} className="text-brand" /> Patient Details
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSection('details');
                  }}
                  className="p-1 rounded-md text-ink-soft hover:text-brand hover:bg-brand-light/60 transition-colors"
                  title="Edit Patient Details"
                  aria-label="Edit Patient Details"
                >
                  <Edit3 size={14} />
                </button>
                {accordions.details ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
              </div>
            </div>

            {accordions.details && (
              <div className="p-4 pt-0 space-y-3.5 text-xs border-t border-border/60">
                <div className="flex items-center gap-3 pt-3">
                  <div className="h-11 w-11 rounded-2xl bg-brand text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                    {fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-bold text-ink truncate">{fullName}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="font-mono text-xs font-bold text-brand">OP #{patient.opNumber || 'N/A'}</span>
                      <span className={`badge text-[10px] py-0 px-1.5 font-bold ${pType === 'child' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {pType === 'child' ? 'Child' : 'Adult'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-bg/60 border border-border">
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Age / Sex</span>
                    <span className="font-semibold text-ink">{patient.age !== undefined && patient.age !== null && patient.age !== '' ? `${formatAge(patient.age, 'yrs')}` : 'Not recorded'} / {patient.sex || 'Not recorded'}</span>
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
            <div
              onClick={() => toggleAccordion('contact')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left font-display text-xs font-bold text-ink hover:bg-bg/50 transition-colors cursor-pointer select-none"
            >
              <span className="flex items-center gap-2">
                <Phone size={15} className="text-brand" /> Contact Information
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSection('contact');
                  }}
                  className="p-1 rounded-md text-ink-soft hover:text-brand hover:bg-brand-light/60 transition-colors"
                  title="Edit Contact Information"
                  aria-label="Edit Contact Information"
                >
                  <Edit3 size={14} />
                </button>
                {accordions.contact ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
              </div>
            </div>

            {accordions.contact && (
              <div className="p-4 pt-0 space-y-2.5 border-t border-border/60 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Primary Phone</span>
                    <span className="font-mono font-semibold text-ink text-xs">{patient.primaryPhone || patient.phone || 'Not recorded'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Secondary Phone</span>
                    <span className="font-mono font-semibold text-ink text-xs">{patient.secondaryPhone || 'Not recorded'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Occupation</span>
                    <span className="font-medium text-ink flex items-center gap-1">
                      <Briefcase size={12} className="text-ink-soft shrink-0" /> {patient.occupation || 'Not recorded'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Registration Date</span>
                    <span className="font-medium text-ink">{regDateStr || 'Not recorded'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Address</span>
                  <span className="font-medium text-ink leading-relaxed flex items-start gap-1">
                    <MapPin size={12} className="text-ink-soft shrink-0 mt-0.5" /> {patient.address || 'Not recorded'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Clinical Vitals */}
          <div className="card bg-surface border-border overflow-hidden shadow-sm text-xs">
            <div
              onClick={() => toggleAccordion('vitals')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left font-display text-xs font-bold text-ink hover:bg-bg/50 transition-colors cursor-pointer select-none"
            >
              <span className="flex items-center gap-2">
                <HeartPulse size={15} className="text-rose-600" /> Patient Vitals
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSection('vitals');
                  }}
                  className="p-1 rounded-md text-ink-soft hover:text-brand hover:bg-brand-light/60 transition-colors"
                  title="Edit Patient Vitals"
                  aria-label="Edit Patient Vitals"
                >
                  <Edit3 size={14} />
                </button>
                {accordions.vitals ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
              </div>
            </div>

            {accordions.vitals && (
              <div className="p-4 pt-0 border-t border-border/60 pt-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-bg border border-border">
                    <span className="text-[10px] text-ink-soft block font-semibold">Blood Pressure</span>
                    <span className={`font-mono font-bold text-xs ${bp ? 'text-ink' : 'text-ink-soft italic font-normal'}`}>
                      {bp || 'Not recorded'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-bg border border-border">
                    <span className="text-[10px] text-ink-soft block font-semibold">Random Blood Sugar</span>
                    <span className={`font-mono font-bold text-xs ${rbs ? 'text-ink' : 'text-ink-soft italic font-normal'}`}>
                      {rbs || 'Not recorded'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-bg border border-border">
                    <span className="text-[10px] text-ink-soft block font-semibold">Heart Rate / Pulse</span>
                    <span className={`font-mono font-bold text-xs ${pulse ? 'text-ink' : 'text-ink-soft italic font-normal'}`}>
                      {pulse || 'Not recorded'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-bg border border-border">
                    <span className="text-[10px] text-ink-soft block font-semibold">Temperature</span>
                    <span className={`font-mono font-bold text-xs ${temp ? 'text-ink' : 'text-ink-soft italic font-normal'}`}>
                      {temp || 'Not recorded'}
                    </span>
                  </div>

                  {bloodGroup ? (
                    <div className="p-2.5 rounded-xl bg-bg border border-border col-span-2">
                      <span className="text-[10px] text-ink-soft block font-semibold">Blood Group</span>
                      <span className="font-mono font-bold text-brand text-xs">{bloodGroup}</span>
                    </div>
                  ) : null}

                  {Object.entries(vitals).map(([key, val]) => {
                    if (['bp', 'bloodPressure', 'rbs', 'pulse', 'heartRate', 'temperature', 'temp', 'bloodGroup'].includes(key) || !val) {
                      return null;
                    }
                    return (
                      <div key={key} className="p-2.5 rounded-xl bg-bg border border-border">
                        <span className="text-[10px] text-ink-soft block font-semibold">{key}</span>
                        <span className="font-mono font-bold text-ink text-xs">{String(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clinical History & Habits Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Card 4: Medical History & Allergies (Collapsed by default) */}
          <div className="card bg-surface border-border overflow-hidden shadow-sm text-xs">
            <div
              onClick={() => toggleAccordion('medical')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left font-display text-xs font-bold text-ink hover:bg-bg/50 transition-colors cursor-pointer select-none"
            >
              <span className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-amber-600" /> Medical History & Allergies
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSection('medical');
                  }}
                  className="p-1 rounded-md text-ink-soft hover:text-brand hover:bg-brand-light/60 transition-colors"
                  title="Edit Medical History & Allergies"
                  aria-label="Edit Medical History & Allergies"
                >
                  <Edit3 size={14} />
                </button>
                {accordions.medical ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
              </div>
            </div>

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

                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">Current Medications</span>
                  {patient.currentMedications ? (
                    <p className="text-ink font-medium leading-relaxed bg-bg/50 p-2 rounded-lg border border-border">
                      {patient.currentMedications}
                    </p>
                  ) : (
                    <span className="text-ink-soft/70 italic">Not recorded</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Card 5: Past Dental History & Personal Habits (Collapsed by default) */}
          <div className="card bg-surface border-border overflow-hidden shadow-sm text-xs">
            <div
              onClick={() => toggleAccordion('dental')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left font-display text-xs font-bold text-ink hover:bg-bg/50 transition-colors cursor-pointer select-none"
            >
              <span className="flex items-center gap-2">
                <Stethoscope size={15} className="text-brand" /> Dental History & Habits
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSection('dental');
                  }}
                  className="p-1 rounded-md text-ink-soft hover:text-brand hover:bg-brand-light/60 transition-colors"
                  title="Edit Dental History & Habits"
                  aria-label="Edit Dental History & Habits"
                >
                  <Edit3 size={14} />
                </button>
                {accordions.dental ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
              </div>
            </div>

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
      </div>

      {/* CLINICAL WORKSPACE SECTION (TABS & CONTENT FULL-WIDTH) */}
      <div className="space-y-4 pt-2">
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

        <div className={activeTab === 'billing' ? 'block' : 'hidden'}>
          <BillingTab consultation={consultation} isReadOnly={isCompleted} />
        </div>
      </div>

      {/* 2-PART CLOSE CONSULTATION MODAL */}
      {showCloseModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden !mt-0">
          <div className="card w-full max-w-2xl max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
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

                {/* FOLLOW-UP STATUS DISPLAY (MANAGED VIA PRESCRIPTION TAB) */}
                {scheduledFollowUp && scheduledFollowUp.recommendedDate ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold">
                      <Calendar size={16} className="text-emerald-600 shrink-0" />
                      <span>Next Follow-Up Scheduled:</span>
                    </div>
                    <div className="pl-6 space-y-1 text-ink">
                      <p>
                        <strong>Date & Time: </strong>
                        {new Date(scheduledFollowUp.recommendedDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at {scheduledFollowUp.scheduledAppointment?.time || '10:00 AM'}
                      </p>
                      {scheduledFollowUp.reason && (
                        <p>
                          <strong>Reason / Procedure: </strong>
                          {scheduledFollowUp.reason}
                        </p>
                      )}
                      {scheduledFollowUp.instructions && (
                        <p className="text-ink-soft italic">
                          <strong>Instructions: </strong>
                          {scheduledFollowUp.instructions}
                        </p>
                      )}
                      <p className="text-[11px] text-emerald-700 pt-1 font-medium italic">
                        ✓ This scheduled follow-up will be preserved in the receptionist queue.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-bg/50 p-3.5 text-xs text-ink-soft flex items-start gap-2.5">
                    <Info size={16} className="text-brand shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-ink">No Next Follow-Up Scheduled</p>
                      <p className="mt-0.5">
                        Follow-up appointments can be scheduled directly from the <strong>Prescription</strong> tab.
                      </p>
                    </div>
                  </div>
                )}

                {/* PART B: CONSULTATION SUMMARY SECTION */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Closing Summary Notes <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    className="input-field text-xs py-2 min-h-[58px] resize-y"
                    placeholder="Enter optional clinical summary, post-op care advice, or final diagnosis notes..."
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(capitalizeWords(e.target.value))}
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
        </div>,
        document.body
      )}

      {/* DIRECT SECTION EDIT MODAL FOR PATIENT CARDS */}
      <PatientSectionEditModal
        isOpen={Boolean(editingSection)}
        section={editingSection || 'details'}
        patient={patient}
        onClose={() => setEditingSection(null)}
        onSuccess={(updatedPatient) => {
          setConsultation((prev) => ({
            ...prev,
            patient: updatedPatient,
          }));
          setEditingSection(null);
        }}
      />
    </div>
  );
}
