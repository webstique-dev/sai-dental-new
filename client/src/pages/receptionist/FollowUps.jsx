import { useState, useEffect } from 'react';
import {
  CalendarDays, Plus, Search, Calendar, Phone, CheckCircle2, UserCheck, X, Clock, AlertTriangle,
} from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

const STATUS_BADGE_CLASSES = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function FollowUps() {
  const { showSuccess, showError } = useNotification();

  const [followUps, setFollowUps] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [activeTab, setActiveTab] = useState('All'); // 'Pending', 'Scheduled', 'Completed', 'All'
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  // Add Follow-Up Form state
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [addFormData, setAddFormData] = useState({
    recommendedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reason: '',
    notes: '',
  });

  // Schedule Appointment Form state
  const [scheduleFormData, setScheduleFormData] = useState({
    doctor: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
    type: 'Appointment',
    reason: '',
  });

  // Fetch doctors list on mount
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await api.get('/users/doctors');
        setDoctors(res.data?.doctors || []);
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    }
    fetchDoctors();
  }, []);

  // Fetch follow-up records
  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'All') {
        params.append('status', activeTab);
      }
      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      const res = await api.get(`/follow-ups?${params.toString()}`);
      setFollowUps(res.data?.followUps || []);
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFollowUps();
    }, 250);
    return () => clearTimeout(timer);
  }, [activeTab, search]);

  // Live patient search for Add Modal
  useEffect(() => {
    if (!patientSearch || patientSearch.trim().length < 2) {
      setPatientOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/patients?search=${encodeURIComponent(patientSearch.trim())}&limit=5`);
        setPatientOptions(res.data?.patients || []);
      } catch (err) {
        console.error('Patient search error:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientSearch(`${patient.firstName || ''} ${patient.lastName || ''}`.trim());
    setPatientOptions([]);
  };

  const resetAddModal = () => {
    setShowAddModal(false);
    setSelectedPatient(null);
    setPatientSearch('');
    setPatientOptions([]);
    setAddFormData({
      recommendedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reason: '',
      notes: '',
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      showError('Please search and select a patient.');
      return;
    }
    if (!addFormData.reason || !addFormData.reason.trim()) {
      showError('Reason / Procedure is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patient: selectedPatient._id || selectedPatient.id,
        ...addFormData,
      };

      await api.post('/follow-ups', payload);
      showSuccess('Follow-up reminder created successfully!');
      resetAddModal();
      fetchFollowUps();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create follow-up.');
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
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!schedulingFollowUp) return;

    if (!scheduleFormData.doctor) {
      showError('Please select a doctor to assign.');
      return;
    }

    setSubmitting(true);
    try {
      const followUpId = schedulingFollowUp._id || schedulingFollowUp.id;
      await api.post(`/follow-ups/${followUpId}/schedule`, scheduleFormData);

      showSuccess('Appointment created and follow-up marked as Scheduled!');
      setSchedulingFollowUp(null);
      fetchFollowUps();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to schedule follow-up appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Follow-Up Reminders</h2>
          <p className="text-sm text-ink-soft">Track recommended recall dates and convert into booked appointments</p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary shrink-0">
          <Plus size={18} />
          <span>Add Follow-Up</span>
        </button>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-2xl overflow-x-auto">
          {['All', 'Pending', 'Scheduled', 'Completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${activeTab === tab
                ? 'bg-brand text-white shadow-sm'
                : 'text-ink-soft hover:text-ink hover:bg-bg'
                }`}
            >
              {tab === 'Pending' ? 'Pending Callbacks' : tab}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            className="input-field pl-9 py-1.5 text-xs"
            placeholder="Search by Patient Name, Phone, OP#..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Follow-Up Records Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-ink-soft">Loading follow-ups...</div>
        ) : followUps.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CalendarDays size={36} className="mx-auto text-ink-soft/40" />
            <p className="font-display text-base font-semibold text-ink">No follow-ups found</p>
            <p className="text-xs text-ink-soft">
              {activeTab === 'Pending'
                ? 'No pending recall callbacks scheduled.'
                : 'Try adjusting your search or tab filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Recommended Date</th>
                  <th className="px-5 py-3.5">Patient Details</th>
                  <th className="px-5 py-3.5">Reason / Procedure</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Scheduled Appt</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {followUps.map((item) => {
                  const itemId = item._id || item.id;
                  const patient = item.patient || {};
                  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';
                  const isPending = item.status === 'Pending';
                  const recDateStr = item.recommendedDate
                    ? new Date(item.recommendedDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                    : 'N/A';

                  return (
                    <tr key={itemId} className="hover:bg-bg/40 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap font-bold text-ink">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-brand shrink-0" />
                          <span>{recDateStr}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink text-sm">{patientName}</div>
                        <div className="flex items-center gap-2 text-ink-soft text-[11px] mt-0.5">
                          {patient.opNumber && (
                            <span className="font-mono font-bold text-brand">{patient.opNumber}</span>
                          )}
                          {patient.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} /> {patient.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-medium text-ink max-w-xs">
                        {item.reason}
                        {item.notes && <span className="block text-[11px] text-ink-soft italic font-normal">{item.notes}</span>}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`badge border ${STATUS_BADGE_CLASSES[item.status] || 'bg-slate-100 text-slate-800'}`}>
                          {item.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-ink-soft">
                        {item.scheduledAppointment ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block text-[11px] w-fit">
                              {new Date(item.scheduledAppointment.date).toLocaleDateString()} @ {item.scheduledAppointment.time || '—'}
                            </span>
                            {item.scheduledAppointment.doctor && (
                              <span className="text-[10px] block">
                                Dr. {item.scheduledAppointment.doctor.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {isPending && (
                          <button
                            onClick={() => openScheduleModal(item)}
                            className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                          >
                            <UserCheck size={14} /> Schedule Appt
                          </button>
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

      {/* ADD FOLLOW-UP MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-lg max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Plus size={18} className="text-brand" /> Add Follow-Up Recall
              </h3>
              <button onClick={resetAddModal} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                {/* Patient Search */}
                <div className="relative">
                  <label className="block font-semibold text-ink-soft mb-1">Search & Select Patient *</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                    <input
                      type="text"
                      className="input-field pl-9 text-xs"
                      placeholder="Type Patient Name, OP Number, or Phone..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setSelectedPatient(null);
                      }}
                    />
                  </div>

                  {patientOptions.length > 0 && !selectedPatient && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-border">
                      {patientOptions.map((p) => (
                        <button
                          type="button"
                          key={p._id}
                          onClick={() => selectPatient(p)}
                          className="w-full text-left p-2.5 hover:bg-bg transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-ink block">{p.firstName} {p.lastName}</span>
                            <span className="text-[11px] text-ink-soft">{p.phone || 'No phone'}</span>
                          </div>
                          <span className="font-mono text-xs font-bold text-brand">{p.opNumber}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedPatient && (
                    <div className="mt-2 p-2.5 rounded-xl bg-brand-light/30 border border-brand-light flex items-center justify-between">
                      <div>
                        <span className="font-bold text-brand-dark block text-xs">
                          {selectedPatient.firstName} {selectedPatient.lastName}
                        </span>
                        <span className="text-[11px] text-ink-soft">{selectedPatient.phone}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-brand">{selectedPatient.opNumber}</span>
                    </div>
                  )}
                </div>

                <div>
                  <DatePicker
                    label="Recommended Follow-Up Date *"
                    value={addFormData.recommendedDate}
                    onChange={(date, dateStr) => setAddFormData((prev) => ({ ...prev, recommendedDate: dateStr }))}
                    minDate={new Date()}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Reason / Procedure *</label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    placeholder="e.g. Suture removal, Crown Placement, Post-op evaluation"
                    value={addFormData.reason}
                    onChange={(e) => setAddFormData((prev) => ({ ...prev, reason: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Notes (Optional)</label>
                  <textarea
                    rows={2}
                    className="input-field text-xs"
                    placeholder="Instructions for receptionist during recall call..."
                    value={addFormData.notes}
                    onChange={(e) => setAddFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button type="button" className="btn-secondary text-xs" onClick={resetAddModal}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? 'Saving...' : 'Save Follow-Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE APPOINTMENT MODAL */}
      {schedulingFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-md max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <UserCheck size={18} className="text-brand" /> Schedule Follow-Up Appointment
              </h3>
              <button onClick={() => setSchedulingFollowUp(null)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-bg border border-border space-y-1">
                  <span className="text-[10px] font-bold uppercase text-ink-soft block">Patient</span>
                  <span className="font-bold text-ink text-sm">
                    {schedulingFollowUp.patient?.firstName} {schedulingFollowUp.patient?.lastName}
                  </span>
                  <span className="text-xs text-brand font-mono font-bold block">{schedulingFollowUp.patient?.opNumber}</span>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Assign Doctor *</label>
                  <select
                    className="input-field text-xs"
                    value={scheduleFormData.doctor}
                    onChange={(e) => setScheduleFormData((prev) => ({ ...prev, doctor: e.target.value }))}
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((d) => (
                      <option key={d._id || d.id} value={d._id || d.id}>
                        Dr. {d.name} ({d.specialization || 'Dental Specialist'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <DatePicker
                      label="Date *"
                      value={scheduleFormData.date}
                      onChange={(date, dateStr) => setScheduleFormData((prev) => ({ ...prev, date: dateStr }))}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Time Slot *</label>
                    <select
                      className="input-field text-xs"
                      value={scheduleFormData.time}
                      onChange={(e) => setScheduleFormData((prev) => ({ ...prev, time: e.target.value }))}
                    >
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:00 PM">03:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="05:00 PM">05:00 PM</option>
                      <option value="06:00 PM">06:00 PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Reason / Notes</label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    value={scheduleFormData.reason}
                    onChange={(e) => setScheduleFormData((prev) => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setSchedulingFollowUp(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? 'Scheduling...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
