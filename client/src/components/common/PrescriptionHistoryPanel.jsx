import { useState, useEffect } from 'react';
import { Pill, Calendar, User, Clock, FileText, ChevronDown, ChevronUp, Printer, Plus, Edit3, Trash2 } from 'lucide-react';
import api from '../../api/axios.js';
import { openPrescriptionPDFWindow } from '../../utils/prescriptionPdfGenerator.js';
import { PrescriptionCardSkeleton } from './TableSkeleton.jsx';
import PrescriptionEditModal from './PrescriptionEditModal.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

export default function PrescriptionHistoryPanel({ patientId, title = "Prescription History & Medication Records" }) {
  const { showSuccess, showError } = useNotification();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const [selectedPrescriptionForEdit, setSelectedPrescriptionForEdit] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Deletion Confirmation state
  const [prescriptionToDelete, setPrescriptionToDelete] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPrescriptions = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const res = await api.get(`/prescriptions?patient=${patientId}`);
      const list = res.data?.prescriptions || [];
      setPrescriptions(list);
      if (list.length > 0 && !expandedId) {
        setExpandedId(list[0]._id || list[0].id);
      }
    } catch (err) {
      console.error('Failed to load patient prescriptions history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [patientId]);

  const handlePrint = (e, rx) => {
    if (e) e.stopPropagation();
    openPrescriptionPDFWindow({ rx }, true);
  };

  const handleOpenAdd = () => {
    setSelectedPrescriptionForEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e, rx) => {
    if (e) e.stopPropagation();
    setSelectedPrescriptionForEdit(rx);
    setIsModalOpen(true);
  };

  const handleRequestDelete = (e, rx) => {
    if (e) e.stopPropagation();
    setPrescriptionToDelete(rx);
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!prescriptionToDelete) return;
    const rxId = prescriptionToDelete._id || prescriptionToDelete.id;

    try {
      setIsDeleting(true);
      await api.delete(`/prescriptions/${rxId}`);
      showSuccess('Prescription record deleted successfully.');
      setIsConfirmDeleteOpen(false);
      setPrescriptionToDelete(null);
      await fetchPrescriptions();
    } catch (err) {
      console.error('Failed to delete prescription:', err);
      showError(err.response?.data?.message || 'Failed to delete prescription.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
          <Pill size={18} className="text-brand" />
          <span>{title}</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="badge bg-brand-light/50 text-brand-dark font-mono text-xs font-bold">
            {prescriptions.length} {prescriptions.length === 1 ? 'Prescription' : 'Prescriptions'}
          </span>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 shadow-sm"
            title="Add New Prescription"
          >
            <Plus size={14} />
            <span>Add Prescription</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <PrescriptionCardSkeleton count={3} />
      ) : prescriptions.length === 0 ? (
        <div className="p-8 text-center space-y-3 border border-dashed border-border rounded-xl">
          <Pill size={32} className="mx-auto text-ink-soft/40" />
          <p className="font-semibold text-xs text-ink">No prescription history on record</p>
          <p className="text-[11px] text-ink-soft">
            Click &ldquo;Add Prescription&rdquo; above to record past medications or new prescriptions.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="btn-secondary py-1.5 px-3 text-xs font-bold inline-flex items-center gap-1.5 mx-auto"
          >
            <Plus size={13} /> Add First Prescription
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx, idx) => {
            const rxId = rx._id || rx.id;
            const isExpanded = expandedId === rxId;

            const dateStr = rx.createdAt
              ? new Date(rx.createdAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'N/A';

            const doctorName = rx.recordedBy?.name
              ? `Dr. ${rx.recordedBy.name}`
              : 'Attending Doctor';

            const medicines = rx.medicines || [];

            return (
              <div
                key={rxId || idx}
                className="rounded-xl border border-border bg-bg/40 overflow-hidden transition-colors"
              >
                {/* Header Row */}
                <div className="w-full p-3.5 flex items-center justify-between gap-3 bg-surface hover:bg-bg/60 transition-colors">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : rxId)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <div className="h-9 w-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-xs shrink-0">
                      #{prescriptions.length - idx}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-ink">{doctorName}</span>
                        <span className="text-[10px] text-ink-soft">• {dateStr}</span>
                      </div>
                      <p className="text-[11px] text-ink-soft font-medium truncate">
                        {medicines.length} medicine(s): {medicines.map((m) => m.medicine).filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(e, rx)}
                      className="btn-secondary py-1.5 px-2.5 text-xs flex items-center gap-1 text-amber-700 hover:text-amber-800 hover:border-amber-300 font-semibold"
                      title="Edit Prescription"
                    >
                      <Edit3 size={13} />
                      <span className="hidden md:inline">Edit Prescription</span>
                      <span className="md:hidden inline">Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handlePrint(e, rx)}
                      className="btn-secondary py-1.5 px-2.5 text-xs flex items-center gap-1 border-brand/30 text-brand hover:bg-brand-light/30 shadow-sm font-semibold"
                      title="Print Prescription PDF"
                    >
                      <Printer size={13} />
                      <span className="hidden md:inline">Print Prescription</span>
                      <span className="md:hidden inline">Print</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleRequestDelete(e, rx)}
                      className="p-1.5 rounded-lg border border-border text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                      title="Delete Prescription"
                    >
                      <Trash2 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : rxId)}
                      className="p-1.5 rounded-lg hover:bg-bg text-ink-soft hover:text-ink transition-colors flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <span>{isExpanded ? 'Hide' : 'Details'}</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 border-t border-border bg-surface space-y-3 text-xs">
                    {/* Medicines Table */}
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-bg/60 border-b border-border text-[10px] font-bold text-ink-soft uppercase">
                          <tr>
                            <th className="px-3 py-2 text-center w-10">#</th>
                            <th className="px-3 py-2">Medicine Name</th>
                            <th className="px-3 py-2">Dosage</th>
                            <th className="px-3 py-2">Frequency</th>
                            <th className="px-3 py-2">Duration</th>
                            <th className="px-3 py-2">Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {medicines.map((m, mIdx) => (
                            <tr key={mIdx} className="hover:bg-bg/30">
                              <td className="px-3 py-2.5 font-bold text-ink-soft text-center">{mIdx + 1}</td>
                              <td className="px-3 py-2.5 font-bold text-ink">{m.medicine || '—'}</td>
                              <td className="px-3 py-2.5 text-ink-soft font-medium">{m.dosage || '—'}</td>
                              <td className="px-3 py-2.5 font-mono text-brand font-bold">
                                <span className="inline-flex items-center gap-1 rounded-md bg-brand-light/50 border border-brand/20 px-2 py-0.5 text-[11px]">
                                  {m.frequency || '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-ink-soft">{m.duration || '—'}</td>
                              <td className="px-3 py-2.5 text-ink-soft italic">{m.instructions || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Notes */}
                    {rx.notes && (
                      <div className="p-2.5 rounded-lg bg-bg/50 border border-border text-xs">
                        <span className="text-[10px] font-bold text-ink-soft uppercase block mb-0.5">Prescription Notes</span>
                        <p className="text-ink font-medium leading-relaxed">{rx.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PRESCRIPTION EDIT / CREATE MODAL */}
      <PrescriptionEditModal
        isOpen={isModalOpen}
        prescription={selectedPrescriptionForEdit}
        patientId={patientId}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchPrescriptions()}
      />

      {/* DELETE CONFIRMATION POPUP */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Delete Prescription Record"
        message={
          prescriptionToDelete
            ? `Are you sure you want to delete this prescription entry recorded on ${
                prescriptionToDelete.createdAt
                  ? new Date(prescriptionToDelete.createdAt).toLocaleDateString()
                  : 'file'
              }? This action cannot be undone.`
            : 'Are you sure you want to delete this prescription record?'
        }
        confirmText="Delete Prescription"
        cancelText="Cancel"
        variant="delete"
        loading={isDeleting}
        onClose={() => {
          setIsConfirmDeleteOpen(false);
          setPrescriptionToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
