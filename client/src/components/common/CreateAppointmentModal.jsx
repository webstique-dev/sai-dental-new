import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../api/axios.js';
import { formatAge, formatPatientFullName, capitalizeWords } from '../../utils/formatters.js';
import DatePicker from './DatePicker.jsx';
import SplitTimeInput from './SplitTimeInput.jsx';
import PatientSearchInput from './PatientSearchInput.jsx';
import EditableCombobox from './EditableCombobox.jsx';
import UnsavedChangesModal from './UnsavedChangesModal.jsx';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges.js';
import { TOOTH_CONDITIONS } from '../../constants/toothConditions.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

// Helper to get today's date & exact current system time in 12-hour AM/PM format
function getInitialExactDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  let rawH = now.getHours();
  let m = now.getMinutes();
  const period = rawH >= 12 ? 'PM' : 'AM';
  let h12 = rawH % 12 === 0 ? 12 : rawH % 12;

  const hourStr = String(h12).padStart(2, '0');
  const minStr = String(m).padStart(2, '0');
  const timeStr = `${hourStr}:${minStr} ${period}`;

  return { dateStr, timeStr };
}

export default function CreateAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  initialPatient = null,
  initialDoctorId = null,
  defaultAction = 'Check-in',
}) {
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [primaryDoctor, setPrimaryDoctor] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(initialPatient);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const initialSnapshotRef = useRef(null);

  const [formData, setFormData] = useState(() => {
    const { dateStr, timeStr } = getInitialExactDateTime();
    return {
      patient: initialPatient?._id || initialPatient?.id || '',
      doctor: initialDoctorId || '',
      date: dateStr,
      time: timeStr,
      type: 'Walk-In',
      reason: '',
      action: defaultAction || 'Check-in',
    };
  });

  // Re-sync default action and patient whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const { dateStr, timeStr } = getInitialExactDateTime();
      const p = initialPatient || null;
      setSelectedPatient(p);
      const initForm = {
        patient: p?._id || p?.id || '',
        doctor: initialDoctorId || '',
        date: dateStr,
        time: timeStr,
        type: 'Walk-In',
        reason: '',
        action: defaultAction || 'Check-in',
      };
      setFormData(initForm);
      initialSnapshotRef.current = {
        patientId: p?._id || p?.id || '',
        doctorId: initialDoctorId || '',
        reason: '',
        type: 'Walk-In',
      };
      setErrorMessage('');
    } else {
      initialSnapshotRef.current = null;
    }
  }, [isOpen, defaultAction, initialPatient, initialDoctorId]);

  // Load doctors list on open
  useEffect(() => {
    if (!isOpen) return;
    async function fetchDoctors() {
      try {
        const res = await api.get('/users/doctors');
        const docList = res.data?.doctors || [];
        const primId = res.data?.primaryDoctorId;
        const primDoc =
          docList.find((d) => (d._id || d.id)?.toString() === primId?.toString()) ||
          docList.find((d) => d.isPrimary) ||
          docList[0];
        setDoctors(docList);
        setPrimaryDoctor(primDoc || null);

        // Pre-fill doctor: prioritize initialDoctorId -> logged-in user if doctor -> primaryDoctor
        const userDocId = user?.role === 'doctor' ? (user._id || user.id) : null;
        const fallbackDocId = initialDoctorId || userDocId || (primDoc ? (primDoc._id || primDoc.id) : (docList[0]?._id || docList[0]?.id || ''));

        setFormData((prev) => {
          const updatedDoc = prev.doctor || fallbackDocId;
          if (initialSnapshotRef.current && !initialSnapshotRef.current.doctorId) {
            initialSnapshotRef.current.doctorId = updatedDoc;
          }
          return {
            ...prev,
            doctor: updatedDoc,
          };
        });
      } catch (err) {
        console.error('Failed to load doctors list:', err);
      }
    }
    fetchDoctors();
  }, [isOpen, initialDoctorId, user]);

  const isDirty = useMemo(() => {
    if (!isOpen || !initialSnapshotRef.current) return false;
    const curPatientId = selectedPatient?._id || selectedPatient?.id || '';
    const initPatientId = initialSnapshotRef.current.patientId || '';
    if (curPatientId !== initPatientId) return true;

    if ((formData.reason || '').trim() !== (initialSnapshotRef.current.reason || '')) return true;
    if (formData.type !== (initialSnapshotRef.current.type || 'Walk-In')) return true;
    if (initialSnapshotRef.current.doctorId && formData.doctor && formData.doctor !== initialSnapshotRef.current.doctorId) return true;

    return false;
  }, [isOpen, selectedPatient, formData]);

  const {
    showConfirmModal,
    confirmLeave,
    handleStay,
    handleDiscard,
    resetDirty,
  } = useUnsavedChanges(isDirty);

  // Sync initialPatient if changed
  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
      setFormData((prev) => ({
        ...prev,
        patient: initialPatient._id || initialPatient.id || '',
      }));
    }
  }, [initialPatient]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedPatient) {
      const msg = 'Please select or search for a patient.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    const docId =
      formData.doctor ||
      (initialDoctorId || (primaryDoctor ? (primaryDoctor._id || primaryDoctor.id) : (doctors[0]?._id || doctors[0]?.id || '')));

    if (!docId) {
      const msg = 'Please select an assigned doctor.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    const isSchedule = formData.action === 'Schedule';

    if (isSchedule) {
      if (!formData.date || !formData.date.trim()) {
        const msg = 'Appointment Date is required for scheduled appointments.';
        setErrorMessage(msg);
        showError(msg);
        return;
      }
      if (!formData.time || !formData.time.trim()) {
        const msg = 'Appointment Time is required for scheduled appointments.';
        setErrorMessage(msg);
        showError(msg);
        return;
      }
    }

    setSubmitting(true);
    try {
      const { dateStr, timeStr } = getInitialExactDateTime();
      const patientId = selectedPatient._id || selectedPatient.id;
      const payload = {
        patient: patientId,
        doctor: docId,
        type: formData.type || 'Walk-In',
        reason: capitalizeWords(formData.reason || ''),
        status: isSchedule ? 'Scheduled' : 'Checked-In',
        date: isSchedule ? formData.date : dateStr,
        time: isSchedule ? formData.time : timeStr,
      };

      const res = await api.post('/appointments', payload);
      const newAppt = res.data?.appointment;
      const successMsg = isSchedule
        ? 'Appointment booked as Scheduled!'
        : 'Patient checked in successfully & added to doctor queue!';

      resetDirty();
      showSuccess(successMsg);
      if (onSuccess) {
        onSuccess(newAppt || payload);
      } else if (onClose) {
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create appointment';
      showError(msg);
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestClose = () => {
    if (!submitting && onClose) {
      confirmLeave(onClose);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleRequestClose();
    }
  };

  return createPortal(
    <div
      data-modal-backdrop="create-appointment"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-150 !m-0 !mt-0"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in zoom-in-95 duration-150 !mt-0 !my-0"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-3.5 bg-surface shrink-0">
          <h3 className="font-display text-base sm:text-lg font-bold text-ink">Book New Appointment</h3>
          <button
            type="button"
            onClick={handleRequestClose}
            className="rounded-lg p-1 text-ink-soft hover:text-ink hover:bg-bg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Patient Selector */}
            <PatientSearchInput
              selectedPatient={selectedPatient}
              onSelect={(p) => {
                setSelectedPatient(p);
                setFormData((prev) => ({ ...prev, patient: p?._id || p?.id || '' }));
              }}
              required
            />

            {/* Selected Patient Basic Details Card */}
            {selectedPatient && (
              <div className="p-3 rounded-xl bg-bg/50 border border-border text-xs space-y-1.5">
                <div className="flex items-center justify-between text-ink">
                  <span className="font-bold">
                    {formatPatientFullName(selectedPatient)}
                  </span>
                  <span className="badge bg-brand/10 text-brand font-mono font-bold text-[10px]">
                    OP #{selectedPatient.opNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-ink-soft text-[11px] flex-wrap">
                  {selectedPatient.age !== undefined && selectedPatient.age !== null && selectedPatient.age !== '' && (
                    <span>
                      Age: <strong className="text-ink">{formatAge(selectedPatient.age)}</strong>
                    </span>
                  )}
                  {selectedPatient.sex && (
                    <span>
                      Sex: <strong className="text-ink">{selectedPatient.sex}</strong>
                    </span>
                  )}
                  <span>
                    Type:{' '}
                    <strong className="text-ink">
                      {((selectedPatient.patientType || (Number(selectedPatient.age) < 12 ? 'child' : 'adult')) === 'child')
                        ? 'Child'
                        : 'Adult'}
                    </strong>
                  </span>
                  {(selectedPatient.primaryPhone || selectedPatient.phone) && (
                    <span>
                      Phone:{' '}
                      <strong className="text-ink">
                        {selectedPatient.primaryPhone || selectedPatient.phone}
                        {selectedPatient.secondaryPhone ? ` / ${selectedPatient.secondaryPhone}` : ''}
                      </strong>
                    </span>
                  )}
                </div>
                {selectedPatient.medicalHistory && selectedPatient.medicalHistory.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    <span className="text-[10px] text-ink-soft font-semibold">Medical:</span>
                    {selectedPatient.medicalHistory.map((m, idx) => (
                      <span key={idx} className="badge bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Doctor Selector */}
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Assigned Doctor <span className="text-rose-600">*</span>
              </label>
              <select
                className="input-field font-semibold bg-surface text-xs"
                value={
                  formData.doctor ||
                  (initialDoctorId ||
                    (primaryDoctor ? (primaryDoctor._id || primaryDoctor.id) : (doctors[0]?._id || doctors[0]?.id || '')))
                }
                onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
              >
                {doctors.map((d) => {
                  const docId = d._id || d.id;
                  const isPrimaryDoc = primaryDoctor && (primaryDoctor._id || primaryDoctor.id)?.toString() === docId?.toString();
                  const isCurrentDoc = user && (user._id || user.id)?.toString() === docId?.toString();
                  return (
                    <option key={docId} value={docId}>
                      Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}{' '}
                      {isCurrentDoc ? '• You' : isPrimaryDoc ? '• Primary Doctor' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Status / Initial Action Radio Group */}
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                Appointment Status / Action <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    formData.action === 'Schedule'
                      ? 'border-brand bg-brand/5 text-ink ring-1 ring-brand/30 shadow-xs'
                      : 'border-border bg-surface text-ink-soft hover:bg-bg'
                  }`}
                >
                  <input
                    type="radio"
                    name="appointmentActionModal"
                    value="Schedule"
                    checked={formData.action === 'Schedule'}
                    onChange={() => {
                      const { dateStr, timeStr } = getInitialExactDateTime();
                      setFormData((prev) => ({
                        ...prev,
                        action: 'Schedule',
                        date: prev.date || dateStr,
                        time: prev.time || timeStr,
                      }));
                    }}
                    className="w-4 h-4 text-brand focus:ring-brand accent-brand cursor-pointer shrink-0"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-sm font-bold text-ink">Schedule</span>
                    <span className="text-[11px] text-ink-soft">Pick date & time for a future visit</span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    formData.action === 'Check-in'
                      ? 'border-brand bg-brand/5 text-ink ring-1 ring-brand/30 shadow-xs'
                      : 'border-border bg-surface text-ink-soft hover:bg-bg'
                  }`}
                >
                  <input
                    type="radio"
                    name="appointmentActionModal"
                    value="Check-in"
                    checked={formData.action === 'Check-in'}
                    onChange={() => {
                      setFormData((prev) => ({
                        ...prev,
                        action: 'Check-in',
                      }));
                    }}
                    className="w-4 h-4 text-brand focus:ring-brand accent-brand cursor-pointer shrink-0"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-sm font-bold text-ink">Check-in</span>
                    <span className="text-[11px] text-ink-soft">Immediate visit — add to queue now</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Date & Time (Only rendered when Schedule action is selected) */}
            {formData.action === 'Schedule' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <DatePicker
                    label="Appointment Date"
                    isRequired={true}
                    value={formData.date}
                    onChange={(date, dateStr) => setFormData({ ...formData, date: dateStr })}
                  />
                </div>
                <div>
                  <SplitTimeInput
                    label="Appointment Time *"
                    value={formData.time}
                    onChange={(time12) => setFormData({ ...formData, time: time12 })}
                  />
                </div>
              </div>
            )}

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Booking Source / Type</label>
              <select
                className="input-field text-xs"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="Walk-In">Walk-In</option>
                <option value="Phone Booking">Phone Booking</option>
                <option value="Online Booking">Online Booking</option>
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Reason for Visit</label>
              <EditableCombobox
                options={TOOTH_CONDITIONS}
                placeholder="e.g. Toothache, Scaling, Root Canal follow-up, Mobility..."
                value={formData.reason}
                onChange={(val) => setFormData((prev) => ({ ...prev, reason: capitalizeWords(val) }))}
                inputClassName="text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-border bg-bg/50 shrink-0">
            <button
              type="button"
              disabled={submitting}
              className="btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleRequestClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              <span>
                {submitting
                  ? formData.action === 'Schedule'
                    ? 'Scheduling...'
                    : 'Checking In...'
                  : formData.action === 'Schedule'
                  ? 'Schedule Appointment'
                  : 'Check In Patient'}
              </span>
            </button>
          </div>
        </form>
      </div>

      <UnsavedChangesModal
        isOpen={showConfirmModal}
        onStay={handleStay}
        onDiscard={handleDiscard}
      />
    </div>,
    document.body
  );
}
