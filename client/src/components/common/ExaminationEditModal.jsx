import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Stethoscope, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';
import api from '../../api/axios.js';
import { useNotification } from '../../context/NotificationContext.jsx';

const EXTRAORAL_OPTIONS = ['Facial Symmetry', 'TMJ', 'Lymph Nodes', 'Swelling', 'Muscle Tenderness'];
const SOFT_TISSUE_OPTIONS = ['Labial/Buccal Mucosa', 'Tongue', 'Floor of Mouth', 'Gingiva', 'Hard Palate', 'Soft Palate', 'Tonsillar Area'];
const GINGIVAL_OPTIONS = ['Healthy', 'Gingivitis', 'Periodontitis', 'Enlargement', 'Recession', 'Bleeding on Probing'];

export default function ExaminationEditModal({
  isOpen,
  consultation,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const { showSuccess, showError } = useNotification();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    chiefComplaints: '',
    extraoral: [],
    softTissue: [],
    gingivalFindings: [],
    periodontalDetails: '',
    overallNotes: '',
  });

  const [newExtraoralFinding, setNewExtraoralFinding] = useState('');
  const [newExtraoralNotes, setNewExtraoralNotes] = useState('');

  const [newSoftTissueArea, setNewSoftTissueArea] = useState('');
  const [newSoftTissueNotes, setNewSoftTissueNotes] = useState('');

  useEffect(() => {
    if (consultation) {
      const exam = consultation.examination || {};
      setFormData({
        chiefComplaints: consultation.chiefComplaints || consultation.reason || exam.chiefComplaints || '',
        extraoral: Array.isArray(exam.extraoral) ? JSON.parse(JSON.stringify(exam.extraoral)) : [],
        softTissue: Array.isArray(exam.softTissue) ? JSON.parse(JSON.stringify(exam.softTissue)) : [],
        gingivalFindings: Array.isArray(exam.gingivalFindings) ? [...exam.gingivalFindings] : [],
        periodontalDetails: exam.periodontalDetails || '',
        overallNotes: exam.overallNotes || consultation.clinicalNotes || consultation.notes || '',
      });
      setErrorMessage('');
    }
  }, [consultation]);

  if (!isOpen || !consultation) return null;

  const consultationId = consultation.consultationId || consultation._id || consultation.id;
  const examId = consultation.examination?._id || consultation.examination?.id;

  const handleAddExtraoral = () => {
    if (!newExtraoralFinding.trim()) return;
    setFormData((prev) => ({
      ...prev,
      extraoral: [...prev.extraoral, { finding: newExtraoralFinding.trim(), notes: newExtraoralNotes.trim() }],
    }));
    setNewExtraoralFinding('');
    setNewExtraoralNotes('');
  };

  const handleRemoveExtraoral = (index) => {
    setFormData((prev) => ({
      ...prev,
      extraoral: prev.extraoral.filter((_, i) => i !== index),
    }));
  };

  const handleAddSoftTissue = () => {
    if (!newSoftTissueArea.trim()) return;
    setFormData((prev) => ({
      ...prev,
      softTissue: [...prev.softTissue, { area: newSoftTissueArea.trim(), notes: newSoftTissueNotes.trim() }],
    }));
    setNewSoftTissueArea('');
    setNewSoftTissueNotes('');
  };

  const handleRemoveSoftTissue = (index) => {
    setFormData((prev) => ({
      ...prev,
      softTissue: prev.softTissue.filter((_, i) => i !== index),
    }));
  };

  const handleToggleGingival = (item) => {
    setFormData((prev) => {
      const exists = prev.gingivalFindings.includes(item);
      const updated = exists
        ? prev.gingivalFindings.filter((g) => g !== item)
        : [...prev.gingivalFindings, item];
      return { ...prev, gingivalFindings: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');

    try {
      const targetPatientId = consultation.patient?._id || consultation.patient?.id || consultation.patient || consultation.patientId;
      const payload = {
        consultation: consultationId,
        patient: targetPatientId || undefined,
        chiefComplaints: formData.chiefComplaints.trim(),
        extraoral: formData.extraoral,
        softTissue: formData.softTissue,
        gingivalFindings: formData.gingivalFindings,
        periodontalDetails: formData.periodontalDetails.trim(),
        overallNotes: formData.overallNotes.trim(),
      };

      let res;
      if (examId) {
        res = await api.patch(`/examinations/${examId}`, payload);
      } else {
        res = await api.post('/examinations', payload);
      }

      showSuccess('Doctor examination record updated successfully!');
      onSuccess(res.data?.examination);
      onClose();
    } catch (err) {
      console.error('Error updating examination record:', err);
      const msg = err.response?.data?.message || 'Failed to update examination record.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-150 !mt-0">
      <div className="card w-full max-w-2xl sm:max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150 !mt-0 !my-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-3.5 bg-surface shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold shrink-0">
              <Stethoscope size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-lg font-bold text-ink">
                Edit Doctor Examination Record
              </h3>
              <p className="text-[11px] text-ink-soft truncate">
                Update clinical examination findings, complaints, soft tissue, and periodontal records
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

            {/* Chief Complaints */}
            <div className="card p-3.5 bg-bg/40 space-y-2 border border-border">
              <label className="block font-bold text-ink text-xs uppercase tracking-wider text-brand">
                Chief Complaints
              </label>
              <textarea
                rows={2}
                className="input-field text-xs"
                placeholder="Patient's primary concerns and reported symptoms..."
                value={formData.chiefComplaints}
                onChange={(e) => setFormData({ ...formData, chiefComplaints: e.target.value })}
              />
            </div>

            {/* 1. Extraoral Examination */}
            <div className="card p-3.5 bg-bg/40 space-y-3 border border-border">
              <div className="flex items-center justify-between border-b border-border/80 pb-2">
                <h4 className="font-bold text-ink text-xs uppercase tracking-wider text-brand">
                  1. Extraoral Examination Findings
                </h4>
                <span className="badge bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                  {formData.extraoral.length} Finding(s)
                </span>
              </div>

              {formData.extraoral.length > 0 && (
                <div className="space-y-2">
                  {formData.extraoral.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface border border-border text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-ink">{item.finding}</span>
                        {item.notes && <span className="text-ink-soft ml-2 text-[11px]">— {item.notes}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraoral(idx)}
                        className="text-rose-600 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                        title="Remove Finding"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Extraoral */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    list="extraoral-options"
                    className="input-field text-xs py-1.5"
                    placeholder="Finding (e.g. Swelling, TMJ)..."
                    value={newExtraoralFinding}
                    onChange={(e) => setNewExtraoralFinding(e.target.value)}
                  />
                  <datalist id="extraoral-options">
                    {EXTRAORAL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    className="input-field text-xs py-1.5"
                    placeholder="Clinical notes / observations..."
                    value={newExtraoralNotes}
                    onChange={(e) => setNewExtraoralNotes(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddExtraoral}
                    disabled={!newExtraoralFinding.trim()}
                    className="btn-secondary text-xs py-1.5 px-3 w-full justify-center inline-flex items-center gap-1 disabled:opacity-40"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Intraoral Soft Tissue */}
            <div className="card p-3.5 bg-bg/40 space-y-3 border border-border">
              <div className="flex items-center justify-between border-b border-border/80 pb-2">
                <h4 className="font-bold text-ink text-xs uppercase tracking-wider text-brand">
                  2. Intraoral Soft Tissue Findings
                </h4>
                <span className="badge bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-bold">
                  {formData.softTissue.length} Finding(s)
                </span>
              </div>

              {formData.softTissue.length > 0 && (
                <div className="space-y-2">
                  {formData.softTissue.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface border border-border text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-ink">{item.area}</span>
                        {item.notes && <span className="text-ink-soft ml-2 text-[11px]">— {item.notes}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSoftTissue(idx)}
                        className="text-rose-600 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                        title="Remove Area"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Soft Tissue */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    list="soft-tissue-options"
                    className="input-field text-xs py-1.5"
                    placeholder="Area (e.g. Labial Mucosa, Tongue)..."
                    value={newSoftTissueArea}
                    onChange={(e) => setNewSoftTissueArea(e.target.value)}
                  />
                  <datalist id="soft-tissue-options">
                    {SOFT_TISSUE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    className="input-field text-xs py-1.5"
                    placeholder="Clinical findings / observations..."
                    value={newSoftTissueNotes}
                    onChange={(e) => setNewSoftTissueNotes(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddSoftTissue}
                    disabled={!newSoftTissueArea.trim()}
                    className="btn-secondary text-xs py-1.5 px-3 w-full justify-center inline-flex items-center gap-1 disabled:opacity-40"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Gingival & Periodontal */}
            <div className="card p-3.5 bg-bg/40 space-y-3 border border-border">
              <h4 className="font-bold text-ink text-xs uppercase tracking-wider text-brand border-b border-border/80 pb-2">
                3. Gingival & Periodontal Findings
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GINGIVAL_OPTIONS.map((gOpt) => {
                  const checked = formData.gingivalFindings.includes(gOpt);
                  return (
                    <label
                      key={gOpt}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                        checked
                          ? 'border-brand bg-brand-light/30 text-brand font-semibold'
                          : 'border-border bg-surface text-ink hover:bg-bg'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleGingival(gOpt)}
                        className="rounded border-border text-brand focus:ring-brand"
                      />
                      <span>{gOpt}</span>
                    </label>
                  );
                })}
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1 text-[11px]">
                  Periodontal & Pocket Probing Details
                </label>
                <textarea
                  rows={2}
                  className="input-field text-xs"
                  placeholder="Pocket depths, calculus index, bleeding index details..."
                  value={formData.periodontalDetails}
                  onChange={(e) => setFormData({ ...formData, periodontalDetails: e.target.value })}
                />
              </div>
            </div>

            {/* 4. Overall Clinical Notes */}
            <div className="card p-3.5 bg-bg/40 space-y-2 border border-border">
              <label className="block font-bold text-ink text-xs uppercase tracking-wider text-brand">
                4. Overall Clinical Examination Notes
              </label>
              <textarea
                rows={3}
                className="input-field text-xs"
                placeholder="Comprehensive diagnosis notes, prognosis, and treatment recommendations..."
                value={formData.overallNotes}
                onChange={(e) => setFormData({ ...formData, overallNotes: e.target.value })}
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
              <span>{saving ? 'Saving...' : 'Save Examination Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
