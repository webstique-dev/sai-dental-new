import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, UserPlus, Plus, X } from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

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

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    sex: '',
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

  const [similarPatients, setSimilarPatients] = useState([]);
  const [submitting, setSubmitting] = useState(false);
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
    const query = [formData.firstName, formData.lastName, formData.phone]
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
  }, [formData.firstName, formData.lastName, formData.phone]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVitalsChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      vitals: { ...prev.vitals, [field]: value },
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
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : undefined,
      };

      const res = await api.post('/patients', payload);
      const newPatient = res.data?.patient;

      showSuccess(`Patient ${newPatient?.opNumber || ''} registered successfully!`);
      setTimeout(() => {
        if (newPatient?._id) {
          navigate(`/reception/patients/${newPatient._id}`);
        } else {
          navigate('/reception/patients');
        }
      }, 1000);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to register patient. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/reception/patients"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-ink-soft transition-colors hover:bg-bg hover:text-ink"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="font-display text-xl font-bold text-ink">New Patient Registration</h2>
            <p className="text-sm text-ink-soft">Create a new Dental OP Record</p>
          </div>
        </div>
      </div>

      {/* Soft Duplicate Warning */}
      {similarPatients.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Soft Warning: Similar patient record found</p>
              <ul className="list-disc pl-4 space-y-0.5 text-xs text-amber-800">
                {similarPatients.map((p) => (
                  <li key={p._id}>
                    <span className="font-medium">{p.firstName} {p.lastName}</span> ({p.opNumber || 'No OP#'}) — {p.phone || 'No phone'}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-700 pt-1">
                You can still proceed with submitting this new registration.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Basic Details */}
        <div className="card p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-ink border-b border-border pb-3">
            Basic Details
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">First Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. John"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Last Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Doe"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Phone Number</label>
              <input
                type="tel"
                className="input-field"
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
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
                min="0"
                max="120"
                className="input-field"
                placeholder="e.g. 35"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
              />
            </div>
            <div>
              <DatePicker
                label="Date of Birth"
                value={formData.dateOfBirth}
                onChange={(date, dateStr) => handleChange('dateOfBirth', dateStr)}
                maxDate={new Date()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Occupation</label>
              <input
                type="text"
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
                className="input-field"
                placeholder="Street, City, Pin Code"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 2. Medical History */}
        <div className="card p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-ink border-b border-border pb-3">
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
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
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
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input-field py-2 text-sm flex-1"
                placeholder="Enter additional medical condition (e.g. Penicillin Allergy, Glaucoma)..."
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
                className="btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
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
        <div className="card p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-ink border-b border-border pb-3">
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
        <div className="card p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-ink border-b border-border pb-3">
            Vitals
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Blood Pressure (BP)</label>
              <input
                type="text"
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
                    className="p-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
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
                placeholder="Vital Name (e.g. Pulse, SpO2)..."
                value={customVitalLabel}
                onChange={(e) => setCustomVitalLabel(e.target.value)}
              />
              <input
                type="text"
                className="input-field py-2 text-sm sm:col-span-2"
                placeholder="Value (e.g. 72 bpm, 98%)..."
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
        <div className="card p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-ink border-b border-border pb-3">
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
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
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
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input-field py-2 text-sm flex-1"
                placeholder="Enter additional habit (e.g. Vaping, Betel Nut, E-Cigarette)..."
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
                className="btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
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
        <div className="card p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-ink border-b border-border pb-3">
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
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/reception/patients')}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
          >
            <UserPlus size={18} />
            <span>{submitting ? 'Registering...' : 'Register Patient'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
