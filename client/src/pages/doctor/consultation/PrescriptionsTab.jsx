import { useState, useEffect } from 'react';
import {
  Pill, Plus, Trash2, Printer, FileText, X, Stethoscope,
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
  const [medicines, setMedicines] = useState([
    { medicine: 'Amoxicillin 500mg', dosage: '1 capsule', frequency: '1-0-1 (BD)', duration: '5 days', instructions: 'After meals with water' },
    { medicine: 'Paracetamol 650mg', dosage: '1 tablet', frequency: '1-1-1 (TDS)', duration: '3 days', instructions: 'SOS / For pain' },
  ]);
  const [prescriptionNotes, setPrescriptionNotes] = useState('Take all prescribed medicines after food. Maintain warm saline rinses twice daily.');

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

  const handleAddRow = () => {
    if (isReadOnly) return;
    setMedicines([
      ...medicines,
      { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (isReadOnly || medicines.length === 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
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

      setMedicines([
        { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' },
      ]);

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
                <Pill size={18} className="text-brand" /> Issue New Prescription (Rx)
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
            <div className="space-y-2 border border-border rounded-xl p-3 bg-bg/30 max-h-72 overflow-y-auto">
              <div className="grid grid-cols-12 gap-2 text-xs font-bold text-ink-soft uppercase px-1 pb-1 border-b border-border/50">
                <span className="col-span-4">Medicine Name *</span>
                <span className="col-span-2">Dosage</span>
                <span className="col-span-2">Frequency</span>
                <span className="col-span-2">Duration</span>
                <span className="col-span-2">Instructions</span>
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
                      placeholder="Dosage (500 mg)"
                      value={item.dosage}
                      onChange={(e) => handleRowChange(idx, 'dosage', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs"
                      placeholder="Freq (Twice daily / 1-0-1)"
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
                <Pill size={16} />
                <span>{submitting ? 'Saving Prescription...' : 'Issue Medicine Prescription'}</span>
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
            <p className="font-semibold text-ink">No prescriptions issued for this consultation yet.</p>
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
