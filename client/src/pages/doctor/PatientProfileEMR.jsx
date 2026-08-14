import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  UserSquare2, ArrowLeft, History, Stethoscope, Activity, Pill, Calendar, Plus, Clock,
  FileHeart, HeartPulse, ShieldAlert, Phone, MapPin, Briefcase, UserCheck, CheckCircle2
} from 'lucide-react';
import api from '../../api/axios.js';
import ToothChart from './consultation/ToothChart.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

export default function PatientProfileEMR() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();

  const [patient, setPatient] = useState(null);
  const [emrData, setEmrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingConsultation, setCreatingConsultation] = useState(false);

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
      <div className="p-12 text-center text-xs text-ink-soft space-y-2">
        <div className="h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading patient clinical profile & EMR...</p>
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

  // Medical & Dental history arrays or strings
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

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/doctor/patients"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline mb-1"
          >
            <ArrowLeft size={16} /> Back to Patients Directory
          </Link>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <UserSquare2 size={26} className="text-brand" /> {fullName}
            <span className="badge bg-brand-light/50 text-brand-dark font-mono font-bold text-xs border border-brand/30">
              OP #{patient.opNumber || 'N/A'}
            </span>
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Patient Clinical EMR & Current Dental Snapshot
          </p>
        </div>

        {/* View Full History Link */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Link
            to={`/doctor/history/${patientId}`}
            className="btn-secondary text-xs py-2 px-3 font-semibold inline-flex items-center gap-1.5"
          >
            <History size={16} className="text-brand" /> View full history
          </Link>
        </div>
      </div>

      {/* QUICK ACTION BUTTONS BAR */}
      {/* <div className="card p-3.5 bg-surface border-brand/20 flex flex-wrap items-center gap-2">
        <button
          onClick={handleStartConsultation}
          disabled={creatingConsultation}
          className="btn-primary py-2 px-3 text-xs font-bold inline-flex items-center gap-1.5"
        >
          <FileHeart size={15} />
          <span>{creatingConsultation ? 'Starting...' : 'New Consultation'}</span>
        </button>

        <button
          onClick={() => navigate('/doctor/diagnosis')}
          className="btn-secondary py-2 px-3 text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <Stethoscope size={15} className="text-brand" /> Add Diagnosis
        </button>

        <button
          onClick={() => navigate('/doctor/treatment-plans')}
          className="btn-secondary py-2 px-3 text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <Activity size={15} className="text-purple-600" /> Create Treatment Plan
        </button>

        <button
          onClick={() => navigate('/doctor/prescriptions')}
          className="btn-secondary py-2 px-3 text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <Pill size={15} className="text-emerald-600" /> Add Prescription
        </button>

        <button
          onClick={() => navigate('/reception/follow-ups')}
          className="btn-secondary py-2 px-3 text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <Calendar size={15} className="text-amber-600" /> Book Follow-up
        </button>
      </div> */}

      {/* DEMOGRAPHICS & PROFILE HEADER CARD */}
      <div className="card p-5 bg-surface border-border grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="space-y-1 md:col-span-1 border-b md:border-b-0 md:border-r border-border pb-3 md:pb-0 md:pr-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-brand text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">{fullName}</h3>
              <span className="font-mono text-xs font-bold text-brand block">OP #{patient.opNumber || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div>
            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Age / Sex</span>
            <span className="font-semibold text-ink">{patient.age !== undefined ? `${patient.age} yrs` : 'N/A'} / {patient.sex || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Date of Birth</span>
            <span className="font-medium text-ink">{dobStr}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div>
            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Phone Number</span>
            <span className="font-mono font-semibold text-ink">{patient.phone || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Occupation</span>
            <span className="font-medium text-ink flex items-center gap-1">
              <Briefcase size={12} className="text-ink-soft shrink-0" /> {patient.occupation || 'N/A'}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div>
            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Registration Date</span>
            <span className="font-medium text-ink">{regDateStr}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">Address</span>
            <span className="font-medium text-ink truncate block max-w-xs">{patient.address || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* CLINICAL VITALS & MEDICAL HISTORY SNAPSHOT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        {/* Vitals Card */}
        <div className="card p-4 space-y-3 bg-surface">
          <h4 className="font-display text-sm font-bold text-ink flex items-center gap-2 border-b border-border pb-2">
            <HeartPulse size={16} className="text-rose-600" /> Clinical Vitals
          </h4>
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

        {/* Medical History & Allergies */}
        <div className="card p-4 space-y-3 bg-surface">
          <h4 className="font-display text-sm font-bold text-ink flex items-center gap-2 border-b border-border pb-2">
            <ShieldAlert size={16} className="text-amber-600" /> Medical History & Allergies
          </h4>
          <div className="space-y-2">
            <div>
              <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">Known Allergies</span>
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
              <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">Systemic Conditions</span>
              {medicalHistoryList.length > 0 ? (
                <p className="text-ink font-medium leading-relaxed">{medicalHistoryList.join(', ')}</p>
              ) : (
                <span className="text-ink-soft/70 italic">No systemic conditions logged</span>
              )}
            </div>
          </div>
        </div>

        {/* Dental History */}
        <div className="card p-4 space-y-3 bg-surface">
          <h4 className="font-display text-sm font-bold text-ink flex items-center gap-2 border-b border-border pb-2">
            <Stethoscope size={16} className="text-brand" /> Past Dental History
          </h4>
          <div className="space-y-2">
            <div>
              <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">Previous Dental Treatments</span>
              {dentalHistoryList.length > 0 ? (
                <p className="text-ink font-medium leading-relaxed">{dentalHistoryList.join(', ')}</p>
              ) : (
                <span className="text-ink-soft/70 italic">No past dental procedures on record</span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">Oral Hygiene Status</span>
              <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px]">
                Good / Maintained
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CURRENT INTERACTIVE TOOTH CHART */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
            <Activity size={18} className="text-brand" /> Current Interactive FDI Tooth Chart
          </h3>
          <span className="text-xs text-ink-soft">
            Click teeth below to inspect treatment histories or record findings.
          </span>
        </div>

        <ToothChart patientId={patientId} />
      </div>
    </div>
  );
}
