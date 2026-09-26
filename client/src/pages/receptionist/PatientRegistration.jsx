import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  UserPlus,
  Plus,
  X,
  Loader2,
  User,
  HeartPulse,
  ClipboardList,
  Activity,
  Stethoscope,
  Smile,
  Baby,
} from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import CreateAppointmentModal from '../../components/common/CreateAppointmentModal.jsx';
import UnsavedChangesModal from '../../components/common/UnsavedChangesModal.jsx';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { validateName, validatePhone, validateDOB, validateAge } from '../../utils/validators.js';
import { capitalizeName, capitalizeWords } from '../../utils/formatters.js';


const MEDICAL_HISTORY_OPTIONS = [
  'Diabetes Mellitus',
  'Hypertension',
  'Asthma',
  'Allergy',
  'Pregnancy',
  'Cardiac Disease',
  'Epilepsy',
  'Thyroid Disorder',
  'Hepatitis',
  'Bleeding Disorder',
];

const HABITS_OPTIONS = ['Smoking', 'Tobacco', 'Alcohol', 'Pan'];

export default function PatientRegistration() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  const [registeredPatientForAppointment, setRegisteredPatientForAppointment] = useState(null);
  const [showBookModal, setShowBookModal] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    sex: '',
    patientType: 'adult',
    dateOfBirth: '',
    occupation: '',
    address: '',
    primaryPhone: '',
    secondaryPhone: '',
    medicalHistory: [],
    currentMedications: '',
    vitals: { bp: '', rbs: '' },
    habits: [],
    dentalHistory: '',
  });

  const isDirty = useMemo(() => {
    const f = formData;
    return Boolean(
      f.firstName?.trim() ||
      f.lastName?.trim() ||
      (f.age !== '' && f.age !== undefined && f.age !== null) ||
      f.sex ||
      f.dateOfBirth ||
      f.occupation?.trim() ||
      f.address?.trim() ||
      f.primaryPhone?.trim() ||
      f.secondaryPhone?.trim() ||
      (f.medicalHistory && f.medicalHistory.length > 0) ||
      f.currentMedications?.trim() ||
      (f.vitals && Object.values(f.vitals).some((v) => (typeof v === 'string' ? v.trim() : v))) ||
      (f.habits && f.habits.length > 0) ||
      f.dentalHistory?.trim()
    );
  }, [formData]);

  const {
    showConfirmModal,
    confirmLeave,
    handleStay,
    handleDiscard,
    resetDirty,
  } = useUnsavedChanges(isDirty);

  const handleBackNavigation = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetUrl = user?.role === 'doctor' ? '/doctor/patients' : '/reception/patients';
    confirmLeave(() => {
      navigate(targetUrl);
    });
  };

  const [userManuallySetPatientType, setUserManuallySetPatientType] = useState(false);
  const [similarPatients, setSimilarPatients] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [customMedicalInput, setCustomMedicalInput] = useState('');
  const [customHabitInput, setCustomHabitInput] = useState('');
  const [customVitalLabel, setCustomVitalLabel] = useState('');
  const [customVitalValue, setCustomVitalValue] = useState('');

  const handleAddCustomMedicalHistory = () => {
    const trimmed = capitalizeWords(customMedicalInput.trim());
    if (!trimmed) return;
    if (!formData.medicalHistory.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        medicalHistory: [...prev.medicalHistory, trimmed],
      }));
    }
    setCustomMedicalInput('');
  };

  const handleAddCustomHabit = () => {
    const trimmed = capitalizeWords(customHabitInput.trim());
    if (!trimmed) return;
    if (!formData.habits.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        habits: [...prev.habits, trimmed],
      }));
    }
    setCustomHabitInput('');
  };

  const handleAddCustomVital = () => {
    const labelTrimmed = capitalizeWords(customVitalLabel.trim());
    const valueTrimmed = customVitalValue.trim();
    if (!labelTrimmed) return;
    setFormData((prev) => ({
      ...prev,
      vitals: {
        ...(prev.vitals || {}),
        [labelTrimmed]: valueTrimmed,
      },
    }));
    setCustomVitalLabel('');
    setCustomVitalValue('');
  };

  const handleRemoveCustomVital = (key) => {
    setFormData((prev) => {
      const updated = { ...(prev.vitals || {}) };
      delete updated[key];
      return { ...prev, vitals: updated };
    });
  };

  // Live duplicate check on name or phone change (debounced)
  useEffect(() => {
    const query = [formData.firstName, formData.lastName, formData.primaryPhone, formData.secondaryPhone]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (!query || query.length < 2) {
      setSimilarPatients([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/patients?search=${encodeURIComponent(query)}&limit=3`);
        const matches = res.data?.patients || [];
        setSimilarPatients(matches);
      } catch (err) {
        console.error('Live search error:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.firstName, formData.lastName, formData.primaryPhone, formData.secondaryPhone]);

  // Auto-detect Patient Type (Adult vs Child) based on age/DOB unless manually overridden
  useEffect(() => {
    if (userManuallySetPatientType) return;

    let calcAge = null;
    if (formData.age) {
      calcAge = parseFloat(formData.age);
    } else if (formData.dateOfBirth) {
      const birth = new Date(formData.dateOfBirth);
      const now = new Date();
      let diff = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        diff--;
      }
      calcAge = diff;
    }

    if (calcAge !== null && !isNaN(calcAge)) {
      const detected = calcAge < 12 ? 'child' : 'adult';
      if (formData.patientType !== detected) {
        setFormData((prev) => ({ ...prev, patientType: detected }));
      }
    }
  }, [formData.age, formData.dateOfBirth, userManuallySetPatientType]);

  const handleChange = (field, value) => {
    let formattedVal = value;
    if (['firstName', 'lastName'].includes(field)) {
      formattedVal = capitalizeWords(value.replace(/[^a-zA-Z\s'-]/g, ''));
    } else if (['occupation', 'address', 'currentMedications', 'dentalHistory'].includes(field)) {
      formattedVal = capitalizeWords(value);
    }
    setFormData((prev) => ({ ...prev, [field]: formattedVal }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleVitalsChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      vitals: {
        ...(prev.vitals || {}),
        [field]: value,
      },
    }));
  };

  const handleCheckboxToggle = (field, item) => {
    setFormData((prev) => {
      const list = prev[field] || [];
      const updated = list.includes(item)
        ? list.filter((i) => i !== item)
        : [...list, item];
      return { ...prev, [field]: updated };
    });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const newErrors = {};

    const nameErr = validateName(formData.firstName, 'First Name', true);
    if (nameErr) newErrors.firstName = nameErr;

    if (formData.lastName) {
      const lastNameErr = validateName(formData.lastName, 'Last Name', false);
      if (lastNameErr) newErrors.lastName = lastNameErr;
    }

    if (formData.primaryPhone) {
      const pPhoneErr = validatePhone(formData.primaryPhone, 'Primary Phone', false);
      if (pPhoneErr) newErrors.primaryPhone = pPhoneErr;
    }

    if (formData.secondaryPhone) {
      const sPhoneErr = validatePhone(formData.secondaryPhone, 'Secondary Phone', false);
      if (sPhoneErr) newErrors.secondaryPhone = sPhoneErr;
    }

    if (formData.dateOfBirth) {
      const dobErr = validateDOB(formData.dateOfBirth, false);
      if (dobErr) newErrors.dateOfBirth = dobErr;
    }

    if (formData.age !== '' && formData.age !== undefined && formData.age !== null) {
      const ageErr = validateAge(formData.age, false);
      if (ageErr) newErrors.age = ageErr;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showError('Please fill in all required fields correctly before submitting.');

      setTimeout(() => {
        const firstErrorField = document.querySelector('.border-rose-500, [aria-invalid="true"]');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (firstErrorField.focus) firstErrorField.focus();
        }
      }, 100);
      return;
    }

    setSubmitting(true);

    try {
      const cleanedVitals = {};
      if (formData.vitals && typeof formData.vitals === 'object') {
        Object.entries(formData.vitals).forEach(([k, v]) => {
          if (typeof v === 'string' && v.trim()) {
            cleanedVitals[k] = v.trim();
          } else if (v !== null && v !== undefined && typeof v !== 'string' && v !== '') {
            cleanedVitals[k] = v;
          }
        });
      }

      const payload = {
        ...formData,
        firstName: formData.firstName ? capitalizeName(formData.firstName.trim()) : '',
        lastName: formData.lastName ? capitalizeName(formData.lastName.trim()) : '',
        primaryPhone: formData.primaryPhone ? formData.primaryPhone.trim() : '',

        secondaryPhone: formData.secondaryPhone ? formData.secondaryPhone.trim() : '',
        occupation: formData.occupation ? capitalizeWords(formData.occupation.trim()) : '',
        address: formData.address ? capitalizeWords(formData.address.trim()) : '',
        currentMedications: formData.currentMedications ? capitalizeWords(formData.currentMedications.trim()) : '',
        dentalHistory: formData.dentalHistory ? capitalizeWords(formData.dentalHistory.trim()) : '',
        age: formData.age !== '' && formData.age !== undefined && !isNaN(formData.age) ? parseFloat(formData.age) : undefined,
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : undefined,
        vitals: cleanedVitals,
      };

      const res = await api.post('/patients', payload);
      const newPatient = res.data?.patient;
      resetDirty();

      if (user?.role === 'doctor') {
        showSuccess(`Patient ${newPatient?.opNumber || ''} registered successfully!`);
        setRegisteredPatientForAppointment(newPatient);
        setShowBookModal(true);
      } else {
        showSuccess(`Patient ${newPatient?.opNumber || ''} registered successfully! Redirecting to appointments...`);
        setTimeout(() => {
          navigate('/reception/appointments', {
            state: {
              newPatient,
              autoOpenCreate: true,
            },
          });
        }, 800);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to register patient. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 sm:space-y-6 pb-12">
      {/* 1. Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-ink-soft shadow-xs transition-colors hover:bg-bg hover:text-ink cursor-pointer"
            title="Back to Patients"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Register & Book Appointment
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
              Create a new Dental OP Record and schedule an appointment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto w-full sm:w-auto">
          <button
            type="button"
            className="btn-secondary flex-1 sm:flex-initial text-xs sm:text-sm"
            onClick={() => navigate(user?.role === 'doctor' ? '/doctor/patients' : '/reception/patients')}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary flex-1 sm:flex-initial text-xs sm:text-sm inline-flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={17} />}
            <span>{submitting ? 'Registering...' : 'Register & Book'}</span>
          </button>
        </div>
      </div>

      {/* 2. Soft Duplicate / Family Member Notice */}
      {similarPatients.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="space-y-1.5 text-sm flex-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-xs sm:text-sm text-amber-950">
                  Notice: Similar patient record found ({similarPatients.length})
                </p>
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-md">
                  Potential Family Match
                </span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 text-xs text-amber-900">
                {similarPatients.map((p) => {
                  const pPhones = [p.primaryPhone || p.phone, p.secondaryPhone].filter(Boolean).join(' / ') || 'No phone';
                  return (
                    <li key={p._id} className="bg-white/80 rounded-xl p-2.5 border border-amber-200/70 flex flex-col gap-0.5">
                      <span className="font-bold text-ink">
                        {capitalizeName(p.firstName)} {capitalizeName(p.lastName)}
                      </span>
                      <span className="font-mono text-[11px] text-brand-dark font-medium">
                        OP: {p.opNumber || 'N/A'}
                      </span>
                      <span className="text-ink-soft text-[11px]">📞 {pPhones}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-amber-800/90 pt-1">
                A patient with matching details already exists. You may continue to create a new record if this is a family member, or search their record above.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Responsive Grid Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          
          {/* ================= LEFT / PRIMARY COLUMN (7 cols on lg, 8 cols on xl) ================= */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5 sm:space-y-6">
            
            {/* Card 1: Personal & Contact Information */}
            <div className="card p-4 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light text-brand">
                    <User size={18} />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-ink">
                      Personal & Contact Information
                    </h2>
                    <p className="text-xs text-ink-soft">Basic demographic and contact details</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-ink-soft bg-bg px-2.5 py-1 rounded-full border border-border/60">
                  Required <span className="text-rose-600">*</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* First Name */}
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    First Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    className={`input-field ${
                      errors.firstName ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20' : ''
                    }`}
                    placeholder="e.g. John"
                    autoComplete="off"
                    autoCapitalize="words"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', capitalizeName(e.target.value.replace(/[^a-zA-Z\s'-]/g, '')))}
                  />
                  {errors.firstName && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} /> {errors.firstName}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    autoCapitalize="words"
                    className={`input-field ${
                      errors.lastName ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20' : ''
                    }`}
                    placeholder="e.g. Doe"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', capitalizeName(e.target.value.replace(/[^a-zA-Z\s'-]/g, '')))}
                  />
                  {errors.lastName && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} /> {errors.lastName}
                    </p>
                  )}
                </div>


                {/* Primary Phone */}
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    Primary Phone
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      autoComplete="off"
                      maxLength={10}
                      className={`input-field font-mono ${
                        errors.primaryPhone ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20' : ''
                      }`}
                      placeholder="9876543210"
                      value={formData.primaryPhone}
                      onChange={(e) => handleChange('primaryPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                  {errors.primaryPhone && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} /> {errors.primaryPhone}
                    </p>
                  )}
                </div>

                {/* Secondary Phone */}
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    Secondary Phone <span className="text-ink-soft/70 font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    autoComplete="off"
                    maxLength={10}
                    className={`input-field font-mono ${
                      errors.secondaryPhone ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20' : ''
                    }`}
                    placeholder="9123456789"
                    value={formData.secondaryPhone}
                    onChange={(e) => handleChange('secondaryPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                  {errors.secondaryPhone && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} /> {errors.secondaryPhone}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="sm:col-span-4">
                  <DatePicker
                    label="Date of Birth"
                    value={formData.dateOfBirth}
                    onChange={(date, dateStr) => handleChange('dateOfBirth', dateStr)}
                    maxDate={new Date()}
                    error={errors.dateOfBirth}
                  />
                </div>

                {/* Age */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">Age</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="130"
                    autoComplete="off"
                    className={`input-field font-mono ${
                      errors.age ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20' : ''
                    }`}
                    placeholder="e.g. 28"
                    value={formData.age}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (!isNaN(val) && Number(val) >= 0 && Number(val) <= 130)) {
                        handleChange('age', val);
                      }
                    }}
                  />
                  {errors.age && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} /> {errors.age}
                    </p>
                  )}
                </div>

                {/* Sex / Gender */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">Sex / Gender</label>
                  <select
                    className="input-field"
                    value={formData.sex}
                    onChange={(e) => handleChange('sex', e.target.value)}
                  >
                    <option value="">Select Sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Patient Type (Dentition) Toggle */}
                <div className="sm:col-span-12">
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    Dentition Type <span className="text-rose-600">*</span>
                  </label>
                  <div
                    className="grid grid-cols-2 rounded-xl border border-border bg-bg p-1 gap-1"
                    role="radiogroup"
                    aria-label="Patient Dentition Type"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={formData.patientType === 'adult'}
                      onClick={() => {
                        setUserManuallySetPatientType(true);
                        handleChange('patientType', 'adult');
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                        formData.patientType === 'adult'
                          ? 'bg-brand text-white shadow-xs'
                          : 'text-ink-soft hover:text-ink hover:bg-surface/60'
                      }`}
                    >
                      <Smile size={15} />
                      <span>Adult (Permanent 32 Teeth)</span>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={formData.patientType === 'child'}
                      onClick={() => {
                        setUserManuallySetPatientType(true);
                        handleChange('patientType', 'child');
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                        formData.patientType === 'child'
                          ? 'bg-brand text-white shadow-xs'
                          : 'text-ink-soft hover:text-ink hover:bg-surface/60'
                      }`}
                    >
                      <Baby size={15} />
                      <span>Child (Primary 20 Teeth)</span>
                    </button>
                  </div>
                </div>

                {/* Occupation */}
                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">Occupation</label>
                  <input
                    type="text"
                    autoComplete="off"
                    className="input-field"
                    placeholder="e.g. Teacher, Engineer"
                    value={formData.occupation}
                    onChange={(e) => handleChange('occupation', e.target.value)}
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-7">
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">Address</label>
                  <input
                    type="text"
                    autoComplete="off"
                    className="input-field"
                    placeholder="Street, Area, City, Pin Code"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Clinical & Dental Background */}
            <div className="card p-4 sm:p-6 space-y-5">
              <div className="flex items-center gap-2.5 border-b border-border/80 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Stethoscope size={18} />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-ink">
                    Clinical Background & Dental History
                  </h2>
                  <p className="text-xs text-ink-soft">Previous complaints, treatments, and current medications</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Dental History */}
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    Dental History & Chief Complaints
                  </label>
                  <textarea
                    rows={3}
                    className="input-field leading-relaxed"
                    placeholder="Previous dental treatments, chief complaints, extractions, root canals, restorations, or pain history..."
                    value={formData.dentalHistory}
                    onChange={(e) => handleChange('dentalHistory', e.target.value)}
                  />
                </div>

                {/* Current Medications */}
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    Current Medications & Drug Allergies
                  </label>
                  <textarea
                    rows={2}
                    className="input-field leading-relaxed"
                    placeholder="List any ongoing medications (anticoagulants, antihypertensives, etc.) or known drug allergies..."
                    value={formData.currentMedications}
                    onChange={(e) => handleChange('currentMedications', e.target.value)}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* ================= RIGHT / CLINICAL & VITALS COLUMN (5 cols on lg, 4 cols on xl) ================= */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5 sm:space-y-6">
            
            {/* Card 3: Vitals */}
            <div className="card p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/80 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <HeartPulse size={18} />
                </div>
                <div>
                  <h2 className="font-display text-sm sm:text-base font-bold text-ink">
                    Patient Vitals
                  </h2>
                  <p className="text-[11px] text-ink-soft">Baseline clinical measurements</p>
                </div>
              </div>

              {/* Standard Vitals: BP & RBS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-ink-soft mb-1 uppercase tracking-wider">
                    BP (mmHg)
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    className="input-field font-mono text-sm py-2"
                    placeholder="120/80"
                    value={formData.vitals?.bp || ''}
                    onChange={(e) => handleVitalsChange('bp', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-ink-soft mb-1 uppercase tracking-wider">
                    RBS (mg/dL)
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    className="input-field font-mono text-sm py-2"
                    placeholder="110"
                    value={formData.vitals?.rbs || ''}
                    onChange={(e) => handleVitalsChange('rbs', e.target.value)}
                  />
                </div>
              </div>

              {/* Added Custom Vitals */}
              {Object.entries(formData.vitals || {}).filter(([k]) => k !== 'bp' && k !== 'rbs').length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
                    Custom Vitals:
                  </span>
                  <div className="space-y-1.5">
                    {Object.entries(formData.vitals || {}).map(([key, val]) => {
                      if (key === 'bp' || key === 'rbs') return null;
                      return (
                        <div key={key} className="flex items-center justify-between bg-bg rounded-lg px-2.5 py-1.5 border border-border/70 text-xs">
                          <span className="font-medium text-ink">{key}: <span className="font-mono text-ink-soft">{val || '—'}</span></span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomVital(key)}
                            className="text-rose-600 hover:text-rose-800 p-0.5 rounded transition-colors"
                            title={`Remove ${key}`}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add Custom Vital Input Row */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <label className="block text-[11px] font-semibold text-ink-soft">
                  Add Custom Vital (Pulse, SpO2, Temp, Weight)
                </label>
                <div className="grid grid-cols-12 gap-1.5">
                  <input
                    type="text"
                    className="input-field text-xs py-1.5 col-span-6"
                    placeholder="Name (e.g. Pulse)"
                    value={customVitalLabel}
                    onChange={(e) => setCustomVitalLabel(e.target.value)}
                  />
                  <input
                    type="text"
                    className="input-field text-xs py-1.5 col-span-4"
                    placeholder="Value (72 bpm)"
                    value={customVitalValue}
                    onChange={(e) => setCustomVitalValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomVital();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomVital}
                    className="btn-primary col-span-2 px-1 py-1.5 text-xs font-bold flex items-center justify-center"
                    title="Add custom vital"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 4: Medical History */}
            <div className="card p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/80 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h2 className="font-display text-sm sm:text-base font-bold text-ink">
                    Medical History
                  </h2>
                  <p className="text-[11px] text-ink-soft">Systemic conditions & contraindications</p>
                </div>
              </div>

              {/* 2-Column Responsive Checkbox Cards */}
              <div className="grid grid-cols-2 gap-2">
                {MEDICAL_HISTORY_OPTIONS.map((item) => {
                  const checked = formData.medicalHistory.includes(item);
                  return (
                    <label
                      key={item}
                      className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer text-xs transition-all ${
                        checked
                          ? 'border-brand bg-brand-light/40 text-brand-navy font-semibold shadow-2xs'
                          : 'border-border/80 bg-surface text-ink hover:bg-bg'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-border text-brand focus:ring-brand shrink-0"
                        checked={checked}
                        onChange={() => handleCheckboxToggle('medicalHistory', item)}
                      />
                      <span className="truncate" title={item}>{item}</span>
                    </label>
                  );
                })}
              </div>

              {/* Custom Medical Condition Input */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <label className="block text-[11px] font-semibold text-ink-soft">
                  Add Custom Medical Condition
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    autoComplete="off"
                    className="input-field text-xs py-1.5 flex-1"
                    placeholder="Other condition..."
                    value={customMedicalInput}
                    onChange={(e) => setCustomMedicalInput(capitalizeWords(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomMedicalHistory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomMedicalHistory}
                    className="btn-primary py-1.5 px-3 text-xs font-semibold flex items-center justify-center gap-1 shrink-0"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>

                {/* Display Custom Medical Conditions Tags */}
                {formData.medicalHistory.some((item) => !MEDICAL_HISTORY_OPTIONS.includes(item)) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formData.medicalHistory.map((item) => {
                      if (MEDICAL_HISTORY_OPTIONS.includes(item)) return null;
                      return (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-200/80 px-2 py-0.5 rounded-md text-[11px] font-medium"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => handleCheckboxToggle('medicalHistory', item)}
                            className="text-teal-600 hover:text-teal-900 rounded p-0.5"
                            title="Remove condition"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Card 5: Habits & Lifestyle */}
            <div className="card p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/80 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <Activity size={18} />
                </div>
                <div>
                  <h2 className="font-display text-sm sm:text-base font-bold text-ink">
                    Habits & Lifestyle
                  </h2>
                  <p className="text-[11px] text-ink-soft">Oral health risk factors</p>
                </div>
              </div>

              {/* 2x2 Habit Chips */}
              <div className="grid grid-cols-2 gap-2">
                {HABITS_OPTIONS.map((habit) => {
                  const checked = formData.habits.includes(habit);
                  return (
                    <label
                      key={habit}
                      className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer text-xs transition-all ${
                        checked
                          ? 'border-brand bg-brand-light/40 text-brand-navy font-semibold shadow-2xs'
                          : 'border-border/80 bg-surface text-ink hover:bg-bg'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-border text-brand focus:ring-brand shrink-0"
                        checked={checked}
                        onChange={() => handleCheckboxToggle('habits', habit)}
                      />
                      <span>{habit}</span>
                    </label>
                  );
                })}
              </div>

              {/* Add Custom Habit */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <label className="block text-[11px] font-semibold text-ink-soft">
                  Add Custom Habit
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    autoComplete="off"
                    className="input-field text-xs py-1.5 flex-1"
                    placeholder="e.g. Vaping..."
                    value={customHabitInput}
                    onChange={(e) => setCustomHabitInput(capitalizeWords(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomHabit();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomHabit}
                    className="btn-primary py-1.5 px-3 text-xs font-semibold flex items-center justify-center gap-1 shrink-0"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>

                {/* Display Custom Habits Tags */}
                {formData.habits.some((item) => !HABITS_OPTIONS.includes(item)) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formData.habits.map((item) => {
                      if (HABITS_OPTIONS.includes(item)) return null;
                      return (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-medium"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => handleCheckboxToggle('habits', item)}
                            className="text-amber-600 hover:text-amber-900 rounded p-0.5"
                            title="Remove habit"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* 4. Bottom Action Buttons Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-border/80">
          <button
            type="button"
            id="btn-cancel-registration"
            className="btn-secondary w-full sm:w-auto justify-center"
            onClick={handleBackNavigation}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full sm:w-auto justify-center text-xs sm:text-sm inline-flex items-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={18} />}
            <span>{submitting ? 'Registering...' : 'Register & Book Appointment'}</span>
          </button>
        </div>
      </form>

      {/* 5. Follow-on Appointment Booking Step for Doctor */}
      <CreateAppointmentModal
        isOpen={showBookModal}
        initialPatient={registeredPatientForAppointment}
        initialDoctorId={user?._id || user?.id}
        defaultAction="Check-in"
        onClose={() => {
          setShowBookModal(false);
          navigate(user?.role === 'doctor' ? '/doctor/patients' : '/reception/appointments');
        }}
        onSuccess={() => {
          setShowBookModal(false);
          navigate(user?.role === 'doctor' ? '/doctor/queue' : '/reception/appointments');
        }}
      />

      {/* 6. Unsaved Changes Confirmation Modal */}
      <UnsavedChangesModal
        isOpen={showConfirmModal}
        onStay={handleStay}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
