import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, UserSquare2, Phone, Calendar, Hash, User, ShieldAlert,
  Edit3, Briefcase, MapPin, Activity, Heart, Pill, Stethoscope, CheckCircle2, X, Save
} from 'lucide-react';
import api from '../../api/axios.js';
import DocumentsPanel from '../../components/common/DocumentsPanel.jsx';

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

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFeedback, setEditFeedback] = useState({ type: '', msg: '' });
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    age: '',
    sex: '',
    dateOfBirth: '',
    occupation: '',
    address: '',
    medicalHistory: [],
    currentMedications: '',
    vitals: { bp: '', rbs: '' },
    habits: [],
    dentalHistory: '',
  });

  const fetchPatient = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/patients/${id}`);
      setPatient(res.data?.patient);
    } catch (err) {
      setError(err.response?.data?.message || 'Patient not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPatient();
    }
  }, [id]);

  const handleOpenEdit = () => {
    if (!patient) return;
    setEditForm({
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      phone: patient.phone || '',
      age: patient.age !== undefined && patient.age !== null ? String(patient.age) : '',
      sex: patient.sex || '',
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
      occupation: patient.occupation || '',
      address: patient.address || '',
      medicalHistory: Array.isArray(patient.medicalHistory) ? [...patient.medicalHistory] : [],
      currentMedications: patient.currentMedications || '',
      vitals: {
        bp: patient.vitals?.bp || '',
        rbs: patient.vitals?.rbs || '',
      },
      habits: Array.isArray(patient.habits) ? [...patient.habits] : [],
      dentalHistory: patient.dentalHistory || '',
    });
    setEditFeedback({ type: '', msg: '' });
    setShowEditModal(true);
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleVitalsChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      vitals: { ...prev.vitals, [field]: value },
    }));
  };

  const handleCheckboxToggle = (field, item) => {
    setEditForm((prev) => {
      const list = prev[field] || [];
      const updated = list.includes(item)
        ? list.filter((i) => i !== item)
        : [...list, item];
      return { ...prev, [field]: updated };
    });
  };

  const handleSavePatient = async (e) => {
    e.preventDefault();
    setSaving(true);
    setEditFeedback({ type: '', msg: '' });

    try {
      const payload = {
        ...editForm,
        age: editForm.age ? parseInt(editForm.age, 10) : undefined,
        dateOfBirth: editForm.dateOfBirth ? editForm.dateOfBirth : null,
      };

      const res = await api.patch(`/patients/${id}`, payload);
      setPatient(res.data?.patient);
      setEditFeedback({ type: 'success', msg: 'Patient profile updated successfully!' });
      setTimeout(() => {
        setShowEditModal(false);
      }, 800);
    } catch (err) {
      setEditFeedback({
        type: 'error',
        msg: err.response?.data?.message || 'Failed to update patient profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-ink-soft">Loading patient profile...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <Link
          to="/reception/patients"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
        >
          <ArrowLeft size={16} /> Back to Patients
        </Link>
        <div className="card p-6 text-center space-y-3">
          <ShieldAlert size={32} className="mx-auto text-rose-500" />
          <h3 className="font-display text-base font-bold text-ink">{error || 'Patient not found'}</h3>
        </div>
      </div>
    );
  }

  const fullName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unnamed Patient';
  const regDate = patient.registrationDate || patient.createdAt
    ? new Date(patient.registrationDate || patient.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  const dobStr = patient.dateOfBirth
    ? new Date(patient.dateOfBirth).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top back navigation & Header Action */}
      <div className="flex items-center justify-between">
        <Link
          to="/reception/patients"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
        >
          <ArrowLeft size={16} /> Back to Patients Directory
        </Link>

        <button
          onClick={handleOpenEdit}
          className="btn-secondary text-xs flex items-center gap-1.5 border-brand/30 text-brand hover:bg-brand-light/30"
        >
          <Edit3 size={15} /> Edit Patient Profile
        </button>
      </div>

      {/* Patient Header Card */}
      <div className="card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand-dark font-bold text-xl">
              <UserSquare2 size={28} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">{fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="badge bg-brand/10 text-brand font-mono text-xs font-bold">
                  {patient.opNumber || 'OP-000000'}
                </span>
                <span className="text-xs text-ink-soft">ID: {patient._id}</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-ink-soft text-left sm:text-right">
            Registered on <span className="font-semibold text-ink">{regDate}</span>
            {patient.registeredBy?.name && (
              <span className="block text-[11px] text-ink-soft">
                by {patient.registeredBy.name} ({patient.registeredBy.role || 'Staff'})
              </span>
            )}
          </div>
        </div>

        {/* Basic Demographics & Contact Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs text-ink-soft font-medium">
              <User size={14} className="text-brand" /> Age / Sex
            </span>
            <p className="font-semibold text-ink">
              {patient.age !== undefined && patient.age !== null ? `${patient.age} yrs` : 'Not specified'} {patient.sex ? `/ ${patient.sex}` : ''}
            </p>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs text-ink-soft font-medium">
              <Phone size={14} className="text-brand" /> Phone Number
            </span>
            <p className="font-semibold text-ink">{patient.phone || 'Not specified'}</p>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs text-ink-soft font-medium">
              <Calendar size={14} className="text-brand" /> Date of Birth
            </span>
            <p className="font-semibold text-ink">{dobStr || 'Not specified'}</p>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs text-ink-soft font-medium">
              <Hash size={14} className="text-brand" /> OP Number
            </span>
            <p className="font-semibold text-ink font-mono">{patient.opNumber || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Structured Registration Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Address & Demographics */}
        <div className="card p-5 space-y-4">
          <h3 className="font-display text-sm font-bold text-ink border-b border-border pb-2 flex items-center gap-2">
            <MapPin size={16} className="text-brand" /> Address & Occupation
          </h3>
          <div className="text-sm space-y-3 text-ink">
            <div>
              <span className="text-xs text-ink-soft block font-medium">Occupation</span>
              <p className="font-medium text-ink mt-0.5">{patient.occupation || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-xs text-ink-soft block font-medium">Residential Address</span>
              <p className="font-medium text-ink mt-0.5">{patient.address || 'Not specified'}</p>
            </div>
          </div>
        </div>

        {/* Vitals & Habits */}
        <div className="card p-5 space-y-4">
          <h3 className="font-display text-sm font-bold text-ink border-b border-border pb-2 flex items-center gap-2">
            <Activity size={16} className="text-brand" /> Vitals & Lifestyle Habits
          </h3>
          <div className="text-sm space-y-3 text-ink">
            <div className="flex gap-8">
              <div>
                <span className="text-xs text-ink-soft block font-medium">Blood Pressure (BP)</span>
                <p className="font-semibold text-ink mt-0.5">{patient.vitals?.bp || 'Not measured'}</p>
              </div>
              <div>
                <span className="text-xs text-ink-soft block font-medium">Random Blood Sugar (RBS)</span>
                <p className="font-semibold text-ink mt-0.5">{patient.vitals?.rbs || 'Not measured'}</p>
              </div>
            </div>
            <div>
              <span className="text-xs text-ink-soft block font-medium mb-1">Habits</span>
              {patient.habits && patient.habits.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.habits.map((h) => (
                    <span key={h} className="badge bg-purple-50 text-purple-800 border border-purple-200 text-xs">
                      {h}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-ink-soft text-xs italic">None reported</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Medical History & Current Medications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Medical History Conditions */}
        <div className="card p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-ink border-b border-border pb-2 flex items-center gap-2">
            <Heart size={16} className="text-rose-500" /> Medical History Alerts
          </h3>
          {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {patient.medicalHistory.map((condition) => (
                <span
                  key={condition}
                  className="badge bg-amber-100 text-amber-900 border border-amber-300 font-medium text-xs py-1 px-2.5"
                >
                  {condition}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-soft italic">No pre-existing medical conditions reported during registration.</p>
          )}
        </div>

        {/* Current Medications & Drug Allergies */}
        <div className="card p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-ink border-b border-border pb-2 flex items-center gap-2">
            <Pill size={16} className="text-blue-500" /> Current Medications & Allergies
          </h3>
          <div className="text-sm">
            {patient.currentMedications ? (
              <p className="font-medium text-ink whitespace-pre-wrap bg-bg/50 p-3 rounded-xl border border-border text-xs">
                {patient.currentMedications}
              </p>
            ) : (
              <p className="text-xs text-ink-soft italic">No ongoing medications or drug allergies reported.</p>
            )}
          </div>
        </div>
      </div>

      {/* Dental History Section */}
      <div className="card p-5 space-y-3">
        <h3 className="font-display text-sm font-bold text-ink border-b border-border pb-2 flex items-center gap-2">
          <Stethoscope size={16} className="text-brand" /> Dental History & Chief Complaints
        </h3>
        <div className="text-sm">
          {patient.dentalHistory ? (
            <p className="font-medium text-ink whitespace-pre-wrap bg-bg/50 p-3 rounded-xl border border-border text-xs">
              {patient.dentalHistory}
            </p>
          ) : (
            <p className="text-xs text-ink-soft italic">No previous dental history or chief complaints recorded during registration.</p>
          )}
        </div>
      </div>

      {/* Patient Documents Panel (Shared view/upload for Receptionist) */}
      <DocumentsPanel patientId={patient._id || patient.id} title="Patient Attached Files & Invoices" />

      {/* EDIT PATIENT PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="card max-w-2xl w-full p-6 space-y-4 bg-surface max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Edit3 size={18} className="text-brand" /> Edit Patient Registration Details
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded text-ink-soft hover:text-ink hover:bg-bg"
              >
                <X size={18} />
              </button>
            </div>

            {editFeedback.msg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  editFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {editFeedback.type === 'success' ? <CheckCircle2 size={15} /> : <ShieldAlert size={15} />}
                <span>{editFeedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleSavePatient} className="space-y-4 text-xs">
              {/* Basic Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-ink border-b border-border/60 pb-1">Basic Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">First Name</label>
                    <input
                      type="text"
                      className="input-field py-1.5"
                      value={editForm.firstName}
                      onChange={(e) => handleEditChange('firstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Last Name</label>
                    <input
                      type="text"
                      className="input-field py-1.5"
                      value={editForm.lastName}
                      onChange={(e) => handleEditChange('lastName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Phone Number</label>
                    <input
                      type="tel"
                      className="input-field py-1.5"
                      value={editForm.phone}
                      onChange={(e) => handleEditChange('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Sex / Gender</label>
                    <select
                      className="input-field py-1.5"
                      value={editForm.sex}
                      onChange={(e) => handleEditChange('sex', e.target.value)}
                    >
                      <option value="">Select Sex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Age</label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      className="input-field py-1.5"
                      value={editForm.age}
                      onChange={(e) => handleEditChange('age', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Date of Birth</label>
                    <input
                      type="date"
                      className="input-field py-1.5"
                      value={editForm.dateOfBirth}
                      onChange={(e) => handleEditChange('dateOfBirth', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Occupation</label>
                    <input
                      type="text"
                      className="input-field py-1.5"
                      value={editForm.occupation}
                      onChange={(e) => handleEditChange('occupation', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Address</label>
                    <input
                      type="text"
                      className="input-field py-1.5"
                      value={editForm.address}
                      onChange={(e) => handleEditChange('address', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Medical History */}
              <div className="space-y-2">
                <h4 className="font-bold text-ink border-b border-border/60 pb-1">Medical History</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MEDICAL_HISTORY_OPTIONS.map((item) => {
                    const checked = editForm.medicalHistory.includes(item);
                    return (
                      <label
                        key={item}
                        className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer text-[11px] transition-colors ${
                          checked
                            ? 'border-brand bg-brand-light/30 text-brand-dark font-medium'
                            : 'border-border bg-surface text-ink hover:bg-bg'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-border text-brand focus:ring-brand"
                          checked={checked}
                          onChange={() => handleCheckboxToggle('medicalHistory', item)}
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Current Medications */}
              <div className="space-y-1">
                <h4 className="font-bold text-ink border-b border-border/60 pb-1">Current Medications & Allergies</h4>
                <textarea
                  rows={2}
                  className="input-field py-1.5"
                  placeholder="Ongoing medications or allergies..."
                  value={editForm.currentMedications}
                  onChange={(e) => handleEditChange('currentMedications', e.target.value)}
                />
              </div>

              {/* Vitals */}
              <div className="space-y-2">
                <h4 className="font-bold text-ink border-b border-border/60 pb-1">Vitals</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">BP (mmHg)</label>
                    <input
                      type="text"
                      className="input-field py-1.5"
                      placeholder="e.g. 120/80"
                      value={editForm.vitals.bp}
                      onChange={(e) => handleVitalsChange('bp', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">RBS (mg/dL)</label>
                    <input
                      type="text"
                      className="input-field py-1.5"
                      placeholder="e.g. 110"
                      value={editForm.vitals.rbs}
                      onChange={(e) => handleVitalsChange('rbs', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Habits */}
              <div className="space-y-2">
                <h4 className="font-bold text-ink border-b border-border/60 pb-1">Habits</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {HABITS_OPTIONS.map((h) => {
                    const checked = editForm.habits.includes(h);
                    return (
                      <label
                        key={h}
                        className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer text-[11px] transition-colors ${
                          checked
                            ? 'border-brand bg-brand-light/30 text-brand-dark font-medium'
                            : 'border-border bg-surface text-ink hover:bg-bg'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-border text-brand focus:ring-brand"
                          checked={checked}
                          onChange={() => handleCheckboxToggle('habits', h)}
                        />
                        <span>{h}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Dental History */}
              <div className="space-y-1">
                <h4 className="font-bold text-ink border-b border-border/60 pb-1">Dental History</h4>
                <textarea
                  rows={3}
                  className="input-field py-1.5"
                  placeholder="Previous dental treatments, chief complaints, etc."
                  value={editForm.dentalHistory}
                  onChange={(e) => handleEditChange('dentalHistory', e.target.value)}
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Patient Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

