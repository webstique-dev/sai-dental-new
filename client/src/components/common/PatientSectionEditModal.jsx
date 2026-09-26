import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Phone,
  HeartPulse,
  ShieldAlert,
  Stethoscope,
  Lock,
  Plus,
  AlertTriangle,
  Loader2,
  Save,
  Smile,
  Baby,
} from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from './DatePicker.jsx';
import UnsavedChangesModal from './UnsavedChangesModal.jsx';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import { validateName, validatePhone, validateAge, validateDOB } from '../../utils/validators.js';
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

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function PatientSectionEditModal({
  isOpen,
  section = 'details',
  patient,
  onClose,
  onSuccess,
}) {
  const { showSuccess, showError } = useNotification();
  const initialFormDataRef = useRef(null);

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
    allergies: '',
    currentMedications: '',
    vitals: { bp: '', rbs: '', pulse: '', temperature: '', bloodGroup: '' },
    habits: [],
    dentalHistory: '',
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [customMedicalInput, setCustomMedicalInput] = useState('');
  const [customHabitInput, setCustomHabitInput] = useState('');
  const [customVitalLabel, setCustomVitalLabel] = useState('');
  const [customVitalValue, setCustomVitalValue] = useState('');

  // Prefill data when modal opens
  useEffect(() => {
    if (!isOpen || !patient) return;

    const pAge = patient.age !== undefined && patient.age !== null ? String(patient.age) : '';
    const initialType = patient.patientType || (patient.age && Number(patient.age) < 12 ? 'child' : 'adult');

    let dobStr = '';
    if (patient.dateOfBirth) {
      try {
        dobStr = new Date(patient.dateOfBirth).toISOString().split('T')[0];
      } catch (e) {
        dobStr = String(patient.dateOfBirth).split('T')[0];
      }
    }

    const patientVitals = patient.vitals && typeof patient.vitals === 'object' ? { ...patient.vitals } : {};

    let allergiesStr = '';
    if (Array.isArray(patient.allergies)) {
      allergiesStr = patient.allergies.join(', ');
    } else if (typeof patient.allergies === 'string') {
      allergiesStr = patient.allergies;
    }

    const initial = {
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      age: pAge,
      sex: patient.sex || '',
      patientType: initialType,
      dateOfBirth: dobStr,
      occupation: patient.occupation || '',
      address: patient.address || '',
      primaryPhone: patient.primaryPhone || patient.phone || '',
      secondaryPhone: patient.secondaryPhone || '',
      medicalHistory: Array.isArray(patient.medicalHistory) ? [...patient.medicalHistory] : [],
      allergies: allergiesStr,
      currentMedications: patient.currentMedications || '',
      vitals: {
        bp: patientVitals.bp || patientVitals.bloodPressure || '',
        rbs: patientVitals.rbs || '',
        pulse: patientVitals.pulse || patientVitals.heartRate || '',
        temperature: patientVitals.temperature || patientVitals.temp || '',
        bloodGroup: patientVitals.bloodGroup || '',
        ...patientVitals,
      },
      habits: Array.isArray(patient.habits) ? [...patient.habits] : [],
      dentalHistory: Array.isArray(patient.dentalHistory) ? patient.dentalHistory.join(', ') : (patient.dentalHistory || ''),
    };

    initialFormDataRef.current = initial;
    setFormData(initial);

    setErrors({});
    setCustomMedicalInput('');
    setCustomHabitInput('');
    setCustomVitalLabel('');
    setCustomVitalValue('');
  }, [isOpen, patient]);

  const isDirty = useMemo(() => {
    if (!initialFormDataRef.current) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormDataRef.current);
  }, [formData]);

  const {
    showConfirmModal,
    confirmLeave,
    handleStay,
    handleDiscard,
    resetDirty,
  } = useUnsavedChanges(isDirty);

  const handleRequestClose = () => {
    if (saving) return;
    confirmLeave(() => {
      if (onClose) onClose();
    });
  };

  if (!isOpen || !patient) return null;

  const handleChange = (field, value) => {
    let formattedVal = value;
    if (['firstName', 'lastName'].includes(field)) {
      formattedVal = capitalizeWords(value.replace(/[^a-zA-Z\s'-]/g, ''));
    } else if (['occupation', 'address', 'allergies', 'currentMedications', 'dentalHistory'].includes(field)) {
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

  const handleRemoveCustomVital = (key) => {
    setFormData((prev) => {
      const updated = { ...(prev.vitals || {}) };
      delete updated[key];
      return { ...prev, vitals: updated };
    });
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

  const handleCheckboxToggle = (field, item) => {
    setFormData((prev) => {
      const list = prev[field] || [];
      const updated = list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
      return { ...prev, [field]: updated };
    });
  };

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

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const newErrors = {};

    if (section === 'details') {
      const nameErr = validateName(formData.firstName, 'First Name', true);
      if (nameErr) newErrors.firstName = nameErr;

      if (formData.lastName) {
        const lErr = validateName(formData.lastName, 'Last Name', false);
        if (lErr) newErrors.lastName = lErr;
      }

      if (formData.dateOfBirth) {
        const dobErr = validateDOB(formData.dateOfBirth, false);
        if (dobErr) newErrors.dateOfBirth = dobErr;
      }

      if (formData.age !== '' && formData.age !== undefined && formData.age !== null) {
        const aErr = validateAge(formData.age, false);
        if (aErr) newErrors.age = aErr;
      }
    }

    if (section === 'contact') {
      if (formData.primaryPhone) {
        const pErr = validatePhone(formData.primaryPhone, 'Primary Phone', false);
        if (pErr) newErrors.primaryPhone = pErr;
      }
      if (formData.secondaryPhone) {
        const sErr = validatePhone(formData.secondaryPhone, 'Secondary Phone', false);
        if (sErr) newErrors.secondaryPhone = sErr;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showError('Please correct the highlighted errors before saving.');
      return;
    }

    setSaving(true);
    try {
      const payload = {};

      if (section === 'details') {
        payload.firstName = capitalizeName(formData.firstName.trim());
        payload.lastName = formData.lastName ? capitalizeName(formData.lastName.trim()) : '';
        payload.sex = formData.sex;

        payload.patientType = formData.patientType;
        payload.dateOfBirth = formData.dateOfBirth || null;
        payload.age = formData.age !== '' && !isNaN(formData.age) ? parseFloat(formData.age) : null;
      } else if (section === 'contact') {
        payload.primaryPhone = formData.primaryPhone ? formData.primaryPhone.trim() : '';
        payload.phone = formData.primaryPhone ? formData.primaryPhone.trim() : '';
        payload.secondaryPhone = formData.secondaryPhone ? formData.secondaryPhone.trim() : '';
        payload.occupation = formData.occupation ? capitalizeWords(formData.occupation.trim()) : '';
        payload.address = formData.address ? capitalizeWords(formData.address.trim()) : '';
      } else if (section === 'vitals') {
        const cleanedVitals = {};
        Object.entries(formData.vitals || {}).forEach(([k, v]) => {
          if (typeof v === 'string' && v.trim()) {
            cleanedVitals[k] = v.trim();
          } else if (v !== null && v !== undefined && typeof v !== 'string' && v !== '') {
            cleanedVitals[k] = v;
          }
        });
        payload.vitals = cleanedVitals;
      } else if (section === 'medical') {
        payload.medicalHistory = formData.medicalHistory;
        payload.currentMedications = formData.currentMedications ? capitalizeWords(formData.currentMedications.trim()) : '';
        payload.allergies = formData.allergies ? capitalizeWords(formData.allergies.trim()) : '';
      } else if (section === 'dental') {
        payload.dentalHistory = formData.dentalHistory ? capitalizeWords(formData.dentalHistory.trim()) : '';
        payload.habits = formData.habits;
      }

      const patientId = patient._id || patient.id;
      const res = await api.patch(`/patients/${patientId}`, payload);
      const updated = res.data?.patient || { ...patient, ...payload };

      showSuccess('Patient details updated successfully!');
      resetDirty();
      if (onSuccess) {
        onSuccess(updated);
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to update patient:', err);
      showError(err.response?.data?.message || 'Failed to update patient details.');
    } finally {
      setSaving(false);
    }
  };

  const getSectionConfig = () => {
    switch (section) {
      case 'details':
        return {
          title: 'Edit Patient Details',
          subtitle: 'Update personal identity and demographic information',
          icon: User,
          iconBg: 'bg-brand-light text-brand',
        };
      case 'contact':
        return {
          title: 'Edit Contact Information',
          subtitle: 'Update phone numbers, address, and occupation',
          icon: Phone,
          iconBg: 'bg-blue-50 text-blue-600',
        };
      case 'vitals':
        return {
          title: 'Edit Patient Vitals',
          subtitle: 'Update baseline clinical measurements and vitals',
          icon: HeartPulse,
          iconBg: 'bg-rose-50 text-rose-600',
        };
      case 'medical':
        return {
          title: 'Edit Medical History & Allergies',
          subtitle: 'Update systemic medical conditions, drug allergies, and medications',
          icon: ShieldAlert,
          iconBg: 'bg-amber-50 text-amber-700',
        };
      case 'dental':
        return {
          title: 'Edit Dental History & Habits',
          subtitle: 'Update previous dental procedures, complaints, and lifestyle habits',
          icon: Stethoscope,
          iconBg: 'bg-teal-50 text-teal-700',
        };
      default:
        return {
          title: 'Edit Patient Information',
          subtitle: 'Update patient information',
          icon: User,
          iconBg: 'bg-brand-light text-brand',
        };
    }
  };

  const config = getSectionConfig();
  const IconComponent = config.icon;

  const regDateFormatted = patient.registrationDate || patient.createdAt
    ? new Date(patient.registrationDate || patient.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <>
      {createPortal(
        <div
          data-modal-backdrop="patient-section-edit"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleRequestClose();
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-150 !m-0 !mt-0"
        >
          <div
            role="dialog"
            aria-label={config.title}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in zoom-in-95 duration-150 !mt-0 !my-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-3.5 bg-surface shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.iconBg}`}>
                  <IconComponent size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">{config.title}</h3>
                  <p className="text-[11px] text-ink-soft">{config.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestClose}
                disabled={saving}
                className="rounded-lg p-1 text-ink-soft hover:text-ink hover:bg-bg transition-colors disabled:opacity-50"
                aria-label="Close edit modal"
              >
                <X size={18} />
              </button>
            </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} autoComplete="off" className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 text-xs">

            {/* SECTION 1: Patient Details */}
            {section === 'details' && (
              <div className="space-y-4">
                {/* System-Generated Read-Only Identifier */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-bg border border-border/80 text-xs">
                  <span className="font-semibold text-ink-soft">OP Number:</span>
                  <span className="badge bg-brand/10 text-brand font-mono font-bold flex items-center gap-1">
                    <Lock size={11} className="text-brand" />
                    {patient.opNumber || 'N/A'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">
                      First Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      autoCapitalize="words"
                      className={`input-field text-xs ${
                        errors.firstName ? 'border-rose-500 bg-rose-50/40 text-rose-900' : ''
                      }`}
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', capitalizeName(e.target.value.replace(/[^a-zA-Z\s'-]/g, '')))}
                    />
                    {errors.firstName && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} /> {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Last Name</label>
                    <input
                      type="text"
                      autoCapitalize="words"
                      className={`input-field text-xs ${
                        errors.lastName ? 'border-rose-500 bg-rose-50/40 text-rose-900' : ''
                      }`}
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', capitalizeName(e.target.value.replace(/[^a-zA-Z\s'-]/g, '')))}
                    />
                    {errors.lastName && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} /> {errors.lastName}
                      </p>
                    )}
                  </div>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <DatePicker
                      label="Date of Birth"
                      value={formData.dateOfBirth}
                      onChange={(date, dateStr) => {
                        handleChange('dateOfBirth', dateStr);
                        if (date) {
                          const now = new Date();
                          let diff = now.getFullYear() - date.getFullYear();
                          const m = now.getMonth() - date.getMonth();
                          if (m < 0 || (m === 0 && now.getDate() < date.getDate())) diff--;
                          if (diff >= 0) {
                            handleChange('age', String(diff));
                            handleChange('patientType', diff < 12 ? 'child' : 'adult');
                          }
                        }
                      }}
                      maxDate={new Date()}
                      error={errors.dateOfBirth}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Age</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="130"
                      className={`input-field font-mono text-xs ${
                        errors.age ? 'border-rose-500 bg-rose-50/40 text-rose-900' : ''
                      }`}
                      placeholder="Age"
                      value={formData.age}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleChange('age', val);
                        if (val !== '' && !isNaN(val)) {
                          handleChange('patientType', Number(val) < 12 ? 'child' : 'adult');
                        }
                      }}
                    />
                    {errors.age && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} /> {errors.age}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Sex / Gender</label>
                    <select
                      className="input-field text-xs"
                      value={formData.sex}
                      onChange={(e) => handleChange('sex', e.target.value)}
                    >
                      <option value="">Select Sex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Dentition Type <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 rounded-xl border border-border bg-bg p-1 gap-1" role="radiogroup">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={formData.patientType === 'adult'}
                      onClick={() => handleChange('patientType', 'adult')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                        formData.patientType === 'adult'
                          ? 'bg-brand text-white shadow-xs'
                          : 'text-ink-soft hover:text-ink hover:bg-surface/60'
                      }`}
                    >
                      <Smile size={14} />
                      <span>Adult (32 Teeth)</span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={formData.patientType === 'child'}
                      onClick={() => handleChange('patientType', 'child')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                        formData.patientType === 'child'
                          ? 'bg-brand text-white shadow-xs'
                          : 'text-ink-soft hover:text-ink hover:bg-surface/60'
                      }`}
                    >
                      <Baby size={14} />
                      <span>Child (20 Teeth)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: Contact Information */}
            {section === 'contact' && (
              <div className="space-y-4">
                {/* System-Generated Read-Only Registration Date */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-bg border border-border/80 text-xs">
                  <span className="font-semibold text-ink-soft">Registration Date:</span>
                  <span className="font-medium text-ink flex items-center gap-1">
                    <Lock size={11} className="text-ink-soft" />
                    {regDateFormatted}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Primary Phone</label>
                    <input
                      type="tel"
                      maxLength={10}
                      className={`input-field font-mono text-xs ${
                        errors.primaryPhone ? 'border-rose-500 bg-rose-50/40 text-rose-900' : ''
                      }`}
                      placeholder="10-digit phone"
                      value={formData.primaryPhone}
                      onChange={(e) => handleChange('primaryPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                    {errors.primaryPhone && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} /> {errors.primaryPhone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">
                      Secondary Phone <span className="text-ink-soft/70 font-normal">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      className={`input-field font-mono text-xs ${
                        errors.secondaryPhone ? 'border-rose-500 bg-rose-50/40 text-rose-900' : ''
                      }`}
                      placeholder="Optional phone"
                      value={formData.secondaryPhone}
                      onChange={(e) => handleChange('secondaryPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                    {errors.secondaryPhone && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} /> {errors.secondaryPhone}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Occupation</label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    placeholder="e.g. Teacher, Engineer, Student"
                    value={formData.occupation}
                    onChange={(e) => handleChange('occupation', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Address</label>
                  <textarea
                    rows={2}
                    className="input-field text-xs leading-relaxed"
                    placeholder="Street, City, Pin Code"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* SECTION 3: Patient Vitals */}
            {section === 'vitals' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Blood Pressure (BP)</label>
                    <input
                      type="text"
                      className="input-field font-mono text-xs"
                      placeholder="e.g. 120/80 mmHg"
                      value={formData.vitals?.bp || ''}
                      onChange={(e) => handleVitalsChange('bp', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Random Blood Sugar (RBS)</label>
                    <input
                      type="text"
                      className="input-field font-mono text-xs"
                      placeholder="e.g. 110 mg/dL"
                      value={formData.vitals?.rbs || ''}
                      onChange={(e) => handleVitalsChange('rbs', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Heart Rate / Pulse</label>
                    <input
                      type="text"
                      className="input-field font-mono text-xs"
                      placeholder="72 bpm"
                      value={formData.vitals?.pulse || ''}
                      onChange={(e) => handleVitalsChange('pulse', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Temperature</label>
                    <input
                      type="text"
                      className="input-field font-mono text-xs"
                      placeholder="98.6 °F"
                      value={formData.vitals?.temperature || ''}
                      onChange={(e) => handleVitalsChange('temperature', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Blood Group</label>
                    <select
                      className="input-field text-xs font-semibold"
                      value={formData.vitals?.bloodGroup || ''}
                      onChange={(e) => handleVitalsChange('bloodGroup', e.target.value)}
                    >
                      <option value="">Select</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Vitals List */}
                {Object.entries(formData.vitals || {}).filter(
                  ([k]) => !['bp', 'bloodPressure', 'rbs', 'pulse', 'heartRate', 'temperature', 'temp', 'bloodGroup'].includes(k)
                ).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/70">
                    <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
                      Custom Vitals:
                    </span>
                    <div className="space-y-1.5">
                      {Object.entries(formData.vitals || {}).map(([key, val]) => {
                        if (['bp', 'bloodPressure', 'rbs', 'pulse', 'heartRate', 'temperature', 'temp', 'bloodGroup'].includes(key)) {
                          return null;
                        }
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between bg-bg rounded-lg px-3 py-1.5 border border-border/80 text-xs"
                          >
                            <span className="font-medium text-ink">
                              {key}: <span className="font-mono text-ink-soft">{val || '—'}</span>
                            </span>
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
                <div className="pt-2 border-t border-border/70 space-y-2">
                  <label className="block text-[11px] font-semibold text-ink-soft">
                    Add Custom Measurement (SpO2, Weight, Height, BMI)
                  </label>
                  <div className="grid grid-cols-12 gap-1.5">
                    <input
                      type="text"
                      className="input-field text-xs py-1.5 col-span-6"
                      placeholder="Name (e.g. SpO2)"
                      value={customVitalLabel}
                      onChange={(e) => setCustomVitalLabel(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input-field text-xs py-1.5 col-span-4"
                      placeholder="Value (e.g. 99%)"
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
            )}

            {/* SECTION 4: Medical History & Allergies */}
            {section === 'medical' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-2">
                    Systemic Medical History
                  </label>
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
                </div>

                {/* Custom Medical History Tag Adder */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-ink-soft">
                    Add Custom Medical Condition
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      className="input-field text-xs py-1.5 flex-1"
                      placeholder="Other medical condition..."
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

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Known Drug Allergies
                  </label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    placeholder="e.g. Penicillin, NSAIDs, Sulfa drugs, Latex..."
                    value={formData.allergies}
                    onChange={(e) => handleChange('allergies', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Current Medications
                  </label>
                  <textarea
                    rows={2}
                    className="input-field text-xs leading-relaxed"
                    placeholder="Ongoing medications, systematic drugs, supplements..."
                    value={formData.currentMedications}
                    onChange={(e) => handleChange('currentMedications', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* SECTION 5: Dental History & Habits */}
            {section === 'dental' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Previous Dental Procedures & Chief Complaints
                  </label>
                  <textarea
                    rows={3}
                    className="input-field text-xs leading-relaxed"
                    placeholder="Previous dental treatments, chief complaints, extractions, root canals, crowns, restorations..."
                    value={formData.dentalHistory}
                    onChange={(e) => handleChange('dentalHistory', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-2">
                    Personal Habits & Lifestyle
                  </label>
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
                </div>

                {/* Custom Habit Adder */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-ink-soft">
                    Add Custom Habit
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      className="input-field text-xs py-1.5 flex-1"
                      placeholder="e.g. Vaping, Betel nut..."
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
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-border bg-bg/50 shrink-0">
            <button
              type="button"
              disabled={saving}
              className="btn-secondary text-xs disabled:opacity-50"
              onClick={handleRequestClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )}

  <UnsavedChangesModal
    isOpen={showConfirmModal}
    onStay={handleStay}
    onDiscard={handleDiscard}
  />
</>
  );
}
