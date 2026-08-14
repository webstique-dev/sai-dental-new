import { useState, useEffect } from 'react';
import {
  ClipboardList, UserPlus, Search, CheckCircle2, AlertTriangle, X,
  User, Stethoscope, ChevronRight, ChevronLeft, ArrowRight, ShieldCheck,
  UserCheck, Loader2, RefreshCw, Clock,
} from 'lucide-react';
import api from '../../api/axios.js';
import PatientSearchInput from '../../components/common/PatientSearchInput.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

const STATUS_BADGE_CLASSES = {
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  'No Show': 'bg-slate-100 text-slate-800 border-slate-200',
};

export default function Queue() {
  const { showSuccess, showError } = useNotification();
  const [queueEntries, setQueueEntries] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCancelQueueEntry, setPendingCancelQueueEntry] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [cancellingQueue, setCancellingQueue] = useState(false);

  // Modal State for 4-Step Walk-In Flow
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [step, setStep] = useState(1); // 1: Patient, 2: Doctor, 3: Confirm, 4: Success Token

  // Step 1 State: Existing or New Patient
  const [patientMode, setPatientMode] = useState('search'); // 'search' | 'new'
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [newPatientData, setNewPatientData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    sex: '',
    age: '',
  });

  // Step 2 State: Doctor & Reason
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [visitReason, setVisitReason] = useState('');

  // Step 4 State: Generated Token
  const [issuedToken, setIssuedToken] = useState(null);

  // Notifications inside modal
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch today's active queue
  const fetchTodayQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/queue/today');
      setQueueEntries(res.data?.queueEntries || []);
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctors on mount
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await api.get('/users/doctors');
        const docs = res.data?.doctors || [];
        setDoctors(docs);
        if (docs.length > 0) {
          setSelectedDoctorId(docs[0]._id || docs[0].id);
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    }
    fetchDoctors();
    fetchTodayQueue();
  }, []);

  // Live patient search in Step 1
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

  const resetWalkInModal = () => {
    setStep(1);
    setPatientMode('search');
    setPatientSearch('');
    setPatientOptions([]);
    setSelectedPatient(null);
    setNewPatientData({ firstName: '', lastName: '', phone: '', sex: '', age: '' });
    setSelectedDoctorId(doctors[0]?._id || doctors[0]?.id || '');
    setVisitReason('');
    setIssuedToken(null);
    setErrorMessage('');
    setShowWalkInModal(false);
  };

  const handleNextStep = () => {
    setErrorMessage('');
    if (step === 1) {
      if (patientMode === 'search' && !selectedPatient) {
        setErrorMessage('Please search and select an existing patient, or switch to Register New Patient.');
        return;
      }
      if (patientMode === 'new' && !newPatientData.firstName && !newPatientData.lastName && !newPatientData.phone) {
        setErrorMessage('Please provide at least a name or phone number for the new patient.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedDoctorId) {
        setErrorMessage('Please select a doctor to assign.');
        return;
      }
      setStep(3); // Confirmation step
    }
  };

  const handleFinalizeWalkIn = async () => {
    setSubmitting(true);
    setErrorMessage('');
    try {
      const payload = {
        doctorId: selectedDoctorId,
        reason: visitReason || 'Walk-in Consultation',
      };

      if (patientMode === 'search' && selectedPatient) {
        payload.patientId = selectedPatient._id;
      } else {
        payload.patientData = newPatientData;
      }

      const res = await api.post('/queue/walk-in', payload);
      const newEntry = res.data?.queueEntry;

      setIssuedToken(newEntry);
      setStep(4); // Success step displaying token
      fetchTodayQueue();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to complete walk-in check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCancelQueueEntry = async () => {
    if (!pendingCancelQueueEntry) return;
    setCancellingQueue(true);
    try {
      await api.patch(`/queue/${pendingCancelQueueEntry._id}/status`, { status: 'Cancelled' });
      showSuccess('Queue check-in cancelled successfully.');
      setPendingCancelQueueEntry(null);
      fetchTodayQueue();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel queue entry.');
    } finally {
      setCancellingQueue(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <ClipboardList size={22} className="text-brand" /> Today's Check-In & Active Queue
          </h2>
          <p className="text-sm text-ink-soft">Real-time front desk active patient flow and sequential token queue</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchTodayQueue}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Refresh Queue
          </button>
          <button
            onClick={() => {
              resetWalkInModal();
              setShowWalkInModal(true);
            }}
            className="btn-primary shrink-0"
          >
            <UserPlus size={18} />
            <span>Walk-In Patient</span>
          </button>
        </div>
      </div>

      {/* TODAY'S ACTIVE QUEUE TABLE */}
      <div className="card overflow-hidden">
        <div className="border-b border-border bg-bg/40 px-5 py-3.5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Active Queue Flow ({queueEntries.length} Patients Waiting / In Consultation)
          </span>
          <span className="text-xs text-brand font-semibold">
            Auto-derived from today's checked-in patients
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-ink-soft">Loading active queue...</div>
        ) : queueEntries.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ClipboardList size={36} className="mx-auto text-ink-soft/50" />
            <p className="font-display text-base font-semibold text-ink">No active patients in queue today</p>
            <p className="text-sm text-ink-soft">
              Check in patients from Appointments or click "Walk-In Patient" to issue tokens.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Queue Token</th>
                  <th className="px-5 py-3.5">Patient</th>
                  <th className="px-5 py-3.5">Doctor</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Time</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {queueEntries.map((entry) => {
                  const patientName = entry.patient
                    ? `${entry.patient.firstName} ${entry.patient.lastName}`.trim()
                    : 'Walk-in Patient';
                  const docName = entry.doctor ? `Dr. ${entry.doctor.name}` : 'Unassigned';
                  const timeStr = entry.checkInTime
                    ? new Date(entry.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : entry.appointment?.time || '—';

                  const displayStatus = entry.status === 'With Doctor' ? 'In Consultation' : entry.status;

                  return (
                    <tr key={entry._id} className="hover:bg-bg/60 transition-colors">
                      {/* Queue Token */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-mono text-base font-bold shadow-sm">
                          #{entry.token}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink">{patientName}</div>
                        <div className="text-xs text-ink-soft flex items-center gap-2 mt-0.5">
                          {entry.patient?.opNumber && (
                            <span className="font-mono text-brand font-bold">{entry.patient.opNumber}</span>
                          )}
                          {entry.patient?.phone && <span>{entry.patient.phone}</span>}
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="px-5 py-4 text-ink font-medium text-xs">
                        {docName}
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4 text-xs">
                        <span
                          className={`badge ${
                            entry.type === 'Walk-in'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {entry.type}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="px-5 py-4 text-xs text-ink-soft whitespace-nowrap">
                        <div className="flex items-center gap-1 font-medium text-ink">
                          <Clock size={13} className="text-brand" /> {timeStr}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`badge border ${
                            STATUS_BADGE_CLASSES[displayStatus] || 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {displayStatus === 'Checked-In' && (
                            <button
                              onClick={() => setPendingCancelQueueEntry(entry)}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                              title="Cancel Check-in"
                            >
                              <X size={13} />
                              Cancel Check-In
                            </button>
                          )}
                          {displayStatus === 'In Consultation' && (
                            <span className="text-xs text-purple-700 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                              Doctor Consulting
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4-STEP WALK-IN MODAL */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="card w-full max-w-xl my-auto flex flex-col bg-surface shadow-2xl rounded-2xl border border-border overflow-visible min-h-[480px] max-h-[calc(100vh-2rem)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-6 sm:py-4 bg-surface shrink-0 rounded-t-2xl">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-ink">Walk-In Patient Check-In</h3>
                <p className="text-xs text-ink-soft">
                  Step {step} of 4: {step === 1 ? 'Patient Selection' : step === 2 ? 'Assign Doctor' : step === 3 ? 'Confirmation' : 'Token Issued'}
                </p>
              </div>
              <button onClick={resetWalkInModal} className="rounded-lg p-1.5 text-ink-soft hover:bg-bg hover:text-ink transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-[360px]">
              {/* Error Banner inside Modal */}
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* STEP 1: Search or Register Patient */}
              {step === 1 && (
                <div className="space-y-4 min-h-[300px]">
                  <div className="flex rounded-xl border border-border p-1 bg-bg">
                    <button
                      type="button"
                      onClick={() => setPatientMode('search')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        patientMode === 'search' ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      Search Existing Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => setPatientMode('new')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        patientMode === 'new' ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      Register New Patient
                    </button>
                  </div>

                  {patientMode === 'search' ? (
                    <div className="pb-12">
                      <PatientSearchInput
                        selectedPatient={selectedPatient}
                        onSelect={setSelectedPatient}
                        required
                      />
                    </div>
                  ) : (
                    /* New Patient Form */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-ink-soft font-semibold mb-1">First Name *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. Alex"
                          value={newPatientData.firstName}
                          onChange={(e) => setNewPatientData({ ...newPatientData, firstName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-ink-soft font-semibold mb-1">Last Name</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. Smith"
                          value={newPatientData.lastName}
                          onChange={(e) => setNewPatientData({ ...newPatientData, lastName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-ink-soft font-semibold mb-1">Phone Number</label>
                        <input
                          type="tel"
                          className="input-field"
                          placeholder="e.g. 9876543210"
                          value={newPatientData.phone}
                          onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-ink-soft font-semibold mb-1">Sex</label>
                        <select
                          className="input-field"
                          value={newPatientData.sex}
                          onChange={(e) => setNewPatientData({ ...newPatientData, sex: e.target.value })}
                        >
                          <option value="">Select Sex</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Assign Doctor */}
              {step === 2 && (
                <div className="space-y-4 text-xs min-h-[300px]">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Assigned Doctor *</label>
                    <select
                      className="input-field font-semibold py-2.5 text-xs"
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map((d) => {
                        const docId = d._id || d.id;
                        return (
                          <option key={docId} value={docId}>
                            Dr. {d.name} {d.specialization ? `— ${d.specialization}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Reason for Visit</label>
                    <input
                      type="text"
                      className="input-field py-2.5 text-xs"
                      placeholder="e.g. Toothache, Urgent scaling, Walk-in consultation"
                      value={visitReason}
                      onChange={(e) => setVisitReason(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Confirm Details before Check-In */}
              {step === 3 && (
                <div className="space-y-4 text-xs">
                  <div className="rounded-xl border border-border bg-bg p-4 space-y-3">
                    <h4 className="font-display font-bold text-ink text-sm border-b border-border pb-2">
                      Walk-In Summary Review
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-ink">
                      <div>
                        <span className="text-ink-soft block font-medium">Patient Name</span>
                        <span className="font-bold text-sm">
                          {patientMode === 'search' && selectedPatient
                            ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                            : `${newPatientData.firstName} ${newPatientData.lastName}` || 'Unnamed Walk-in'}
                        </span>
                      </div>

                      <div>
                        <span className="text-ink-soft block font-medium">Phone / OP#</span>
                        <span>
                          {patientMode === 'search' && selectedPatient
                            ? `${selectedPatient.opNumber} | ${selectedPatient.phone || 'N/A'}`
                            : newPatientData.phone || 'New Patient'}
                        </span>
                      </div>

                      <div>
                        <span className="text-ink-soft block font-medium">Assigned Doctor</span>
                        <span className="font-semibold text-brand">
                          Dr. {doctors.find((d) => (d._id || d.id) === selectedDoctorId)?.name || 'Selected Doctor'}
                        </span>
                      </div>

                      <div>
                        <span className="text-ink-soft block font-medium">Reason</span>
                        <span>{visitReason || 'Walk-in Consultation'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-amber-900 border border-amber-200">
                    <ShieldCheck size={18} className="text-amber-600 shrink-0" />
                    <span>
                      Confirming will generate today's next sequential Token, create a Walk-in Appointment, and mark status as <strong>Checked-In</strong>.
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 4: Token Issued Success State */}
              {step === 4 && issuedToken && (
                <div className="text-center py-4 space-y-4">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white shadow-lg">
                    <span className="font-mono text-3xl font-extrabold">#{issuedToken.token}</span>
                  </div>

                  <div>
                    <h4 className="font-display text-lg font-bold text-ink">
                      Token #{issuedToken.token} Issued!
                    </h4>
                    <p className="text-xs text-ink-soft mt-1">
                      Patient <span className="font-semibold text-ink">{issuedToken.patient?.firstName} {issuedToken.patient?.lastName}</span> has been checked in for <span className="font-semibold text-brand">Dr. {issuedToken.doctor?.name}</span>.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Footer Navigation Buttons */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
              {step > 1 && step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="btn-secondary text-xs"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {step < 3 && (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="btn-primary text-xs"
                  >
                    Next Step
                  </button>
                )}

                {step === 3 && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleFinalizeWalkIn}
                    className="btn-primary text-xs"
                  >
                    {submitting ? 'Checking In...' : 'Confirm & Issue Token'}
                  </button>
                )}

                {step === 4 && (
                  <button
                    type="button"
                    onClick={resetWalkInModal}
                    className="btn-primary text-xs"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION POPUP */}
      <ConfirmModal
        isOpen={Boolean(pendingCancelQueueEntry)}
        onClose={() => setPendingCancelQueueEntry(null)}
        onConfirm={confirmCancelQueueEntry}
        title="Confirm Queue Cancellation"
        message={
          pendingCancelQueueEntry ? (
            <p className="text-xs">
              Are you sure you want to cancel the check-in for{' '}
              <strong className="text-ink font-bold">
                {pendingCancelQueueEntry.patient?.firstName} {pendingCancelQueueEntry.patient?.lastName}
              </strong>
              ?
            </p>
          ) : (
            'Are you sure you want to cancel this check-in entry?'
          )
        }
        confirmText="Yes, Cancel Check-In"
        cancelText="Keep in Queue"
        variant="cancel"
        loading={cancellingQueue}
      />
    </div>
  );
}
