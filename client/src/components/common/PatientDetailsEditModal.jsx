import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserCheck, Plus, AlertTriangle, Stethoscope, Save, ArrowRight } from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from './DatePicker.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { validateName, validatePhone, validateAge } from '../../utils/validators.js';

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
  onClose = () => {},
  onSuccess = () => {},
}) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    sex: '',
    patientType: 'adult',
    dateOfBirth: '',
    occupation: '',
    address: '',
    phone: '',
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
        phone: patient.phone || '',
        medicalHistory: Array.isArray(patient.medicalHistory) ? [...patient.medicalHistory] : [],
        currentMedications: patient.currentMedications || '',
        vitals: patient.vitals && typeof patient.vitals === 'object' ? { bp: '', rbs: '', ...patient.vitals } : { bp: '', rbs: '' },
        habits: Array.isArray(patient.habits) ? [...patient.habits] : [],
        dentalHistory: patient.dentalHistory || '',
      });
      setErrorMessage('');
    }
  }, [patient]);

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

    const fnErr = validateName(formData.firstName, 'First Name');
    if (fnErr) {
      setErrorMessage(fnErr);
      return;
    }

    const lnErr = validateName(formData.lastName, 'Last Name');
    if (lnErr) {
      setErrorMessage(lnErr);
      return;
    }

    const phoneErr = validatePhone(formData.phone);
    if (phoneErr) {
      setErrorMessage(phoneErr);
      return;
    }

    const ageErr = validateAge(formData.age);
    if (ageErr) {
      setErrorMessage(ageErr);
      return;
    }

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      age: formData.age ? Number(formData.age) : undefined,
      sex: formData.sex || '',
      patientType: formData.patientType || 'adult',
      dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : undefined,
      occupation: formData.occupation.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      medicalHistory: formData.medicalHistory,
      currentMedications: formData.currentMedications.trim(),
      vitals: formData.vitals,
      habits: formData.habits,
      dentalHistory: formData.dentalHistory.trim(),
    };

    await handleStartConsultationDirectly(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-3 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-150">
      <div className="card w-full max-w-4xl max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-2xl border-brand/20">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand text-white flex items-center justify-center font-bold">
              <Stethoscope size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-ink">
                  Patient Registration Details & Consultation Entry
                </h3>
                <span className="badge bg-brand-light/50 text-brand-dark font-mono text-xs font-bold">
                  OP #{patient.opNumber || 'N/A'}
                </span>
              </div>
              <p className="text-xs text-ink-soft">
                Review and update patient info recorded during registration before starting consultation.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-bg disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} autoComplete="off" className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
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
                  Phone Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  className="input-field py-1.5 text-xs"
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, phone: val });
                  }}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Age</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  className="input-field py-1.5 text-xs"
                  placeholder="e.g. 35"
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
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      formData.patientType === 'adult'
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
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      formData.patientType === 'child'
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

            <div className="space-y-2">
              <label className="block font-semibold text-ink-soft">Select Relevant Medical History</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {MEDICAL_HISTORY_OPTIONS.map((item) => {
                  const checked = formData.medicalHistory.includes(item);
                  return (
                    <label
                      key={item}
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                        checked ? 'bg-brand-light/30 border-brand text-brand-dark font-semibold' : 'border-border bg-surface text-ink-soft'
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

              {/* Custom Medical Tag Input */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  className="input-field py-1 text-xs max-w-xs"
                  placeholder="Add custom medical condition..."
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
                  className="btn-secondary py-1 px-3 text-xs"
                >
                  <Plus size={14} /> Add
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
            <div className="space-y-2 pt-2">
              <label className="block font-semibold text-ink-soft">Personal Habits</label>
              <div className="flex flex-wrap gap-2">
                {HABITS_OPTIONS.map((habit) => {
                  const checked = formData.habits.includes(habit);
                  return (
                    <label
                      key={habit}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition-colors ${
                        checked ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold' : 'border-border bg-surface text-ink-soft'
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
        </form>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-6 py-4 bg-surface shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="btn-secondary py-2 px-4 text-xs font-semibold w-full sm:w-auto"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleStartConsultationDirectly(null)}
              className="btn-secondary py-2 px-4 text-xs font-semibold hover:border-brand hover:text-brand"
            >
              Continue Without Updating
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleFormSubmit}
              className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2"
            >
              <Save size={16} />
              <span>{saving ? 'Saving & Opening Consultation...' : 'Save & Start Consultation'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
