import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, UserPlus } from 'lucide-react';
import api from '../../api/axios.js';

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
  'Any Other',
];

const HABITS_OPTIONS = ['Smoking', 'Tobacco', 'Alcohol', 'Pan'];

export default function PatientRegistration() {
  const navigate = useNavigate();

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
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
        // Non-blocking, ignore live search error
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
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Prepare payload, convert age to number if entered
      const payload = {
        ...formData,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : undefined,
      };

      const res = await api.post('/patients', payload);
      const newPatient = res.data?.patient;

      setSuccessMessage(`Patient ${newPatient?.opNumber || ''} registered successfully!`);
      setTimeout(() => {
        if (newPatient?._id) {
          navigate(`/reception/patients/${newPatient._id}`);
        } else {
          navigate('/reception/patients');
        }
      }, 1200);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to register patient. Please try again.');
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

      {/* Success / Error Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800 border border-rose-200">
          <AlertTriangle size={18} className="text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

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
              <label className="block text-xs font-semibold text-ink-soft mb-1">Date of Birth</label>
              <input
                type="date"
                className="input-field"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
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
                  className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer text-sm transition-colors ${
                    checked
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
                value={formData.vitals.bp}
                onChange={(e) => handleVitalsChange('bp', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Random Blood Sugar (RBS)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 110 mg/dL"
                value={formData.vitals.rbs}
                onChange={(e) => handleVitalsChange('rbs', e.target.value)}
              />
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
                  className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer text-sm transition-colors ${
                    checked
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
