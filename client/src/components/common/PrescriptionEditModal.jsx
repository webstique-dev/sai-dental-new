import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Pill, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';
import api from '../../api/axios.js';
import { useNotification } from '../../context/NotificationContext.jsx';

const COMMON_DURATIONS = ['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '1 Month'];
const COMMON_INSTRUCTIONS = ['After food', 'Before food', 'With water', 'At bedtime', 'Apply locally on gums', 'Rinse & Spit (Do not swallow)'];

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

  const [medicines, setMedicines] = useState([
    { medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After food' },
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
              instructions: m.instructions || 'After food',
            }))
          : [{ medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After food' }]
      );
      setNotes(prescription.notes || '');
    } else {
      setMedicines([
        { medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After food' },
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
      { medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After food' },
    ]);
  };

  const handleRemoveMedicineRow = (index) => {
    if (medicines.length <= 1) {
      setMedicines([{ medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After food' }]);
      return;
    }
    setMedicines((prev) => prev.filter((_, i) => i !== index));
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
        dosage: m.dosage.trim(),
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
      <div className="card w-full max-w-3xl sm:max-w-4xl max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl border border-border animate-in zoom-in-95 duration-150 !mt-0 !my-0">
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
                Prescribe medications, adjust dosages, specify frequencies (1-0-1), durations, and instructions
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
                  Prescribed Medicines & Dosages
                </h4>
                <button
                  type="button"
                  onClick={handleAddMedicineRow}
                  className="btn-secondary py-1 px-2.5 text-xs font-semibold flex items-center gap-1 hover:border-brand hover:text-brand"
                >
                  <Plus size={13} /> Add Medicine
                </button>
              </div>

              <div className="space-y-3">
                {medicines.map((item, idx) => {
                  const freqPattern = parseFrequencyPattern(item.frequency);

                  return (
                    <div key={idx} className="card p-3.5 bg-bg/40 border border-border space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-ink uppercase tracking-wider">
                          Medicine #{idx + 1}
                        </span>
                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(idx)}
                            className="text-rose-600 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                            title="Remove Medicine"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                        {/* Medicine Name */}
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-ink-soft uppercase mb-1">
                            Medicine Name <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="input-field py-1.5 text-xs font-semibold"
                            placeholder="e.g. Amoxicillin, Paracetamol"
                            value={item.medicine}
                            onChange={(e) => handleMedicineChange(idx, 'medicine', e.target.value)}
                          />
                        </div>

                        {/* Dosage */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-ink-soft uppercase mb-1">
                            Dosage
                          </label>
                          <input
                            type="text"
                            className="input-field py-1.5 text-xs"
                            placeholder="e.g. 500 mg, 1 tab"
                            value={item.dosage}
                            onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                          />
                        </div>

                        {/* Frequency (Doctor Frequency UI matching Start Consultation) */}
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-bold text-ink-soft uppercase mb-1">
                            Frequency (1 - 0 - 1)
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* 3-Slot Interactive Toggle */}
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

                            {/* Quick Preset Buttons */}
                            <div className="flex items-center gap-1">
                              {['1-0-1', '1-1-1', '1-0-0', '0-0-1', 'SOS'].map((preset) => (
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
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-ink-soft uppercase mb-1">
                            Duration
                          </label>
                          <input
                            type="text"
                            list="duration-options"
                            className="input-field py-1.5 text-xs"
                            placeholder="e.g. 5 Days"
                            value={item.duration}
                            onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                          />
                        </div>

                        {/* Instructions */}
                        <div className="sm:col-span-8">
                          <label className="block text-[10px] font-bold text-ink-soft uppercase mb-1">
                            Instructions / Special Advice
                          </label>
                          <input
                            type="text"
                            list="instruction-options"
                            className="input-field py-1.5 text-xs"
                            placeholder="e.g. After food, Take with warm water..."
                            value={item.instructions}
                            onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                          />
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
              <datalist id="instruction-options">
                {COMMON_INSTRUCTIONS.map((ins) => (
                  <option key={ins} value={ins} />
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
              className="btn-primary text-xs font-bold flex items-center gap-1.5"
            >
              <Save size={15} />
              <span>{saving ? 'Saving...' : isEditMode ? 'Save Prescription Changes' : 'Record Prescription'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
