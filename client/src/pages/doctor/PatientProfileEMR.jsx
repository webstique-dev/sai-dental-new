import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  UserSquare2, ArrowLeft, History, Stethoscope, Activity, Pill, Calendar, Plus, Clock,
  FileHeart, HeartPulse, ShieldAlert, Phone, MapPin, Briefcase, UserCheck, CheckCircle2,
  ChevronDown, ChevronUp, Eye, Edit3, CalendarClock, CalendarDays, CalendarCheck,
  CheckCircle, XCircle, AlertCircle, Sparkles, ExternalLink, ArrowRight, X,
  Receipt, Wallet, CreditCard
} from 'lucide-react';
import { formatAge } from '../../utils/formatters.js';
import api from '../../api/axios.js';
import ToothChart from './consultation/ToothChart.jsx';
import PrescriptionHistoryPanel from '../../components/common/PrescriptionHistoryPanel.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import PatientBillingSummary from '../../components/common/PatientBillingSummary.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';
import PatientDetailsEditModal from '../../components/common/PatientDetailsEditModal.jsx';
import ExaminationEditModal from '../../components/common/ExaminationEditModal.jsx';

const PROFILE_TABS = [
  { id: 'examination', label: 'Doctor Examination History', icon: Stethoscope },
  { id: 'tooth-chart', label: 'FDI Tooth Chart & Conditions', icon: Activity },
  { id: 'prescriptions', label: 'Prescription History', icon: Pill },
  // { id: 'treatment-plan', label: 'Treatment Plans & Diagnoses', icon: FileHeart },
  { id: 'billing', label: 'Billing Summary', icon: Receipt },
  { id: 'followups-appointments', label: 'Follow-Ups & Appointments', icon: CalendarClock },
];

function getInvoiceStatusBadge(status) {
  switch (status) {
    case 'Paid':
      return { label: 'Paid', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'Partially Paid':
      return { label: 'Partially Paid', color: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'Pending':
      return { label: 'Pending', color: 'bg-rose-50 text-rose-800 border-rose-200' };
    case 'Refunded':
      return { label: 'Refunded', color: 'bg-purple-50 text-purple-800 border-purple-200' };
    default:
      return { label: status || 'Pending', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

function getAppointmentStatusBadge(status) {
  switch (status) {
    case 'Completed':
      return { label: 'Completed', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'Scheduled':
      return { label: 'Scheduled', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
    case 'Checked-In':
      return { label: 'Checked-In', color: 'bg-blue-50 text-blue-800 border-blue-200' };
    case 'In Consultation':
    case 'In Progress':
      return { label: 'In Consultation', color: 'bg-teal-50 text-teal-800 border-teal-200' };
    case 'Cancelled':
      return { label: 'Cancelled', color: 'bg-rose-50 text-rose-800 border-rose-200' };
    case 'No Show':
      return { label: 'No Show', color: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'Missed':
      return { label: 'Missed', color: 'bg-orange-50 text-orange-800 border-orange-200' };
    case 'Pending':
      return { label: 'Pending', color: 'bg-purple-50 text-purple-800 border-purple-200' };
    default:
      return { label: status || 'Scheduled', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

function getCleanDoctorName(doctorObj, fallbackObj) {
  const name = doctorObj?.name || fallbackObj?.name;
  if (!name || !name.trim()) return 'Assigned Doctor';
  const clean = name.replace(/^Dr\.?\s*/i, '').trim();
  if (!clean || clean.toLowerCase() === 'doctor') return 'Assigned Doctor';
  return `Dr. ${clean}`;
}

function formatReadableDate(dateInput) {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeSchedule(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  return '';
}

function getVisitTimingBadge(dateVal, status) {
  if (status === 'In Consultation' || status === 'In Progress') {
    return {
      type: 'ongoing',
      label: 'Ongoing',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold flex items-center gap-1.5 shadow-2xs',
      isOngoing: true,
    };
  }

  const rel = formatRelativeSchedule(dateVal);
  if (rel === 'Today') {
    return {
      type: 'today',
      label: 'Today',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
      isOngoing: false,
    };
  }
  if (rel === 'Tomorrow' || (rel && rel.startsWith('In '))) {
    return {
      type: 'upcoming',
      label: 'Upcoming',
      sublabel: rel,
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
      isOngoing: false,
    };
  }
  return {
    type: 'scheduled',
    label: rel || 'Scheduled',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200 font-semibold',
    isOngoing: false,
  };
}

export default function PatientProfileEMR() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useNotification();

  const isAdminView = location.pathname.startsWith('/admin');
  const backPath = isAdminView ? '/admin/patients' : '/doctor/patients';
  const backLabel = isAdminView ? 'Back to Admin Patients' : 'Back to Patients Directory';

  const [patient, setPatient] = useState(null);
  const [emrData, setEmrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingConsultation, setCreatingConsultation] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedConsultationForExamEdit, setSelectedConsultationForExamEdit] = useState(null);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('examination');

  // Accordion state: all expanded by default for full visibility
  const [accordions, setAccordions] = useState({
    details: true,
    contact: true,
    vitals: true,
    medical: true,
    dental: true,
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

  // Real-time live synchronization from database/socket
  useSocketEvent('APPOINTMENT_UPDATED', () => fetchEMR());
  useSocketEvent('QUEUE_UPDATED', () => fetchEMR());
  useSocketEvent('CONSULTATION_STARTED', () => fetchEMR());
  useSocketEvent('CONSULTATION_COMPLETED', () => fetchEMR());
  useSocketEvent('PATIENT_UPDATED', () => fetchEMR());

  const handlePatientUpdated = (updatedPatient) => {
    if (!updatedPatient) return;
    setPatient((prev) => ({
      ...prev,
      ...updatedPatient,
    }));
    fetchEMR();
  };

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

  // Follow-Up Actions & Cancellation Modal State
  const [checkingInFollowUpId, setCheckingInFollowUpId] = useState(null);
  const [cancellingFollowUp, setCancellingFollowUp] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelModalError, setCancelModalError] = useState('');

  const handleFollowUpCheckIn = async (followUpId) => {
    if (!followUpId) return;
    try {
      setCheckingInFollowUpId(followUpId);
      await api.post(`/follow-ups/${followUpId}/check-in`);
      showSuccess('Patient checked in for follow-up! Added to live queue.');
      await fetchEMR();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to check in follow-up.');
    } finally {
      setCheckingInFollowUpId(null);
    }
  };

  const openCancelModal = (item) => {
    setCancellingFollowUp(item);
    setCancellationReason('');
    setCancelModalError('');
  };

  const handleConfirmCancel = async (e) => {
    if (e) e.preventDefault();
    if (!cancellingFollowUp) return;

    const reasonTrimmed = cancellationReason.trim();
    if (!reasonTrimmed) {
      setCancelModalError('Please enter a cancellation reason.');
      return;
    }

    try {
      setCancelSubmitting(true);
      setCancelModalError('');

      const targetId = cancellingFollowUp._id || cancellingFollowUp.id;
      if (cancellingFollowUp.isFollowUp || cancellingFollowUp.recommendedDate) {
        await api.post(`/follow-ups/${targetId}/cancel`, {
          cancellationReason: reasonTrimmed,
        });
      } else {
        await api.patch(`/appointments/${targetId}`, {
          status: 'Cancelled',
          cancellationReason: reasonTrimmed,
        });
      }

      showSuccess('Follow-up / Visit cancelled successfully.');
      setCancellingFollowUp(null);
      setCancellationReason('');
      await fetchEMR();
    } catch (err) {
      setCancelModalError(err.response?.data?.message || 'Failed to cancel follow-up.');
    } finally {
      setCancelSubmitting(false);
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
        <Link to={backPath} className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5 mx-auto">
          <ArrowLeft size={16} /> {backLabel}
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

  // Aggregated treatment plans & diagnoses across all consultations
  const allConsultations = emrData?.consultations || [];
  const allTreatmentPlans = allConsultations.flatMap((c) =>
    (c.treatmentPlans || []).map((tp) => ({
      ...tp,
      consultationId: c._id || c.id,
      visitDate: c.visitDate || c.date || c.startedAt || c.createdAt,
      doctorName: c.doctor?.name || c.examination?.recordedBy?.name || 'Doctor',
    }))
  );

  const allDiagnoses = allConsultations.flatMap((c) =>
    (c.diagnoses || []).map((diag) => ({
      ...(typeof diag === 'object' ? diag : { diseaseName: diag }),
      consultationId: c._id || c.id,
      visitDate: c.visitDate || c.date || c.startedAt || c.createdAt,
      doctorName: c.doctor?.name || c.examination?.recordedBy?.name || 'Doctor',
    }))
  );

  // Appointments & Follow-ups processing
  const allAppointments = emrData?.appointments || [];
  const allFollowUps = emrData?.followUps || [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // Group appointments and unlinked follow-ups into Upcoming vs History
  const upcomingAppointments = allAppointments.filter((a) => {
    const isPastStatus = ['Completed', 'Cancelled', 'No Show', 'Missed'].includes(a.status);
    if (isPastStatus) return false;
    const aDate = a.date ? new Date(a.date) : null;
    if (aDate && aDate < startOfToday && a.status === 'Scheduled') {
      return false; // Missed / past
    }
    return true;
  });

  const historyAppointments = allAppointments.filter((a) => {
    const isPastStatus = ['Completed', 'Cancelled', 'No Show', 'Missed'].includes(a.status);
    if (isPastStatus) return true;
    const aDate = a.date ? new Date(a.date) : null;
    return aDate && aDate < startOfToday;
  });

  const scheduledApptIds = new Set(allAppointments.map((a) => String(a._id)));

  const upcomingFollowUps = allFollowUps.filter((f) => {
    if (f.scheduledAppointment && scheduledApptIds.has(String(f.scheduledAppointment._id || f.scheduledAppointment))) {
      return false; // already represented via appointment
    }
    const isPastStatus = ['Completed', 'Cancelled', 'No Show', 'Missed'].includes(f.status);
    if (isPastStatus) return false;
    return true;
  });

  const historyFollowUps = allFollowUps.filter((f) => {
    if (f.scheduledAppointment && scheduledApptIds.has(String(f.scheduledAppointment._id || f.scheduledAppointment))) {
      return false; // already represented via appointment
    }
    const isPastStatus = ['Completed', 'Cancelled', 'No Show', 'Missed'].includes(f.status);
    return isPastStatus;
  });

  const combinedUpcoming = [
    ...upcomingAppointments.map((a) => ({
      ...a,
      isFollowUp: Boolean(a.followUp),
      sortDate: a.date ? new Date(a.date) : new Date(9999, 11, 31),
    })),
    ...upcomingFollowUps.map((f) => ({
      ...f,
      isFollowUp: true,
      date: f.recommendedDate,
      sortDate: f.recommendedDate ? new Date(f.recommendedDate) : new Date(9999, 11, 31),
    })),
  ].sort((a, b) => a.sortDate - b.sortDate);

  const combinedHistory = [
    ...historyAppointments.map((a) => ({
      ...a,
      isFollowUp: Boolean(a.followUp),
      sortDate: a.date ? new Date(a.date) : new Date(0),
    })),
    ...historyFollowUps.map((f) => ({
      ...f,
      isFollowUp: true,
      date: f.recommendedDate || f.createdAt,
      sortDate: f.recommendedDate ? new Date(f.recommendedDate) : new Date(f.createdAt || 0),
    })),
  ].sort((a, b) => b.sortDate - a.sortDate);

  const nextScheduledVisit = combinedUpcoming[0] || null;

  // Billing summary & invoices
  const billing = emrData?.billing || {
    totalCharges: 0,
    totalPaid: 0,
    totalBalance: 0,
    invoices: [],
  };
  const billingInvoices = billing.invoices || [];

  // Active / Ongoing consultation
  const activeConsultation = allConsultations.find((c) => c.status === 'In Progress');

  // Active / Scheduled follow-ups
  const activeFollowUps = allFollowUps.filter((f) =>
    !['Completed', 'Cancelled', 'No Show', 'Missed'].includes(f.status)
  );
  activeFollowUps.sort((a, b) => {
    const da = a.recommendedDate ? new Date(a.recommendedDate) : new Date(9999, 11, 31);
    const db = b.recommendedDate ? new Date(b.recommendedDate) : new Date(9999, 11, 31);
    return da - db;
  });
  const primaryFollowUp = activeFollowUps[0] || null;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header & Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to={backPath}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline mb-1"
          >
            <ArrowLeft size={16} /> {backLabel}
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

        {/* TOP-RIGHT ACTIONS: START CONSULTATION & EDIT DETAILS */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center">
          <button
            type="button"
            onClick={handleStartConsultation}
            disabled={creatingConsultation}
            className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 text-xs font-bold py-2 px-3.5"
            title="Start or open active consultation for this patient"
          >
            <Stethoscope size={15} />
            <span>{creatingConsultation ? 'Starting...' : 'Start Consultation'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-2 font-bold shadow-sm"
            id="edit-patient-profile-btn"
            title="Edit Patient Details"
          >
            <Edit3 size={15} className="text-brand" />
            <span>Edit Details</span>
          </button>
        </div>
      </div>

      {/* TWO-COLUMN RESPONSIVE LAYOUT (MATCHING CONSULTATION DESIGN) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PATIENT REGISTRATION DETAILS (COLLAPSIBLE ACCORDIONS ON RIGHT COLUMN) */}
        <div className="lg:col-span-4 lg:order-2 space-y-3 self-start">
          {/* Card 1: Core Registration Profile & Demographics */}
          <div className="card bg-surface border-border overflow-hidden shadow-sm">
            <div className="w-full p-4 flex items-center justify-between text-left font-display text-xs font-bold text-ink">
              <button
                type="button"
                onClick={() => toggleAccordion('details')}
                className="flex items-center justify-between gap-2 hover:text-brand transition-colors w-full"
              >
                <span className="flex items-center gap-2">
                  <UserSquare2 size={16} className="text-brand" /> Patient Details
                </span>
                {accordions.details ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
              </button>
            </div>

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
                    <span className="font-semibold text-ink">{patient.age !== undefined && patient.age !== null && patient.age !== '' ? `${formatAge(patient.age, 'yrs')}` : 'N/A'} / {patient.sex || 'N/A'}</span>
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
            <div className="w-full p-4 flex items-center justify-between text-left font-display text-xs font-bold text-ink">
              <button
                type="button"
                onClick={() => toggleAccordion('contact')}
                className="flex items-center justify-between gap-2 hover:text-brand transition-colors w-full"
              >
                <span className="flex items-center gap-2">
                  <Phone size={15} className="text-brand" /> Contact Information
                </span>
                {accordions.contact ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
              </button>
            </div>

            {accordions.contact && (
              <div className="p-4 pt-0 space-y-2.5 border-t border-border/60 pt-3">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Primary Phone</span>
                    <span className="font-mono font-semibold text-ink text-xs">{patient.primaryPhone || patient.phone || 'N/A'}</span>
                  </div>
                  {patient.secondaryPhone && (
                    <div>
                      <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Secondary Phone</span>
                      <span className="font-mono font-semibold text-ink text-xs">{patient.secondaryPhone}</span>
                    </div>
                  )}
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
            <div className="w-full p-4 flex items-center justify-between text-left font-display text-xs font-bold text-ink">
              <button
                type="button"
                onClick={() => toggleAccordion('vitals')}
                className="flex items-center justify-between gap-2 hover:text-brand transition-colors w-full"
              >
                <span className="flex items-center gap-2">
                  <HeartPulse size={15} className="text-rose-600" /> Patient Vitals
                </span>
                {accordions.vitals ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
              </button>
            </div>

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

          {/* Card 4: Medical History & Allergies */}
          <div className="card bg-surface border-border overflow-hidden shadow-sm text-xs">
            <div className="w-full p-4 flex items-center justify-between text-left font-display text-xs font-bold text-ink">
              <button
                type="button"
                onClick={() => toggleAccordion('medical')}
                className="flex items-center justify-between gap-2 hover:text-brand transition-colors w-full"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert size={15} className="text-amber-600" /> Medical History & Allergies
                </span>
                {accordions.medical ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
              </button>
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

          {/* Card 5: Past Dental History & Personal Habits */}
          <div className="card bg-surface border-border overflow-hidden shadow-sm text-xs">
            <div className="w-full p-4 flex items-center justify-between text-left font-display text-xs font-bold text-ink">
              <button
                type="button"
                onClick={() => toggleAccordion('dental')}
                className="flex items-center justify-between gap-2 hover:text-brand transition-colors w-full"
              >
                <span className="flex items-center gap-2">
                  <Stethoscope size={15} className="text-brand" /> Dental History & Habits
                </span>
                {accordions.dental ? <ChevronUp size={16} className="text-ink-soft" /> : <ChevronDown size={16} className="text-ink-soft" />}
              </button>
            </div>

            {accordions.dental && (
              <div className="p-4 pt-0 space-y-3.5 border-t border-border/60 pt-3">
                {/* 1. Previous Dental Procedures */}
                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                    Previous Dental Procedures
                  </span>
                  {dentalHistoryList.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {dentalHistoryList.map((item, idx) => (
                        <span
                          key={idx}
                          className="badge bg-brand-light/60 text-brand-dark border border-brand/20 text-[11px] font-semibold py-1 px-2.5 break-words"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-ink-soft/70 italic text-[11px]">No past dental procedures on record</span>
                  )}
                </div>

                {/* 2. Personal Habits */}
                <div>
                  <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                    Personal Habits
                  </span>
                  {habitsList.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {habitsList.map((hItem, i) => (
                        <span
                          key={i}
                          className="badge bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-semibold py-1 px-2.5"
                        >
                          {hItem}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-ink-soft/70 italic text-[11px]">No personal habits reported</span>
                  )}
                </div>

                {/* 3. Detailed Dental Notes & History */}
                {typeof patient.dentalHistory === 'string' && patient.dentalHistory.trim() && (
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">
                      Detailed Dental Notes & History
                    </span>
                    <div className="p-3 rounded-xl bg-bg/60 border border-border text-xs text-ink font-medium leading-relaxed break-words whitespace-pre-wrap">
                      {patient.dentalHistory}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CLINICAL CONTENT COLUMN WITH CONSULTATION-STYLE TABS (LEFT COLUMN) */}
        <div className="lg:col-span-8 lg:order-1 space-y-4">
          {/* PROFILE TAB BAR (MATCHING CONSULTATION TABS) */}
          <div className="flex border-b border-border space-x-1 overflow-x-auto scrollbar-none">
            {PROFILE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              let badgeCount = null;
              if (tab.id === 'examination') badgeCount = emrData?.consultations?.length;
              if (tab.id === 'treatment-plan') badgeCount = allTreatmentPlans.length > 0 ? allTreatmentPlans.length : null;
              if (tab.id === 'followups-appointments') badgeCount = combinedUpcoming.length > 0 ? combinedUpcoming.length : null;
              if (tab.id === 'billing') badgeCount = billingInvoices.length > 0 ? billingInvoices.length : null;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-brand text-brand font-bold'
                      : 'border-transparent text-ink-soft hover:text-ink hover:border-border'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  {badgeCount !== null && badgeCount !== undefined && badgeCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isActive ? 'bg-brand-light text-brand-dark' : 'bg-bg text-ink-soft'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: DOCTOR EXAMINATION HISTORY */}
          <div className={activeTab === 'examination' ? 'block space-y-4 animate-fadeIn' : 'hidden'}>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                  <Stethoscope size={16} className="text-brand" /> Doctor Examination Records
                </h3>
                <p className="text-xs text-ink-soft">Chronological log of clinical findings and doctor examinations.</p>
              </div>
              <span className="badge bg-slate-100 text-slate-700 font-mono text-xs border border-slate-200">
                {allConsultations.length} Record(s)
              </span>
            </div>

            {allConsultations.length > 0 ? (
              <div className="space-y-4">
                {allConsultations.map((c) => {
                  const cId = c._id || c.id || c.consultationId;
                  const rawDate = c.visitDate || c.date || c.startedAt || c.createdAt || c.examination?.recordedAt || c.examination?.createdAt;
                  const consultDateStr = rawDate
                    ? new Date(rawDate).toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                    })
                    : 'N/A';
                  const docName = c.doctor?.name
                    ? `Dr. ${c.doctor.name}`
                    : c.examination?.recordedBy?.name
                    ? `Dr. ${c.examination.recordedBy.name}`
                    : 'Doctor';

                  const exam = c.examination || {};
                  const extraoralList = Array.isArray(exam.extraoral) ? exam.extraoral : [];
                  const softTissueList = Array.isArray(exam.softTissue) ? exam.softTissue : [];
                  const gingivalList = Array.isArray(exam.gingivalFindings) ? exam.gingivalFindings : [];
                  const periodontalNotes = exam.periodontalDetails || '';
                  const overallNotesStr = exam.overallNotes || c.clinicalNotes || c.notes || '';
                  const chiefComplaints = exam.chiefComplaints || c.chiefComplaints || c.reason || '';

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
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedConsultationForExamEdit({
                              ...c,
                              chiefComplaints: chiefComplaints,
                              examination: {
                                ...exam,
                                chiefComplaints: chiefComplaints,
                              },
                            });
                            setIsExamModalOpen(true);
                          }}
                          className="btn-secondary py-1 px-2.5 text-xs font-semibold flex items-center gap-1.5 text-amber-700 hover:text-amber-800 hover:border-amber-300 shadow-sm"
                          title="Edit Examination Record"
                        >
                          <Edit3 size={13} />
                          <span>Edit Examination</span>
                        </button>
                      </div>

                      {/* SAVED EXAMINATION SECTIONS */}
                      <div className="border border-border rounded-xl p-4 bg-bg/30 space-y-3">
                        <div className="flex items-center justify-between border-b border-border/80 pb-2">
                          <h4 className="font-display text-xs font-bold text-ink flex items-center gap-1.5">
                            <Stethoscope size={14} className="text-brand" /> Clinical Examination Details
                          </h4>
                        </div>

                        {/* Chief Complaints */}
                        {chiefComplaints ? (
                          <div className="p-3 rounded-lg bg-surface border border-border/80 space-y-1 text-xs shadow-2xs">
                            <span className="text-[10px] font-bold text-brand uppercase tracking-wider block">
                              Chief Complaints
                            </span>
                            <p className="font-semibold text-ink text-xs leading-relaxed">{chiefComplaints}</p>
                          </div>
                        ) : null}

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
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card p-8 text-center text-xs text-ink-soft space-y-2">
                <Stethoscope size={28} className="mx-auto text-ink-soft/40" />
                <p className="font-semibold text-ink text-sm">No completed examination records on file yet.</p>
                <p className="text-xs">Click "Start Consultation" to begin a new clinical examination.</p>
              </div>
            )}
          </div>

          {/* TAB 2: FDI TOOTH CHART & CONDITIONS */}
          <div className={activeTab === 'tooth-chart' ? 'block space-y-4 animate-fadeIn' : 'hidden'}>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                  <Activity size={16} className="text-brand" /> FDI Tooth Chart & Conditions Log
                </h3>
                <p className="text-xs text-ink-soft">
                  Select any tooth to inspect past treatment histories and apply condition updates.
                </p>
              </div>
            </div>

            <ToothChart patientId={patientId} patient={patient} isReadOnly={false} />
          </div>

          {/* TAB 3: PRESCRIPTIONS HISTORY */}
          <div className={activeTab === 'prescriptions' ? 'block space-y-4 animate-fadeIn' : 'hidden'}>
            <PrescriptionHistoryPanel patientId={patientId} title="Patient Prescription History & Past Medications" />
          </div>

          {/* TAB 4: TREATMENT PLANS & DIAGNOSES */}
          <div className={activeTab === 'treatment-plan' ? 'block space-y-6 animate-fadeIn' : 'hidden'}>
            {/* Treatment Plans Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                  <FileHeart size={16} className="text-brand" /> Planned & Completed Treatment Procedures
                </h3>
                <span className="badge bg-slate-100 text-slate-700 font-mono text-xs border border-slate-200">
                  {allTreatmentPlans.length} Procedure(s)
                </span>
              </div>

              {allTreatmentPlans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {allTreatmentPlans.map((tp, idx) => (
                    <div key={idx} className="card p-4 bg-surface border-border space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-ink text-sm">{tp.procedureName || tp.treatment || 'Treatment'}</h4>
                          {tp.toothNumbers && tp.toothNumbers.length > 0 && (
                            <span className="text-[11px] font-mono text-brand font-semibold">
                              Teeth: #{tp.toothNumbers.join(', #')}
                            </span>
                          )}
                        </div>
                        <span className={`badge text-[10px] font-bold uppercase ${
                          tp.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : tp.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {tp.status || 'Planned'}
                        </span>
                      </div>

                      {tp.notes && (
                        <p className="text-ink-soft text-[11px] leading-relaxed bg-bg/50 p-2 rounded-lg border border-border">
                          {tp.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-ink-soft pt-1 border-t border-border/50">
                        <span>{tp.doctorName ? `Dr. ${tp.doctorName}` : ''}</span>
                        {tp.cost ? <span className="font-bold font-mono text-ink">₹{tp.cost}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card p-6 text-center text-xs text-ink-soft space-y-1">
                  <p className="font-semibold text-ink">No treatment plans recorded on file yet.</p>
                </div>
              )}
            </div>

            {/* Diagnoses Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                  <ShieldAlert size={16} className="text-amber-600" /> Recorded Clinical Diagnoses
                </h3>
                <span className="badge bg-slate-100 text-slate-700 font-mono text-xs border border-slate-200">
                  {allDiagnoses.length} Diagnoses
                </span>
              </div>

              {allDiagnoses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  {allDiagnoses.map((d, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-surface border border-border space-y-1">
                      <span className="font-bold text-ink text-xs block truncate">{d.diseaseName || d.name || 'Diagnosis'}</span>
                      {d.severity && (
                        <span className="badge bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-semibold">
                          Severity: {d.severity}
                        </span>
                      )}
                      {d.visitDate && (
                        <span className="text-[10px] text-ink-soft block">
                          {new Date(d.visitDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card p-6 text-center text-xs text-ink-soft space-y-1">
                  <p className="font-semibold text-ink">No diagnoses recorded on file yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* TAB 5: FOLLOW-UPS & APPOINTMENTS */}
          <div className={activeTab === 'followups-appointments' ? 'block space-y-6 animate-fadeIn' : 'hidden'}>
            {/* Header / Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                  <CalendarClock size={16} className="text-brand" /> Follow-Ups & Appointments Schedule
                </h3>
                <p className="text-xs text-ink-soft">
                  Upcoming follow-up appointments, scheduled visits, and full chronological visit history.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {combinedUpcoming.length > 0 && (
                  <span className="badge bg-purple-50 text-purple-800 font-mono text-xs border border-purple-200">
                    {combinedUpcoming.length} Upcoming
                  </span>
                )}
                <span className="badge bg-slate-100 text-slate-700 font-mono text-xs border border-slate-200">
                  {combinedHistory.length} Past Visit(s)
                </span>
              </div>
            </div>

            {/* 1. ONGOING CONSULTATION BANNER (IF CONSULTATION IS CURRENTLY ACTIVE) */}
            {activeConsultation && (
              <div className="bg-linear-to-r from-emerald-50 via-surface to-teal-50/50 border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase bg-emerald-600 text-white shadow-2xs">
                      <Activity size={13} className="animate-pulse" /> Active Consultation
                    </span>
                    <span className="badge bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                      Ongoing • Today
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/doctor/consultation/${activeConsultation._id || activeConsultation.id || activeConsultation.consultationId}`)}
                    className="btn-primary py-1 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                  >
                    <Stethoscope size={13} />
                    <span>Resume Consultation</span>
                    <ArrowRight size={12} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Doctor in Charge</span>
                    <span className="font-bold text-ink text-xs">
                      {getCleanDoctorName(activeConsultation.doctor, activeConsultation.examination?.recordedBy)}
                    </span>
                  </div>
                  {activeConsultation.chiefComplaints && (
                    <div>
                      <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Chief Complaints</span>
                      <p className="font-semibold text-ink text-xs truncate">{activeConsultation.chiefComplaints}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. SCHEDULED FOLLOW-UP RECORD (SHOWN PROMINENTLY AT TOP AS REQUESTED) */}
            {primaryFollowUp && (
              <div className="bg-linear-to-r from-purple-50 via-surface to-brand-light/40 border-2 border-purple-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase bg-purple-700 text-white shadow-2xs">
                      <CalendarCheck size={13} /> Scheduled Follow-Up
                    </span>
                    {(() => {
                      const timing = getVisitTimingBadge(
                        primaryFollowUp.recommendedDate || primaryFollowUp.date,
                        primaryFollowUp.status
                      );
                      return (
                        <span className={`badge text-xs ${timing.badgeClass}`}>
                          {timing.label} {timing.sublabel && timing.sublabel !== timing.label ? `• ${timing.sublabel}` : ''}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const st = getAppointmentStatusBadge(primaryFollowUp.status);
                      return (
                        <span className={`badge text-xs font-bold uppercase ${st.color}`}>
                          {st.label}
                        </span>
                      );
                    })()}

                    {/* Action Buttons: Check-In & Cancel */}
                    {['Scheduled', 'Pending'].includes(primaryFollowUp.status) && (
                      <button
                        type="button"
                        disabled={checkingInFollowUpId === (primaryFollowUp._id || primaryFollowUp.id)}
                        onClick={() => handleFollowUpCheckIn(primaryFollowUp._id || primaryFollowUp.id)}
                        className="btn-primary py-1 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-xs transition-colors"
                        title="Check-In patient for today's visit"
                      >
                        <UserCheck size={13} />
                        <span>{checkingInFollowUpId === (primaryFollowUp._id || primaryFollowUp.id) ? 'Checking In...' : 'Check-In'}</span>
                      </button>
                    )}
                    {!['Completed', 'Cancelled'].includes(primaryFollowUp.status) && (
                      <button
                        type="button"
                        onClick={() => openCancelModal(primaryFollowUp)}
                        className="btn-secondary py-1 px-2.5 text-xs font-bold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 flex items-center gap-1 shadow-xs transition-colors"
                        title="Cancel this follow-up"
                      >
                        <XCircle size={13} className="text-rose-600" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">
                      Recommended Follow-Up Date & Time
                    </span>
                    <div className="flex items-center gap-2 text-ink font-bold text-sm">
                      <Calendar size={15} className="text-purple-700" />
                      <span>{formatReadableDate(primaryFollowUp.recommendedDate || primaryFollowUp.date)}</span>
                      {primaryFollowUp.time && (
                        <span className="text-xs font-mono text-ink-soft font-medium flex items-center gap-1">
                          <Clock size={13} /> {primaryFollowUp.time}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">
                      Doctor / Specialist
                    </span>
                    <div className="flex items-center gap-2 text-ink font-bold text-xs">
                      <UserCheck size={15} className="text-teal-600" />
                      <span>{getCleanDoctorName(primaryFollowUp.doctor, primaryFollowUp.createdBy)}</span>
                      {primaryFollowUp.doctor?.specialization && (
                        <span className="text-ink-soft font-normal text-[11px]">
                          ({primaryFollowUp.doctor.specialization})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {(primaryFollowUp.reason || primaryFollowUp.instructions || primaryFollowUp.notes || primaryFollowUp.treatmentStatus) && (
                  <div className="p-3 rounded-xl bg-surface border border-purple-200/80 space-y-1 text-xs shadow-2xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-purple-950 text-xs">
                        Clinical Reason & Instructions:
                      </span>
                      {primaryFollowUp.treatmentStatus && (
                        <span className="badge bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold">
                          {primaryFollowUp.treatmentStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-ink-soft text-xs leading-relaxed font-medium">
                      {primaryFollowUp.reason || primaryFollowUp.instructions || primaryFollowUp.notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3. APPOINTMENT HISTORY (REVERSE CHRONOLOGICAL ORDER) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="font-display text-xs font-bold text-ink flex items-center gap-1.5">
                  <History size={14} className="text-brand" /> Appointment & Visit History
                </h4>
                <span className="badge bg-slate-100 text-slate-700 font-mono text-xs border border-slate-200">
                  {combinedHistory.length} Record(s)
                </span>
              </div>

              {combinedHistory.length > 0 ? (
                <div className="space-y-3">
                  {combinedHistory.map((item, idx) => {
                    const statusObj = getAppointmentStatusBadge(item.status);
                    const isCancelled = item.status === 'Cancelled';
                    const rel = formatRelativeSchedule(item.date || item.sortDate);
                    const docName = getCleanDoctorName(item.doctor, item.createdBy);

                    return (
                      <div
                        key={item._id || idx}
                        className={`card p-4 bg-surface border transition-all space-y-3 shadow-2xs hover:border-brand/40 ${
                          isCancelled ? 'border-rose-200 bg-rose-50/10' : 'border-border'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display text-xs font-bold text-ink flex items-center gap-1.5">
                              <Calendar size={14} className="text-brand" />
                              {formatReadableDate(item.date || item.sortDate)}
                            </span>
                            {item.time && (
                              <span className="text-[11px] font-mono font-medium text-ink-soft flex items-center gap-1">
                                <Clock size={12} /> {item.time}
                              </span>
                            )}
                            {rel && (
                              <span className="text-[10px] text-ink-soft bg-bg px-2 py-0.5 rounded border border-border">
                                {rel}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {item.isFollowUp && (
                              <span className="badge bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold py-0.5 px-1.5">
                                Follow-Up
                              </span>
                            )}
                            <span className={`badge border text-[10px] font-bold uppercase py-0.5 px-2 ${statusObj.color}`}>
                              {statusObj.label}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">
                              Doctor / Provider
                            </span>
                            <span className="font-semibold text-ink text-xs block">
                              {docName}
                            </span>
                            {item.doctor?.specialization && (
                              <span className="text-[11px] text-ink-soft block">{item.doctor.specialization}</span>
                            )}
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">
                              Appointment Type / Reason
                            </span>
                            <span className="font-medium text-ink text-xs block">
                              {item.reason || item.type || (item.isFollowUp ? 'Follow-Up Visit' : 'General Appointment')}
                            </span>
                            {item.timeSlot && (
                              <span className="text-[11px] font-mono text-ink-soft block">
                                Slot: {item.timeSlot}
                              </span>
                            )}
                          </div>
                        </div>

                        {item.notes && (
                          <p className="text-ink-soft text-[11px] bg-bg/40 p-2 rounded-md border border-border/40 leading-relaxed">
                            <span className="font-semibold text-ink">Notes: </span>
                            {item.notes}
                          </p>
                        )}

                        {isCancelled && (
                          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200/80 space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-rose-900 text-[11px] uppercase tracking-wider">
                              <XCircle size={13} className="text-rose-600 shrink-0" />
                              <span>Cancellation Record</span>
                            </div>
                            {item.cancellationReason ? (
                              <p className="text-rose-800 text-xs font-medium">
                                <span className="font-bold text-rose-950">Reason: </span>
                                {item.cancellationReason}
                              </p>
                            ) : (
                              <p className="text-rose-700 text-xs italic">
                                Cancellation recorded on file.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card p-6 text-center text-xs text-ink-soft space-y-1.5 bg-bg/30">
                  <History size={24} className="mx-auto text-ink-soft/40" />
                  <p className="font-semibold text-ink">No appointment history on file yet.</p>
                  <p className="text-[11px]">Completed and past visits will automatically appear in reverse chronological order.</p>
                </div>
              )}
            </div>
          </div>

          {/* TAB 6: BILLING SUMMARY (READ-ONLY) */}
          <div className={activeTab === 'billing' ? 'block space-y-6 animate-fadeIn' : 'hidden'}>
            <PatientBillingSummary billing={billing} showHeader={true} />
          </div>
        </div>
      </div>

      {/* EDIT PATIENT DETAILS MODAL */}
      <PatientDetailsEditModal
        isOpen={isEditModalOpen}
        patient={patient}
        appointmentId={null}
        startConsultation={false}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handlePatientUpdated}
      />

      {/* EDIT EXAMINATION MODAL */}
      <ExaminationEditModal
        isOpen={isExamModalOpen}
        consultation={selectedConsultationForExamEdit}
        onClose={() => {
          setIsExamModalOpen(false);
          setSelectedConsultationForExamEdit(null);
        }}
        onSuccess={() => fetchEMR()}
      />

      {/* CANCELLATION CONFIRMATION MODAL POPUP */}
      {cancellingFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="card w-full max-w-md bg-surface p-6 shadow-2xl border border-border space-y-4 rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">Cancel Follow-Up Visit</h3>
                  <p className="text-xs text-ink-soft">
                    Please provide a reason to confirm the cancellation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellingFollowUp(null)}
                className="p-1 rounded-lg text-ink-soft hover:text-ink hover:bg-bg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {cancelModalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <span>{cancelModalError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div className="space-y-1.5 text-xs">
                <label className="block font-bold text-ink">
                  Reason for Cancellation <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  className="input-field w-full text-xs py-2"
                  placeholder="e.g. Patient called to cancel, patient relocated, condition resolved..."
                  value={cancellationReason}
                  onChange={(e) => {
                    setCancellationReason(e.target.value);
                    if (cancelModalError) setCancelModalError('');
                  }}
                  autoFocus
                />
                <p className="text-[11px] text-ink-soft">
                  * A valid cancellation reason is required to maintain clinical audit records.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCancellingFollowUp(null)}
                  disabled={cancelSubmitting}
                  className="btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  Keep Follow-Up
                </button>
                <button
                  type="submit"
                  disabled={cancelSubmitting || !cancellationReason.trim()}
                  className="btn-primary py-2 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle size={14} />
                  <span>{cancelSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
