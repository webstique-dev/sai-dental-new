import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, UserSquare2, Phone, Calendar, Hash, User, ShieldAlert,
  Edit3, Briefcase, MapPin, Activity, Heart, Pill, Stethoscope, CheckCircle2, X, Save, Plus
} from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
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

  const [editCustomMedicalInput, setEditCustomMedicalInput] = useState('');
  const [editCustomHabitInput, setEditCustomHabitInput] = useState('');
  const [editCustomVitalLabel, setEditCustomVitalLabel] = useState('');
  const [editCustomVitalValue, setEditCustomVitalValue] = useState('');

  const handleAddEditCustomMedicalHistory = () => {
    const trimmed = editCustomMedicalInput.trim();
    if (!trimmed) return;
    if (!editForm.medicalHistory.includes(trimmed)) {
      setEditForm((prev) => ({
        ...prev,
        medicalHistory: [...prev.medicalHistory, trimmed],
      }));
    }
    setEditCustomMedicalInput('');
  };

  const handleAddEditCustomHabit = () => {
    const trimmed = editCustomHabitInput.trim();
    if (!trimmed) return;
    if (!editForm.habits.includes(trimmed)) {
      setEditForm((prev) => ({
        ...prev,
        habits: [...prev.habits, trimmed],
      }));
    }
    setEditCustomHabitInput('');
  };

  const handleAddEditCustomVital = () => {
    const labelTrimmed = editCustomVitalLabel.trim();
    const valueTrimmed = editCustomVitalValue.trim();
    if (!labelTrimmed) return;
    setEditForm((prev) => ({
      ...prev,
      vitals: {
        ...(prev.vitals || {}),
        [labelTrimmed]: valueTrimmed,
      },
    }));
    setEditCustomVitalLabel('');
    setEditCustomVitalValue('');
  };

  const handleRemoveEditCustomVital = (key) => {
    setEditForm((prev) => {
      const updated = { ...(prev.vitals || {}) };
      delete updated[key];
      return { ...prev, vitals: updated };
    });
  };

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

  const { showError, showSuccess } = useNotification();

  const handleSavePatient = async (e) => {
    e.preventDefault();

    const nameErr = validateName(editForm.firstName, 'First Name', true);
    if (nameErr) {
      setEditFeedback({ type: 'error', msg: nameErr });
      showError(nameErr);
      return;
    }

    if (editForm.lastName) {
      const lastNameErr = validateName(editForm.lastName, 'Last Name', false);
      if (lastNameErr) {
        setEditFeedback({ type: 'error', msg: lastNameErr });
        showError(lastNameErr);
        return;
      }
    }

    if (editForm.phone) {
      const phoneErr = validatePhone(editForm.phone, false);
      if (phoneErr) {
        setEditFeedback({ type: 'error', msg: phoneErr });
        showError(phoneErr);
        return;
      }
    }

    if (editForm.dateOfBirth) {
      const dobErr = validateDOB(editForm.dateOfBirth, false);
      if (dobErr) {
        setEditFeedback({ type: 'error', msg: dobErr });
        showError(dobErr);
        return;
      }
    }

    if (editForm.age !== '' && editForm.age !== undefined && editForm.age !== null) {
      const ageErr = validateAge(editForm.age, false);
      if (ageErr) {
        setEditFeedback({ type: 'error', msg: ageErr });
        showError(ageErr);
        return;
      }
    }

    setSaving(true);
    setEditFeedback({ type: '', msg: '' });

    try {
      const payload = {
        ...editForm,
        firstName: editForm.firstName ? editForm.firstName.trim() : '',
        lastName: editForm.lastName ? editForm.lastName.trim() : '',
        phone: editForm.phone ? editForm.phone.trim() : '',
        occupation: editForm.occupation ? editForm.occupation.trim() : '',
        address: editForm.address ? editForm.address.trim() : '',
        age: editForm.age ? parseInt(editForm.age, 10) : undefined,
        dateOfBirth: editForm.dateOfBirth ? editForm.dateOfBirth : null,
      };

      const res = await api.patch(`/patients/${id}`, payload);
      setPatient(res.data?.patient);
      setEditFeedback({ type: 'success', msg: 'Patient profile updated successfully!' });
      showSuccess('Patient profile updated successfully!');
      setTimeout(() => {
        setShowEditModal(false);
      }, 800);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update patient profile.';
      setEditFeedback({ type: 'error', msg });
      showError(msg);
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

        <div className="flex items-center gap-2">
          {/* <Link
            to={`/doctor/patients/${patient._id}`}
            className="btn-secondary text-xs flex items-center gap-1.5 border-brand/30 text-brand hover:bg-brand-light/30"
          >
            <Activity size={15} /> View EMR & History
          </Link> */}
          <button
            onClick={handleOpenEdit}
            className="btn-secondary text-xs flex items-center gap-1.5 border-brand/30 text-brand hover:bg-brand-light/30"
          >
            <Edit3 size={15} /> Edit Patient Profile
          </button>
        </div>
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
                {/* <span className="text-xs text-ink-soft">ID: {patient._id}</span> */}
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
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
              <UserSquare2 size={14} className="text-brand" /> Patient Type
            </span>
            <p className="font-semibold text-ink capitalize">
              {patient.patientType === 'child' ? 'Child (Primary Dentition)' : 'Adult (Permanent Dentition)'}
            </p>
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
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <span className="text-xs text-ink-soft block font-medium">Blood Pressure (BP)</span>
                <p className="font-semibold text-ink mt-0.5">{patient.vitals?.bp || 'Not measured'}</p>
              </div>
              <div>
                <span className="text-xs text-ink-soft block font-medium">Random Blood Sugar (RBS)</span>
                <p className="font-semibold text-ink mt-0.5">{patient.vitals?.rbs || 'Not measured'}</p>
              </div>
              {patient.vitals && Object.entries(patient.vitals).map(([key, val]) => {
                if (key === 'bp' || key === 'rbs' || !val) return null;
                return (
                  <div key={key}>
                    <span className="text-xs text-ink-soft block font-medium">{key}</span>
                    <p className="font-semibold text-ink mt-0.5">{val}</p>
                  </div>
                );
              })}
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



      {/* EDIT PATIENT PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
          <div className="card max-w-2xl w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
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

            <form onSubmit={handleSavePatient} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                {editFeedback.msg && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${editFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                  >
                    {editFeedback.type === 'success' ? <CheckCircle2 size={15} /> : <ShieldAlert size={15} />}
                    <span>{editFeedback.msg}</span>
                  </div>
                )}
                {/* Basic Details */}
                <div className="space-y-3">
                  <h4 className="font-bold text-ink border-b border-border/60 pb-1">Basic Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-ink-soft mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        className="input-field py-1.5"
                        value={editForm.firstName}
                        onChange={(e) => handleEditChange('firstName', e.target.value.replace(/[^a-zA-Z\s'-]/g, ''))}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-ink-soft mb-1">Last Name</label>
                      <input
                        type="text"
                        className="input-field py-1.5"
                        value={editForm.lastName}
                        onChange={(e) => handleEditChange('lastName', e.target.value.replace(/[^a-zA-Z\s'-]/g, ''))}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-ink-soft mb-1">Phone Number</label>
                      <input
                        type="tel"
                        maxLength={10}
                        className="input-field py-1.5 font-mono"
                        value={editForm.phone}
                        onChange={(e) => handleEditChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
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
                        type="text"
                        maxLength={3}
                        className="input-field py-1.5 font-mono"
                        value={editForm.age}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, '').slice(0, 3);
                          if (!cleaned || parseInt(cleaned, 10) <= 120) {
                            handleEditChange('age', cleaned);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <DatePicker
                        label="Date of Birth"
                        value={editForm.dateOfBirth}
                        onChange={(date, dateStr) => handleEditChange('dateOfBirth', dateStr)}
                        maxDate={new Date()}
                        inputClassName="py-1.5"
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
                          className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer text-[11px] transition-colors ${checked
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

                  {/* Custom Medical History Add Input */}
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <label className="block text-[11px] font-semibold text-ink-soft">
                      Add Custom Medical History / Condition
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input-field py-1.5 text-xs flex-1"
                        placeholder="Enter additional condition (e.g. Penicillin Allergy)..."
                        value={editCustomMedicalInput}
                        onChange={(e) => setEditCustomMedicalInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEditCustomMedicalHistory();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddEditCustomMedicalHistory}
                        className="btn-primary py-1.5 px-3 text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                      >
                        <Plus size={13} /> Add
                      </button>
                    </div>

                    {/* Custom items chips */}
                    {editForm.medicalHistory.some((item) => !MEDICAL_HISTORY_OPTIONS.includes(item)) && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-semibold text-ink-soft uppercase">
                          Added Custom Conditions:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {editForm.medicalHistory.map((item) => {
                            if (MEDICAL_HISTORY_OPTIONS.includes(item)) return null;
                            return (
                              <span
                                key={item}
                                className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full text-xs font-medium"
                              >
                                <span>{item}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCheckboxToggle('medicalHistory', item)}
                                  className="text-teal-600 hover:text-teal-900 rounded-full p-0.5"
                                  title="Remove"
                                >
                                  <X size={11} />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
                        value={editForm.vitals?.bp || ''}
                        onChange={(e) => handleVitalsChange('bp', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-ink-soft mb-1">RBS (mg/dL)</label>
                      <input
                        type="text"
                        className="input-field py-1.5"
                        placeholder="e.g. 110"
                        value={editForm.vitals?.rbs || ''}
                        onChange={(e) => handleVitalsChange('rbs', e.target.value)}
                      />
                    </div>

                    {/* Render Custom Vitals in Edit Modal */}
                    {Object.entries(editForm.vitals || {}).map(([key, val]) => {
                      if (key === 'bp' || key === 'rbs') return null;
                      return (
                        <div key={key} className="flex items-end gap-1.5 col-span-2 sm:col-span-1">
                          <div className="flex-1">
                            <label className="block font-semibold text-ink-soft mb-1">{key}</label>
                            <input
                              type="text"
                              className="input-field py-1.5 text-xs"
                              value={val || ''}
                              onChange={(e) => handleVitalsChange(key, e.target.value)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveEditCustomVital(key)}
                            className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            title={`Remove ${key}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom Vital Add Input */}
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <label className="block text-[11px] font-semibold text-ink-soft">
                      Add Custom Vital
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      <input
                        type="text"
                        className="input-field py-1.5 text-xs sm:col-span-2"
                        placeholder="Vital Name (e.g. Pulse)..."
                        value={editCustomVitalLabel}
                        onChange={(e) => setEditCustomVitalLabel(e.target.value)}
                      />
                      <input
                        type="text"
                        className="input-field py-1.5 text-xs sm:col-span-2"
                        placeholder="Value (e.g. 72 bpm)..."
                        value={editCustomVitalValue}
                        onChange={(e) => setEditCustomVitalValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEditCustomVital();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddEditCustomVital}
                        className="btn-primary py-1.5 px-3 text-xs font-semibold flex items-center justify-center gap-1 whitespace-nowrap"
                      >
                        <Plus size={13} /> Add
                      </button>
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
                          className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer text-[11px] transition-colors ${checked
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

                  {/* Custom Habit Add Input */}
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <label className="block text-[11px] font-semibold text-ink-soft">
                      Add Custom Habit
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input-field py-1.5 text-xs flex-1"
                        placeholder="Enter additional habit (e.g. Vaping, Betel Nut)..."
                        value={editCustomHabitInput}
                        onChange={(e) => setEditCustomHabitInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEditCustomHabit();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddEditCustomHabit}
                        className="btn-primary py-1.5 px-3 text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                      >
                        <Plus size={13} /> Add
                      </button>
                    </div>

                    {/* Custom Habit chips */}
                    {editForm.habits.some((item) => !HABITS_OPTIONS.includes(item)) && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-semibold text-ink-soft uppercase">
                          Added Custom Habits:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {editForm.habits.map((item) => {
                            if (HABITS_OPTIONS.includes(item)) return null;
                            return (
                              <span
                                key={item}
                                className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-medium"
                              >
                                <span>{item}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCheckboxToggle('habits', item)}
                                  className="text-amber-600 hover:text-amber-900 rounded-full p-0.5"
                                  title="Remove habit"
                                >
                                  <X size={11} />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
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

