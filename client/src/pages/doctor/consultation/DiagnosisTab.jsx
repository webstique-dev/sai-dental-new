import { useState, useEffect } from 'react';
import {
  Stethoscope, Plus, Trash2, CheckCircle2, AlertTriangle, Layers, Tag, X, FileText,
} from 'lucide-react';
import api from '../../../api/axios.js';

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

  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form state
  const [diagnosisText, setDiagnosisText] = useState('');
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [notes, setNotes] = useState('');
  const [severity, setSeverity] = useState('');
  const [relatedTeeth, setRelatedTeeth] = useState([]);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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

  const toggleTooth = (tNum) => {
    if (isReadOnly) return;
    if (relatedTeeth.includes(tNum)) {
      setRelatedTeeth(relatedTeeth.filter((t) => t !== tNum));
    } else {
      setRelatedTeeth([...relatedTeeth, tNum]);
    }
  };

  const handleAddDiagnosis = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!diagnosisText || !diagnosisText.trim()) {
      setErrorMessage('Diagnosis description is required.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const payload = {
        consultation: consultationId,
        patient: patientId,
        diagnosis: diagnosisText.trim(),
        clinicalFindings,
        notes,
        severity: severity || undefined,
        relatedTeeth,
      };

      await api.post('/diagnoses', payload);
      setSuccessMessage('Diagnosis added successfully!');

      // Reset form
      setDiagnosisText('');
      setClinicalFindings('');
      setNotes('');
      setSeverity('');
      setRelatedTeeth([]);

      fetchDiagnoses();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to add diagnosis.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (diagId) => {
    if (isReadOnly) return;
    setDeletingId(diagId);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await api.delete(`/diagnoses/${diagId}`);
      setSuccessMessage('Diagnosis entry deleted.');
      fetchDiagnoses();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete diagnosis.');
    } finally {
      setDeletingId(null);
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

      {/* Form: Add Diagnosis (Hidden when read-only) */}
      {!isReadOnly && (
        <div className="card p-5 space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Stethoscope size={18} className="text-brand" /> Add Clinical Diagnosis
            </h3>
            <p className="text-xs text-ink-soft">
              Record findings, select severity rating, and link related FDI teeth.
            </p>
          </div>

          <form onSubmit={handleAddDiagnosis} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-ink-soft mb-1">Diagnosis Title / Condition *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Irreversible Pulpitis, Class II Dental Caries, Chronic Periodontitis"
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
                  placeholder="e.g. Tenderness on percussion, deep occlusal cavity"
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

            {/* Interactive Tooth Chip Selector */}
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
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${isSel
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
                <span>{submitting ? 'Adding...' : 'Add Diagnosis Entry'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RUNNING LIST OF DIAGNOSES */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-ink">
              Diagnoses for Current Consultation ({diagnoses.length})
            </h3>
            <p className="text-xs text-ink-soft">
              Active diagnostic record for this visit.
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
                      <div className="flex items-center gap-2">
                        <h4 className="font-display text-sm font-bold text-ink">{diag.diagnosis}</h4>
                        {diag.severity && (
                          <span className={`badge border ${SEVERITY_BADGES[diag.severity] || ''}`}>
                            {diag.severity}
                          </span>
                        )}
                      </div>

                      {/* Related Teeth chips */}
                      {diag.relatedTeeth && diag.relatedTeeth.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[11px] pt-1">
                          <span className="text-ink-soft font-semibold">Teeth:</span>
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
                      <button
                        disabled={deletingId === diagId}
                        onClick={() => handleDelete(diagId)}
                        title="Delete Diagnosis"
                        className="p-1.5 text-ink-soft hover:text-rose-600 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {diag.clinicalFindings && (
                    <div className="text-xs text-ink">
                      <span className="font-semibold text-ink-soft">Findings: </span>
                      {diag.clinicalFindings}
                    </div>
                  )}

                  {diag.notes && (
                    <div className="text-xs text-ink-soft italic bg-bg/50 p-2 rounded-lg border border-border/50">
                      Notes: {diag.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
