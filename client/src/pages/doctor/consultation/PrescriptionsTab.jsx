import { useState, useEffect } from 'react';
import {
  Pill, Plus, Trash2, Printer, FileText, X, Stethoscope, Save,
} from 'lucide-react';
import api from '../../../api/axios.js';
import { openPrescriptionPDFWindow } from '../../../utils/prescriptionPdfGenerator.js';
import ConfirmModal from '../../../components/common/ConfirmModal.jsx';
import { useNotification } from '../../../context/NotificationContext.jsx';

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

  // Print Modal State
  const [printingRx, setPrintingRx] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Dynamic Medicine Rows State
  const [medicines, setMedicines] = useState([]);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');

  const fetchData = async () => {
    if (!consultationId) return;
    try {
      setLoading(true);
      const [rxRes, diagRes, settingsRes] = await Promise.all([
        api.get(`/prescriptions?consultation=${consultationId}`),
        api.get(`/diagnoses?consultation=${consultationId}`).catch(() => ({ data: { diagnoses: [] } })),
        api.get('/clinic-settings').catch(() => ({ data: {} })),
      ]);

      setPrescriptions(rxRes.data?.prescriptions || []);
      setDiagnoses(diagRes.data?.diagnoses || []);

      if (settingsRes.data?.settings) {
        setClinicSettings((prev) => ({ ...prev, ...settingsRes.data.settings }));
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

  const handleRemoveRow = (index) => {
    if (isReadOnly) return;
    setMedicines((prev) => prev.filter((_, i) => i !== index));
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
    <div className="space-y-6">
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
              {/* Table Header (Fixed Top) */}
              <div className="p-3 pb-2 border-b border-border/50 bg-bg/60">
                <div className="grid grid-cols-12 gap-2 text-xs font-bold text-ink-soft uppercase px-1">
                  <span className="col-span-3">Medicine Name *</span>
                  <span className="col-span-2">Dosage</span>
                  <span className="col-span-3 text-center">Frequency (1 - 0 - 1)</span>
                  <span className="col-span-2">Duration</span>
                  <span className="col-span-2">Instructions</span>
                </div>
              </div>

              {/* Scrollable Medicines Container with hidden scrollbar */}
              <div
                className="p-3 space-y-2.5 max-h-72 overflow-y-auto [&::-webkit-scrollbar]:hidden"
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
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
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
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 text-ink-soft hover:text-rose-600 shrink-0"
                            title="Remove row"
                          >
                            <Trash2 size={14} />
                          </button>
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
    </div>
  );
}
