import { useState, useEffect } from 'react';
import {
  Pill, Plus, Trash2, Printer, FileText, X, Stethoscope, Save,
  Calendar, Clock, CalendarDays, CheckCircle2, AlertTriangle, Sparkles, Check, ChevronDown, ChevronUp, Lock
} from 'lucide-react';
import api from '../../../api/axios.js';
import { openPrescriptionPDFWindow } from '../../../utils/prescriptionPdfGenerator.js';
import ConfirmModal from '../../../components/common/ConfirmModal.jsx';
import DatePicker from '../../../components/common/DatePicker.jsx';
import SplitTimeInput from '../../../components/common/SplitTimeInput.jsx';
import EditableCombobox from '../../../components/common/EditableCombobox.jsx';
import { useNotification } from '../../../context/NotificationContext.jsx';
import { FOLLOW_UP_REASONS, PROCEDURE_TREATMENT_STATUSES } from '../../../constants/followUpOptions.js';
import { TOOTH_CONDITIONS } from '../../../constants/toothConditions.js';

export default function PrescriptionsTab({ consultation, isReadOnly = false }) {
  const consultationId = consultation?._id || consultation?.id;
  const patient = consultation?.patient || {};
  const patientId = patient?._id || patient?.id;
  const doctor = consultation?.doctor || {};
  const { showSuccess, showError } = useNotification();

  const [prescriptions, setPrescriptions] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [clinicSettings, setClinicSettings] = useState({
    clinicName: 'Sai Dental Clinic & Super-Specialty Center',
    address: '123 Healthcare Avenue, Medical District, City',
    phone: '+91 98765 43210',
    email: 'contact@sai-dentalclinic.com',
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deletingRx, setDeletingRx] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletingMedicineIndex, setDeletingMedicineIndex] = useState(null);

  // Print Modal State
  const [printingRx, setPrintingRx] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Dynamic Medicine Rows State
  const [medicines, setMedicines] = useState([]);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');

  // Follow-Up Scheduling State
  const [existingFollowUpId, setExistingFollowUpId] = useState(null);
  const [existingFollowUp, setExistingFollowUp] = useState(null);
  const [followUpScheduled, setFollowUpScheduled] = useState(false);
  const [enableFollowUp, setEnableFollowUp] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    recommendedDate: '',
    time: '10:00 AM',
    reason: '',
    instructions: '',
    treatmentStatus: '',
    notes: '',
  });
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpSuccessMsg, setFollowUpSuccessMsg] = useState('');
  const [followUpError, setFollowUpError] = useState('');

  const fetchData = async () => {
    if (!consultationId) return;
    try {
      setLoading(true);
      const [rxRes, diagRes, settingsRes, fuRes] = await Promise.all([
        api.get(`/prescriptions?consultation=${consultationId}`),
        api.get(`/diagnoses?consultation=${consultationId}`).catch(() => ({ data: { diagnoses: [] } })),
        api.get('/clinic-settings').catch(() => ({ data: {} })),
        api.get(`/follow-ups?consultation=${consultationId}`).catch(() => ({ data: { followUps: [] } })),
      ]);

      setPrescriptions(rxRes.data?.prescriptions || []);
      setDiagnoses(diagRes.data?.diagnoses || []);

      if (settingsRes.data?.settings) {
        setClinicSettings((prev) => ({ ...prev, ...settingsRes.data.settings }));
      }

      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      const defaultDateStr = defaultDate.toISOString().split('T')[0];

      const fuList = fuRes.data?.followUps || [];
      if (fuList.length > 0) {
        const fu = fuList[0];
        setExistingFollowUp(fu);
        setExistingFollowUpId(fu._id || fu.id);
        setFollowUpScheduled(true);
        setEnableFollowUp(true);
        const fuDateStr = fu.recommendedDate ? new Date(fu.recommendedDate).toISOString().split('T')[0] : defaultDateStr;
        const fuTimeStr = fu.scheduledAppointment?.time || '10:00 AM';
        setFollowUpForm({
          recommendedDate: fuDateStr,
          time: fuTimeStr,
          reason: fu.reason || '',
          instructions: fu.instructions || '',
          treatmentStatus: fu.treatmentStatus || '',
          notes: fu.notes || '',
        });
      } else {
        setExistingFollowUp(null);
        setExistingFollowUpId(null);
        setFollowUpScheduled(false);
        setEnableFollowUp(false);
        setFollowUpForm({
          recommendedDate: defaultDateStr,
          time: '10:00 AM',
          reason: '',
          instructions: '',
          treatmentStatus: '',
          notes: '',
        });
      }
    } catch (err) {
      console.error('Failed to load prescription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [consultationId]);

  const parseFrequencyPattern = (freqStr) => {
    if (!freqStr || typeof freqStr !== 'string') return [0, 0, 0];
    const parts = freqStr.split('-');
    if (parts.length === 3) {
      return [
        parts[0] === '1' ? 1 : 0,
        parts[1] === '1' ? 1 : 0,
        parts[2] === '1' ? 1 : 0,
      ];
    }
    return [0, 0, 0];
  };

  const handleToggleFreqSlot = (idx, slotIndex) => {
    if (isReadOnly) return;
    const current = parseFrequencyPattern(medicines[idx]?.frequency);
    current[slotIndex] = current[slotIndex] === 1 ? 0 : 1;
    const newFreqStr = `${current[0]}-${current[1]}-${current[2]}`;
    handleRowChange(idx, 'frequency', newFreqStr);
  };

  const handleAddRow = () => {
    if (isReadOnly) return;
    setMedicines((prev) => [
      ...prev,
      { medicine: '', dosage: '', frequency: '0-0-0', duration: '', instructions: 'After food' },
    ]);
  };

  const handleInitiateRemoveRow = (index) => {
    if (isReadOnly) return;
    const item = medicines[index];
    if (item && (item.medicine?.trim() || item.dosage?.trim() || item.duration?.trim())) {
      setDeletingMedicineIndex(index);
    } else {
      setMedicines((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const confirmDeleteMedicineRow = () => {
    if (deletingMedicineIndex !== null) {
      setMedicines((prev) => prev.filter((_, i) => i !== deletingMedicineIndex));
      setDeletingMedicineIndex(null);
    }
  };

  const handleRowChange = (index, field, value) => {
    if (isReadOnly) return;
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleSavePrescription = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    const validMedicines = medicines.filter((m) => m.medicine && m.medicine.trim());
    if (validMedicines.length === 0) {
      showError('Please add at least one medicine name.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        consultation: consultationId,
        patient: patientId,
        medicines: validMedicines,
        notes: prescriptionNotes ? prescriptionNotes.trim() : '',
      };

      const res = await api.post('/prescriptions', payload);
      showSuccess('Prescription recorded successfully!');

      setMedicines([]);
      setPrescriptionNotes('');

      fetchData();
      if (res.data?.prescription) {
        setPrintingRx(res.data.prescription);
        setShowPrintModal(true);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteRx = async () => {
    if (!deletingRx || isReadOnly) return;
    setDeleteLoading(true);
    const rxId = deletingRx._id || deletingRx.id;
    try {
      await api.delete(`/prescriptions/${rxId}`);
      showSuccess('Prescription entry deleted successfully.');
      setPrescriptions((prev) => prev.filter((rx) => (rx._id || rx.id) !== rxId));
      setDeletingRx(null);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete prescription.');
      setDeletingRx(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleQuickPresetDate = (daysToAdd) => {
    if (isReadOnly) return;
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const dateStr = d.toISOString().split('T')[0];
    setFollowUpForm((prev) => ({ ...prev, recommendedDate: dateStr }));
    setEnableFollowUp(true);
  };

  const handleSaveFollowUp = async (e) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;

    if (!followUpForm.recommendedDate) {
      setFollowUpError('Please select a recommended follow-up date.');
      return;
    }
    if (!followUpForm.reason.trim()) {
      setFollowUpError('Please enter or select a reason / procedure for the follow-up.');
      return;
    }

    setFollowUpSubmitting(true);
    setFollowUpError('');
    setFollowUpSuccessMsg('');

    try {
      const payload = {
        followUpId: existingFollowUpId,
        patient: patientId,
        doctor: doctor?._id || doctor?.id || consultation?.doctor?._id || consultation?.doctor,
        consultation: consultationId,
        recommendedDate: followUpForm.recommendedDate,
        time: followUpForm.time || '10:00 AM',
        reason: followUpForm.reason.trim(),
        instructions: followUpForm.instructions ? followUpForm.instructions.trim() : '',
        treatmentStatus: followUpForm.treatmentStatus ? followUpForm.treatmentStatus.trim() : '',
        notes: followUpForm.notes ? followUpForm.notes.trim() : '',
      };

      let res;
      if (existingFollowUpId) {
        res = await api.put(`/follow-ups/${existingFollowUpId}`, payload);
      } else {
        res = await api.post('/follow-ups', payload);
      }

      const saved = res.data?.followUp;
      setExistingFollowUp(saved);
      setExistingFollowUpId(saved?._id || saved?.id || existingFollowUpId);
      setFollowUpScheduled(true);
      const isUpdate = Boolean(existingFollowUpId);
      setFollowUpSuccessMsg(
        isUpdate
          ? 'Follow-up appointment updated successfully!'
          : 'Next follow-up appointment scheduled successfully!'
      );
      showSuccess(isUpdate ? 'Follow-up updated successfully!' : 'Follow-up scheduled successfully!');
      setTimeout(() => setFollowUpSuccessMsg(''), 4000);
      fetchData();
    } catch (err) {
      console.error('Failed to save follow-up:', err);
      const msg = err.response?.data?.message || 'Failed to schedule follow-up.';
      setFollowUpError(msg);
      showError(msg);
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  const handleGeneratePDFWindow = (rxToPrint) => {
    const rxObj = rxToPrint || printingRx;
    if (!rxObj) return;
    openPrescriptionPDFWindow({
      rx: rxObj,
      consultation,
      clinicSettings,
      diagnoses,
    });
  };

  const triggerBrowserPrint = () => {
    if (printingRx) {
      openPrescriptionPDFWindow(
        {
          rx: printingRx,
          consultation,
          clinicSettings,
          diagnoses,
        },
        true
      );
    } else {
      window.print();
    }
  };

  const patientFullName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';
  const attendingDoctorName = printingRx?.recordedBy?.name || doctor.name || 'Medical Practitioner';
  const doctorSpecialization = printingRx?.recordedBy?.specialization || doctor.specialization || 'BDS, MDS - Dental Specialist';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: PRESCRIPTIONS FORM & HISTORY (7 COLS) */}
      <div className="lg:col-span-7 space-y-6 min-w-0">
        {/* FORM: REPEATABLE MEDICINES PRESCRIPTION FORM (Hidden when read-only) */}
        {!isReadOnly && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                <Pill size={18} className="text-brand" /> Save Prescription (Rx)
              </h3>
              <p className="text-xs text-ink-soft">
                Add medicine items with dosage, frequency, duration, instructions, and general notes.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              className="btn-secondary text-xs flex items-center gap-1"
            >
              <Plus size={14} /> Add Medicine Row
            </button>
          </div>

          <form onSubmit={handleSavePrescription} className="space-y-4">
            <div className="border border-border rounded-xl bg-bg/30 overflow-hidden flex flex-col">
              {/* Table Header (Desktop Only) */}
              <div className="hidden md:block p-3 pb-2 border-b border-border/50 bg-bg/60">
                <div className="grid grid-cols-12 gap-2 text-xs font-bold text-ink-soft uppercase px-1">
                  <span className="col-span-3">Medicine Name *</span>
                  <span className="col-span-2">Dosage</span>
                  <span className="col-span-3 text-center">Frequency (1 - 0 - 1)</span>
                  <span className="col-span-2">Duration</span>
                  <span className="col-span-2">Instructions</span>
                </div>
              </div>

              {/* Scrollable Medicines Container */}
              <div
                className="p-3 space-y-3 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {medicines.length === 0 ? (
                  <div className="py-6 text-center text-xs text-ink-soft italic">
                    No medicines added yet. Click the <span className="font-bold text-brand">+ Add Medicine Row</span> button below to add medicine.
                  </div>
                ) : (
                  medicines.map((item, idx) => {
                    const freqPattern = parseFrequencyPattern(item.frequency);
                    return (
                      <div key={idx}>
                        {/* Desktop Grid View (≥768px) */}
                        <div className="hidden md:grid grid-cols-12 gap-2 items-center text-xs">
                          <div className="col-span-3">
                            <input
                              type="text"
                              autoComplete="off"
                              className="input-field py-1.5 text-xs"
                              placeholder="Medicine Name (e.g. Amoxicillin)"
                              value={item.medicine}
                              onChange={(e) => handleRowChange(idx, 'medicine', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              autoComplete="off"
                              className="input-field py-1.5 text-xs"
                              placeholder="Dosage (500 mg)"
                              value={item.dosage}
                              onChange={(e) => handleRowChange(idx, 'dosage', e.target.value)}
                            />
                          </div>
                          <div className="col-span-3 flex items-center justify-center">
                            <div className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1 text-xs font-bold shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleToggleFreqSlot(idx, 0)}
                                title="Morning Slot (1 or 0)"
                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all duration-150 ${
                                  freqPattern[0] === 1
                                    ? 'bg-brand text-white shadow-xs'
                                    : 'text-ink-soft hover:text-ink bg-bg'
                                }`}
                              >
                                {freqPattern[0]}
                              </button>
                              <span className="text-ink-soft/40 font-mono text-xs select-none font-bold">-</span>
                              <button
                                type="button"
                                onClick={() => handleToggleFreqSlot(idx, 1)}
                                title="Afternoon Slot (1 or 0)"
                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all duration-150 ${
                                  freqPattern[1] === 1
                                    ? 'bg-brand text-white shadow-xs'
                                    : 'text-ink-soft hover:text-ink bg-bg'
                                }`}
                              >
                                {freqPattern[1]}
                              </button>
                              <span className="text-ink-soft/40 font-mono text-xs select-none font-bold">-</span>
                              <button
                                type="button"
                                onClick={() => handleToggleFreqSlot(idx, 2)}
                                title="Night Slot (1 or 0)"
                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all duration-150 ${
                                  freqPattern[2] === 1
                                    ? 'bg-brand text-white shadow-xs'
                                    : 'text-ink-soft hover:text-ink bg-bg'
                                }`}
                              >
                                {freqPattern[2]}
                              </button>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              autoComplete="off"
                              className="input-field py-1.5 text-xs"
                              placeholder="Duration (5 days)"
                              value={item.duration}
                              onChange={(e) => handleRowChange(idx, 'duration', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-between gap-1 min-w-0">
                            <select
                              className="input-field py-1.5 text-xs font-semibold w-full min-w-0 truncate"
                              value={item.instructions || 'After food'}
                              onChange={(e) => handleRowChange(idx, 'instructions', e.target.value)}
                            >
                              <option value="Before food">Before food</option>
                              <option value="After food">After food</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleInitiateRemoveRow(idx)}
                              className="p-1 text-ink-soft hover:text-rose-600 shrink-0"
                              title="Remove medicine"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Mobile Stacked Card View (<768px down to 320px) */}
                        <div className="block md:hidden p-3 bg-surface border border-border rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
                              Medicine #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleInitiateRemoveRow(idx)}
                              className="p-1 text-ink-soft hover:text-rose-600 shrink-0"
                              title="Remove medicine"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-ink-soft mb-0.5 uppercase">
                                Medicine Name *
                              </label>
                              <input
                                type="text"
                                autoComplete="off"
                                className="input-field py-1.5 text-xs w-full"
                                placeholder="Medicine Name (e.g. Amoxicillin)"
                                value={item.medicine}
                                onChange={(e) => handleRowChange(idx, 'medicine', e.target.value)}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-ink-soft mb-0.5 uppercase">
                                  Dosage
                                </label>
                                <input
                                  type="text"
                                  autoComplete="off"
                                  className="input-field py-1.5 text-xs w-full"
                                  placeholder="500 mg"
                                  value={item.dosage}
                                  onChange={(e) => handleRowChange(idx, 'dosage', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-ink-soft mb-0.5 uppercase">
                                  Duration
                                </label>
                                <input
                                  type="text"
                                  autoComplete="off"
                                  className="input-field py-1.5 text-xs w-full"
                                  placeholder="5 days"
                                  value={item.duration}
                                  onChange={(e) => handleRowChange(idx, 'duration', e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 items-end">
                              <div>
                                <label className="block text-[10px] font-semibold text-ink-soft mb-0.5 uppercase text-center">
                                  Frequency
                                </label>
                                <div className="inline-flex items-center justify-center w-full gap-1 rounded-xl border border-border bg-surface px-2 py-1 text-xs font-bold shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFreqSlot(idx, 0)}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                                      freqPattern[0] === 1 ? 'bg-brand text-white' : 'text-ink-soft bg-bg'
                                    }`}
                                  >
                                    {freqPattern[0]}
                                  </button>
                                  <span className="text-ink-soft/40 font-mono text-xs font-bold">-</span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFreqSlot(idx, 1)}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                                      freqPattern[1] === 1 ? 'bg-brand text-white' : 'text-ink-soft bg-bg'
                                    }`}
                                  >
                                    {freqPattern[1]}
                                  </button>
                                  <span className="text-ink-soft/40 font-mono text-xs font-bold">-</span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFreqSlot(idx, 2)}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                                      freqPattern[2] === 1 ? 'bg-brand text-white' : 'text-ink-soft bg-bg'
                                    }`}
                                  >
                                    {freqPattern[2]}
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-ink-soft mb-0.5 uppercase">
                                  Instructions
                                </label>
                                <select
                                  className="input-field py-1.5 text-xs font-semibold w-full"
                                  value={item.instructions || 'After food'}
                                  onChange={(e) => handleRowChange(idx, 'instructions', e.target.value)}
                                >
                                  <option value="Before food">Before food</option>
                                  <option value="After food">After food</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Fixed Bottom + Add Medicine Row Button */}
              <div className="p-3 pt-2 bg-surface border-t border-border/50">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="w-full py-2.5 border-2 border-dashed border-brand/30 hover:border-brand hover:bg-brand-light/20 text-brand font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus size={16} /> Add Medicine Row
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Prescription Notes</label>
              <textarea
                rows={2}
                className="input-field text-xs"
                placeholder="General instructions for the patient..."
                value={prescriptionNotes}
                onChange={(e) => setPrescriptionNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-1">
              <button type="submit" disabled={submitting} className="btn-primary">
                <Save size={16} />
                <span>{submitting ? 'Saving Prescription...' : 'Save Prescription'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SAVED PRESCRIPTIONS LIST */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-ink">
              Prescription History ({prescriptions.length})
            </h3>
            <p className="text-xs text-ink-soft">
              Medical prescriptions recorded for this visit. Click Print for print-ready A4 document.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-ink-soft">Loading prescriptions...</div>
        ) : prescriptions.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-soft space-y-2">
            <Pill size={28} className="mx-auto text-ink-soft/40" />
            <p className="font-semibold text-ink">No prescription history available.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {prescriptions.map((rx) => {
              const rxId = rx._id || rx.id;
              const dateStr = rx.createdAt
                ? new Date(rx.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
                : 'N/A';

              return (
                <div
                  key={rxId}
                  className="rounded-2xl border border-border p-5 bg-surface shadow-sm space-y-4 font-sans"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xl font-black text-brand tracking-tighter">Rx</span>
                        <span className="text-xs font-bold text-ink">Medical Prescription</span>
                      </div>
                      <p className="text-[11px] text-ink-soft">
                        Issued by: <strong>Dr. {rx.recordedBy?.name || doctor.name}</strong>{' '}
                        {rx.recordedBy?.specialization ? `(${rx.recordedBy.specialization})` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <span className="text-xs font-semibold text-ink mr-1">{dateStr}</span>
                      <button
                        type="button"
                        onClick={() => openPrescriptionPDFWindow({ rx, consultation, clinicSettings, diagnoses }, true)}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
                      >
                        <Printer size={14} /> Print
                      </button>

                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => setDeletingRx(rx)}
                          title="Delete Prescription"
                          className="p-1.5 text-ink-soft hover:text-rose-600 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Medicines Table */}
                  <div className="overflow-x-auto scrollbar-none">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Medicine Name</th>
                          <th className="px-3 py-2">Dosage</th>
                          <th className="px-3 py-2">Frequency</th>
                          <th className="px-3 py-2">Duration</th>
                          <th className="px-3 py-2">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {rx.medicines?.map((m, idx) => (
                          <tr key={idx} className="hover:bg-bg/40">
                            <td className="px-3 py-2.5 font-bold text-ink-soft">{idx + 1}</td>
                            <td className="px-3 py-2.5 font-bold text-ink">{m.medicine}</td>
                            <td className="px-3 py-2.5 text-ink-soft">{m.dosage || '—'}</td>
                            <td className="px-3 py-2.5 font-mono text-brand font-bold">{m.frequency || '—'}</td>
                            <td className="px-3 py-2.5 text-ink-soft">{m.duration || '—'}</td>
                            <td className="px-3 py-2.5 text-ink-soft italic">{m.instructions || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {rx.notes && (
                    <div className="text-xs text-ink-soft italic bg-bg/50 p-2.5 rounded-lg border border-border/50">
                      <span className="font-semibold text-ink not-italic">Prescription Notes: </span>
                      {rx.notes}
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: SCHEDULE NEXT FOLLOW-UP SECTION (5 COLS) */}
      <div className="lg:col-span-5 space-y-6 min-w-0 lg:sticky lg:top-4">
        {/* SCHEDULE NEXT FOLLOW-UP SECTION */}
        <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Calendar className="text-brand shrink-0" size={18} /> Schedule Next Follow-Up
            </h3>
            <p className="text-xs text-ink-soft">
              Set or update the patient's next clinical visit, planned procedure, and post-op recall instructions.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {followUpScheduled ? (
              <span className="badge bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 py-1 px-2.5 shadow-2xs">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>
                  Follow-up: {new Date(followUpForm.recommendedDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })} • {followUpForm.time || '10:00 AM'}
                </span>
              </span>
            ) : (
              <span className="badge bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold py-1 px-2.5">
                No Follow-Up Scheduled
              </span>
            )}
          </div>
        </div>

        {/* Read-Only State Display */}
        {isReadOnly ? (
          followUpScheduled ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Calendar size={14} className="text-emerald-600" /> Recommended Date & Time:
                </span>
                <span className="font-mono font-bold text-ink bg-surface px-2.5 py-1 rounded-lg border border-emerald-200">
                  {new Date(followUpForm.recommendedDate).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })} at {followUpForm.time || '10:00 AM'}
                </span>
              </div>
              {followUpForm.reason && (
                <div>
                  <span className="font-semibold text-ink-soft">Reason / Procedure: </span>
                  <span className="font-bold text-ink">{followUpForm.reason}</span>
                </div>
              )}
              {followUpForm.treatmentStatus && (
                <div>
                  <span className="font-semibold text-ink-soft">Procedure Status Note: </span>
                  <span className="text-ink">{followUpForm.treatmentStatus}</span>
                </div>
              )}
              {followUpForm.instructions && (
                <div>
                  <span className="font-semibold text-ink-soft">Patient Instructions: </span>
                  <span className="italic text-ink">{followUpForm.instructions}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-soft italic p-3 text-center bg-bg/40 rounded-xl border border-border">
              No follow-up appointment was scheduled during this consultation.
            </p>
          )
        ) : (
          /* Editable Follow-Up Form */
          <form onSubmit={handleSaveFollowUp} className="space-y-4">
            {followUpSuccessMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 border border-emerald-200 animate-fadeIn">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{followUpSuccessMsg}</span>
              </div>
            )}

            {followUpError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200 animate-fadeIn">
                <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                <span>{followUpError}</span>
              </div>
            )}

            {/* Quick Presets Bar */}
            <div className="space-y-2 p-3 bg-bg/60 rounded-xl border border-border">
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <Clock size={14} className="text-brand shrink-0" />
                <span>Quick Date Presets:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '+3 Days', days: 3 },
                  { label: '+1 Week', days: 7 },
                  { label: '+2 Weeks', days: 14 },
                  { label: '+1 Month', days: 30 },
                  { label: '+3 Months', days: 90 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleQuickPresetDate(preset.days)}
                    className="flex-1 min-w-[70px] py-1.5 px-2 text-center text-xs font-bold rounded-lg border bg-surface hover:bg-brand-light/40 border-border hover:border-brand/40 text-ink transition-colors shadow-2xs whitespace-nowrap"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3.5">
              <div>
                <DatePicker
                  label="Recommended Follow-Up Date"
                  isRequired={true}
                  value={followUpForm.recommendedDate}
                  onChange={(date, dateStr) => setFollowUpForm((prev) => ({ ...prev, recommendedDate: dateStr }))}
                  minDate={new Date()}
                />
              </div>

              <div>
                <SplitTimeInput
                  label="Appointment Time Slot"
                  value={followUpForm.time || '10:00 AM'}
                  onChange={(time12) => setFollowUpForm((prev) => ({ ...prev, time: time12 }))}
                />
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-soft flex items-center justify-between flex-wrap gap-1">
                  <span>Reason / Procedure *</span>
                  <span className="text-[11px] text-brand font-medium">Dropdown or custom typing</span>
                </label>
                <EditableCombobox
                  options={[...FOLLOW_UP_REASONS, ...TOOTH_CONDITIONS]}
                  placeholder="e.g. Suture Removal, RCT Next Step, Crown Fit..."
                  value={followUpForm.reason}
                  onChange={(val) => setFollowUpForm((prev) => ({ ...prev, reason: val }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-soft flex items-center justify-between flex-wrap gap-1">
                  <span>Procedure / Treatment Status Note</span>
                  <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                </label>
                <EditableCombobox
                  options={PROCEDURE_TREATMENT_STATUSES}
                  placeholder="e.g. RCT Step 1 Done, Temp Crown Placed..."
                  value={followUpForm.treatmentStatus}
                  onChange={(val) => setFollowUpForm((prev) => ({ ...prev, treatmentStatus: val }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink-soft">
                Patient Instructions & Clinical Notes <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
              </label>
              <textarea
                rows={3}
                className="input-field text-xs py-2 min-h-[64px] resize-y"
                placeholder="e.g. Continue warm saline rinses. Avoid hard chewing on the left side until next sitting..."
                value={followUpForm.instructions}
                onChange={(e) => setFollowUpForm((prev) => ({ ...prev, instructions: e.target.value }))}
              />
            </div>

            <div className="space-y-2.5 pt-2 border-t border-border/50">
              <button
                type="submit"
                disabled={followUpSubmitting}
                className="btn-primary w-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-sm whitespace-nowrap transition-all"
              >
                <Save size={15} className="shrink-0" />
                <span>
                  {followUpSubmitting
                    ? 'Saving Follow-Up...'
                    : existingFollowUpId
                    ? 'Update Follow-Up'
                    : 'Save & Schedule Follow-Up'}
                </span>
              </button>

              <p className="text-[11px] text-ink-soft italic text-center">
                {existingFollowUpId
                  ? 'ℹ️ Updates the patient\'s scheduled follow-up and appointment without duplicate entries.'
                  : 'ℹ️ Creates a follow-up record and synchronized appointment for receptionist and doctor schedule.'}
              </p>
            </div>
          </form>
        )}
      </div>
    </div>

      {/* CONFIRM DELETE RX MODAL */}
      <ConfirmModal
        isOpen={Boolean(deletingRx)}
        onClose={() => setDeletingRx(null)}
        onConfirm={confirmDeleteRx}
        title="Confirm Delete Prescription"
        message="Are you sure you want to delete this prescription entry? It will be safely archived."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleteLoading}
      />

      {/* CONFIRM DELETE MEDICINE ROW MODAL */}
      <ConfirmModal
        isOpen={deletingMedicineIndex !== null}
        onClose={() => setDeletingMedicineIndex(null)}
        onConfirm={confirmDeleteMedicineRow}
        title="Confirm Delete Medicine"
        message={
          deletingMedicineIndex !== null && medicines[deletingMedicineIndex]?.medicine?.trim()
            ? `Are you sure you want to remove "${medicines[deletingMedicineIndex].medicine.trim()}" from this prescription?`
            : 'Are you sure you want to remove this medicine item from the prescription?'
        }
        confirmText="Delete Medicine"
        cancelText="Cancel"
        variant="delete"
      />
    </div>
  );
}
