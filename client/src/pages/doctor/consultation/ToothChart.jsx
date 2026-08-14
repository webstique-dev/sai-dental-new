import { useState, useEffect } from 'react';
import {
  CheckCircle2, AlertTriangle, Save, History, Layers, Info, Check, RefreshCw, X, Shield, Loader2,
} from 'lucide-react';
import api from '../../../api/axios.js';

const QUAD_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const QUAD_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const QUAD_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const QUAD_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

const CONDITION_CODES = {
  Healthy: { code: 'H', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
  Caries: { code: 'D', color: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-500' },
  Decayed: { code: 'Dec', color: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-500' },
  Filling: { code: 'F', color: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  RCT: { code: 'RCT', color: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500' },
  Crown: { code: 'Cr', color: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  Bridge: { code: 'Br', color: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  Implant: { code: 'I', color: 'bg-cyan-100 text-cyan-800 border-cyan-300', dot: 'bg-cyan-500' },
  Missing: { code: 'M', color: 'bg-slate-200 text-slate-600 border-slate-300 opacity-60', dot: 'bg-slate-400' },
  Extraction: { code: 'X', color: 'bg-slate-200 text-slate-600 border-slate-300 opacity-60', dot: 'bg-slate-400' },
  Restored: { code: 'Res', color: 'bg-teal-100 text-teal-800 border-teal-300', dot: 'bg-teal-500' },
  Prosthetic: { code: 'P', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', dot: 'bg-indigo-500' },
  Other: { code: 'O', color: 'bg-gray-100 text-gray-800 border-gray-300', dot: 'bg-gray-400' },
};

function formatTeethListPhrase(numbers) {
  if (!numbers || numbers.length === 0) return '';
  if (numbers.length === 1) return `tooth ${numbers[0]}`;
  if (numbers.length === 2) return `teeth ${numbers[0]} and ${numbers[1]}`;
  const copy = [...numbers];
  const last = copy.pop();
  return `teeth ${copy.join(', ')} and ${last}`;
}

export default function ToothChart({ patientId, consultationId, isReadOnly = false }) {
  const [teethMap, setTeethMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form state for updating selected tooth/teeth
  const [formCondition, setFormCondition] = useState('Healthy');
  const [formTreatment, setFormTreatment] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchToothChart = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const res = await api.get(`/tooth-chart/${patientId}`);
      const teethList = res.data?.teeth || [];
      const map = {};
      teethList.forEach((t) => {
        map[t.toothNumber] = t;
      });
      setTeethMap(map);
    } catch (err) {
      console.error('Failed to load tooth chart:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load tooth chart.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToothChart();
  }, [patientId]);

  const handleToothClick = (tNum) => {
    if (multiSelectMode) {
      if (selectedTeeth.includes(tNum)) {
        setSelectedTeeth(selectedTeeth.filter((t) => t !== tNum));
      } else {
        setSelectedTeeth([...selectedTeeth, tNum]);
      }
    } else {
      if (selectedTeeth.length === 1 && selectedTeeth[0] === tNum) {
        setSelectedTeeth([]);
      } else {
        setSelectedTeeth([tNum]);
        // Pre-fill form with clicked tooth's current condition
        const current = teethMap[tNum]?.currentCondition || 'Healthy';
        setFormCondition(current);
        setFormTreatment('');
        setFormNotes('');
      }
    }
  };

  const handleSaveCondition = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (selectedTeeth.length === 0) {
      setErrorMessage('Please click one or more teeth on the chart first.');
      return;
    }

    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      if (selectedTeeth.length === 1) {
        const tNum = selectedTeeth[0];
        await api.patch(`/tooth-chart/${patientId}/${tNum}`, {
          condition: formCondition,
          treatment: formTreatment,
          notes: formNotes,
          consultationId,
        });
      } else {
        await api.post(`/tooth-chart/${patientId}/bulk`, {
          teeth: selectedTeeth,
          condition: formCondition,
          treatment: formTreatment,
          notes: formNotes,
          consultationId,
        });
      }

      setSuccessMessage(
        `Updated ${selectedTeeth.length} tooth record(s) to ${formCondition}!`
      );
      setFormTreatment('');
      setFormNotes('');
      await fetchToothChart();
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update tooth chart.');
    } finally {
      setSaving(false);
    }
  };

  // Render a single Tooth Card/Element
  const renderToothCard = (tNum) => {
    const record = teethMap[tNum] || {};
    const cond = record.currentCondition || 'Healthy';
    const info = CONDITION_CODES[cond] || CONDITION_CODES.Healthy;
    const isSelected = selectedTeeth.includes(tNum);
    const hasHistory = record.history && record.history.length > 0;

    return (
      <button
        type="button"
        key={tNum}
        onClick={() => handleToothClick(tNum)}
        className={`flex flex-col items-center justify-between p-2 rounded-xl border transition-all duration-150 relative select-none min-w-[42px] sm:min-w-[48px] h-20 ${
          isSelected
            ? 'border-brand bg-brand-light/40 shadow-md ring-2 ring-brand scale-105 z-10'
            : 'border-border bg-surface hover:bg-bg/80 hover:border-brand/50'
        }`}
      >
        {/* Top: Tooth Number */}
        <span className="font-mono text-xs font-bold text-ink">{tNum}</span>

        {/* Center Visual Indicator */}
        <div className="flex flex-col items-center gap-0.5 my-1">
          <div className={`h-3.5 w-3.5 rounded-full border ${info.color} flex items-center justify-center font-mono text-[9px] font-bold`}>
            {info.code}
          </div>
          <span className="text-[10px] font-semibold text-ink-soft truncate max-w-[42px]">
            {cond}
          </span>
        </div>

        {/* Bottom indicator for historical entries count */}
        {hasHistory ? (
          <span className="text-[9px] font-bold text-brand flex items-center gap-0.5">
            <History size={10} /> {record.history.length}
          </span>
        ) : (
          <span className="text-[9px] text-ink-soft/40">—</span>
        )}
      </button>
    );
  };

  const selectedToothSingle = selectedTeeth.length === 1 ? teethMap[selectedTeeth[0]] : null;
  const totalHistoryCount = selectedTeeth.reduce((acc, tNum) => acc + (teethMap[tNum]?.history?.length || 0), 0);

  const historySubtitleText = loading
    ? 'Loading treatment history...'
    : selectedTeeth.length === 0
    ? 'Select a tooth to view its permanent treatment log across all visits.'
    : selectedTeeth.length === 1
    ? `Permanent treatment log for Tooth #${selectedTeeth[0]}`
    : `Treatment history for the selected teeth (${selectedTeeth.join(', ')})`;

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

      {/* Chart Toolbar & Legend */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Layers size={18} className="text-brand" /> FDI Interactive Tooth Chart
            </h3>
            <p className="text-xs text-ink-soft">
              Click a tooth to view treatment history or select multiple teeth to record conditions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMultiSelectMode(!multiSelectMode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                multiSelectMode
                  ? 'bg-purple-600 text-white border-purple-700'
                  : 'bg-surface border-border text-ink-soft hover:text-ink'
              }`}
            >
              {multiSelectMode ? 'Multi-Select Enabled' : 'Enable Multi-Select'}
            </button>

            {selectedTeeth.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTeeth([])}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
              >
                <X size={14} /> Clear ({selectedTeeth.length})
              </button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          {Object.entries(CONDITION_CODES).map(([label, cfg]) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${cfg.color}`}
            >
              <span className="font-mono text-[10px] font-bold">[{cfg.code}]</span> {label}
            </span>
          ))}
        </div>
      </div>

      {/* FDI CHART GRID ARCHES */}
      <div className="card p-5 space-y-6 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-soft">Loading patient tooth records...</div>
        ) : (
          <div className="min-w-[650px] space-y-6">
            {/* UPPER ARCH (Maxillary) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-ink-soft uppercase tracking-wider px-2">
                <span>Maxillary Right (18 - 11)</span>
                <span className="text-brand font-display font-extrabold">UPPER ARCH</span>
                <span>Maxillary Left (21 - 28)</span>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-bg/40 p-3 rounded-2xl border border-border">
                {/* Upper Right Quadrant */}
                <div className="flex justify-end gap-1.5">
                  {QUAD_UPPER_RIGHT.map(renderToothCard)}
                </div>
                {/* Upper Left Quadrant */}
                <div className="flex justify-start gap-1.5 border-l border-border/80 pl-3">
                  {QUAD_UPPER_LEFT.map(renderToothCard)}
                </div>
              </div>
            </div>

            {/* LOWER ARCH (Mandibular) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-ink-soft uppercase tracking-wider px-2">
                <span>Mandibular Right (48 - 41)</span>
                <span className="text-brand font-display font-extrabold">LOWER ARCH</span>
                <span>Mandibular Left (31 - 38)</span>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-bg/40 p-3 rounded-2xl border border-border">
                {/* Lower Right Quadrant */}
                <div className="flex justify-end gap-1.5">
                  {QUAD_LOWER_RIGHT.map(renderToothCard)}
                </div>
                {/* Lower Left Quadrant */}
                <div className="flex justify-start gap-1.5 border-l border-border/80 pl-3">
                  {QUAD_LOWER_LEFT.map(renderToothCard)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL INSPECTION & UPDATE FORM PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Update Form (Hidden when read-only) */}
        {!isReadOnly && (
          <div className="lg:col-span-5 card p-5 space-y-4">
            <div className="border-b border-border pb-3">
              <h4 className="font-display text-sm font-bold text-ink">
                {selectedTeeth.length === 0
                  ? 'Record Finding for Selected Teeth'
                  : selectedTeeth.length === 1
                  ? `Update Tooth #${selectedTeeth[0]}`
                  : `Update ${selectedTeeth.length} Selected Teeth (${selectedTeeth.join(', ')})`}
              </h4>
              <p className="text-xs text-ink-soft">
                Select teeth on the chart above and assign new conditions.
              </p>
            </div>

            <form onSubmit={handleSaveCondition} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">New Condition *</label>
                <select
                  className="input-field"
                  value={formCondition}
                  onChange={(e) => setFormCondition(e.target.value)}
                >
                  <option value="Healthy">Healthy [H]</option>
                  <option value="Caries">Caries / Cavity [D]</option>
                  <option value="Decayed">Decayed [Dec]</option>
                  <option value="Filling">Filling [F]</option>
                  <option value="RCT">Root Canal Therapy [RCT]</option>
                  <option value="Crown">Crown [Cr]</option>
                  <option value="Bridge">Bridge [Br]</option>
                  <option value="Implant">Implant [I]</option>
                  <option value="Missing">Missing [M]</option>
                  <option value="Extraction">Extraction Indicated / Done [X]</option>
                  <option value="Restored">Restored [Res]</option>
                  <option value="Prosthetic">Prosthetic [P]</option>
                  <option value="Other">Other [O]</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Treatment Performed / Planned</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Composite Restoration, Pulpectomy"
                  value={formTreatment}
                  onChange={(e) => setFormTreatment(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Clinical Notes</label>
                <textarea
                  rows={2}
                  className="input-field"
                  placeholder="Diagnostic observations, surface details (MO, DO, MOD)..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={saving || selectedTeeth.length === 0}
                className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={16} />
                <span>
                  {saving
                    ? 'Saving Records...'
                    : selectedTeeth.length === 0
                    ? 'Click Teeth Above First'
                    : `Apply to ${selectedTeeth.length} Tooth/Teeth`}
                </span>
              </button>
            </form>
          </div>
        )}

        {/* Right Col: Treatment History Log */}
        <div className={`${isReadOnly ? 'lg:col-span-12' : 'lg:col-span-7'} card p-5 space-y-4`}>
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h4 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                <History size={16} className="text-brand" /> Historical Treatment Log
              </h4>
              <p className="text-xs text-ink-soft">{historySubtitleText}</p>
            </div>
            {selectedTeeth.length > 1 && (
              <span className="badge bg-purple-50 text-purple-800 border border-purple-200 text-xs font-mono">
                {selectedTeeth.length} Teeth Selected
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-ink-soft flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-brand" />
              <span>Loading treatment history...</span>
            </div>
          ) : selectedTeeth.length === 0 ? (
            <div className="p-12 text-center text-xs text-ink-soft space-y-2">
              <Info size={28} className="mx-auto text-brand/50" />
              <p className="font-semibold text-ink">Select a tooth on the chart above</p>
              <p>Select any tooth to view its permanent treatment log across all visits.</p>
            </div>
          ) : selectedTeeth.length === 1 ? (
            /* SINGLE TOOTH SELECTION LOG */
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {selectedToothSingle?.history && selectedToothSingle.history.length > 0 ? (
                <div className="divide-y divide-border border rounded-xl overflow-hidden bg-bg/30">
                  {[...selectedToothSingle.history]
                    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                    .map((h, idx) => (
                      <div key={h._id || idx} className="p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span className={`badge border ${CONDITION_CODES[h.condition]?.color || 'bg-slate-100 text-slate-800'}`}>
                            {h.condition}
                          </span>
                          <span className="text-[11px] text-ink-soft font-mono">
                            {h.date ? new Date(h.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                          </span>
                        </div>

                        {h.treatment && (
                          <p className="font-bold text-ink text-xs">{h.treatment}</p>
                        )}

                        {h.notes && (
                          <p className="text-ink-soft text-[11px] italic">{h.notes}</p>
                        )}

                        <div className="text-[10px] text-ink-soft/70 text-right pt-0.5">
                          Recorded by: Dr. {h.doctor?.name || 'Doctor'}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-ink-soft space-y-1">
                  <Shield size={24} className="mx-auto text-ink-soft/40" />
                  <p className="font-semibold text-ink">No historical treatments recorded yet.</p>
                  <p>Tooth #{selectedTeeth[0]} is currently marked as {selectedToothSingle?.currentCondition || 'Healthy'}.</p>
                </div>
              )}
            </div>
          ) : (
            /* MULTIPLE TEETH SELECTION LOG */
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {totalHistoryCount === 0 ? (
                <div className="p-8 text-center text-xs text-ink-soft space-y-2 bg-bg/30 rounded-xl border border-border">
                  <Shield size={28} className="mx-auto text-ink-soft/40" />
                  <p className="font-semibold text-ink text-sm">No treatment history found</p>
                  <p className="text-ink-soft">
                    No previous treatment history found for {formatTeethListPhrase(selectedTeeth)}.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedTeeth.map((tNum) => {
                    const record = teethMap[tNum] || {};
                    const history = record.history
                      ? [...record.history].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                      : [];

                    return (
                      <div key={tNum} className="border border-border rounded-xl p-3.5 space-y-2.5 bg-bg/30">
                        <div className="flex items-center justify-between border-b border-border/70 pb-2">
                          <span className="font-mono font-bold text-sm text-ink flex items-center gap-2">
                            Tooth #{tNum}
                          </span>
                          <span className="text-xs font-semibold text-ink-soft">
                            Current: <span className="text-brand font-bold">{record.currentCondition || 'Healthy'}</span>
                          </span>
                        </div>

                        {history.length > 0 ? (
                          <div className="divide-y divide-border border border-border/60 rounded-lg overflow-hidden bg-surface">
                            {history.map((h, idx) => (
                              <div key={h._id || idx} className="p-3 text-xs space-y-1">
                                <div className="flex items-center justify-between font-semibold">
                                  <span className={`badge border ${CONDITION_CODES[h.condition]?.color || 'bg-slate-100 text-slate-800'}`}>
                                    {h.condition}
                                  </span>
                                  <span className="text-[11px] text-ink-soft font-mono">
                                    {h.date ? new Date(h.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                  </span>
                                </div>

                                {h.treatment && (
                                  <p className="font-bold text-ink text-xs">{h.treatment}</p>
                                )}

                                {h.notes && (
                                  <p className="text-ink-soft text-[11px] italic">{h.notes}</p>
                                )}

                                <div className="text-[10px] text-ink-soft/70 text-right pt-0.5">
                                  Recorded by: Dr. {h.doctor?.name || 'Doctor'}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-ink-soft italic pt-1">
                            No previous treatment history recorded for Tooth #{tNum}.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
