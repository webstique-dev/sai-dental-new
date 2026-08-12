import { useState, useEffect } from 'react';
import {
  ClipboardList, UserPlus, Search, CheckCircle2, AlertTriangle, X,
  User, Stethoscope, ChevronRight, ChevronLeft, ArrowRight, ShieldCheck,
} from 'lucide-react';
import api from '../../api/axios.js';

const QUEUE_STATUS_OPTIONS = ['Waiting', 'Checked-In', 'With Doctor', 'Completed', 'Cancelled'];

const STATUS_BADGE_CLASSES = {
  Waiting: 'bg-slate-100 text-slate-800 border-slate-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  'With Doctor': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function Queue() {
  const [queueEntries, setQueueEntries] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch today's queue
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
          setSelectedDoctorId(docs[0]._id);
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
    setSelectedDoctorId(doctors[0]?._id || '');
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
        // All optional, but alert if completely blank to confirm
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

  const handleStatusChange = async (queueId, newStatus) => {
    try {
      await api.patch(`/queue/${queueId}/status`, { status: newStatus });
      setSuccessMessage(`Queue status updated to ${newStatus}`);
      fetchTodayQueue();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <ClipboardList size={22} className="text-brand" /> Today's Walk-In & Queue
          </h2>
          <p className="text-sm text-ink-soft">Real-time front desk patient flow and token queue</p>
        </div>

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

      {/* Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && !showWalkInModal && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800 border border-rose-200">
          <AlertTriangle size={18} className="text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TODAY'S QUEUE TABLE */}
      <div className="card overflow-hidden">
        <div className="border-b border-border bg-bg/40 px-5 py-3.5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Today's Queue List ({queueEntries.length} Patients)
          </span>
          <button
            onClick={fetchTodayQueue}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Refresh Queue
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-ink-soft">Loading today's queue...</div>
        ) : queueEntries.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ClipboardList size={36} className="mx-auto text-ink-soft/50" />
            <p className="font-display text-base font-semibold text-ink">No patients in queue today</p>
            <p className="text-sm text-ink-soft">
              Click "Walk-In Patient" to issue tokens and check in patients.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Token</th>
                  <th className="px-5 py-3.5">Patient</th>
                  <th className="px-5 py-3.5">Doctor</th>
                  <th className="px-5 py-3.5">Type</th>
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

                  return (
                    <tr key={entry._id} className="hover:bg-bg/60 transition-colors">
                      {/* Token */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-mono text-base font-bold shadow-sm">
                          #{entry.token}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-ink">{patientName}</div>
                        <div className="text-xs text-ink-soft flex items-center gap-2 mt-0.5">
                          {entry.patient?.opNumber && (
                            <span className="font-mono text-brand">{entry.patient.opNumber}</span>
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

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`badge border ${
                            STATUS_BADGE_CLASSES[entry.status] || 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <select
                          className="input-field py-1 px-2.5 text-xs w-auto inline-block"
                          value={entry.status}
                          onChange={(e) => handleStatusChange(entry._id, e.target.value)}
                        >
                          {QUEUE_STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="card w-full max-w-xl p-6 space-y-5 bg-surface max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">Walk-In Patient Check-In</h3>
                <p className="text-xs text-ink-soft">
                  Step {step} of 4: {step === 1 ? 'Patient Selection' : step === 2 ? 'Assign Doctor' : step === 3 ? 'Confirmation' : 'Token Issued'}
                </p>
              </div>
              <button onClick={resetWalkInModal} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            {/* Error Banner inside Modal */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 1: Search or Register Patient */}
            {step === 1 && (
              <div className="space-y-4">
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
                  <div className="space-y-3">
                    {selectedPatient ? (
                      <div className="flex items-center justify-between rounded-xl border border-brand bg-brand-light/20 p-3.5">
                        <div>
                          <p className="text-sm font-bold text-ink">
                            {selectedPatient.firstName} {selectedPatient.lastName}
                          </p>
                          <p className="text-xs text-ink-soft">
                            OP: <span className="font-mono text-brand">{selectedPatient.opNumber}</span> | Phone: {selectedPatient.phone || 'N/A'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(null)}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
                        <input
                          type="text"
                          className="input-field pl-9"
                          placeholder="Search patient name, phone number, or OP number..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                        />

                        {patientOptions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-xl border border-border bg-surface shadow-card max-h-48 overflow-y-auto">
                            {patientOptions.map((p) => (
                              <div
                                key={p._id}
                                onClick={() => {
                                  setSelectedPatient(p);
                                  setPatientSearch('');
                                  setPatientOptions([]);
                                }}
                                className="p-3 text-xs border-b border-border/50 hover:bg-brand-light/30 cursor-pointer"
                              >
                                <span className="font-bold text-ink">{p.firstName} {p.lastName}</span>{' '}
                                <span className="text-brand font-mono">({p.opNumber})</span> — {p.phone || 'No phone'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* New Patient Form (All optional) */
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-ink-soft font-semibold mb-1">First Name</label>
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
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Assigned Doctor *</label>
                  <select
                    className="input-field"
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Reason for Visit</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Tooth ache, Urgent scaling, Walk-in consultation"
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
                        Dr. {doctors.find((d) => d._id === selectedDoctorId)?.name || 'Selected Doctor'}
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
                    Confirming will automatically generate today's next sequential Token and mark status as <strong>Checked-In</strong>.
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

            {/* Footer Buttons */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              {step > 1 && step < 4 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="btn-secondary text-xs"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}

              <div className="ml-auto flex items-center gap-2">
                {step < 3 && (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="btn-primary text-xs"
                  >
                    Next Step <ChevronRight size={16} />
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
    </div>
  );
}
