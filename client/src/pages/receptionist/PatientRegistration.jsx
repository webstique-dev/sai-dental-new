import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, UserPlus, Plus, X, Loader2 } from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import CreateAppointmentModal from '../../components/common/CreateAppointmentModal.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { validateName, validatePhone, validateDOB, validateAge } from '../../utils/validators.js';

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

  const [userManuallySetPatientType, setUserManuallySetPatientType] = useState(false);
  const [similarPatients, setSimilarPatients] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [customMedicalInput, setCustomMedicalInput] = useState('');
  const [customHabitInput, setCustomHabitInput] = useState('');
  const [customVitalLabel, setCustomVitalLabel] = useState('');
  const [customVitalValue, setCustomVitalValue] = useState('');

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
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      const payload = {
        ...formData,
        firstName: formData.firstName ? formData.firstName.trim() : '',
        lastName: formData.lastName ? formData.lastName.trim() : '',
        primaryPhone: formData.primaryPhone ? formData.primaryPhone.trim() : '',
        secondaryPhone: formData.secondaryPhone ? formData.secondaryPhone.trim() : '',
        occupation: formData.occupation ? formData.occupation.trim() : '',
        address: formData.address ? formData.address.trim() : '',
        age: formData.age !== '' && formData.age !== undefined && !isNaN(formData.age) ? parseFloat(formData.age) : undefined,
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : undefined,
      };

      const res = await api.post('/patients', payload);
      const newPatient = res.data?.patient;

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
    <div className="max-w-4xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={user?.role === 'doctor' ? '/doctor/patients' : '/reception/patients'}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-ink-soft transition-colors hover:bg-bg hover:text-ink"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-ink">Register & Book Appointment</h2>
            <p className="text-xs sm:text-sm text-ink-soft">Create a new Dental OP Record and schedule an appointment</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary shrink-0 w-full sm:w-auto justify-center text-xs sm:text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={18} />}
          <span>{submitting ? 'Registering...' : 'Register & Book Appointment'}</span>
        </button>
      </div>

      {/* Soft Duplicate / Family Member Notice */}
      {similarPatients.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 sm:p-4 text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-xs sm:text-sm">Notice: Similar patient record found</p>
              <ul className="list-disc pl-4 space-y-0.5 text-xs text-amber-800">
                {similarPatients.map((p) => {
                  const pPhones = [p.primaryPhone || p.phone, p.secondaryPhone].filter(Boolean).join(' / ') || 'No phone';
                  return (
                    <li key={p._id}>
                      <span className="font-medium">{p.firstName} {p.lastName}</span> ({p.opNumber || 'No OP#'}) — {pPhones}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-amber-700 pt-1">
                A patient with matching details already exists — this may be a family member. Continue to create a new record, or select their existing record if this is actually the same person.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* 1. Basic Details */}
        <div className="card p-4 sm:p-6 space-y-4">
          <h3 className="font-display text-sm sm:text-base font-bold text-ink border-b border-border pb-3">
            Basic Details
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                First Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                className={`input-field ${errors.firstName ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20' : ''
                  }`}
                placeholder="e.g. John"
                autoComplete="off"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value.replace(/[^a-zA-Z\s'-]/g, ''))}
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
                autoComplete="off"
                className={`input-field ${errors.lastName ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20' : ''
                  }`}
                placeholder="e.g. Doe"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value.replace(/[^a-zA-Z\s'-]/g, ''))}
              />
              {errors.lastName && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> {errors.lastName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Primary Phone
              </label>
              <input
                type="tel"
                autoComplete="off"
                maxLength={10}
                className={`input-field font-mono ${errors.primaryPhone ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20' : ''
                  }`}
                placeholder="e.g. 9876543210"
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
                Secondary Phone <span className="text-ink-soft font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                autoComplete="off"
                maxLength={10}
                className={`input-field font-mono ${errors.secondaryPhone ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20' : ''
                  }`}
                placeholder="e.g. 9123456789"
                value={formData.secondaryPhone}
                onChange={(e) => handleChange('secondaryPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
              {errors.secondaryPhone && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> {errors.secondaryPhone}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Sex / Gender</label>
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
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Age</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="130"
                autoComplete="off"
                className={`input-field font-mono ${errors.age ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20' : ''
                  }`}
                placeholder="e.g. 4.5 or 30"
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
            <div>
              <DatePicker
                label="Date of Birth"
                value={formData.dateOfBirth}
                onChange={(date, dateStr) => handleChange('dateOfBirth', dateStr)}
                maxDate={new Date()}
                error={errors.dateOfBirth}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Patient Type (Dentition) <span className="text-rose-600">*</span>
              </label>
              <div className="inline-flex flex-col sm:flex-row rounded-xl border border-border bg-bg p-1 w-full gap-1 sm:gap-0" role="radiogroup" aria-label="Patient Type">
                <button
                  type="button"
                  role="radio"
                  aria-checked={formData.patientType === 'adult'}
                  onClick={() => {
                    setUserManuallySetPatientType(true);
                    handleChange('patientType', 'adult');
                  }}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all text-center ${formData.patientType === 'adult'
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
                  onClick={() => {
                    setUserManuallySetPatientType(true);
                    handleChange('patientType', 'child');
                  }}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all text-center ${formData.patientType === 'child'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-ink-soft hover:text-ink'
                    }`}
                >
                  Child (Primary 20 Teeth)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Occupation</label>
              <input
                type="text"
                autoComplete="off"
                className="input-field"
                placeholder="e.g. Teacher, Engineer"
                value={formData.occupation}
                onChange={(e) => handleChange('occupation', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Address</label>
              <input
                type="text"
                autoComplete="off"
                className="input-field"
                placeholder="Street, City, Pin Code"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 2. Medical History */}
        <div className="card p-4 sm:p-6 space-y-4">
          <h3 className="font-display text-sm sm:text-base font-bold text-ink border-b border-border pb-3">
            Medical History
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MEDICAL_HISTORY_OPTIONS.map((item) => {
              const checked = formData.medicalHistory.includes(item);
              return (
                <label
                  key={item}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer text-sm transition-colors ${checked
                    ? 'border-brand bg-brand-light/30 text-brand-dark font-medium'
                    : 'border-border bg-surface text-ink hover:bg-bg'
                    }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand shrink-0"
                    checked={checked}
                    onChange={() => handleCheckboxToggle('medicalHistory', item)}
                  />
                  <span>{item}</span>
                </label>
              );
            })}
          </div>

          {/* Custom Medical History Input & Add Option */}
          <div className="pt-3 border-t border-border/70 space-y-3">
            <label className="block text-xs font-semibold text-ink-soft">
              Add Custom Medical History / Condition
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                autoComplete="off"
                className="input-field py-2 text-sm flex-1"
                placeholder="Enter additional medical condition..."
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
                className="btn-primary py-2 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {/* Display Added Custom Items */}
            {formData.medicalHistory.some((item) => !MEDICAL_HISTORY_OPTIONS.includes(item)) && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
                  Added Custom Conditions:
                </span>
                <div className="flex flex-wrap gap-2">
                  {formData.medicalHistory.map((item) => {
                    if (MEDICAL_HISTORY_OPTIONS.includes(item)) return null;
                    return (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => handleCheckboxToggle('medicalHistory', item)}
                          className="text-teal-600 hover:text-teal-900 rounded-full p-0.5"
                          title="Remove condition"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Current Medications */}
        <div className="card p-4 sm:p-6 space-y-4">
          <h3 className="font-display text-sm sm:text-base font-bold text-ink border-b border-border pb-3">
            Current Medications
          </h3>
          <div>
            <textarea
              rows={3}
              className="input-field"
              placeholder="List any ongoing medications or drug allergies..."
              value={formData.currentMedications}
              onChange={(e) => handleChange('currentMedications', e.target.value)}
            />
          </div>
        </div>

        {/* 4. Vitals */}
        <div className="card p-4 sm:p-6 space-y-4">
          <h3 className="font-display text-sm sm:text-base font-bold text-ink border-b border-border pb-3">
            Vitals
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Blood Pressure (BP)</label>
              <input
                type="text"
                autoComplete="off"
                className="input-field"
                placeholder="e.g. 120/80 mmHg"
                value={formData.vitals?.bp || ''}
                onChange={(e) => handleVitalsChange('bp', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Random Blood Sugar (RBS)</label>
              <input
                type="text"
                autoComplete="off"
                className="input-field"
                placeholder="e.g. 110 mg/dL"
                value={formData.vitals?.rbs || ''}
                onChange={(e) => handleVitalsChange('rbs', e.target.value)}
              />
            </div>

            {/* Render Any Added Custom Vitals */}
            {Object.entries(formData.vitals || {}).map(([key, val]) => {
              if (key === 'bp' || key === 'rbs') return null;
              return (
                <div key={key} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-ink-soft mb-1">{key}</label>
                    <input
                      type="text"
                      className="input-field"
                      value={val || ''}
                      onChange={(e) => handleVitalsChange(key, e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomVital(key)}
                    className="p-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    title={`Remove ${key}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Custom Vital Input Row */}
          <div className="pt-3 border-t border-border/70 space-y-3">
            <label className="block text-xs font-semibold text-ink-soft">
              Add Custom Vital (e.g. Pulse, SpO2, Weight, Temperature)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <input
                type="text"
                className="input-field py-2 text-sm sm:col-span-2"
                placeholder="Vital Name (e.g. Pulse)..."
                value={customVitalLabel}
                onChange={(e) => setCustomVitalLabel(e.target.value)}
              />
              <input
                type="text"
                className="input-field py-2 text-sm sm:col-span-2"
                placeholder="Value (e.g. 72 bpm)..."
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
                className="btn-primary py-2 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        </div>

        {/* 5. Habits */}
        <div className="card p-4 sm:p-6 space-y-4">
          <h3 className="font-display text-sm sm:text-base font-bold text-ink border-b border-border pb-3">
            Habits
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {HABITS_OPTIONS.map((habit) => {
              const checked = formData.habits.includes(habit);
              return (
                <label
                  key={habit}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer text-sm transition-colors ${checked
                    ? 'border-brand bg-brand-light/30 text-brand-dark font-medium'
                    : 'border-border bg-surface text-ink hover:bg-bg'
                    }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand shrink-0"
                    checked={checked}
                    onChange={() => handleCheckboxToggle('habits', habit)}
                  />
                  <span>{habit}</span>
                </label>
              );
            })}
          </div>

          {/* Custom Habit Input & Add Option */}
          <div className="pt-3 border-t border-border/70 space-y-3">
            <label className="block text-xs font-semibold text-ink-soft">
              Add Custom Habit
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                autoComplete="off"
                className="input-field py-2 text-sm flex-1"
                placeholder="Enter additional habit (e.g. Vaping)..."
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
                className="btn-primary py-2 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {/* Display Added Custom Habits */}
            {formData.habits.some((item) => !HABITS_OPTIONS.includes(item)) && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
                  Added Custom Habits:
                </span>
                <div className="flex flex-wrap gap-2">
                  {formData.habits.map((item) => {
                    if (HABITS_OPTIONS.includes(item)) return null;
                    return (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => handleCheckboxToggle('habits', item)}
                          className="text-amber-600 hover:text-amber-900 rounded-full p-0.5"
                          title="Remove habit"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 6. Dental History */}
        <div className="card p-4 sm:p-6 space-y-4">
          <h3 className="font-display text-sm sm:text-base font-bold text-ink border-b border-border pb-3">
            Dental History
          </h3>
          <div>
            <textarea
              rows={4}
              className="input-field"
              placeholder="Previous dental treatments, chief complaints, extractions, root canals, etc."
              value={formData.dentalHistory}
              onChange={(e) => handleChange('dentalHistory', e.target.value)}
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary w-full sm:w-auto justify-center"
            onClick={() => navigate(user?.role === 'doctor' ? '/doctor/patients' : '/reception/patients')}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full sm:w-auto justify-center text-xs sm:text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={18} />}
            <span>{submitting ? 'Registering...' : 'Register & Book Appointment'}</span>
          </button>
        </div>
      </form>

      {/* Follow-on Appointment Booking Step for Doctor */}
      <CreateAppointmentModal
        isOpen={showBookModal}
        initialPatient={registeredPatientForAppointment}
        initialDoctorId={user?._id || user?.id}
        defaultAction="Schedule"
        onClose={() => {
          setShowBookModal(false);
          navigate(user?.role === 'doctor' ? '/doctor/patients' : '/reception/appointments');
        }}
        onSuccess={() => {
          setShowBookModal(false);
          navigate(user?.role === 'doctor' ? '/doctor/queue' : '/reception/appointments');
        }}
      />
    </div>
  );
}

