import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Pill, Plus, Trash2, Save, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../api/axios.js';
import ConfirmModal from './ConfirmModal.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

const COMMON_DURATIONS = ['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '1 Month'];
const INSTRUCTION_OPTIONS = ['Before Food', 'After Food'];

export default function PrescriptionEditModal({
  isOpen,
  prescription = null,
  patientId = null,
  consultationId = null,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const { showSuccess, showError } = useNotification();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingMedicineIndex, setDeletingMedicineIndex] = useState(null);

  const [medicines, setMedicines] = useState([
    { medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After Food' },
  ]);
  const [notes, setNotes] = useState('');

  const parseFrequencyPattern = (freqStr) => {
    if (!freqStr || typeof freqStr !== 'string') return [1, 0, 1];
    const clean = freqStr.split(' ')[0].trim();
    const parts = clean.split('-');
    if (parts.length === 3) {
      return [
        parts[0] === '1' ? 1 : 0,
        parts[1] === '1' ? 1 : 0,
        parts[2] === '1' ? 1 : 0,
      ];
    }
    return [1, 0, 1];
  };

  const handleToggleFreqSlot = (idx, slotIndex) => {
    const current = parseFrequencyPattern(medicines[idx]?.frequency);
    current[slotIndex] = current[slotIndex] === 1 ? 0 : 1;
    const newFreqStr = `${current[0]}-${current[1]}-${current[2]}`;
    handleMedicineChange(idx, 'frequency', newFreqStr);
  };

  useEffect(() => {
    if (prescription) {
      setMedicines(
        Array.isArray(prescription.medicines) && prescription.medicines.length > 0
          ? prescription.medicines.map((m) => ({
              medicine: m.medicine || '',
              dosage: m.dosage || '',
              frequency: m.frequency || '1-0-1',
              duration: m.duration || '5 Days',
              instructions: m.instructions || 'After Food',
            }))
          : [{ medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After Food' }]
      );
      setNotes(prescription.notes || '');
    } else {
      setMedicines([
        { medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After Food' },
      ]);
      setNotes('');
    }
    setErrorMessage('');
  }, [prescription, isOpen]);

  if (!isOpen) return null;

  const isEditMode = Boolean(prescription && (prescription._id || prescription.id));
  const rxId = prescription?._id || prescription?.id;

  const handleAddMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      { medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After Food' },
    ]);
  };

  const handleInitiateRemoveRow = (index) => {
    const item = medicines[index];
    if (item && (item.medicine?.trim() || item.dosage?.trim() || item.duration?.trim())) {
      setDeletingMedicineIndex(index);
    } else {
      if (medicines.length <= 1) {
        setMedicines([{ medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After Food' }]);
      } else {
        setMedicines((prev) => prev.filter((_, i) => i !== index));
      }
    }
  };

  const confirmDeleteMedicineRow = () => {
    if (deletingMedicineIndex !== null) {
      if (medicines.length <= 1) {
        setMedicines([{ medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After Food' }]);
      } else {
        setMedicines((prev) => prev.filter((_, i) => i !== deletingMedicineIndex));
      }
      setDeletingMedicineIndex(null);
    }
  };

  const handleMedicineChange = (index, field, value) => {
    setMedicines((prev) => {
      const updated = [...medicines];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');

    const validMedicines = medicines
      .map((m) => ({
        medicine: m.medicine.trim(),
        dosage: (m.dosage || '').trim(),
        frequency: m.frequency.trim(),
        duration: m.duration.trim(),
        instructions: m.instructions.trim(),
      }))
      .filter((m) => m.medicine);

    if (validMedicines.length === 0) {
      setErrorMessage('Please provide at least one medicine name.');
      setSaving(false);
      return;
    }

    try {
      if (isEditMode) {
        const res = await api.put(`/prescriptions/${rxId}`, {
          medicines: validMedicines,
          notes: notes.trim(),
        });
        showSuccess('Prescription record updated successfully!');
        onSuccess(res.data?.prescription);
      } else {
        const res = await api.post('/prescriptions', {
          patient: patientId,
          consultation: consultationId,
          medicines: validMedicines,
          notes: notes.trim(),
        });
        showSuccess('New prescription added successfully!');
        onSuccess(res.data?.prescription);
      }
      onClose();
    } catch (err) {
      console.error('Error saving prescription:', err);
      const msg = err.response?.data?.message || 'Failed to save prescription.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-150 !mt-0">
      <div className="card w-full max-w-3xl sm:max-w-4xl lg:max-w-5xl max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl border border-border animate-in zoom-in-95 duration-150 !mt-0 !my-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-3.5 bg-surface shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold shrink-0">
              <Pill size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-lg font-bold text-ink">
                {isEditMode ? 'Edit Patient Prescription Record' : 'Add New Prescription / Medication Entry'}
              </h3>
              <p className="text-[11px] text-ink-soft truncate">
                Prescribe medications, specify frequencies (1-0-1), durations, and instructions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1 text-ink-soft hover:text-ink hover:bg-bg transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0 !mt-0 !mb-0">
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Repeatable Medicines Rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/80 pb-2">
                <h4 className="font-bold text-ink text-xs uppercase tracking-wider text-brand">
                  Prescribed Medicines
                </h4>
                <button
                  type="button"
                  onClick={handleAddMedicineRow}
                  className="btn-secondary py-1 px-2.5 text-xs font-semibold flex items-center gap-1 hover:border-brand hover:text-brand"
                >
                  <Plus size={13} /> Add Medicine
                </button>
              </div>

              <div className="space-y-2.5">
                {medicines.map((item, idx) => {
                  const freqPattern = parseFrequencyPattern(item.frequency);

                  return (
                    <div key={idx} className="card p-2.5 sm:p-3 bg-bg/40 border border-border space-y-2 relative transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] text-ink uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[9px] font-bold">
                            {idx + 1}
                          </span>
                          Medicine #{idx + 1}
                        </span>
                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleInitiateRemoveRow(idx)}
                            className="text-rose-600 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition-colors flex items-center gap-1 text-[10px] font-medium"
                            title="Remove Medicine"
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      {/* Single Row on md/lg, responsive stack on mobile */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                        {/* Medicine Name */}
                        <div className="md:col-span-4">
                          <label className="block text-[10px] font-bold text-ink-soft uppercase mb-0.5">
                            Medicine Name <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="input-field py-1 text-xs font-semibold w-full"
                            placeholder="e.g. Amoxicillin, Paracetamol"
                            value={item.medicine}
                            onChange={(e) => handleMedicineChange(idx, 'medicine', e.target.value)}
                          />
                        </div>

                        {/* Frequency (Interactive toggle + Quick presets without SOS) */}
                        <div className="md:col-span-4">
                          <label className="block text-[10px] font-bold text-ink-soft uppercase mb-0.5">
                            Frequency (1 - 0 - 1)
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* 3-Slot Interactive Toggle */}
                            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-1.5 py-0.5 text-xs font-bold shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleToggleFreqSlot(idx, 0)}
                                title="Morning Slot (1 or 0)"
                                className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] transition-all duration-150 ${
                                  freqPattern[0] === 1
                                    ? 'bg-brand text-white shadow-xs'
                                    : 'text-ink-soft hover:text-ink bg-bg'
                                }`}
                              >
                                {freqPattern[0]}
                              </button>
                              <span className="text-ink-soft/40 font-mono text-[10px] select-none font-bold">-</span>
                              <button
                                type="button"
                                onClick={() => handleToggleFreqSlot(idx, 1)}
                                title="Afternoon Slot (1 or 0)"
                                className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] transition-all duration-150 ${
                                  freqPattern[1] === 1
                                    ? 'bg-brand text-white shadow-xs'
                                    : 'text-ink-soft hover:text-ink bg-bg'
                                }`}
                              >
                                {freqPattern[1]}
                              </button>
                              <span className="text-ink-soft/40 font-mono text-[10px] select-none font-bold">-</span>
                              <button
                                type="button"
                                onClick={() => handleToggleFreqSlot(idx, 2)}
                                title="Night Slot (1 or 0)"
                                className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] transition-all duration-150 ${
                                  freqPattern[2] === 1
                                    ? 'bg-brand text-white shadow-xs'
                                    : 'text-ink-soft hover:text-ink bg-bg'
                                }`}
                              >
                                {freqPattern[2]}
                              </button>
                            </div>

                            {/* Quick Preset Buttons (SOS hidden) */}
                            <div className="flex items-center gap-1">
                              {['1-0-1', '1-1-1', '1-0-0', '0-0-1'].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => handleMedicineChange(idx, 'frequency', preset)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                    item.frequency === preset
                                      ? 'bg-brand-light text-brand border-brand font-extrabold'
                                      : 'bg-surface text-ink-soft border-border hover:border-brand/40'
                                  }`}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Duration */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-ink-soft uppercase mb-0.5">
                            Duration
                          </label>
                          <input
                            type="text"
                            list="duration-options"
                            className="input-field py-1 text-xs w-full"
                            placeholder="e.g. 5 Days"
                            value={item.duration}
                            onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                          />
                        </div>

                        {/* Instructions Dropdown (Before Food / After Food) */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-ink-soft uppercase mb-0.5">
                            Instructions
                          </label>
                          <select
                            className="input-field py-1 text-xs font-semibold w-full"
                            value={
                              item.instructions?.toLowerCase() === 'before food'
                                ? 'Before Food'
                                : item.instructions?.toLowerCase() === 'after food'
                                ? 'After Food'
                                : item.instructions || 'After Food'
                            }
                            onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                          >
                            <option value="Before Food">Before Food</option>
                            <option value="After Food">After Food</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Datalists for quick completion */}
              <datalist id="duration-options">
                {COMMON_DURATIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            {/* Prescription Notes */}
            <div className="card p-3.5 bg-bg/40 space-y-2 border border-border">
              <label className="block font-bold text-ink text-xs uppercase tracking-wider text-brand">
                Clinical Notes / General Instructions
              </label>
              <textarea
                rows={2}
                className="input-field text-xs"
                placeholder="Additional advice, dietary precautions, follow-up timeline..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-border px-4 py-3 sm:px-6 sm:py-3.5 bg-bg/50 shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="btn-secondary text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>{saving ? 'Saving...' : isEditMode ? 'Save Prescription Changes' : 'Record Prescription'}</span>
            </button>
          </div>
        </form>
      </div>

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
    </div>,
    document.body
  );
}
