import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Pill, Plus, Trash2, Save, AlertTriangle, Loader2, Droplets, Calendar, Clock } from 'lucide-react';
import api from '../../api/axios.js';
import ConfirmModal from './ConfirmModal.jsx';
import MedicineSuggestionInput from './MedicineSuggestionInput.jsx';
import { useMedicineSuggestions } from '../../hooks/useMedicineSuggestions.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import { capitalizeWords, combineDateAndTime, formatTime12Hour } from '../../utils/formatters.js';
import DatePicker, { formatToDateString } from './DatePicker.jsx';
import SplitTimeInput from './SplitTimeInput.jsx';

const COMMON_DURATIONS = ['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '1 Month'];
const COMMON_DOSAGES = ['500 mg', '650 mg', '250 mg', '100 mg', '10 ml', '5 ml', '1 tablet', '1 drop'];
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
  const { medicines: medicineSuggestions, refreshMedicines } = useMedicineSuggestions();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingMedicineIndex, setDeletingMedicineIndex] = useState(null);

  const [prescriptionDate, setPrescriptionDate] = useState(() => formatToDateString(new Date()));
  const [prescriptionTime, setPrescriptionTime] = useState('09:00 AM');

  const [medicines, setMedicines] = useState([
    { medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After Food', type: 'medicine' },
  ]);
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [treatment, setTreatment] = useState('');
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

  const parseSyrupFrequencyPattern = (freqStr) => {
    if (!freqStr || typeof freqStr !== 'string') return ['5ml', '0', '5ml'];
    const parts = freqStr.split('-');
    if (parts.length === 3) {
      return [parts[0].trim(), parts[1].trim(), parts[2].trim()];
    }
    if (parts.length === 2) {
      return [parts[0].trim(), '0', parts[1].trim()];
    }
    return [freqStr.trim(), '0', '0'];
  };

  const handleSyrupFreqSlotChange = (idx, slotIndex, val) => {
    const current = parseSyrupFrequencyPattern(medicines[idx]?.frequency);
    current[slotIndex] = val;
    const newFreqStr = `${current[0]}-${current[1]}-${current[2]}`;
    handleMedicineChange(idx, 'frequency', newFreqStr);
  };

  useEffect(() => {
    if (prescription) {
      const allMeds = Array.isArray(prescription.medicines) ? prescription.medicines : [];
      const rawDate = prescription.date || prescription.recordedAt || prescription.createdAt || new Date();
      setPrescriptionDate(formatToDateString(new Date(rawDate)));
      setPrescriptionTime(formatTime12Hour(rawDate));

      setMedicines(
        allMeds.length > 0
          ? allMeds.map((m) => ({
              medicine: m.medicine || '',
              dosage: m.dosage || (m.type === 'syrup' ? '5 ml' : ''),
              frequency: m.frequency || (m.type === 'syrup' ? '5ml-0-5ml' : '1-0-1'),
              duration: m.duration || (m.type === 'syrup' ? '3 Days' : '5 Days'),
              instructions: m.instructions || 'After Food',
              type: m.type === 'syrup' ? 'syrup' : 'medicine',
            }))
          : [{ medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After Food', type: 'medicine' }]
      );

      setDiagnosis(prescription.diagnosis || '');
      setTreatmentPlan(prescription.treatmentPlan || '');
      setTreatment(prescription.treatment || '');
      setNotes(prescription.notes || '');
    } else {
      setPrescriptionDate(formatToDateString(new Date()));
      setPrescriptionTime(formatTime12Hour(new Date()));
      setMedicines([
        { medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After Food', type: 'medicine' },
      ]);
      setDiagnosis('');
      setTreatmentPlan('');
      setTreatment('');
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
      { medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After Food', type: 'medicine' },
    ]);
  };

  const handleAddSyrupRow = () => {
    setMedicines((prev) => [
      ...prev,
      { medicine: '', dosage: '5 ml', frequency: '5ml-0-5ml', duration: '3 Days', instructions: 'After Food', type: 'syrup' },
    ]);
  };

  const handleInitiateRemoveRow = (index) => {
    const item = medicines[index];
    if (item && (item.medicine?.trim() || item.dosage?.trim() || item.duration?.trim())) {
      setDeletingMedicineIndex(index);
    } else {
      if (medicines.length <= 1) {
        setMedicines([{ medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After Food', type: 'medicine' }]);
      } else {
        setMedicines((prev) => prev.filter((_, i) => i !== index));
      }
    }
  };

  const confirmDeleteMedicineRow = () => {
    if (deletingMedicineIndex !== null) {
      if (medicines.length <= 1) {
        setMedicines([{ medicine: '', dosage: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After Food', type: 'medicine' }]);
      } else {
        setMedicines((prev) => prev.filter((_, i) => i !== deletingMedicineIndex));
      }
      setDeletingMedicineIndex(null);
    }
  };

  const handleMedicineChange = (index, field, value) => {
    let formattedVal = value;
    if (['medicine', 'dosage', 'duration', 'instructions'].includes(field)) {
      formattedVal = capitalizeWords(value);
    }
    setMedicines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: formattedVal };
      return updated;
    });
  };

  const handleSelectSuggestion = (index, suggestion) => {
    if (!suggestion) return;
    setMedicines((prev) => {
      const updated = [...prev];
      const current = updated[index] || {};
      const isSyrup = current.type === 'syrup';
      updated[index] = {
        ...current,
        medicine: capitalizeWords(suggestion.name || ''),
        dosage: suggestion.dosage ? capitalizeWords(suggestion.dosage) : (isSyrup ? (current.dosage || '5 ml') : current.dosage),
        frequency: suggestion.defaultFrequency || current.frequency || (isSyrup ? '5ml-0-5ml' : '1-0-1'),
        duration: suggestion.defaultDuration ? capitalizeWords(suggestion.defaultDuration) : (current.duration || (isSyrup ? '3 Days' : '5 Days')),
        instructions: suggestion.defaultInstructions ? capitalizeWords(suggestion.defaultInstructions) : (current.instructions || 'After Food'),
        type: isSyrup ? 'syrup' : 'medicine',
      };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');

    const validMedicines = medicines
      .map((m) => ({
        medicine: capitalizeWords(m.medicine.trim()),
        dosage: capitalizeWords((m.dosage || '').trim()),
        frequency: m.frequency.trim(),
        duration: capitalizeWords((m.duration || '').trim()),
        instructions: capitalizeWords((m.instructions || '').trim()),
        type: m.type === 'syrup' ? 'syrup' : 'medicine',
      }))
      .filter((m) => m.medicine);

    if (validMedicines.length === 0) {
      setErrorMessage('Please provide at least one medicine or syrup name.');
      setSaving(false);
      return;
    }

    if (!prescriptionDate || !prescriptionDate.trim()) {
      setErrorMessage('Prescription Date is required.');
      showError('Prescription Date is required.');
      setSaving(false);
      return;
    }

    try {
      const combinedDateObj = combineDateAndTime(prescriptionDate, prescriptionTime);
      const isoDate = combinedDateObj.toISOString();

      if (isEditMode) {
        const res = await api.put(`/prescriptions/${rxId}`, {
          medicines: validMedicines,
          diagnosis: diagnosis ? capitalizeWords(diagnosis.trim()) : '',
          treatmentPlan: treatmentPlan ? capitalizeWords(treatmentPlan.trim()) : '',
          treatment: treatment ? capitalizeWords(treatment.trim()) : '',
          notes: notes ? capitalizeWords(notes.trim()) : '',
          date: isoDate,
          recordedAt: isoDate,
        });
        showSuccess('Prescription record updated successfully!');
        refreshMedicines();
        onSuccess(res.data?.prescription);
      } else {
        const res = await api.post('/prescriptions', {
          patient: patientId,
          consultation: consultationId,
          medicines: validMedicines,
          diagnosis: diagnosis ? capitalizeWords(diagnosis.trim()) : '',
          treatmentPlan: treatmentPlan ? capitalizeWords(treatmentPlan.trim()) : '',
          treatment: treatment ? capitalizeWords(treatment.trim()) : '',
          notes: notes ? capitalizeWords(notes.trim()) : '',
          date: isoDate,
          recordedAt: isoDate,
        });
        showSuccess('New prescription added successfully!');
        refreshMedicines();
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
                Prescribe medications and syrups, specify frequencies, durations, and instructions
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

            {/* Date & Time Row */}
            <div className="card p-3.5 bg-bg/50 border border-border space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5 flex items-center gap-1.5">
                    <Calendar size={13} className="text-brand" />
                    <span>Prescription Date</span>
                    <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <DatePicker
                    required
                    value={prescriptionDate}
                    maxDate={new Date()}
                    onChange={(d, dStr) => setPrescriptionDate(dStr)}
                    inputClassName="py-1.5 text-xs h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5 flex items-center gap-1.5">
                    <Clock size={13} className="text-brand" />
                    <span>Prescription Time</span>
                    <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <SplitTimeInput
                    label=""
                    value={prescriptionTime}
                    onChange={(time12) => setPrescriptionTime(time12)}
                  />
                </div>
              </div>
            </div>

            {/* 3 TOP FIELDS: DIAGNOSIS, TREATMENT PLAN, TREATMENT (Single row on desktop/tablet, stacked on mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Diagnosis</label>
                <input
                  type="text"
                  className="input-field text-xs w-full"
                  placeholder="e.g. Dental Caries, Pulpitis..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(capitalizeWords(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Treatment Plan</label>
                <input
                  type="text"
                  className="input-field text-xs w-full"
                  placeholder="e.g. RCT, Crown Placement..."
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(capitalizeWords(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Treatment</label>
                <input
                  type="text"
                  className="input-field text-xs w-full"
                  placeholder="e.g. Root Canal Treatment..."
                  value={treatment}
                  onChange={(e) => setTreatment(capitalizeWords(e.target.value))}
                />
              </div>
            </div>

            {/* PRESCRIPTION NOTES (Below the three fields) */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Prescription Notes</label>
              <textarea
                rows={2}
                className="input-field text-xs w-full"
                placeholder="General instructions for the patient..."
                value={notes}
                onChange={(e) => setNotes(capitalizeWords(e.target.value))}
              />
            </div>

            {/* Repeatable Medicines & Syrups Rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/80 pb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-ink text-xs uppercase tracking-wider text-brand flex items-center gap-1.5">
                    <Pill size={14} /> Prescribed Medications &amp; Syrups
                  </h4>
                  <span className="text-[11px] text-ink-soft font-semibold">({medicines.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddMedicineRow}
                    className="btn-secondary py-1 px-2.5 text-xs font-semibold flex items-center gap-1 hover:border-brand hover:text-brand"
                  >
                    <Plus size={13} /> Add Medicine
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSyrupRow}
                    className="btn-secondary py-1 px-2.5 text-xs font-semibold flex items-center gap-1 text-teal-700 hover:text-teal-800 border-teal-300 hover:border-teal-400 bg-teal-50/50"
                  >
                    <Plus size={13} /> Add Syrup
                  </button>
                </div>
              </div>

              {medicines.length === 0 ? (
                <div className="p-3 bg-bg/40 border border-dashed border-border rounded-xl text-center text-xs text-ink-soft italic">
                  No medicines added. Click &ldquo;Add Medicine&rdquo; or &ldquo;Add Syrup&rdquo; to add items.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {medicines.map((item, idx) => {
                    const isSyrup = item.type === 'syrup';
                    const freqPattern = parseFrequencyPattern(item.frequency);
                    const syrupFreq = parseSyrupFrequencyPattern(item.frequency);

                    return (
                      <div key={idx} className={`card p-2.5 sm:p-3 border space-y-2 relative transition-all ${isSyrup ? 'bg-teal-50/20 border-teal-200' : 'bg-bg/40 border-border'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 ${isSyrup ? 'text-teal-800' : 'text-ink'}`}>
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${isSyrup ? 'bg-teal-100 text-teal-800' : 'bg-brand/10 text-brand'}`}>
                              {idx + 1}
                            </span>
                            {isSyrup ? `Syrup #${idx + 1}` : `Medicine #${idx + 1}`}
                          </span>
                          {medicines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleInitiateRemoveRow(idx)}
                              className="text-rose-600 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition-colors flex items-center gap-1 text-[10px] font-medium"
                              title="Remove Item"
                            >
                              <Trash2 size={13} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        {/* Single Row on md/lg, responsive stack on mobile */}
                        <div className="flex flex-col md:flex-row md:items-start gap-2.5">
                          {/* Medicine / Syrup Name */}
                          <div className="flex-1 min-w-[140px]">
                            <label className={`block text-[10px] font-bold uppercase mb-0.5 ${isSyrup ? 'text-teal-900' : 'text-ink-soft'}`}>
                              {isSyrup ? 'Syrup Name' : 'Medicine Name'} <span className="text-rose-600">*</span>
                            </label>
                            <MedicineSuggestionInput
                              value={item.medicine}
                              dosage={item.dosage}
                              suggestions={medicineSuggestions}
                              onChange={(val) => handleMedicineChange(idx, 'medicine', val)}
                              onSelect={(suggestion) => handleSelectSuggestion(idx, suggestion)}
                              placeholder={isSyrup ? "e.g. Moxikind-CV Syrup" : "e.g. Augmentin"}
                              required
                            />
                          </div>

                          {/* Dosage */}
                          <div className="w-full md:w-28 shrink-0">
                            <label className={`block text-[10px] font-bold uppercase mb-0.5 ${isSyrup ? 'text-teal-900' : 'text-ink-soft'}`}>
                              {isSyrup ? 'Dose (ML)' : 'Dosage'}
                            </label>
                            <input
                              type="text"
                              list={isSyrup ? "syrup-edit-dosage-options" : "dosage-options"}
                              className="input-field py-1.5 px-2.5 text-xs w-full"
                              placeholder={isSyrup ? "e.g. 5 ml" : "e.g. 500 mg"}
                              value={item.dosage || ''}
                              onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                            />
                          </div>

                          {/* Frequency */}
                          <div className="w-full md:w-[165px] shrink-0">
                            <label className={`block text-[10px] font-bold uppercase mb-0.5 ${isSyrup ? 'text-teal-900' : 'text-ink-soft'}`}>
                              {isSyrup ? 'Frequency (M - A - N)' : 'Frequency (1 - 0 - 1)'}
                            </label>
                            {isSyrup ? (
                              <div className="flex flex-col gap-1">
                                <div className="inline-flex items-center justify-center gap-1 rounded-xl border border-teal-300/80 bg-teal-50/30 px-1.5 py-0.5 shadow-2xs w-full h-[34px]">
                                  <input
                                    type="text"
                                    placeholder="M"
                                    title="Morning (e.g. 5ml, 10ml, 1)"
                                    className="w-10 h-6 text-center text-xs font-mono font-bold bg-white text-teal-900 rounded-md border border-teal-200/80 hover:border-teal-400 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-400 focus:outline-none transition-all px-0.5 shadow-2xs"
                                    value={syrupFreq[0]}
                                    onChange={(e) => handleSyrupFreqSlotChange(idx, 0, e.target.value)}
                                  />
                                  <span className="text-teal-400 font-mono text-xs select-none font-bold px-0.5">-</span>
                                  <input
                                    type="text"
                                    placeholder="A"
                                    title="Afternoon (e.g. 0, 5ml, 10ml)"
                                    className="w-10 h-6 text-center text-xs font-mono font-bold bg-white text-teal-900 rounded-md border border-teal-200/80 hover:border-teal-400 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-400 focus:outline-none transition-all px-0.5 shadow-2xs"
                                    value={syrupFreq[1]}
                                    onChange={(e) => handleSyrupFreqSlotChange(idx, 1, e.target.value)}
                                  />
                                  <span className="text-teal-400 font-mono text-xs select-none font-bold px-0.5">-</span>
                                  <input
                                    type="text"
                                    placeholder="N"
                                    title="Night (e.g. 5ml, 10ml, 1)"
                                    className="w-10 h-6 text-center text-xs font-mono font-bold bg-white text-teal-900 rounded-md border border-teal-200/80 hover:border-teal-400 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-400 focus:outline-none transition-all px-0.5 shadow-2xs"
                                    value={syrupFreq[2]}
                                    onChange={(e) => handleSyrupFreqSlotChange(idx, 2, e.target.value)}
                                  />
                                </div>
                                <div className="flex items-center justify-center flex-nowrap gap-0.5 max-w-full overflow-x-auto scrollbar-none no-scrollbar py-0.5">
                                  {['5ml-0-5ml', '5ml-5ml-5ml', '10ml-0-10ml', '1-0-1'].map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => handleMedicineChange(idx, 'frequency', preset)}
                                      className={`px-1 py-0.5 rounded text-[8.5px] font-mono font-bold border transition-all whitespace-nowrap shrink-0 shadow-2xs ${
                                        item.frequency === preset
                                          ? 'bg-teal-100/90 text-teal-800 border-teal-400 font-extrabold ring-1 ring-teal-300/60'
                                          : 'bg-white/80 text-ink-soft/80 border-teal-200/60 hover:border-teal-400 hover:text-teal-800 hover:bg-teal-50/50'
                                      }`}
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <div className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-surface px-2 py-1 text-xs font-bold shadow-2xs h-[34px] w-full">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFreqSlot(idx, 0)}
                                    title="Morning Slot (1 or 0)"
                                    className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition-all ${
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
                                    className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition-all ${
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
                                    className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition-all ${
                                      freqPattern[2] === 1
                                        ? 'bg-brand text-white shadow-xs'
                                        : 'text-ink-soft hover:text-ink bg-bg'
                                    }`}
                                  >
                                    {freqPattern[2]}
                                  </button>
                                </div>
                                <div className="flex items-center justify-center flex-nowrap gap-0.5 max-w-full overflow-x-auto scrollbar-none no-scrollbar py-0.5">
                                  {['1-0-1', '1-1-1', '1-0-0', '0-0-1'].map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => handleMedicineChange(idx, 'frequency', preset)}
                                      className={`px-1 py-0.5 rounded text-[8.5px] font-mono font-bold border transition-colors whitespace-nowrap shrink-0 shadow-2xs ${
                                        item.frequency === preset
                                          ? 'bg-brand-light text-brand border-brand font-extrabold shadow-2xs'
                                          : 'bg-surface text-ink-soft border-border hover:border-brand/40 hover:bg-bg'
                                      }`}
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Duration */}
                          <div className="w-full md:w-28 shrink-0">
                            <label className={`block text-[10px] font-bold uppercase mb-0.5 ${isSyrup ? 'text-teal-900' : 'text-ink-soft'}`}>
                              Duration
                            </label>
                            <input
                              type="text"
                              list="duration-options"
                              className="input-field py-1.5 px-2.5 text-xs w-full"
                              placeholder={isSyrup ? "e.g. 3 Days" : "e.g. 5 Days"}
                              value={item.duration}
                              onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                            />
                          </div>

                          {/* Instructions Dropdown */}
                          <div className="w-full md:w-32 shrink-0">
                            <label className={`block text-[10px] font-bold uppercase mb-0.5 ${isSyrup ? 'text-teal-900' : 'text-ink-soft'}`}>
                              Instructions
                            </label>
                            <select
                              className="input-field py-1.5 px-2 text-xs font-semibold w-full"
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
              )}

              {/* Datalists for quick completion */}
              <datalist id="dosage-options">
                {COMMON_DOSAGES.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
              <datalist id="duration-options">
                {COMMON_DURATIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
              <datalist id="syrup-edit-dosage-options">
                <option value="2.5 ml" />
                <option value="5 ml" />
                <option value="7.5 ml" />
                <option value="10 ml" />
                <option value="15 ml" />
              </datalist>
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

      {/* CONFIRM DELETE ITEM ROW MODAL */}
      <ConfirmModal
        isOpen={deletingMedicineIndex !== null}
        onClose={() => setDeletingMedicineIndex(null)}
        onConfirm={confirmDeleteMedicineRow}
        title="Confirm Delete Item"
        message={
          deletingMedicineIndex !== null && medicines[deletingMedicineIndex]?.medicine?.trim()
            ? `Are you sure you want to remove "${medicines[deletingMedicineIndex].medicine.trim()}" from this prescription?`
            : 'Are you sure you want to remove this item from the prescription?'
        }
        confirmText="Delete Item"
        cancelText="Cancel"
        variant="delete"
      />
    </div>,
    document.body
  );
}
