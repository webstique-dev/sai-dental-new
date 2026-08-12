import { useState, useEffect } from 'react';
import {
  Pill, Plus, Trash2, CheckCircle2, AlertTriangle, Printer, FileText, UserSquare2,
} from 'lucide-react';
import api from '../../../api/axios.js';

export default function PrescriptionsTab({ consultation }) {
  const consultationId = consultation?._id || consultation?.id;
  const patientId = consultation?.patient?._id || consultation?.patient?.id;

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic Medicine Rows State
  const [medicines, setMedicines] = useState([
    { medicine: 'Amoxicillin 500mg', dosage: '1 capsule', frequency: '1-0-1 (BD)', duration: '5 days', instructions: 'After meals' },
    { medicine: 'Paracetamol 650mg', dosage: '1 tablet', frequency: '1-1-1 (TDS)', duration: '3 days', instructions: 'SOS / For pain' },
  ]);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchPrescriptions = async () => {
    if (!consultationId) return;
    try {
      setLoading(true);
      const res = await api.get(`/prescriptions?consultation=${consultationId}`);
      setPrescriptions(res.data?.prescriptions || []);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [consultationId]);

  const handleAddRow = () => {
    setMedicines([
      ...medicines,
      { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (medicines.length === 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleSavePrescription = async (e) => {
    e.preventDefault();
    const validMedicines = medicines.filter((m) => m.medicine && m.medicine.trim());
    if (validMedicines.length === 0) {
      setErrorMessage('Please add at least one medicine name.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const payload = {
        consultation: consultationId,
        patient: patientId,
        medicines: validMedicines,
      };

      await api.post('/prescriptions', payload);
      setSuccessMessage('Prescription created successfully!');

      // Reset form
      setMedicines([
        { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' },
      ]);

      fetchPrescriptions();
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to create prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800 border border-rose-200">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* FORM: REPEATABLE MEDICINES PRESCRIPTION FORM */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Pill size={18} className="text-brand" /> Issue New Prescription (Rx)
            </h3>
            <p className="text-xs text-ink-soft">
              Add multiple medicine rows with dosage, frequency, duration, and instructions.
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
          <div className="space-y-2 border border-border rounded-xl p-3 bg-bg/30 max-h-72 overflow-y-auto">
            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-ink-soft uppercase px-1 pb-1 border-b border-border/50">
              <span className="col-span-4">Medicine Name *</span>
              <span className="col-span-2">Dosage</span>
              <span className="col-span-2">Frequency</span>
              <span className="col-span-2">Duration</span>
              <span className="col-span-2">Action</span>
            </div>

            {medicines.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                <div className="col-span-4">
                  <input
                    type="text"
                    className="input-field py-1.5 text-xs"
                    placeholder="Medicine Name (e.g. Amoxicillin)"
                    value={item.medicine}
                    onChange={(e) => handleRowChange(idx, 'medicine', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    className="input-field py-1.5 text-xs"
                    placeholder="Dosage (500mg)"
                    value={item.dosage}
                    onChange={(e) => handleRowChange(idx, 'dosage', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    className="input-field py-1.5 text-xs"
                    placeholder="Freq (1-0-1)"
                    value={item.frequency}
                    onChange={(e) => handleRowChange(idx, 'frequency', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    className="input-field py-1.5 text-xs"
                    placeholder="Duration (5 days)"
                    value={item.duration}
                    onChange={(e) => handleRowChange(idx, 'duration', e.target.value)}
                  />
                </div>
                <div className="col-span-2 flex items-center justify-between gap-1">
                  <input
                    type="text"
                    className="input-field py-1.5 text-xs"
                    placeholder="Instructions (After food)"
                    value={item.instructions}
                    onChange={(e) => handleRowChange(idx, 'instructions', e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={medicines.length === 1}
                    onClick={() => handleRemoveRow(idx)}
                    className="p-1 text-ink-soft hover:text-rose-600 disabled:opacity-30 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="btn-primary">
              <Pill size={16} />
              <span>{submitting ? 'Saving Prescription...' : 'Issue Prescription'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SAVED PRESCRIPTIONS PRINT-READY LIST */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-ink">
              Prescription History ({prescriptions.length})
            </h3>
            <p className="text-xs text-ink-soft">
              Formatted medical prescriptions recorded for this visit.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-ink-soft">Loading prescriptions...</div>
        ) : prescriptions.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-soft space-y-2">
            <Pill size={28} className="mx-auto text-ink-soft/40" />
            <p className="font-semibold text-ink">No prescriptions issued for this consultation yet.</p>
            <p>Fill out the form above to add medicine rows.</p>
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
                  {/* Rx Header Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xl font-black text-brand tracking-tighter">Rx</span>
                        <span className="text-xs font-bold text-ink">Medical Prescription</span>
                      </div>
                      <p className="text-[11px] text-ink-soft">
                        Issued by: <strong>Dr. {rx.recordedBy?.name || consultation.doctor?.name}</strong>{' '}
                        {rx.recordedBy?.specialization ? `(${rx.recordedBy.specialization})` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold text-ink">{dateStr}</p>
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline mt-1"
                      >
                        <Printer size={13} /> Print Rx
                      </button>
                    </div>
                  </div>

                  {/* Medicines Table */}
                  <div className="overflow-x-auto">
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
