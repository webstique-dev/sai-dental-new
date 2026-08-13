import { useState, useEffect } from 'react';
import {
  Bell, Plus, Calendar, Search, CheckCircle2, AlertTriangle, X,
  Clock, User, Stethoscope, FileText, CalendarDays, ArrowRight, ShieldCheck,
} from 'lucide-react';
import api from '../../api/axios.js';
import PatientSearchInput from '../../components/common/PatientSearchInput.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';

const STATUS_BADGE_CLASSES = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export default function FollowUps() {
  const [followUps, setFollowUps] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState('Pending'); // 'Pending' | 'Scheduled' | 'Completed' | 'All'
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add Follow-Up Form state
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [addFormData, setAddFormData] = useState({
    recommendedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // default 1 week out
    reason: '',
    instructions: '',
    notes: '',
    treatmentStatus: '',
  });

  // Schedule Appointment Form state
  const [scheduleFormData, setScheduleFormData] = useState({
    doctor: '',
    date: '',
    time: '10:00 AM',
    type: 'Appointment',
    reason: '',
  });

  // Fetch doctors & follow-ups
  const fetchDoctors = async () => {
    try {
      const res = await api.get('/users/doctors');
      const docs = res.data?.doctors || [];
      setDoctors(docs);
      if (docs.length > 0) {
        setScheduleFormData((prev) => ({ ...prev, doctor: docs[0]._id || docs[0].id }));
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  };

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'All') params.append('status', activeTab);
      if (search) params.append('search', search);

      const res = await api.get(`/follow-ups?${params.toString()}`);
      setFollowUps(res.data?.followUps || []);
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFollowUps();
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTab, search]);

  // Live patient search for Add Follow-up
  useEffect(() => {
    if (!patientSearch || patientSearch.trim().length < 2) {
      setPatientOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/patients?search=${encodeURIComponent(patientSearch)}&limit=5`);
        setPatientOptions(res.data?.patients || []);
      } catch (err) {
        console.error('Patient search error:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const resetAddModal = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setPatientOptions([]);
    setAddFormData({
      recommendedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reason: '',
      instructions: '',
      notes: '',
      treatmentStatus: '',
    });
    setErrorMessage('');
    setShowAddModal(false);
  };

  const handleCreateFollowUp = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setErrorMessage('Please search and select a patient.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const payload = {
        patient: selectedPatient._id || selectedPatient.id,
        ...addFormData,
      };

      await api.post('/follow-ups', payload);
      setSuccessMessage('Follow-up reminder created successfully!');
      resetAddModal();
      fetchFollowUps();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to create follow-up.');
    } finally {
      setSubmitting(false);
    }
  };

  const openScheduleModal = (item) => {
    setSchedulingFollowUp(item);
    const recDate = item.recommendedDate
      ? new Date(item.recommendedDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setScheduleFormData({
      doctor: doctors[0]?._id || doctors[0]?.id || '',
      date: recDate,
      time: '10:00 AM',
      type: 'Appointment',
      reason: item.reason || 'Follow-Up Consultation',
    });
    setErrorMessage('');
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!schedulingFollowUp) return;

    if (!scheduleFormData.doctor) {
      setErrorMessage('Please select a doctor to assign.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const followUpId = schedulingFollowUp._id || schedulingFollowUp.id;
      await api.post(`/follow-ups/${followUpId}/schedule`, scheduleFormData);

      setSuccessMessage('Appointment created and follow-up marked as Scheduled!');
      setSchedulingFollowUp(null);
      fetchFollowUps();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to schedule follow-up appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Grouping helper
  const pendingCount = followUps.filter((f) => f.status === 'Pending').length;
  const scheduledCount = followUps.filter((f) => f.status === 'Scheduled').length;
  const completedCount = followUps.filter((f) => f.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Header & Main Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <Bell size={22} className="text-brand" /> Recall & Follow-Ups
          </h2>
          <p className="text-sm text-ink-soft">Track patient recall dates and schedule follow-up appointments</p>
        </div>

        <button
          onClick={() => {
            resetAddModal();
            setShowAddModal(true);
          }}
          className="btn-primary shrink-0"
        >
          <Plus size={18} />
          <span>Add Follow-Up</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && !showAddModal && !schedulingFollowUp && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800 border border-rose-200">
          <AlertTriangle size={18} className="text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          {['Pending', 'Scheduled', 'Completed', 'All'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-brand text-white'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            className="input-field pl-9 py-2 text-xs"
            placeholder="Search patient name, phone, OP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* FOLLOW-UPS LIST GROUPED */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-soft">Loading follow-ups...</div>
        ) : followUps.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Bell size={36} className="mx-auto text-ink-soft/50" />
            <p className="font-display text-base font-semibold text-ink">No follow-ups found</p>
            <p className="text-sm text-ink-soft">
              {search ? 'Try clearing your search query.' : 'Click "Add Follow-Up" to create a recall reminder.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Recommended Date</th>
                  <th className="px-5 py-3.5">Patient</th>
                  <th className="px-5 py-3.5">Reason & Instructions</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {followUps.map((item) => {
                  const itemId = item._id || item.id;
                  const patientName = item.patient
                    ? `${item.patient.firstName} ${item.patient.lastName}`.trim()
                    : 'Unknown Patient';
                  const recDateStr = item.recommendedDate
                    ? new Date(item.recommendedDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'N/A';

                  return (
                    <tr key={itemId} className="hover:bg-bg/60 transition-colors">
                      {/* Recommended Date */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-semibold text-ink text-xs flex items-center gap-1.5">
                          <Calendar size={14} className="text-brand" /> {recDateStr}
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-ink">{patientName}</div>
                        <div className="text-xs text-brand font-mono">{item.patient?.opNumber || '—'}</div>
                      </td>

                      {/* Reason & Instructions */}
                      <td className="px-5 py-4 text-xs max-w-xs">
                        <div className="font-semibold text-ink">{item.reason || 'Follow-Up Visit'}</div>
                        {item.instructions && (
                          <div className="text-ink-soft truncate mt-0.5">{item.instructions}</div>
                        )}
                        {item.notes && (
                          <div className="text-[11px] text-ink-soft/80 italic mt-0.5">{item.notes}</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`badge border ${
                            STATUS_BADGE_CLASSES[item.status] || 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.scheduledAppointment && (
                          <div className="text-[11px] text-blue-700 font-medium mt-1">
                            Dr. {item.scheduledAppointment.doctor?.name || 'Assigned'}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {item.status === 'Pending' ? (
                          <button
                            onClick={() => openScheduleModal(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-brand bg-brand-light/30 px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-light"
                          >
                            <CalendarDays size={14} /> Schedule Appointment
                          </button>
                        ) : (
                          <span className="text-xs text-ink-soft italic">Scheduled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MANUAL ADD FOLLOW-UP MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="card w-full max-w-lg p-6 space-y-5 bg-surface max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <Bell size={20} className="text-brand" /> Add Manual Follow-Up Reminder
              </h3>
              <button onClick={resetAddModal} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateFollowUp} className="space-y-4 text-xs">
              {/* Patient Search */}
              <PatientSearchInput
                selectedPatient={selectedPatient}
                onSelect={setSelectedPatient}
                required
              />

              {/* Recommended Date */}
              <div>
                <DatePicker
                  label="Recommended Date"
                  value={addFormData.recommendedDate}
                  onChange={(date, dateStr) => setAddFormData({ ...addFormData, recommendedDate: dateStr })}
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Reason for Follow-Up</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Suture Removal, Crown Fitting, Post-Op Check"
                  value={addFormData.reason}
                  onChange={(e) => setAddFormData({ ...addFormData, reason: e.target.value })}
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Post-Op / Patient Instructions</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Soft diet, avoid hot liquids"
                  value={addFormData.instructions}
                  onChange={(e) => setAddFormData({ ...addFormData, instructions: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Notes</label>
                <textarea
                  rows={2}
                  className="input-field"
                  placeholder="Additional notes for front desk..."
                  value={addFormData.notes}
                  onChange={(e) => setAddFormData({ ...addFormData, notes: e.target.value })}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button type="button" className="btn-secondary" onClick={resetAddModal}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Saving...' : 'Add Follow-Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE APPOINTMENT FROM FOLLOW-UP MODAL */}
      {schedulingFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="card w-full max-w-lg p-6 space-y-5 bg-surface max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <CalendarDays size={20} className="text-brand" /> Schedule Appointment from Follow-Up
              </h3>
              <button onClick={() => setSchedulingFollowUp(null)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
              {/* Pre-filled Patient Display */}
              <div className="rounded-xl border border-brand bg-brand-light/20 p-3">
                <span className="text-ink-soft block font-medium">Patient</span>
                <span className="font-bold text-ink text-sm">
                  {schedulingFollowUp.patient?.firstName} {schedulingFollowUp.patient?.lastName}
                </span>{' '}
                <span className="text-brand font-mono">({schedulingFollowUp.patient?.opNumber})</span>
              </div>

              {/* Doctor Select */}
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Assigned Doctor *</label>
                <select
                  className="input-field"
                  value={scheduleFormData.doctor}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, doctor: e.target.value })}
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((d) => {
                    const docId = d._id || d.id;
                    return (
                      <option key={docId} value={docId}>
                        Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <DatePicker
                    label="Appointment Date"
                    value={scheduleFormData.date}
                    onChange={(date, dateStr) => setScheduleFormData({ ...scheduleFormData, date: dateStr })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Time</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 10:00 AM"
                    value={scheduleFormData.time}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, time: e.target.value })}
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Reason for Visit</label>
                <input
                  type="text"
                  className="input-field"
                  value={scheduleFormData.reason}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, reason: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-blue-900 border border-blue-200">
                <ShieldCheck size={18} className="text-blue-600 shrink-0" />
                <span>
                  This will create an official Appointment record and set this follow-up status to <strong>Scheduled</strong>.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSchedulingFollowUp(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Scheduling...' : 'Confirm & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
