import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  UserSquare2, ArrowLeft, History, Stethoscope, Activity, Pill, Calendar, Plus, Clock,
  FileHeart, HeartPulse, ShieldAlert, Phone, MapPin, Briefcase, UserCheck, CheckCircle2,
  ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import api from '../../api/axios.js';
import ToothChart from './consultation/ToothChart.jsx';
import PrescriptionHistoryPanel from '../../components/common/PrescriptionHistoryPanel.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

export default function PatientProfileEMR() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();

  const [patient, setPatient] = useState(null);
  const [emrData, setEmrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingConsultation, setCreatingConsultation] = useState(false);

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

  const fetchEMR = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const res = await api.get(`/patients/${patientId}/emr`);
      setPatient(res.data?.patient || null);
      setEmrData(res.data || null);
    } catch (err) {
      console.error('Failed to fetch patient EMR:', err);
      showError(err.response?.data?.message || 'Failed to load patient profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEMR();
  }, [patientId]);

  const handleStartConsultation = async () => {
    try {
      setCreatingConsultation(true);
      const res = await api.post('/consultations/find-or-create', { patientId });
      const consultation = res.data?.consultation;
      if (consultation && (consultation._id || consultation.id)) {
        const cId = consultation._id || consultation.id;
        navigate(`/doctor/consultation/${cId}`);
      } else {
        showError('Could not create or find an active consultation.');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to start consultation.');
    } finally {
      setCreatingConsultation(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl animate-pulse">
        {/* Banner Skeleton */}
        <div className="card p-6 bg-surface border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-slate-200" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-slate-200 rounded-lg" />
                <div className="h-4 w-64 bg-slate-200/70 rounded-md" />
              </div>
            </div>
            <div className="h-10 w-36 bg-slate-200 rounded-xl" />
          </div>
        </div>

        {/* Accordions Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 bg-surface border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 bg-slate-200 rounded" />
                <div className="h-4 w-4 bg-slate-200 rounded" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="card p-12 text-center space-y-4 max-w-xl mx-auto">
        <UserSquare2 size={40} className="mx-auto text-ink-soft/40" />
        <h3 className="font-display text-base font-bold text-ink">Patient Record Not Found</h3>
        <p className="text-xs text-ink-soft">The requested patient record could not be found or has been deleted.</p>
        <Link to="/doctor/patients" className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5 mx-auto">
          <ArrowLeft size={16} /> Back to Patients Directory
        </Link>
      </div>
    );
  }

  const fullName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';
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

  // Extract vitals or latest examination vitals
  const latestConsultation = emrData?.consultations?.[0];
  const vitals = latestConsultation?.examination?.vitals || patient.vitals || {};

  const bp = vitals.bp || vitals.bloodPressure || '120/80 mmHg';
  const pulse = vitals.pulse || vitals.heartRate || '72 bpm';
  const temp = vitals.temperature || '98.6 °F';
  const weight = vitals.weight || '65 kg';
  const bloodGroup = patient.bloodGroup || vitals.bloodGroup || 'O+';

  // Medical, Dental & Habit arrays/strings
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

  const pType = patient.patientType || (patient.age !== undefined && patient.age !== null && Number(patient.age) < 12 ? 'child' : 'adult');

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header & Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/doctor/patients"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline mb-1"
          >
            <ArrowLeft size={16} /> Back to Patients Directory
          </Link>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2 flex-wrap">
            <UserSquare2 size={26} className="text-brand" /> {fullName}
            <span className="badge bg-brand-light/50 text-brand-dark font-mono font-bold text-xs border border-brand/30">
              OP #{patient.opNumber || 'N/A'}
            </span>
            <span className={`badge text-xs font-bold ${pType === 'child' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              {pType === 'child' ? 'Child Dentition' : 'Adult Dentition'}
            </span>
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Patient Clinical EMR & Registration Details
          </p>
        </div>

        {/* TOP-RIGHT CORNER SINGLE VIEW ONLY BADGE */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold shadow-sm shrink-0 self-start sm:self-center">
          <Eye size={15} className="text-blue-600 shrink-0" />
          <span>View Only</span>
        </div>
      </div>

      {/* TWO-COLUMN RESPONSIVE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PATIENT REGISTRATION DETAILS (FIXED/STICKY ON LAPTOP/DESKTOP >=1024px, HIDDEN SCROLLBAR) */}
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

        {/* CLINICAL CONTENT COLUMN (BELOW ON MOBILE/TABLET <1024px, LEFT-SIDE ON LAPTOP/DESKTOP >=1024px) */}
        <div className="lg:col-span-8 lg:order-1 space-y-6">
          {/* COMPLETED DOCTOR EXAMINATIONS & FINDINGS HISTORY (VIEW-ONLY) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Stethoscope size={18} className="text-brand" /> Doctor Examination History
              </h3>
              <span className="badge bg-slate-100 text-slate-700 font-mono text-xs border border-slate-200">
                {emrData?.consultations?.length || 0} Record(s)
              </span>
            </div>

            {emrData?.consultations && emrData.consultations.length > 0 ? (
              <div className="space-y-4">
                {emrData.consultations.map((c) => {
                  const cId = c._id || c.id;
                  const consultDateStr = c.visitDate || c.startedAt || c.createdAt
                    ? new Date(c.visitDate || c.startedAt || c.createdAt).toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                    })
                    : 'N/A';
                  const docName = c.doctor?.name ? `Dr. ${c.doctor.name}` : 'Doctor';

                  const exam = c.examination || {};
                  const extraoralList = exam.extraoral || [];
                  const softTissueList = exam.softTissue || [];
                  const gingivalList = exam.gingivalFindings || [];
                  const periodontalNotes = exam.periodontalDetails || '';
                  const overallNotesStr = exam.overallNotes || c.clinicalNotes || c.notes || '';

                  const chiefComplaints = exam.chiefComplaints || c.chiefComplaints || c.reason || '';
                  const diagnosesList = c.diagnoses || [];
                  const treatmentsList = c.treatmentPlans || [];

                  return (
                    <div key={cId} className="card p-5 bg-surface border-border space-y-4 shadow-sm">
                      {/* Consultation Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-ink flex items-center gap-1.5">
                            <Calendar size={15} className="text-brand" /> {consultDateStr}
                          </span>
                          <span className="text-xs font-semibold text-ink-soft">• {docName}</span>
                        </div>
                      </div>

                      {chiefComplaints && (
                        <div className="p-3 rounded-xl bg-bg/50 border border-border space-y-1 text-xs">
                          <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Chief Complaints</span>
                          <p className="font-semibold text-ink leading-relaxed">{chiefComplaints}</p>
                        </div>
                      )}

                      {/* 4 SAVED EXAMINATION SECTIONS */}
                      <div className="border border-border rounded-xl p-4 bg-bg/30 space-y-3">
                        <div className="flex items-center justify-between border-b border-border/80 pb-2">
                          <h4 className="font-display text-xs font-bold text-ink flex items-center gap-1.5">
                            <Stethoscope size={14} className="text-brand" /> Clinical Examination Details
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* 1. Extraoral Examination */}
                          <div className="p-3 rounded-lg bg-surface border border-border/70 space-y-1">
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">
                              Extraoral Examination
                            </span>
                            {extraoralList.length > 0 ? (
                              <div className="space-y-1.5 pt-1">
                                {extraoralList.map((eItem, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-2">
                                    <span className="badge bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                                      {eItem.finding}
                                    </span>
                                    <span className="text-ink-soft text-[11px] font-medium">{eItem.notes || 'No notes'}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-ink-soft/70 italic text-[11px]">No extraoral findings logged</span>
                            )}
                          </div>

                          {/* 2. Intraoral Soft Tissue Examination */}
                          <div className="p-3 rounded-lg bg-surface border border-border/70 space-y-1">
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">
                              Intraoral Soft Tissue Examination
                            </span>
                            {softTissueList.length > 0 ? (
                              <div className="space-y-1.5 pt-1">
                                {softTissueList.map((stItem, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-2">
                                    <span className="badge bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-bold">
                                      {stItem.area}
                                    </span>
                                    <span className="text-ink-soft text-[11px] font-medium">{stItem.notes || 'No notes'}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-ink-soft/70 italic text-[11px]">No soft tissue findings logged</span>
                            )}
                          </div>

                          {/* 3. Gingival & Periodontal Findings */}
                          <div className="p-3 rounded-lg bg-surface border border-border/70 space-y-1">
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">
                              Gingival & Periodontal Findings
                            </span>
                            {gingivalList.length > 0 || periodontalNotes ? (
                              <div className="space-y-1.5 pt-1">
                                {gingivalList.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {gingivalList.map((gItem, idx) => (
                                      <span key={idx} className="badge bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                                        {gItem}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {periodontalNotes && (
                                  <p className="text-ink font-medium text-[11px] leading-relaxed">{periodontalNotes}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-ink-soft/70 italic text-[11px]">No gingival / periodontal findings logged</span>
                            )}
                          </div>

                          {/* 4. Overall Examination Notes */}
                          <div className="p-3 rounded-lg bg-surface border border-border/70 space-y-1">
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">
                              Overall Examination Notes
                            </span>
                            {overallNotesStr ? (
                              <p className="text-ink font-medium text-[11px] leading-relaxed pt-0.5">{overallNotesStr}</p>
                            ) : (
                              <span className="text-ink-soft/70 italic text-[11px]">No overall examination notes logged</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {(diagnosesList.length > 0 || treatmentsList.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                          {diagnosesList.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Diagnoses Logged</span>
                              <div className="flex flex-wrap gap-1">
                                {diagnosesList.map((d, idx) => (
                                  <span key={idx} className="badge bg-purple-50 text-purple-800 border border-purple-200 text-xs">
                                    {d.diseaseName || d.name || d}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {treatmentsList.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Treatment Plans</span>
                              <div className="flex flex-wrap gap-1">
                                {treatmentsList.map((t, idx) => (
                                  <span key={idx} className="badge bg-blue-50 text-blue-800 border border-blue-200 text-xs">
                                    {t.procedureName || t.treatment || t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card p-6 text-center text-xs text-ink-soft space-y-1">
                <Stethoscope size={24} className="mx-auto text-ink-soft/40" />
                <p className="font-semibold text-ink">No completed doctor examination records on file yet.</p>
              </div>
            )}
          </div>

          {/* TOOTH CHART SECTION */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <div>
                <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                  <Activity size={18} className="text-brand" /> FDI Tooth Chart & Conditions Log
                </h3>
                <p className="text-xs text-ink-soft mt-0.5">
                  Select any tooth to inspect past treatment histories.
                </p>
              </div>
            </div>

            <ToothChart patientId={patientId} patient={patient} isReadOnly={true} />
          </div>

          {/* PATIENT PRESCRIPTION HISTORY SECTION */}
          <PrescriptionHistoryPanel patientId={patientId} title="Patient Prescription History & Past Medications" />
        </div>
      </div>
    </div>
  );
}
