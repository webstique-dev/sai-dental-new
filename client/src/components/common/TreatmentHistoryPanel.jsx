import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardList, Calendar, Plus, Edit3, Trash2, X, Check, Activity,
  Search, Stethoscope, AlertCircle, Clock, FileText, CheckCircle2, ChevronDown
} from 'lucide-react';
import api from '../../api/axios.js';
import { capitalizeWords, formatDateTimeDisplay } from '../../utils/formatters.js';
import ConfirmModal from './ConfirmModal.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

const POPULAR_TREATMENTS = [
  'Root Canal Treatment',
  'Scaling & Polishing',
  'Composite Tooth Restoration',
  'Tooth Extraction',
  'Crown & Bridge',
  'Dental Filling',
  'Orthodontic Adjustment',
  'Dental X-Ray (IOPA/OPG)',
  'Teeth Whitening',
  'Deep Cleaning / Curettage',
  'Fluoride Application',
  'Impression & Study Model',
];

function formatDateForInput(dateVal) {
  if (!dateVal) return new Date().toISOString().split('T')[0];
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
}

function formatDateDisplay(dateVal) {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function TreatmentHistoryPanel({
  patientId,
  consultationId = null,
  isReadOnly = false,
  title = "Treatment History",
  onRecordChanged = null,
}) {
  const { showSuccess, showError } = useNotification();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    date: formatDateForInput(new Date()),
    procedure: '',
    tooth: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Confirmation state
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchRecords = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const res = await api.get(`/treatment-records?patient=${patientId}`);
      setRecords(res.data?.treatmentRecords || []);
    } catch (err) {
      console.error('Failed to load treatment history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [patientId]);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData({
      date: formatDateForInput(new Date()),
      procedure: '',
      tooth: '',
      notes: '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setFormData({
      date: formatDateForInput(rec.date || rec.createdAt),
      procedure: rec.procedure || rec.treatment || '',
      tooth: rec.tooth ? String(rec.tooth) : '',
      notes: rec.notes || '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingRecord(null);
    setModalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.procedure.trim()) {
      setModalError('Treatment Performed is required.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');

      const payload = {
        patient: patientId,
        date: formData.date ? new Date(formData.date) : new Date(),
        procedure: formData.procedure.trim(),
        treatment: formData.procedure.trim(),
        tooth: formData.tooth ? Number(formData.tooth) : null,
        notes: formData.notes ? formData.notes.trim() : '',
      };

      if (consultationId && !editingRecord) {
        payload.consultation = consultationId;
      }

      if (editingRecord) {
        const recId = editingRecord._id || editingRecord.id;
        await api.put(`/treatment-records/${recId}`, payload);
        showSuccess('Treatment record updated successfully.');
      } else {
        await api.post('/treatment-records', payload);
        showSuccess('Treatment record added successfully.');
      }

      setIsModalOpen(false);
      setEditingRecord(null);
      await fetchRecords();
      if (typeof onRecordChanged === 'function') {
        onRecordChanged();
      }
    } catch (err) {
      console.error('Failed to save treatment record:', err);
      setModalError(err.response?.data?.message || 'Failed to save treatment record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDelete = (rec) => {
    setRecordToDelete(rec);
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    const recId = recordToDelete._id || recordToDelete.id;

    try {
      setDeleting(true);
      await api.delete(`/treatment-records/${recId}`);
      showSuccess('Treatment record deleted successfully.');
      setIsConfirmDeleteOpen(false);
      setRecordToDelete(null);
      await fetchRecords();
      if (typeof onRecordChanged === 'function') {
        onRecordChanged();
      }
    } catch (err) {
      console.error('Failed to delete treatment record:', err);
      showError(err.response?.data?.message || 'Failed to delete treatment record.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    const proc = (r.procedure || r.treatment || '').toLowerCase();
    const notes = (r.notes || '').toLowerCase();
    const toothStr = r.tooth ? String(r.tooth) : '';
    const dateStr = formatDateDisplay(r.date || r.createdAt).toLowerCase();
    return proc.includes(query) || notes.includes(query) || toothStr.includes(query) || dateStr.includes(query);
  });

  return (
    <div className="card p-5 space-y-4 bg-surface border-border shadow-xs">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
            <ClipboardList size={18} className="text-brand" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-ink-soft">
            Chronological record of dental treatments and procedures performed for this patient.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge bg-brand-light/50 text-brand-dark font-mono text-xs font-bold px-2.5 py-1">
            {records.length} {records.length === 1 ? 'Record' : 'Records'}
          </span>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="btn-primary text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} />
              <span>Add Treatment</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar if records exist */}
      {records.length > 5 && (
        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              placeholder="Search treatments, teeth, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-8 py-1.5 text-xs w-full"
            />
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-10 bg-bg rounded-lg animate-pulse" />
          <div className="h-12 bg-bg rounded-lg animate-pulse" />
          <div className="h-12 bg-bg rounded-lg animate-pulse" />
        </div>
      ) : filteredRecords.length > 0 ? (
        /* Treatment History Table */
        <div className="overflow-x-auto scrollbar-none rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-xs text-ink border-collapse">
            <thead className="bg-bg/70 text-[11px] font-bold text-ink-soft uppercase tracking-wider border-b border-border">
              <tr>
                <th className="py-3 px-4 w-16 text-center">S.No.</th>
                <th className="py-3 px-4 w-36 whitespace-nowrap">Date</th>
                <th className="py-3 px-4">Treatment Performed</th>
                {!isReadOnly && <th className="py-3 px-4 w-28 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRecords.map((rec, index) => {
                const treatmentName = rec.procedure || rec.treatment || 'Treatment';
                const dateDisplay = formatDateDisplay(rec.date || rec.createdAt);
                const recordedDoc = rec.recordedBy?.name ? `Dr. ${rec.recordedBy.name.replace(/^Dr\.\s*/i, '')}` : null;

                return (
                  <tr
                    key={rec._id || rec.id || index}
                    className="hover:bg-bg/40 transition-colors group"
                  >
                    {/* Column 1: S.No. */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-ink-soft text-center text-xs">
                      {index + 1}
                    </td>

                    {/* Column 2: Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-ink">
                        <Calendar size={13} className="text-brand shrink-0" />
                        <span>{dateDisplay}</span>
                      </div>
                    </td>

                    {/* Column 3: Treatment Performed */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-ink text-xs sm:text-[13px]">
                            {treatmentName}
                          </span>
                          {rec.tooth && (
                            <span className="badge bg-brand-light/60 text-brand-dark border border-brand/20 font-mono text-[10px] font-bold px-1.5 py-0.5">
                              Tooth #{rec.tooth}
                            </span>
                          )}
                        </div>

                        {rec.notes && (
                          <p className="text-[11px] text-ink-soft leading-relaxed font-medium bg-bg/40 p-2 rounded-lg border border-border/50 break-words whitespace-pre-wrap max-w-2xl">
                            {rec.notes}
                          </p>
                        )}

                        {recordedDoc && (
                          <span className="text-[10px] text-ink-soft/80 block font-normal">
                            Recorded by {recordedDoc}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column 4: Actions */}
                    {!isReadOnly && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rec)}
                            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 hover:text-amber-800 border border-transparent hover:border-amber-200 transition-colors"
                            title="Edit Treatment Record"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDelete(rec)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-transparent hover:border-rose-200 transition-colors"
                            title="Delete Treatment Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty State */
        <div className="card p-8 text-center text-xs text-ink-soft space-y-3 bg-bg/30 border-dashed">
          <div className="w-12 h-12 rounded-2xl bg-brand-light/40 text-brand flex items-center justify-center mx-auto">
            <ClipboardList size={24} />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-ink text-sm">No treatment history recorded yet.</p>
            <p className="text-xs text-ink-soft max-w-sm mx-auto">
              Add past or completed dental treatments to maintain an accurate clinical timeline for this patient.
            </p>
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="btn-primary text-xs py-1.5 px-3.5 font-semibold inline-flex items-center gap-1.5 mx-auto shadow-xs"
            >
              <Plus size={14} />
              <span>Add First Treatment</span>
            </button>
          )}
        </div>
      )}

      {/* ADD / EDIT TREATMENT RECORD MODAL */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-150 !mt-0">
          <div
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 !mt-0"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-surface shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-light/60 text-brand flex items-center justify-center shrink-0">
                  <ClipboardList size={17} />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-ink">
                    {editingRecord ? 'Edit Treatment Record' : 'Add Treatment Record'}
                  </h3>
                  <p className="text-[11px] text-ink-soft">
                    {editingRecord ? 'Update treatment details and clinical notes.' : 'Enter date and treatment performed for this patient.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={submitting}
                className="rounded-lg p-1.5 text-ink-soft hover:text-ink hover:bg-bg transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4 text-xs">
                {modalError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2">
                    <AlertCircle size={15} className="text-rose-600 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Date and Tooth Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-ink">
                      Date <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="input-field w-full text-xs py-2"
                      value={formData.date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-ink">
                      Tooth Number <span className="text-ink-soft font-normal text-[11px]">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="11"
                      max="85"
                      placeholder="Tooth number..."
                      className="input-field w-full text-xs py-2 font-mono"
                      value={formData.tooth}
                      onChange={(e) => setFormData((prev) => ({ ...prev, tooth: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Treatment Performed Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-ink">
                    Treatment Performed <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter treatment performed..."
                    className="input-field w-full text-xs py-2"
                    value={formData.procedure}
                    onChange={(e) => setFormData((prev) => ({ ...prev, procedure: capitalizeWords(e.target.value) }))}
                    autoFocus
                  />

                  {/* Quick Suggestion Pills */}
                  <div className="pt-1 space-y-1">
                    <span className="text-[10px] font-semibold text-ink-soft block uppercase tracking-wider">
                      Quick Suggestions:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                      {POPULAR_TREATMENTS.map((proc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, procedure: proc }))}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                            formData.procedure === proc
                              ? 'bg-brand text-white border-brand font-semibold shadow-2xs'
                              : 'bg-bg text-ink-soft hover:text-ink hover:bg-bg/80 border-border'
                          }`}
                        >
                          {proc}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notes / Clinical Remarks */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-ink">
                    Treatment Notes / Clinical Remarks <span className="text-ink-soft font-normal text-[11px]">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter clinical notes or remarks..."
                    className="input-field w-full text-xs py-2 resize-y"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: capitalizeWords(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="btn-secondary text-xs px-4 py-2 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.procedure.trim()}
                  className="btn-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>{submitting ? 'Saving...' : editingRecord ? 'Update Record' : 'Save Treatment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => {
          if (!deleting) {
            setIsConfirmDeleteOpen(false);
            setRecordToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Treatment Record"
        message={
          recordToDelete ? (
            <span>
              Are you sure you want to delete the treatment record for{' '}
              <strong>"{recordToDelete.procedure || recordToDelete.treatment}"</strong>?
              This action will remove it from the patient's treatment history.
            </span>
          ) : (
            'Are you sure you want to delete this treatment record?'
          )
        }
        confirmText="Delete Record"
        cancelText="Keep Record"
        variant="delete"
        loading={deleting}
      />
    </div>
  );
}
