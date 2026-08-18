import { useState, useEffect } from 'react';
import {
  Users, Search, Filter, Edit3, ArrowUpDown, ChevronLeft, ChevronRight,
  ExternalLink, X, Save, ShieldAlert, CheckCircle2, User, Phone, Calendar, Hash, Eye, History
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import DocumentsPanel from '../../components/common/DocumentsPanel.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { validateName, validatePhone, validateDOB, validateAge } from '../../utils/validators.js';

export default function AdminPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [sortBy, setSortBy] = useState('registrationDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Selected patient for Profile drawer/modal
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Edit patient modal state
  const [editingPatient, setEditingPatient] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    age: '',
    sex: 'Male',
    address: '',
    medicalHistory: '',
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', msg: '' });

  const fetchPatients = async (targetPage = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', targetPage);
      params.append('limit', 15);
      if (search.trim()) params.append('search', search.trim());
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);

      const res = await api.get(`/patients?${params.toString()}`);
      const data = res.data || {};
      setPatients(data.patients || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients(1);
  }, [search, sortBy, sortOrder]);

  const handleSortToggle = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleOpenEdit = (e, patient) => {
    e.stopPropagation();
    setEditingPatient(patient);
    setEditForm({
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      phone: patient.phone || '',
      age: patient.age !== undefined && patient.age !== null ? String(patient.age) : '',
      sex: patient.sex || 'Male',
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
      occupation: patient.occupation || '',
      address: patient.address || '',
      medicalHistory: Array.isArray(patient.medicalHistory) ? patient.medicalHistory.join(', ') : patient.medicalHistory || '',
      currentMedications: patient.currentMedications || '',
      bp: patient.vitals?.bp || '',
      rbs: patient.vitals?.rbs || '',
      habits: Array.isArray(patient.habits) ? patient.habits.join(', ') : patient.habits || '',
      dentalHistory: patient.dentalHistory || '',
    });
    setFeedback({ type: '', msg: '' });
  };

  const { showError, showSuccess } = useNotification();

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPatient) return;

    const nameErr = validateName(editForm.firstName, 'First Name', true);
    if (nameErr) {
      setFeedback({ type: 'error', msg: nameErr });
      showError(nameErr);
      return;
    }

    if (editForm.lastName) {
      const lastNameErr = validateName(editForm.lastName, 'Last Name', false);
      if (lastNameErr) {
        setFeedback({ type: 'error', msg: lastNameErr });
        showError(lastNameErr);
        return;
      }
    }

    if (editForm.phone) {
      const phoneErr = validatePhone(editForm.phone, false);
      if (phoneErr) {
        setFeedback({ type: 'error', msg: phoneErr });
        showError(phoneErr);
        return;
      }
    }

    if (editForm.dateOfBirth) {
      const dobErr = validateDOB(editForm.dateOfBirth, false);
      if (dobErr) {
        setFeedback({ type: 'error', msg: dobErr });
        showError(dobErr);
        return;
      }
    }

    if (editForm.age !== '' && editForm.age !== undefined && editForm.age !== null) {
      const ageErr = validateAge(editForm.age, false);
      if (ageErr) {
        setFeedback({ type: 'error', msg: ageErr });
        showError(ageErr);
        return;
      }
    }

    setSaving(true);
    setFeedback({ type: '', msg: '' });

    try {
      const payload = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim(),
        age: editForm.age ? Number(editForm.age) : undefined,
        sex: editForm.sex,
        dateOfBirth: editForm.dateOfBirth ? editForm.dateOfBirth : null,
        occupation: editForm.occupation.trim(),
        address: editForm.address.trim(),
        medicalHistory: editForm.medicalHistory
          ? editForm.medicalHistory.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        currentMedications: editForm.currentMedications.trim(),
        vitals: {
          bp: editForm.bp.trim(),
          rbs: editForm.rbs.trim(),
        },
        habits: editForm.habits
          ? editForm.habits.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        dentalHistory: editForm.dentalHistory.trim(),
      };

      const res = await api.patch(`/patients/${editingPatient._id}`, payload);
      const updated = res.data?.patient;

      setPatients((prev) => prev.map((p) => (p._id === editingPatient._id ? updated : p)));
      if (selectedPatient?._id === editingPatient._id) {
        setSelectedPatient(updated);
      }

      setFeedback({ type: 'success', msg: 'Patient details updated successfully.' });
      setTimeout(() => {
        setEditingPatient(null);
      }, 1000);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message || 'Failed to update patient details.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <Users size={26} className="text-brand" /> Clinic-Wide Patient Directory
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Read-only oversight directory across all registered clinic patients with administrative record correction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/reception/patients"
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Jump to Receptionist Patient Registration Page"
          >
            <ExternalLink size={14} /> Receptionist Registration Workflow
          </Link>
        </div>
      </div>

      {/* SEARCH AND CONTROLS */}
      <div className="card p-4 space-y-3 bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-ink-soft" />
            <input
              type="text"
              className="input-field pl-9 py-2 text-xs w-full"
              placeholder="Search by Patient Name, OP Number, or Phone Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-ink-soft font-semibold whitespace-nowrap">Sort By:</span>
            <button
              onClick={() => handleSortToggle('registrationDate')}
              className={`btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 ${sortBy === 'registrationDate' ? 'border-brand text-brand font-bold' : ''
                }`}
            >
              Reg Date <ArrowUpDown size={13} />
            </button>
            <button
              onClick={() => handleSortToggle('name')}
              className={`btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 ${sortBy === 'name' ? 'border-brand text-brand font-bold' : ''
                }`}
            >
              Name <ArrowUpDown size={13} />
            </button>
            <button
              onClick={() => handleSortToggle('opNumber')}
              className={`btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 ${sortBy === 'opNumber' ? 'border-brand text-brand font-bold' : ''
                }`}
            >
              OP # <ArrowUpDown size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* PATIENTS TABLE */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-bg font-semibold text-ink-soft">
              <tr>
                <th className="px-4 py-3">OP Number</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Age / Sex</th>
                <th className="px-4 py-3">Patient Type</th>
                <th className="px-4 py-3">Registration Date</th>
                <th className="px-4 py-3">Registered By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink-soft">
                    Loading patient directory...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink-soft">
                    No patients match your search query.
                  </td>
                </tr>
              ) : (
                patients.map((p) => {
                  const pName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed Patient';
                  const regDateStr = p.registrationDate || p.createdAt
                    ? new Date(p.registrationDate || p.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                    : 'N/A';
                  const isChild = p.patientType === 'child' || (p.age !== undefined && p.age !== null && Number(p.age) < 12);

                  return (
                    <tr
                      key={p._id}
                      onClick={() => setSelectedPatient(p)}
                      className="hover:bg-bg/60 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-brand whitespace-nowrap">
                        {p.opNumber || '—'}
                      </td>

                      <td className="px-4 py-3 font-bold text-ink whitespace-nowrap">
                        {pName}
                      </td>

                      <td className="px-4 py-3 font-mono text-ink-soft whitespace-nowrap">
                        {p.phone || '—'}
                      </td>

                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                        {p.age ? `${p.age} yrs` : '—'} / {p.sex || '—'}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`badge font-semibold text-xs border px-2 py-0.5 ${
                          isChild
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {isChild ? 'Child' : 'Adult'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                        {regDateStr}
                      </td>

                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                        {p.registeredBy?.name || 'Staff'}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/doctor/patients/${p._id}`}
                            className="btn-secondary py-1 px-2 text-[11px] flex items-center gap-1 border-brand/30 text-brand font-semibold hover:bg-brand-light/30"
                            title="View Patient EMR & Visit Timeline"
                          >
                            <History size={13} /> View EMR
                          </Link>
                          <button
                            onClick={() => setSelectedPatient(p)}
                            className="btn-secondary py-1 px-2 text-[11px] flex items-center gap-1"
                            title="View Full Profile"
                          >
                            <Eye size={13} /> Profile
                          </button>
                          <button
                            onClick={(e) => handleOpenEdit(e, p)}
                            className="btn-secondary py-1 px-2 text-[11px] flex items-center gap-1 border-amber-300 text-amber-800 hover:bg-amber-50"
                            title="Edit Basic Details (Admin Only)"
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {!loading && patients.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg/40 text-xs">
            <div className="text-ink-soft font-medium">
              Showing Page <span className="font-bold text-ink">{page}</span> of{' '}
              <span className="font-bold text-ink">{totalPages}</span> ({total} Total Patients)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => fetchPatients(page - 1)}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 disabled:opacity-30"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchPatients(page + 1)}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 disabled:opacity-30"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PATIENT PROFILE DRAWER/MODAL */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
          <div className="card max-w-3xl w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <div>
                <span className="badge bg-brand/10 text-brand font-mono font-bold text-xs mb-1 inline-block">
                  OP #{selectedPatient.opNumber}
                </span>
                <h2 className="font-display text-lg sm:text-xl font-bold text-ink">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h2>
                <p className="text-xs text-ink-soft">Registered Patient Overview</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleOpenEdit(e, selectedPatient)}
                  className="btn-secondary text-xs flex items-center gap-1 text-amber-800 border-amber-300"
                >
                  <Edit3 size={14} /> Edit Patient Profile
                </button>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="p-1 rounded text-ink-soft hover:text-ink hover:bg-bg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Profile Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-bg p-4 rounded-lg border border-border">
                <div>
                  <div className="text-ink-soft font-semibold">Phone Number</div>
                  <div className="font-bold text-ink">{selectedPatient.phone || 'Not specified'}</div>
                </div>
                <div>
                  <div className="text-ink-soft font-semibold">Age / Sex</div>
                  <div className="font-bold text-ink">
                    {selectedPatient.age !== undefined && selectedPatient.age !== null ? `${selectedPatient.age} yrs` : '—'} / {selectedPatient.sex || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-ink-soft font-semibold">Date of Birth</div>
                  <div className="font-bold text-ink">
                    {selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : 'Not specified'}
                  </div>
                </div>
                <div>
                  <div className="text-ink-soft font-semibold">Registration Date</div>
                  <div className="font-bold text-ink">
                    {selectedPatient.registrationDate || selectedPatient.createdAt
                      ? new Date(selectedPatient.registrationDate || selectedPatient.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-semibold text-ink-soft mb-1">Occupation</div>
                  <div className="p-2.5 bg-bg rounded border border-border text-ink font-medium">
                    {selectedPatient.occupation || 'Not specified'}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-ink-soft mb-1">Residential Address</div>
                  <div className="p-2.5 bg-bg rounded border border-border text-ink font-medium">
                    {selectedPatient.address || 'Not specified'}
                  </div>
                </div>
              </div>

              {/* Vitals & Habits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-semibold text-ink-soft mb-1">Vitals</div>
                  <div className="p-2.5 bg-bg rounded border border-border text-ink flex gap-4">
                    <span>BP: <strong>{selectedPatient.vitals?.bp || 'N/A'}</strong></span>
                    <span>RBS: <strong>{selectedPatient.vitals?.rbs || 'N/A'}</strong></span>
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-ink-soft mb-1">Habits</div>
                  <div className="p-2.5 bg-bg rounded border border-border text-ink">
                    {selectedPatient.habits && selectedPatient.habits.length > 0
                      ? (Array.isArray(selectedPatient.habits) ? selectedPatient.habits.join(', ') : selectedPatient.habits)
                      : 'None reported'}
                  </div>
                </div>
              </div>

              {/* Medical History */}
              <div className="text-xs">
                <div className="font-semibold text-ink-soft mb-1">Medical History Alerts</div>
                {selectedPatient.medicalHistory && selectedPatient.medicalHistory.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(selectedPatient.medicalHistory)
                      ? selectedPatient.medicalHistory
                      : [selectedPatient.medicalHistory]
                    ).map((m, i) => (
                      <span key={i} className="badge bg-amber-100 text-amber-900 border-amber-300 font-medium">
                        {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-soft italic">No pre-existing medical conditions reported.</p>
                )}
              </div>

              {/* Current Medications */}
              <div className="text-xs">
                <div className="font-semibold text-ink-soft mb-1">Current Medications & Allergies</div>
                <div className="p-2.5 bg-bg rounded border border-border text-ink">
                  {selectedPatient.currentMedications || <span className="italic text-ink-soft">None reported</span>}
                </div>
              </div>

              {/* Dental History */}
              <div className="text-xs">
                <div className="font-semibold text-ink-soft mb-1">Dental History & Chief Complaints</div>
                <div className="p-2.5 bg-bg rounded border border-border text-ink">
                  {selectedPatient.dentalHistory || <span className="italic text-ink-soft">No previous dental history reported</span>}
                </div>
              </div>

              {/* Embedded Clinical Documents Panel */}
              <div className="pt-2">
                <DocumentsPanel patientId={selectedPatient._id} />
              </div>
            </div>

            <div className="flex justify-end px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="btn-secondary text-xs"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BASIC DETAILS MODAL (ADMIN ONLY) */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
          <div className="card max-w-xl w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Edit3 size={18} className="text-amber-600" /> Edit Patient Profile Details
              </h3>
              <button onClick={() => setEditingPatient(null)} className="p-1 text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 text-xs">
                {feedback.msg && (
                  <div
                    className={`p-3 rounded text-xs flex items-center gap-2 ${feedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                  >
                    {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                    <span>{feedback.msg}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      className="input-field py-1.5"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value.replace(/[^a-zA-Z\s'-]/g, '') })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Last Name</label>
                    <input
                      type="text"
                      className="input-field py-1.5"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value.replace(/[^a-zA-Z\s'-]/g, '') })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Phone</label>
                    <input
                      type="tel"
                      maxLength={10}
                      className="input-field py-1.5 font-mono"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
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
                          setEditForm({ ...editForm, age: cleaned });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Sex</label>
                    <select
                      className="input-field py-1.5"
                      value={editForm.sex}
                      onChange={(e) => setEditForm({ ...editForm, sex: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <DatePicker
                      label="Date of Birth"
                      value={editForm.dateOfBirth}
                      onChange={(date, dateStr) => setEditForm({ ...editForm, dateOfBirth: dateStr })}
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
                      onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Address</label>
                  <textarea
                    rows={2}
                    className="input-field py-1.5"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Blood Pressure (BP)</label>
                    <input
                      type="text"
                      className="input-field py-1.5"
                      placeholder="e.g. 120/80"
                      value={editForm.bp}
                      onChange={(e) => setEditForm({ ...editForm, bp: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Random Blood Sugar (RBS)</label>
                    <input
                      type="text"
                      className="input-field py-1.5"
                      placeholder="e.g. 110"
                      value={editForm.rbs}
                      onChange={(e) => setEditForm({ ...editForm, rbs: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Medical History (Comma separated)
                  </label>
                  <input
                    type="text"
                    className="input-field py-1.5"
                    placeholder="e.g. Diabetes Mellitus, Hypertension, Asthma"
                    value={editForm.medicalHistory}
                    onChange={(e) => setEditForm({ ...editForm, medicalHistory: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Habits (Comma separated)
                  </label>
                  <input
                    type="text"
                    className="input-field py-1.5"
                    placeholder="e.g. Smoking, Alcohol"
                    value={editForm.habits}
                    onChange={(e) => setEditForm({ ...editForm, habits: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Current Medications & Allergies</label>
                  <textarea
                    rows={2}
                    className="input-field py-1.5"
                    value={editForm.currentMedications}
                    onChange={(e) => setEditForm({ ...editForm, currentMedications: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Dental History</label>
                  <textarea
                    rows={2}
                    className="input-field py-1.5"
                    value={editForm.dentalHistory}
                    onChange={(e) => setEditForm({ ...editForm, dentalHistory: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
