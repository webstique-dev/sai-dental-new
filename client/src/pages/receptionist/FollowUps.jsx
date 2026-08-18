import { useState, useEffect } from 'react';
import {
  CalendarDays, Plus, Search, Calendar, Phone, CheckCircle2, UserCheck, X, Clock, AlertTriangle, User, List,
} from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import SplitTimeInput from '../../components/common/SplitTimeInput.jsx';
import PatientSearchInput from '../../components/common/PatientSearchInput.jsx';
import AppointmentCalendar from '../../components/common/AppointmentCalendar.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

const STATUS_BADGE_CLASSES = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  'No Show': 'bg-slate-100 text-slate-800 border-slate-200',
  Missed: 'bg-purple-100 text-purple-800 border-purple-200',
};

function getInitialTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  const strMinutes = String(minutes).padStart(2, '0');
  return `${strHours}:${strMinutes} ${ampm}`;
}

export default function FollowUps() {
  const { showSuccess, showError } = useNotification();

  const [followUps, setFollowUps] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & View Mode state
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Add Follow-Up Form state
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [addFormData, setAddFormData] = useState({
    doctor: '',
    recommendedDate: new Date().toISOString().split('T')[0],
    time: getInitialTime(),
    reason: '',
    notes: '',
  });

  // Schedule Appointment Form state
  const [scheduleFormData, setScheduleFormData] = useState({
    doctor: '',
    date: new Date().toISOString().split('T')[0],
    time: getInitialTime(),
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

  const selectPatient = async (patient) => {
    setSelectedPatient(patient);
    setErrorMessage('');
    if (!patient) {
      setAddFormData((prev) => ({ ...prev, doctor: '' }));
      return;
    }

    // Auto-suggest patient's most recent treating doctor
    try {
      const pId = patient._id || patient.id;
      const res = await api.get(`/follow-ups/patient-last-doctor/${pId}`);
      if (res.data?.doctor) {
        const docId = res.data.doctor._id || res.data.doctor.id;
        setAddFormData((prev) => ({ ...prev, doctor: docId }));
      }
    } catch (err) {
      console.error('Failed to fetch last doctor for patient:', err);
    }
  };

  const resetAddModal = () => {
    setShowAddModal(false);
    setSelectedPatient(null);
    setErrorMessage('');
    setAddFormData({
      doctor: '',
      recommendedDate: new Date().toISOString().split('T')[0],
      time: getInitialTime(),
      reason: '',
      notes: '',
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedPatient) {
      const msg = 'Please search and select a patient.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    if (!addFormData.doctor) {
      const msg = 'Assigned doctor is required.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    if (!addFormData.recommendedDate) {
      const msg = 'Follow-Up Date is required.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    if (!addFormData.time) {
      const msg = 'Follow-Up Time is required.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    if (!addFormData.reason || !addFormData.reason.trim()) {
      const msg = 'Reason / Procedure is required.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patient: selectedPatient._id || selectedPatient.id,
        ...addFormData,
      };

      await api.post('/follow-ups', payload);
      showSuccess('Follow-up scheduled and appointment created successfully!');
      resetAddModal();
      fetchFollowUps();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create follow-up appointment.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openScheduleModal = async (item) => {
    setSchedulingFollowUp(item);
    setErrorMessage('');
    const recDate = item.recommendedDate
      ? new Date(item.recommendedDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    let initialDoctor = item.doctor?._id || item.doctor?.id || (typeof item.doctor === 'string' ? item.doctor : '');

    // If doctor is unassigned, auto-suggest last treating doctor
    if (!initialDoctor && item.patient) {
      const pId = item.patient._id || item.patient.id || item.patient;
      try {
        const res = await api.get(`/follow-ups/patient-last-doctor/${pId}`);
        if (res.data?.doctor) {
          initialDoctor = res.data.doctor._id || res.data.doctor.id;
        }
      } catch (err) {
        console.error('Failed to fetch last doctor:', err);
      }
    }

    setScheduleFormData({
      doctor: initialDoctor || (doctors[0]?._id || doctors[0]?.id || ''),
      date: recDate,
      time: getInitialTime(),
      type: 'Appointment',
      reason: item.reason || 'Follow-Up Consultation',
    });
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!schedulingFollowUp) return;

    if (!scheduleFormData.doctor) {
      const msg = 'Doctor selection is required to book an appointment.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setSubmitting(true);
    try {
      const followUpId = schedulingFollowUp._id || schedulingFollowUp.id;
      await api.post(`/follow-ups/${followUpId}/schedule`, scheduleFormData);

      showSuccess('Appointment booked successfully and follow-up status updated to Scheduled!');
      setSchedulingFollowUp(null);
      fetchFollowUps();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to schedule follow-up appointment.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header & Primary Action */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Follow-Up Reminders</h2>
            <p className="text-sm text-ink-soft">Directly schedule follow-up appointments and track patient visits</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl border border-border bg-surface p-1 shadow-sm">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'list' ? 'bg-brand text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <List size={15} /> List View
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'calendar' ? 'bg-brand text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <CalendarDays size={15} /> Calendar View
              </button>
            </div>

            <button onClick={() => setShowAddModal(true)} className="btn-primary shrink-0">
              <Plus size={18} />
              <span>Add Follow-Up Appointment</span>
            </button>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <AppointmentCalendar
            calendarDate={calendarDate}
            setCalendarDate={setCalendarDate}
            appointments={followUps.map((fu) => ({
              _id: fu._id || fu.id,
              date: fu.recommendedDate,
              time: fu.scheduledAppointment?.time || '10:00 AM',
              status: fu.status,
              patient: fu.patient,
              doctor: fu.createdBy || { name: 'Staff Doctor' },
            }))}
            allowEdit={true}
            onEdit={(fuApt) => {
              const matched = followUps.find((f) => (f._id || f.id) === fuApt._id);
              if (matched && matched.status === 'Pending') {
                openScheduleModal(matched);
              }
            }}
          />
        ) : (
          <>

        {/* Tabs & Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-2xl overflow-x-auto">
            {['All', 'Scheduled', 'Pending', 'Checked-In', 'Completed', 'Missed', 'Cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab
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
                    <th className="px-5 py-3.5">Follow-Up Date</th>
                    <th className="px-5 py-3.5">Patient Details</th>
                    <th className="px-5 py-3.5">Assigned Doctor</th>
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
                    const docObj = item.doctor || item.scheduledAppointment?.doctor;
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

                        <td className="px-5 py-4 whitespace-nowrap">
                          {docObj ? (
                            <span className="font-medium text-ink">Dr. {docObj.name}</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Unassigned
                            </span>
                          )}
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
      </>
      )}
      </div>

      {/* ADD FOLLOW-UP MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-lg max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Plus size={18} className="text-brand" /> Add Follow-Up Appointment
              </h3>
              <button onClick={resetAddModal} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Patient Search */}
                <PatientSearchInput
                  selectedPatient={selectedPatient}
                  onSelect={selectPatient}
                  required
                />

                {/* Assigned Doctor (Required) */}
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Assigned Doctor <span className="text-rose-600">*</span>
                  </label>
                  <select
                    required
                    className="input-field text-xs"
                    value={addFormData.doctor}
                    onChange={(e) => setAddFormData((prev) => ({ ...prev, doctor: e.target.value }))}
                  >
                    <option value="">Select Doctor *</option>
                    {doctors.map((d) => (
                      <option key={d._id || d.id} value={d._id || d.id}>
                        Dr. {d.name} ({d.specialization || 'Dental Specialist'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Follow-Up Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <DatePicker
                      label="Follow-Up Date *"
                      value={addFormData.recommendedDate}
                      onChange={(date, dateStr) => setAddFormData((prev) => ({ ...prev, recommendedDate: dateStr }))}
                      minDate={new Date()}
                    />
                  </div>

                  <div>
                    <SplitTimeInput
                      label="Time *"
                      value={addFormData.time}
                      onChange={(time12) => setAddFormData((prev) => ({ ...prev, time: time12 }))}
                    />
                  </div>
                </div>

                {/* Reason / Procedure */}
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Reason / Procedure <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field text-xs"
                    placeholder="e.g. Suture removal, Crown Placement, Post-op evaluation"
                    value={addFormData.reason}
                    onChange={(e) => setAddFormData((prev) => ({ ...prev, reason: e.target.value }))}
                  />
                </div>

                {/* Notes (Optional) */}
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Notes <span className="font-normal text-ink-soft/70">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    className="input-field text-xs"
                    placeholder="Additional notes for doctor or staff..."
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
                  {submitting ? 'Scheduling...' : 'Schedule Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE APPOINTMENT MODAL (FOR PENDING ROWS) */}
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
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-bg border border-border space-y-1">
                  <span className="text-[10px] font-bold uppercase text-ink-soft block">Patient</span>
                  <span className="font-bold text-ink text-sm">
                    {schedulingFollowUp.patient?.firstName} {schedulingFollowUp.patient?.lastName}
                  </span>
                  <span className="text-xs text-brand font-mono font-bold block">{schedulingFollowUp.patient?.opNumber}</span>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Assign Doctor <span className="text-rose-600">*</span>
                  </label>
                  <select
                    required
                    className="input-field text-xs"
                    value={scheduleFormData.doctor}
                    onChange={(e) => setScheduleFormData((prev) => ({ ...prev, doctor: e.target.value }))}
                  >
                    <option value="">Select Doctor *</option>
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
                    <SplitTimeInput
                      label="Time *"
                      value={scheduleFormData.time}
                      onChange={(time12) => setScheduleFormData((prev) => ({ ...prev, time: time12 }))}
                    />
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
    </>
  );
}
