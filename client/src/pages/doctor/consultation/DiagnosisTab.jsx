import { useState, useEffect } from 'react';
import {
  Stethoscope, Plus, Trash2, Edit3, X,
} from 'lucide-react';
import api from '../../../api/axios.js';
import ConfirmModal from '../../../components/common/ConfirmModal.jsx';
import { useNotification } from '../../../context/NotificationContext.jsx';

const ALL_FDI_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
];

const SEVERITY_BADGES = {
  Mild: 'bg-blue-100 text-blue-800 border-blue-200',
  Moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  Severe: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function DiagnosisTab({ consultation, isReadOnly = false }) {
  const consultationId = consultation?._id || consultation?.id;
  const patientId = consultation?.patient?._id || consultation?.patient?.id;
  const { showSuccess, showError } = useNotification();

  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation state
  const [deletingDiagnosis, setDeletingDiagnosis] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add Form state
  const [diagnosisText, setDiagnosisText] = useState('');
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [notes, setNotes] = useState('');
  const [severity, setSeverity] = useState('');
  const [relatedTeeth, setRelatedTeeth] = useState([]);

  // Edit Modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editDiagnosisText, setEditDiagnosisText] = useState('');
  const [editClinicalFindings, setEditClinicalFindings] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSeverity, setEditSeverity] = useState('');
  const [editRelatedTeeth, setEditRelatedTeeth] = useState([]);

  const fetchDiagnoses = async () => {
    if (!consultationId) return;
    try {
      setLoading(true);
      const res = await api.get(`/diagnoses?consultation=${consultationId}`);
      setDiagnoses(res.data?.diagnoses || []);
    } catch (err) {
      console.error('Failed to load diagnoses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnoses();
  }, [consultationId]);

  const toggleTooth = (tNum, isEdit = false) => {
    if (isReadOnly) return;
    if (isEdit) {
      if (editRelatedTeeth.includes(tNum)) {
        setEditRelatedTeeth(editRelatedTeeth.filter((t) => t !== tNum));
      } else {
        setEditRelatedTeeth([...editRelatedTeeth, tNum]);
      }
    } else {
      if (relatedTeeth.includes(tNum)) {
        setRelatedTeeth(relatedTeeth.filter((t) => t !== tNum));
      } else {
        setRelatedTeeth([...relatedTeeth, tNum]);
      }
    }
  };

  const handleAddDiagnosis = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!diagnosisText || !diagnosisText.trim()) {
      showError('Diagnosis title is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        consultation: consultationId,
        patient: patientId,
        diagnosis: diagnosisText.trim(),
        clinicalFindings: clinicalFindings ? clinicalFindings.trim() : '',
        notes: notes ? notes.trim() : '',
        severity: severity || undefined,
        relatedTeeth,
      };

      await api.post('/diagnoses', payload);
      showSuccess('Diagnosis added successfully!');

      setDiagnosisText('');
      setClinicalFindings('');
      setNotes('');
      setSeverity('');
      setRelatedTeeth([]);

      fetchDiagnoses();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to add diagnosis.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item) => {
    if (isReadOnly) return;
    setEditingItem(item);
    setEditDiagnosisText(item.diagnosis || '');
    setEditClinicalFindings(item.clinicalFindings || '');
    setEditNotes(item.notes || '');
    setEditSeverity(item.severity || '');
    setEditRelatedTeeth(item.relatedTeeth || []);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (isReadOnly || !editingItem) return;
    if (!editDiagnosisText || !editDiagnosisText.trim()) {
      showError('Diagnosis title is required.');
      return;
    }

    setSubmitting(true);
    try {
      const diagId = editingItem._id || editingItem.id;
      await api.patch(`/diagnoses/${diagId}`, {
        diagnosis: editDiagnosisText.trim(),
        clinicalFindings: editClinicalFindings ? editClinicalFindings.trim() : '',
        notes: editNotes ? editNotes.trim() : '',
        severity: editSeverity || undefined,
        relatedTeeth: editRelatedTeeth,
      });

      showSuccess('Diagnosis updated successfully!');
      setEditingItem(null);
      fetchDiagnoses();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update diagnosis.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteDiagnosis = async () => {
    if (!deletingDiagnosis || isReadOnly) return;
    setDeleteLoading(true);
    const diagId = deletingDiagnosis._id || deletingDiagnosis.id;
    try {
      await api.delete(`/diagnoses/${diagId}`);
      showSuccess('Diagnosis entry deleted successfully.');
      setDiagnoses((prev) => prev.filter((d) => (d._id || d.id) !== diagId));
      setDeletingDiagnosis(null);
      fetchDiagnoses();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete diagnosis.');
      setDeletingDiagnosis(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* FORM: ADD DIAGNOSIS (Hidden when read-only) */}
      {!isReadOnly && (
        <div className="card p-5 space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Stethoscope size={18} className="text-brand" /> Add Clinical Diagnosis
            </h3>
            <p className="text-xs text-ink-soft">
              Record diagnosis, severity, supporting clinical findings, and link related FDI teeth.
            </p>
          </div>

          <form onSubmit={handleAddDiagnosis} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-ink-soft mb-1">Diagnosis Title / Condition *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Irreversible Pulpitis, Dental Caries, Chronic Periodontitis"
                  value={diagnosisText}
                  onChange={(e) => setDiagnosisText(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Severity Rating</label>
                <select
                  className="input-field"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <option value="">Unspecified</option>
                  <option value="Mild">Mild</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Clinical Findings</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Deep occlusal cavity, tenderness on percussion"
                  value={clinicalFindings}
                  onChange={(e) => setClinicalFindings(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Notes & Recommendations</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Additional notes for treatment planning..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-border/60">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-ink-soft">
                  Related Teeth ({relatedTeeth.length} selected):
                </label>
                {relatedTeeth.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRelatedTeeth([])}
                    className="text-rose-600 text-[11px] font-semibold hover:underline"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-border bg-bg/40 max-h-32 overflow-y-auto">
                {ALL_FDI_TEETH.map((tNum) => {
                  const isSel = relatedTeeth.includes(tNum);
                  return (
                    <button
                      type="button"
                      key={tNum}
                      onClick={() => toggleTooth(tNum)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                        isSel
                          ? 'bg-brand text-white shadow-sm'
                          : 'bg-surface border border-border text-ink-soft hover:bg-bg'
                      }`}
                    >
                      #{tNum}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={submitting} className="btn-primary">
                <Plus size={16} />
                <span>{submitting ? 'Adding...' : 'Add Diagnosis'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DIAGNOSES LIST TABLE / CARDS */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-ink">
              Recorded Diagnoses ({diagnoses.length})
            </h3>
            <p className="text-xs text-ink-soft">
              Active diagnostic entries for this consultation visit.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-ink-soft">Loading diagnoses...</div>
        ) : diagnoses.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-soft space-y-2">
            <Stethoscope size={28} className="mx-auto text-ink-soft/40" />
            <p className="font-semibold text-ink">No diagnoses recorded for this visit.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {diagnoses.map((diag) => {
              const diagId = diag._id || diag.id;
              return (
                <div
                  key={diagId}
                  className="rounded-xl border border-border p-4 bg-surface hover:border-brand/30 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-display text-sm font-bold text-ink">{diag.diagnosis}</h4>
                        {diag.severity && (
                          <span className={`badge border ${SEVERITY_BADGES[diag.severity] || 'bg-slate-100 text-slate-800'}`}>
                            {diag.severity} Severity
                          </span>
                        )}
                      </div>

                      {diag.relatedTeeth && diag.relatedTeeth.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[11px] pt-1">
                          <span className="text-ink-soft font-semibold">Related Teeth:</span>
                          {diag.relatedTeeth.map((tNum) => (
                            <span
                              key={tNum}
                              className="px-1.5 py-0.5 rounded-md bg-brand-light/30 text-brand-dark font-mono font-bold border border-brand-light text-[11px]"
                            >
                              #{tNum}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {!isReadOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(diag)}
                          title="Edit Diagnosis"
                          className="p-1.5 text-ink-soft hover:text-ink rounded-lg hover:bg-bg border border-transparent hover:border-border transition-colors"
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingDiagnosis(diag)}
                          title="Delete Diagnosis"
                          className="p-1.5 text-ink-soft hover:text-rose-600 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  {diag.clinicalFindings && (
                    <div className="text-xs text-ink">
                      <span className="font-semibold text-ink-soft">Clinical Findings: </span>
                      {diag.clinicalFindings}
                    </div>
                  )}

                  {diag.notes && (
                    <div className="text-xs text-ink-soft italic bg-bg/50 p-2 rounded-lg border border-border/50">
                      Notes & Recommendations: {diag.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT DIAGNOSIS MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-lg max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Edit3 size={18} className="text-brand" /> Edit Clinical Diagnosis
              </h3>
              <button onClick={() => setEditingItem(null)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Diagnosis Title / Condition *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editDiagnosisText}
                    onChange={(e) => setEditDiagnosisText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Severity Rating</label>
                  <select
                    className="input-field"
                    value={editSeverity}
                    onChange={(e) => setEditSeverity(e.target.value)}
                  >
                    <option value="">Unspecified</option>
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Clinical Findings</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editClinicalFindings}
                    onChange={(e) => setEditClinicalFindings(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Notes & Recommendations</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>

                <div className="space-y-2 pt-1 border-t border-border/60">
                  <label className="block font-semibold text-ink-soft">
                    Related Teeth ({editRelatedTeeth.length} selected):
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-border bg-bg/40 max-h-32 overflow-y-auto">
                    {ALL_FDI_TEETH.map((tNum) => {
                      const isSel = editRelatedTeeth.includes(tNum);
                      return (
                        <button
                          type="button"
                          key={tNum}
                          onClick={() => toggleTooth(tNum, true)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                            isSel
                              ? 'bg-brand text-white shadow-sm'
                              : 'bg-surface border border-border text-ink-soft hover:bg-bg'
                          }`}
                        >
                          #{tNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deletingDiagnosis)}
        onClose={() => setDeletingDiagnosis(null)}
        onConfirm={confirmDeleteDiagnosis}
        title="Confirm Delete Diagnosis"
        message={
          deletingDiagnosis ? (
            <p className="text-xs">
              Are you sure you want to delete diagnosis entry{' '}
              <strong className="text-ink font-bold font-mono">"{deletingDiagnosis.diagnosis}"</strong>?
            </p>
          ) : (
            'Are you sure you want to delete this diagnosis entry?'
          )
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
