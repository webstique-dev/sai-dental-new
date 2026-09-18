import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, UserCheck, Plus, AlertTriangle, Stethoscope, Save, ArrowRight, Edit3, Trash2 } from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from './DatePicker.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { validateName, validatePhone, validateAge, validateDOB } from '../../utils/validators.js';

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

export default function PatientDetailsEditModal({
  isOpen,
  patient,
  appointmentId = null,
  startConsultation = null,
  title = null,
  subtitle = null,
  onClose = () => { },
  onSuccess = () => { },
}) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const shouldStartConsultation = startConsultation !== null ? Boolean(startConsultation) : Boolean(appointmentId);

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

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [customMedicalInput, setCustomMedicalInput] = useState('');
  const [customHabitInput, setCustomHabitInput] = useState('');
  const [customVitalLabel, setCustomVitalLabel] = useState('');
  const [customVitalValue, setCustomVitalValue] = useState('');

  // Editing states for custom tags
  const [editingMedicalIndex, setEditingMedicalIndex] = useState(null);
  const [editingMedicalValue, setEditingMedicalValue] = useState('');
  const [editingHabitIndex, setEditingHabitIndex] = useState(null);
  const [editingHabitValue, setEditingHabitValue] = useState('');

  useEffect(() => {
    if (patient) {
      const pAge = patient.age !== undefined && patient.age !== null ? Number(patient.age) : null;
      const initialType = patient.patientType || (pAge !== null && pAge < 12 ? 'child' : 'adult');

      setFormData({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        age: patient.age !== undefined && patient.age !== null ? String(patient.age) : '',
        sex: patient.sex || '',
        patientType: initialType,
        dateOfBirth: patient.dateOfBirth
          ? new Date(patient.dateOfBirth).toISOString().split('T')[0]
          : '',
        occupation: patient.occupation || '',
        address: patient.address || '',
        primaryPhone: patient.primaryPhone || patient.phone || '',
        secondaryPhone: patient.secondaryPhone || '',
        medicalHistory: Array.isArray(patient.medicalHistory) ? [...patient.medicalHistory] : [],
        currentMedications: patient.currentMedications || '',
        vitals: patient.vitals && typeof patient.vitals === 'object' ? { bp: '', rbs: '', ...patient.vitals } : { bp: '', rbs: '' },
        habits: Array.isArray(patient.habits) ? [...patient.habits] : [],
        dentalHistory: patient.dentalHistory || '',
      });
      setErrorMessage('');
    }
  }, [patient]);

  // When opened, fetch full up-to-date patient profile in background
  useEffect(() => {
    if (!isOpen || !patient) return;
    const pId = patient._id || patient.id;
    if (!pId) return;

    let isMounted = true;
    api.get(`/patients/${pId}`).then((res) => {
      if (isMounted && res.data?.patient) {
        const fresh = res.data.patient;
        const pAge = fresh.age !== undefined && fresh.age !== null ? Number(fresh.age) : null;
        const initialType = fresh.patientType || (pAge !== null && pAge < 12 ? 'child' : 'adult');
        setFormData({
          firstName: fresh.firstName || '',
          lastName: fresh.lastName || '',
          age: fresh.age !== undefined && fresh.age !== null ? String(fresh.age) : '',
          sex: fresh.sex || '',
          patientType: initialType,
          dateOfBirth: fresh.dateOfBirth
            ? new Date(fresh.dateOfBirth).toISOString().split('T')[0]
            : '',
          occupation: fresh.occupation || '',
          address: fresh.address || '',
          primaryPhone: fresh.primaryPhone || fresh.phone || '',
          secondaryPhone: fresh.secondaryPhone || '',
          medicalHistory: Array.isArray(fresh.medicalHistory) ? [...fresh.medicalHistory] : [],
          currentMedications: fresh.currentMedications || '',
          vitals: fresh.vitals && typeof fresh.vitals === 'object' ? { bp: '', rbs: '', ...fresh.vitals } : { bp: '', rbs: '' },
          habits: Array.isArray(fresh.habits) ? [...fresh.habits] : [],
          dentalHistory: fresh.dentalHistory || '',
        });
      }
    }).catch(() => {
      // Fall back silently to patient prop
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, patient]);

  if (!isOpen || !patient) return null;

  const patientId = patient._id || patient.id;

  const handleMedicalHistoryToggle = (item) => {
    setFormData((prev) => {
      const exists = prev.medicalHistory.includes(item);
      const updated = exists
        ? prev.medicalHistory.filter((m) => m !== item)
        : [...prev.medicalHistory, item];
      return { ...prev, medicalHistory: updated };
    });
  };

  const handleHabitToggle = (item) => {
    setFormData((prev) => {
      const exists = prev.habits.includes(item);
      const updated = exists
        ? prev.habits.filter((h) => h !== item)
        : [...prev.habits, item];
      return { ...prev, habits: updated };
    });
  };

  const handleAddCustomMedicalHistory = () => {
    const trimmed = customMedicalInput.trim();
    if (!trimmed) return;
    if (!formData.medicalHistory.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        medicalHistory: [...prev.medicalHistory, trimmed],
      }));
    }
    setCustomMedicalInput('');
  };

  const handleStartEditCustomMedical = (item) => {
    setEditingMedicalIndex(item);
    setEditingMedicalValue(item);
  };

  const handleSaveEditCustomMedical = (oldItem) => {
    const trimmed = editingMedicalValue.trim();
    if (!trimmed) {
      handleRemoveCustomMedical(oldItem);
    } else {
      setFormData((prev) => ({
        ...prev,
        medicalHistory: prev.medicalHistory.map((m) => (m === oldItem ? trimmed : m)),
      }));
    }
    setEditingMedicalIndex(null);
    setEditingMedicalValue('');
  };

  const handleRemoveCustomMedical = (item) => {
    setFormData((prev) => ({
      ...prev,
      medicalHistory: prev.medicalHistory.filter((m) => m !== item),
    }));
  };

  const handleAddCustomHabit = () => {
    const trimmed = customHabitInput.trim();
    if (!trimmed) return;
    if (!formData.habits.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        habits: [...prev.habits, trimmed],
      }));
    }
    setCustomHabitInput('');
  };

  const handleStartEditCustomHabit = (item) => {
    setEditingHabitIndex(item);
    setEditingHabitValue(item);
  };

  const handleSaveEditCustomHabit = (oldItem) => {
    const trimmed = editingHabitValue.trim();
    if (!trimmed) {
      handleRemoveCustomHabit(oldItem);
    } else {
      setFormData((prev) => ({
        ...prev,
        habits: prev.habits.map((h) => (h === oldItem ? trimmed : h)),
      }));
    }
    setEditingHabitIndex(null);
    setEditingHabitValue('');
  };

  const handleRemoveCustomHabit = (item) => {
    setFormData((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h !== item),
    }));
  };

  const handleAddCustomVital = () => {
    const labelTrimmed = customVitalLabel.trim();
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

  const handleStartConsultationDirectly = async (patientDataToUse = null) => {
    setSaving(true);
    setErrorMessage('');
    try {
      // 1. If user updated data, update existing patient via PATCH /api/patients/:id
      if (patientDataToUse) {
        await api.patch(`/patients/${patientId}`, patientDataToUse);
        showSuccess('Patient details updated successfully!');
      }

      // 2. Start/resume consultation
      const startPayload = { patientId };
      if (appointmentId) {
        startPayload.appointmentId = appointmentId;
      }

      const res = await api.post('/consultations/start', startPayload);
      const consultation = res.data?.consultation;
      const consultationId = consultation?._id || consultation?.id;

      if (consultationId) {
        onClose();
        onSuccess(consultation);
        navigate(`/doctor/consultation/${consultationId}`);
      } else {
        throw new Error('Failed to retrieve consultation ID');
      }
    } catch (err) {
      console.error('Error starting consultation:', err);
      const msg = err.response?.data?.message || 'Failed to start consultation.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const fnErr = validateName(formData.firstName, 'First Name', true);
    if (fnErr) {
      setErrorMessage(fnErr);
      return;
    }

    const lnErr = validateName(formData.lastName, 'Last Name', false);
    if (lnErr) {
      setErrorMessage(lnErr);
      return;
    }

    if (formData.primaryPhone) {
      const phoneErr = validatePhone(formData.primaryPhone, 'Primary Phone', false);
      if (phoneErr) {
        setErrorMessage(phoneErr);
        return;
      }
    }

    if (formData.secondaryPhone) {
      const secPhoneErr = validatePhone(formData.secondaryPhone, 'Secondary Phone', false);
      if (secPhoneErr) {
        setErrorMessage(secPhoneErr);
        return;
      }
    }

    const ageErr = validateAge(formData.age, false);
    if (ageErr) {
      setErrorMessage(ageErr);
      return;
    }

    if (formData.dateOfBirth) {
      const dobErr = validateDOB(formData.dateOfBirth, false);
      if (dobErr) {
        setErrorMessage(dobErr);
        return;
      }
    }

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      age: formData.age !== '' && formData.age !== null && formData.age !== undefined && !isNaN(formData.age) ? parseFloat(formData.age) : undefined,
      sex: formData.sex || '',
      patientType: formData.patientType || 'adult',
      dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : null,
      occupation: formData.occupation.trim(),
      address: formData.address.trim(),
      primaryPhone: formData.primaryPhone.trim(),
      secondaryPhone: formData.secondaryPhone.trim(),
      medicalHistory: formData.medicalHistory,
      currentMedications: formData.currentMedications.trim(),
      vitals: formData.vitals,
      habits: formData.habits,
      dentalHistory: formData.dentalHistory.trim(),
    };

    if (shouldStartConsultation) {
      await handleStartConsultationDirectly(payload);
    } else {
      setSaving(true);
      setErrorMessage('');
      try {
        const res = await api.patch(`/patients/${patientId}`, payload);
        const updated = res.data?.patient;
        showSuccess('Patient details updated successfully!');
        if (onSuccess) {
          onSuccess(updated || { ...patient, ...payload });
        }
        onClose();
      } catch (err) {
        console.error('Error updating patient details:', err);
        const msg = err.response?.data?.message || 'Failed to update patient details.';
        setErrorMessage(msg);
        showError(msg);
      } finally {
        setSaving(false);
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-150 !mt-0">
      <div className="card w-full max-w-2xl sm:max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150 !mt-0 !my-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-3.5 bg-surface shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold shrink-0">
              <Stethoscope size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-base sm:text-lg font-bold text-ink">
                  {title || (shouldStartConsultation ? 'Edit Patient Registration Details' : 'Edit Patient Details')}
                </h3>
                <span className="badge bg-brand/10 text-brand font-mono text-[10px] font-bold">
                  OP #{patient.opNumber || 'N/A'}
                </span>
              </div>
              <p className="text-[11px] text-ink-soft truncate">
                {subtitle || (shouldStartConsultation ? 'Review and update patient info recorded during registration' : 'Review and update patient demographics, medical history, vitals, and habits')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1 text-ink-soft hover:text-ink hover:bg-bg transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body & Footer */}
        <form onSubmit={handleFormSubmit} autoComplete="off" className="flex flex-col flex-1 overflow-hidden min-h-0 !mt-0 !mb-0">
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Section 1: Basic Information */}
            <div className="card p-4 bg-bg/30 space-y-4">
              <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider text-brand border-b border-border pb-2">
                1. Basic Personal Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    First Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field py-1.5 text-xs"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Last Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field py-1.5 text-xs"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Primary Phone
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    className="input-field py-1.5 text-xs font-mono"
                    placeholder="10-digit primary number"
                    value={formData.primaryPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, primaryPhone: val });
                    }}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Secondary Phone <span className="font-normal text-[11px]">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    className="input-field py-1.5 text-xs font-mono"
                    placeholder="10-digit secondary number"
                    value={formData.secondaryPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, secondaryPhone: val });
                    }}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Age</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="130"
                    className="input-field py-1.5 text-xs font-mono"
                    placeholder="e.g. 4.5 or 35"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Sex</label>
                  <select
                    className="input-field py-1.5 text-xs"
                    value={formData.sex}
                    onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                  >
                    <option value="">Select Sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Date of Birth</label>
                  <DatePicker
                    placeholder="Select Date of Birth"
                    value={formData.dateOfBirth}
                    onChange={(d, dateStr) => setFormData({ ...formData, dateOfBirth: dateStr })}
                    maxDate={new Date()}
                    inputClassName="py-1.5 text-xs"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-ink-soft mb-1">
                    Patient Type (Dentition) <span className="text-rose-600">*</span>
                  </label>
                  <div className="inline-flex rounded-xl border border-border bg-surface p-1 w-full" role="radiogroup" aria-label="Patient Type">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={formData.patientType === 'adult'}
                      onClick={() => setFormData({ ...formData, patientType: 'adult' })}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${formData.patientType === 'adult'
                          ? 'bg-brand text-white shadow-sm'
                          : 'text-ink-soft hover:text-ink'
                        }`}
                    >
                      Adult (Permanent 32 Teeth)
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={formData.patientType === 'child'}
                      onClick={() => setFormData({ ...formData, patientType: 'child' })}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${formData.patientType === 'child'
                          ? 'bg-brand text-white shadow-sm'
                          : 'text-ink-soft hover:text-ink'
                        }`}
                    >
                      Child (Primary 20 Teeth)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Occupation</label>
                  <input
                    type="text"
                    className="input-field py-1.5 text-xs"
                    placeholder="e.g. Engineer, Business"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-ink-soft mb-1">Address</label>
                  <input
                    type="text"
                    className="input-field py-1.5 text-xs"
                    placeholder="Full residential address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Medical History & Conditions */}
            <div className="card p-4 bg-bg/30 space-y-4">
              <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider text-brand border-b border-border pb-2">
                2. Medical History & Systemic Conditions
              </h4>

              <div className="space-y-3">
                <label className="block font-semibold text-ink-soft">Select Relevant Medical History</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {MEDICAL_HISTORY_OPTIONS.map((item) => {
                    const checked = formData.medicalHistory.includes(item);
                    return (
                      <label
                        key={item}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${checked ? 'bg-brand-light/30 border-brand text-brand-dark font-semibold' : 'border-border bg-surface text-ink-soft'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleMedicalHistoryToggle(item)}
                          className="rounded text-brand focus:ring-brand"
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Custom Added Medical Conditions Section */}
                {formData.medicalHistory.filter((m) => !MEDICAL_HISTORY_OPTIONS.includes(m)).length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">
                      Custom Added Medical Conditions ({formData.medicalHistory.filter((m) => !MEDICAL_HISTORY_OPTIONS.includes(m)).length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {formData.medicalHistory
                        .filter((m) => !MEDICAL_HISTORY_OPTIONS.includes(m))
                        .map((item) => {
                          const isEditing = editingMedicalIndex === item;

                          if (isEditing) {
                            return (
                              <div key={item} className="inline-flex items-center gap-1.5 p-1 rounded-xl border border-brand bg-surface shadow-xs">
                                <input
                                  type="text"
                                  className="input-field py-0.5 px-2 text-xs font-semibold max-w-[170px]"
                                  autoFocus
                                  value={editingMedicalValue}
                                  onChange={(e) => setEditingMedicalValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveEditCustomMedical(item);
                                    } else if (e.key === 'Escape') {
                                      setEditingMedicalIndex(null);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditCustomMedical(item)}
                                  className="p-1 rounded-lg bg-brand text-white hover:bg-brand-dark text-xs font-bold"
                                  title="Save Edit"
                                >
                                  <Save size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingMedicalIndex(null)}
                                  className="p-1 rounded-lg hover:bg-bg text-ink-soft text-xs"
                                  title="Cancel"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={item}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand/40 bg-brand-light/40 text-brand-dark font-bold text-xs shadow-2xs animate-in fade-in"
                            >
                              <span>{item}</span>
                              <button
                                type="button"
                                onClick={() => handleStartEditCustomMedical(item)}
                                className="text-amber-700 hover:text-amber-800 p-0.5 rounded hover:bg-amber-100/50 transition-colors ml-0.5"
                                title="Edit condition"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomMedical(item)}
                                className="text-rose-600 hover:text-rose-700 p-0.5 rounded hover:bg-rose-100/50 transition-colors"
                                title="Remove condition"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Custom Medical Tag Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    className="input-field py-1.5 text-xs max-w-sm"
                    placeholder="Type custom condition (e.g. GERD, Penicillin Allergy)..."
                    value={customMedicalInput}
                    onChange={(e) => setCustomMedicalInput(e.target.value)}
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
                    disabled={!customMedicalInput.trim()}
                    className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Plus size={14} /> Add Condition
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Current Medications</label>
                <textarea
                  rows={2}
                  className="input-field text-xs"
                  placeholder="List any regular medicines currently being taken..."
                  value={formData.currentMedications}
                  onChange={(e) => setFormData({ ...formData, currentMedications: e.target.value })}
                />
              </div>
            </div>

            {/* Section 3: Vitals & Personal Habits */}
            <div className="card p-4 bg-bg/30 space-y-4">
              <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider text-brand border-b border-border pb-2">
                3. Patient Vitals & Personal Habits
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Blood Pressure (BP)</label>
                  <input
                    type="text"
                    className="input-field py-1.5 text-xs"
                    placeholder="e.g. 120/80 mmHg"
                    value={formData.vitals?.bp || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vitals: { ...(formData.vitals || {}), bp: e.target.value },
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1 font-mono">Random Blood Sugar (RBS)</label>
                  <input
                    type="text"
                    className="input-field py-1.5 text-xs"
                    placeholder="e.g. 110 mg/dL"
                    value={formData.vitals?.rbs || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vitals: { ...(formData.vitals || {}), rbs: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              {/* Habits Checkboxes */}
              <div className="space-y-3 pt-2">
                <label className="block font-semibold text-ink-soft">Personal Habits</label>
                <div className="flex flex-wrap gap-2">
                  {HABITS_OPTIONS.map((habit) => {
                    const checked = formData.habits.includes(habit);
                    return (
                      <label
                        key={habit}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition-colors ${checked ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold' : 'border-border bg-surface text-ink-soft'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleHabitToggle(habit)}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>{habit}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Custom Added Habits */}
                {formData.habits.filter((h) => !HABITS_OPTIONS.includes(h)).length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">
                      Custom Added Habits ({formData.habits.filter((h) => !HABITS_OPTIONS.includes(h)).length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {formData.habits
                        .filter((h) => !HABITS_OPTIONS.includes(h))
                        .map((item) => {
                          const isEditing = editingHabitIndex === item;

                          if (isEditing) {
                            return (
                              <div key={item} className="inline-flex items-center gap-1.5 p-1 rounded-xl border border-amber-400 bg-surface shadow-xs">
                                <input
                                  type="text"
                                  className="input-field py-0.5 px-2 text-xs font-semibold max-w-[160px]"
                                  autoFocus
                                  value={editingHabitValue}
                                  onChange={(e) => setEditingHabitValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveEditCustomHabit(item);
                                    } else if (e.key === 'Escape') {
                                      setEditingHabitIndex(null);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditCustomHabit(item)}
                                  className="p-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold"
                                  title="Save Edit"
                                >
                                  <Save size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingHabitIndex(null)}
                                  className="p-1 rounded-lg hover:bg-bg text-ink-soft text-xs"
                                  title="Cancel"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={item}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 font-bold text-xs shadow-2xs animate-in fade-in"
                            >
                              <span>{item}</span>
                              <button
                                type="button"
                                onClick={() => handleStartEditCustomHabit(item)}
                                className="text-amber-700 hover:text-amber-800 p-0.5 rounded hover:bg-amber-100 transition-colors ml-0.5"
                                title="Edit habit"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomHabit(item)}
                                className="text-rose-600 hover:text-rose-700 p-0.5 rounded hover:bg-rose-100 transition-colors"
                                title="Remove habit"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Custom Habit Tag Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    className="input-field py-1.5 text-xs max-w-sm"
                    placeholder="Type custom habit (e.g. Betel nut, Vaping)..."
                    value={customHabitInput}
                    onChange={(e) => setCustomHabitInput(e.target.value)}
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
                    disabled={!customHabitInput.trim()}
                    className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Plus size={14} /> Add Habit
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Previous Dental History</label>
                <textarea
                  rows={2}
                  className="input-field text-xs"
                  placeholder="Details of previous dental treatments or past extractions..."
                  value={formData.dentalHistory}
                  onChange={(e) => setFormData({ ...formData, dentalHistory: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6 sm:py-3.5 bg-bg/50 shrink-0 !mt-0 !mb-0">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="btn-secondary text-xs font-semibold w-full sm:w-auto"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {shouldStartConsultation && appointmentId && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleStartConsultationDirectly(null)}
                  className="btn-secondary text-xs font-semibold hover:border-brand hover:text-brand"
                >
                  Continue Without Updating
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Save size={15} />
                <span>{saving ? 'Saving...' : (shouldStartConsultation ? 'Save Patient Profile' : 'Save Patient Details')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
