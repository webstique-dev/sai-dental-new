import { useState, useEffect } from 'react';
import {
  Search, Plus, CheckCircle2, AlertTriangle, FileText, ExternalLink, Edit3, X, Clock,
} from 'lucide-react';
import api from '../../../api/axios.js';

export default function InvestigationsTab({ consultation, isReadOnly = false }) {
  const consultationId = consultation?._id || consultation?.id;
  const patientId = consultation?.patient?._id || consultation?.patient?.id;

  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeResultItem, setActiveResultItem] = useState(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form State: Create Investigation
  const [type, setType] = useState('X-Ray');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState('');

  // Form State: Enter Result Modal
  const [resultText, setResultText] = useState('');
  const [resultAttachment, setResultAttachment] = useState('');

  const fetchInvestigations = async () => {
    if (!consultationId) return;
    try {
      setLoading(true);
      const res = await api.get(`/investigations?consultation=${consultationId}`);
      setInvestigations(res.data?.investigations || []);
    } catch (err) {
      console.error('Failed to load investigations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, [consultationId]);

  const handleCreateInvestigation = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!reason || !reason.trim()) {
      setErrorMessage('Reason for investigation is required.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const payload = {
        consultation: consultationId,
        patient: patientId,
        type,
        reason: reason.trim(),
        notes: notes ? notes.trim() : '',
        attachment: attachment ? attachment.trim() : '',
      };

      await api.post('/investigations', payload);
      setSuccessMessage('Investigation order created successfully!');

      // Reset form
      setType('X-Ray');
      setReason('');
      setNotes('');
      setAttachment('');

      fetchInvestigations();
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to create investigation.');
    } finally {
      setSubmitting(false);
    }
  };

  const openResultModal = (item) => {
    if (isReadOnly) return;
    setActiveResultItem(item);
    setResultText(item.result || '');
    setResultAttachment(item.attachment || '');
    setErrorMessage('');
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (isReadOnly || !activeResultItem) return;

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const itemId = activeResultItem._id || activeResultItem.id;
      await api.patch(`/investigations/${itemId}`, {
        result: resultText,
        attachment: resultAttachment,
      });

      setSuccessMessage('Investigation results updated successfully!');
      setActiveResultItem(null);
      fetchInvestigations();
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update results.');
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
      {errorMessage && !activeResultItem && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800 border border-rose-200">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* FORM: CREATE INVESTIGATION ORDER (Hidden when read-only) */}
      {!isReadOnly && (
        <div className="card p-5 space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Search size={18} className="text-brand" /> Order Diagnostic Investigation
            </h3>
            <p className="text-xs text-ink-soft">
              Request X-Rays (IOPAR/OPG), Blood Tests, or other diagnostic imaging.
            </p>
          </div>

          <form onSubmit={handleCreateInvestigation} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Investigation Type *</label>
                <select
                  className="input-field"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="X-Ray">X-Ray (IOPAR / OPG / CBCT)</option>
                  <option value="Blood Tests">Blood Tests (CBC / Bleeding Time)</option>
                  <option value="Other">Other Diagnostic Test</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-ink-soft mb-1">Reason / Region of Interest *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. IOPAR wrt #16, Periapical evaluation, Bleeding Time test"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Clinical Notes & Instructions</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Special positioning or lab instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Attachment URL (Optional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://... file reference URL"
                  value={attachment}
                  onChange={(e) => setAttachment(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button type="submit" disabled={submitting} className="btn-primary">
                <Plus size={16} />
                <span>{submitting ? 'Ordering...' : 'Order Investigation'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RUNNING LIST OF INVESTIGATIONS */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-ink">
              Investigation Orders & Results ({investigations.length})
            </h3>
            <p className="text-xs text-ink-soft">
              Track pending diagnostic requests and document report findings.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-ink-soft">Loading investigations...</div>
        ) : investigations.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-soft space-y-2">
            <Search size={28} className="mx-auto text-ink-soft/40" />
            <p className="font-semibold text-ink">No investigations ordered for this visit yet.</p>
            <p>Fill out the form above to order X-Rays or lab tests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {investigations.map((item) => {
              const itemId = item._id || item.id;
              const hasResult = Boolean(item.result && item.result.trim());

              return (
                <div
                  key={itemId}
                  className="rounded-xl border border-border p-4 bg-surface hover:border-brand/30 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="badge bg-brand-light/40 text-brand-dark border-brand-light font-bold">
                        {item.type}
                      </span>
                      <h4 className="font-display text-sm font-bold text-ink">{item.reason}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasResult ? (
                        <span className="badge bg-emerald-100 text-emerald-800 border-emerald-200">
                          Results Available
                        </span>
                      ) : (
                        <span className="badge bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                          <Clock size={12} /> Pending Results
                        </span>
                      )}

                      <button
                        onClick={() => openResultModal(item)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline border border-border rounded-lg px-2.5 py-1 hover:bg-bg"
                      >
                        <Edit3 size={13} /> {hasResult ? 'Edit Results' : 'Fill Results'}
                      </button>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-ink-soft">
                      <span className="font-semibold text-ink">Order Notes: </span>
                      {item.notes}
                    </p>
                  )}

                  {/* Results Section */}
                  {hasResult ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs space-y-1">
                      <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-600" /> Diagnostic Result / Report:
                      </p>
                      <p className="text-emerald-950 whitespace-pre-wrap">{item.result}</p>
                      {item.attachment && (
                        <a
                          href={item.attachment}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-brand hover:underline pt-1"
                        >
                          <ExternalLink size={12} /> View Report Attachment
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-ink-soft/70 italic bg-bg/40 p-2.5 rounded-lg border border-border/50">
                      Results pending. Click "Fill Results" above once report is received.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FILL IN RESULTS MODAL */}
      {activeResultItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-lg max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Edit3 size={18} className="text-brand" /> Record Investigation Results
              </h3>
              <button onClick={() => setActiveResultItem(null)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveResult} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-bg p-3">
                  <p className="font-bold text-ink">{activeResultItem.type} Order</p>
                  <p className="text-ink-soft">{activeResultItem.reason}</p>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Diagnostic Report / Findings *</label>
                  <textarea
                    rows={4}
                    className="input-field"
                    placeholder="e.g. IOPAR shows well-defined periapical radiolucency wrt #16 root apex. No bone loss."
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Report Image / Attachment URL</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="https://... attachment link"
                    value={resultAttachment}
                    onChange={(e) => setResultAttachment(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setActiveResultItem(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? 'Saving...' : 'Save Results'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
