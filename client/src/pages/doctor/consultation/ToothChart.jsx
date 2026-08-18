import { useState, useEffect } from 'react';
import {
  CheckCircle2, AlertTriangle, Save, History, Layers, Info, Check, RefreshCw, X, Shield, Loader2,
} from 'lucide-react';
import api from '../../../api/axios.js';

// Permanent (Adult) Teeth Quadrants (32 teeth)
const QUAD_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const QUAD_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const QUAD_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const QUAD_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

// Primary (Child/Deciduous) Teeth Quadrants (20 teeth) - FDI 2-digit system
const PRIMARY_QUAD_UPPER_RIGHT = [55, 54, 53, 52, 51];
const PRIMARY_QUAD_UPPER_LEFT = [61, 62, 63, 64, 65];
const PRIMARY_QUAD_LOWER_RIGHT = [85, 84, 83, 82, 81];
const PRIMARY_QUAD_LOWER_LEFT = [71, 72, 73, 74, 75];

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

const CONDITION_SVG_STYLES = {
  Healthy: { fill: '#ECFDF5', stroke: '#10B981' },
  Caries: { fill: '#FFE4E6', stroke: '#F43F5E' },
  Decayed: { fill: '#FFE4E6', stroke: '#E11D48' },
  Filling: { fill: '#DBEAFE', stroke: '#3B82F6' },
  RCT: { fill: '#F3E8FF', stroke: '#A855F7' },
  Crown: { fill: '#FEF3C7', stroke: '#F59E0B' },
  Bridge: { fill: '#FEF3C7', stroke: '#D97706' },
  Implant: { fill: '#CFFAFE', stroke: '#06B6D4' },
  Missing: { fill: '#F8FAFC', stroke: '#94A3B8' },
  Extraction: { fill: '#F8FAFC', stroke: '#64748B' },
  Restored: { fill: '#CCFBF1', stroke: '#14B8A6' },
  Prosthetic: { fill: '#E0E7FF', stroke: '#6366F1' },
  Other: { fill: '#F3F4F6', stroke: '#6B7280' },
};

function getToothType(tNum) {
  const digit = tNum % 10;
  const isPrimary = (tNum >= 51 && tNum <= 55) || (tNum >= 61 && tNum <= 65) || (tNum >= 71 && tNum <= 75) || (tNum >= 81 && tNum <= 85);

  if (digit === 1 || digit === 2) return 'incisor';
  if (digit === 3) return 'canine';
  if (isPrimary) {
    if (digit === 4 || digit === 5) return 'molar';
  } else {
    if (digit === 4 || digit === 5) return 'premolar';
    if (digit >= 6) return 'molar';
  }
  return 'molar';
}

function ToothSvg({ tNum, condition, isSelected }) {
  const toothType = getToothType(tNum);
  const isLowerArch = (tNum >= 31 && tNum <= 48) || (tNum >= 71 && tNum <= 85);
  const cfg = CONDITION_SVG_STYLES[condition] || CONDITION_SVG_STYLES.Healthy;
  const isMissing = condition === 'Missing' || condition === 'Extraction';

  return (
    <div className="relative flex items-center justify-center w-5 h-8 xs:w-6 xs:h-9 sm:w-8 sm:h-12 my-0.5 shrink-0">
      <svg
        viewBox="0 0 50 85"
        className={`w-full h-full transition-all duration-200 ${
          isLowerArch ? 'rotate-180' : ''
        }`}
      >
        {/* Base Anatomical Tooth Silhouette Paths */}
        {toothType === 'incisor' && (
          <path
            d="M 25 5 C 21 16 16 30 16 42 C 12 50 11 65 12 78 C 13 80 37 80 38 78 C 39 65 38 50 34 42 C 34 30 29 16 25 5 Z"
            fill={cfg.fill}
            stroke={isSelected ? '#0D9488' : cfg.stroke}
            strokeWidth={isSelected ? '3' : '2.2'}
            strokeDasharray={isMissing ? '3,3' : 'none'}
            strokeLinejoin="round"
          />
        )}
        {toothType === 'canine' && (
          <path
            d="M 25 3 C 21 17 16 32 16 44 C 11 50 8 55 10 65 L 25 82 L 40 65 C 42 55 39 50 34 44 C 34 32 29 17 25 3 Z"
            fill={cfg.fill}
            stroke={isSelected ? '#0D9488' : cfg.stroke}
            strokeWidth={isSelected ? '3' : '2.2'}
            strokeDasharray={isMissing ? '3,3' : 'none'}
            strokeLinejoin="round"
          />
        )}
        {toothType === 'premolar' && (
          <path
            d="M 18 5 C 16 16 14 30 14 42 C 10 50 7 60 12 76 C 16 80 34 80 38 76 C 43 60 40 50 36 42 C 36 30 34 16 32 5 C 29 14 27 22 25 22 C 23 22 21 14 18 5 Z"
            fill={cfg.fill}
            stroke={isSelected ? '#0D9488' : cfg.stroke}
            strokeWidth={isSelected ? '3' : '2.2'}
            strokeDasharray={isMissing ? '3,3' : 'none'}
            strokeLinejoin="round"
          />
        )}
        {toothType === 'molar' && (
          <path
            d="M 13 3 C 11 15 11 28 11 40 C 6 48 5 62 10 76 C 18 78 21 72 25 72 C 29 72 32 78 40 76 C 45 62 44 48 39 40 C 39 28 39 15 37 3 C 33 12 29 25 25 25 C 21 25 17 12 13 3 Z"
            fill={cfg.fill}
            stroke={isSelected ? '#0D9488' : cfg.stroke}
            strokeWidth={isSelected ? '3' : '2.2'}
            strokeDasharray={isMissing ? '3,3' : 'none'}
            strokeLinejoin="round"
          />
        )}

        {/* Cervical CEJ Enamel Line Detail */}
        {toothType === 'incisor' && <path d="M 16 42 Q 25 47 34 42" fill="none" stroke={cfg.stroke} strokeWidth="1.2" opacity="0.5" />}
        {toothType === 'canine' && <path d="M 16 44 Q 25 49 34 44" fill="none" stroke={cfg.stroke} strokeWidth="1.2" opacity="0.5" />}
        {toothType === 'premolar' && <path d="M 14 42 Q 25 47 36 42" fill="none" stroke={cfg.stroke} strokeWidth="1.2" opacity="0.5" />}
        {toothType === 'molar' && <path d="M 11 40 Q 25 45 39 40" fill="none" stroke={cfg.stroke} strokeWidth="1.2" opacity="0.5" />}

        {/* SPECIAL CONDITION OVERLAYS */}
        {(condition === 'Caries' || condition === 'Decayed') && (
          <circle cx="25" cy="62" r="6.5" fill="#F43F5E" stroke="#9F1239" strokeWidth="1.5" />
        )}

        {condition === 'Filling' && (
          <path d="M 17 56 Q 25 51 33 56 Q 35 68 25 73 Q 15 68 17 56 Z" fill="#2563EB" opacity="0.85" stroke="#1D4ED8" strokeWidth="1" />
        )}

        {condition === 'RCT' && (
          <path d="M 25 8 L 25 65 M 19 12 L 25 45 M 31 12 L 25 45" fill="none" stroke="#9333EA" strokeWidth="3" strokeLinecap="round" />
        )}

        {(condition === 'Crown' || condition === 'Bridge') && (
          <path d="M 10 46 Q 25 40 40 46 L 38 76 Q 25 80 12 76 Z" fill="#F59E0B" fillOpacity="0.4" stroke="#D97706" strokeWidth="2.2" />
        )}

        {condition === 'Implant' && (
          <g stroke="#0891B2" strokeWidth="2.2" strokeLinecap="round">
            <line x1="16" y1="12" x2="34" y2="12" />
            <line x1="18" y1="20" x2="32" y2="20" />
            <line x1="20" y1="28" x2="30" y2="28" />
            <line x1="22" y1="36" x2="28" y2="36" />
          </g>
        )}

        {isMissing && (
          <g stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round">
            <line x1="8" y1="8" x2="42" y2="77" />
            <line x1="42" y1="8" x2="8" y2="77" />
          </g>
        )}
      </svg>
    </div>
  );
}

function formatTeethListPhrase(numbers) {
  if (!numbers || numbers.length === 0) return '';
  if (numbers.length === 1) return `tooth ${numbers[0]}`;
  if (numbers.length === 2) return `teeth ${numbers[0]} and ${numbers[1]}`;
  const copy = [...numbers];
  const last = copy.pop();
  return `teeth ${copy.join(', ')} and ${last}`;
}

export default function ToothChart({ patientId, consultationId, isReadOnly = false, patient = null }) {
  const [teethMap, setTeethMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [patientType, setPatientType] = useState('adult'); // 'adult' | 'child'

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form state for updating selected tooth/teeth
  const [formCondition, setFormCondition] = useState('Healthy');
  const [formTreatment, setFormTreatment] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Load patientType strictly from patient registration record
  useEffect(() => {
    if (patient) {
      const type = patient.patientType || (patient.age !== undefined && patient.age !== null && Number(patient.age) < 12 ? 'child' : 'adult');
      setPatientType(type);
      return;
    }
    if (!patientId) return;
    async function fetchPatientInfo() {
      try {
        const res = await api.get(`/patients/${patientId}`);
        const p = res.data?.patient;
        if (p) {
          const type = p.patientType || (p.age !== undefined && p.age !== null && Number(p.age) < 12 ? 'child' : 'adult');
          setPatientType(type);
        }
      } catch (err) {
        console.error('Failed to load patient info for tooth chart:', err);
      }
    }
    fetchPatientInfo();
  }, [patient, patientId]);

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

  const renderToothCard = (tNum) => {
    const record = teethMap[tNum] || {};
    const cond = record.currentCondition || 'Healthy';
    const codeCfg = CONDITION_CODES[cond] || CONDITION_CODES.Healthy;
    const isSelected = selectedTeeth.includes(tNum);
    const hasHistory = record.history && record.history.length > 0;
    const isLowerArch = (tNum >= 31 && tNum <= 48) || (tNum >= 71 && tNum <= 85);

    return (
      <button
        type="button"
        key={tNum}
        onClick={() => handleToothClick(tNum)}
        className={`flex flex-col items-center justify-between p-0.5 sm:p-1 rounded-lg sm:rounded-xl border transition-all duration-150 relative select-none flex-1 max-w-[34px] xs:max-w-[40px] sm:max-w-[46px] min-w-[24px] sm:min-w-[30px] min-h-[85px] xs:min-h-[95px] sm:min-h-[110px] ${
          isSelected
            ? 'border-brand bg-brand-light/40 shadow-md ring-2 ring-brand scale-105 z-10'
            : 'border-border bg-surface hover:bg-bg/80 hover:border-brand/50'
        }`}
      >
        {/* UPPER ARCH */}
        {!isLowerArch ? (
          <>
            <span className="font-mono text-[9px] xs:text-[10px] sm:text-xs font-bold text-ink leading-none">{tNum}</span>

            <ToothSvg tNum={tNum} condition={cond} isSelected={isSelected} />

            <div className="flex flex-col items-center gap-0.5 w-full min-w-0">
              <span className={`px-1 py-0.2 rounded text-[7px] xs:text-[8px] sm:text-[9px] font-extrabold uppercase leading-tight border ${codeCfg.color}`}>
                {codeCfg.code}
              </span>
              {hasHistory ? (
                <span className="text-[7px] sm:text-[8px] font-bold text-brand flex items-center justify-center gap-0.5 w-full">
                  <History size={8} /> {record.history.length}
                </span>
              ) : (
                <span className="text-[7px] text-ink-soft/30">—</span>
              )}
            </div>
          </>
        ) : (
          /* LOWER ARCH */
          <>
            <div className="flex flex-col items-center gap-0.5 w-full min-w-0">
              {hasHistory ? (
                <span className="text-[7px] sm:text-[8px] font-bold text-brand flex items-center justify-center gap-0.5 w-full">
                  <History size={8} /> {record.history.length}
                </span>
              ) : (
                <span className="text-[7px] text-ink-soft/30">—</span>
              )}
              <span className={`px-1 py-0.2 rounded text-[7px] xs:text-[8px] sm:text-[9px] font-extrabold uppercase leading-tight border ${codeCfg.color}`}>
                {codeCfg.code}
              </span>
            </div>

            <ToothSvg tNum={tNum} condition={cond} isSelected={isSelected} />

            <span className="font-mono text-[9px] xs:text-[10px] sm:text-xs font-bold text-ink leading-none">{tNum}</span>
          </>
        )}
      </button>
    );
  };

  const selectedToothSingle = selectedTeeth.length === 1 ? teethMap[selectedTeeth[0]] : null;
  const totalHistoryCount = selectedTeeth.reduce((acc, tNum) => acc + (teethMap[tNum]?.history?.length || 0), 0);

  const historySubtitleText = loading
    ? 'Loading treatment history...'
    : selectedTeeth.length === 0
    ? 'Select a tooth to view its treatment log across all visits.'
    : selectedTeeth.length === 1
    ? `Treatment log for Tooth #${selectedTeeth[0]}`
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



      {/* Chart Toolbar & Dentition Summary */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Layers size={18} className="text-brand" /> FDI Anatomical Interactive Tooth Chart
            </h3>
            <p className="text-xs text-ink-soft">
              {patientType === 'child'
                ? 'Primary (Deciduous) 20-tooth dentition chart loaded strictly based on patient registration.'
                : 'Permanent 32-tooth dentition chart loaded strictly based on patient registration.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Read-Only Registered Patient Type Badge */}
            <span className="badge bg-brand-light/50 text-brand-dark border border-brand/20 text-xs font-semibold px-3 py-1">
              {patientType === 'child' ? 'Pediatric Dentition (20 Primary Teeth)' : 'Adult Dentition (32 Permanent Teeth)'}
            </span>

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
          {['Healthy', 'Caries', 'Missing', 'Filling', 'RCT', 'Crown', 'Bridge', 'Implant'].map((label) => {
            const cfg = CONDITION_CODES[label];
            if (!cfg) return null;
            return (
              <span
                key={label}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${cfg.color}`}
              >
                <span className="font-mono text-[10px] font-bold">[{cfg.code}]</span> {label}
              </span>
            );
          })}
        </div>
      </div>

      {/* FDI CHART GRID ARCHES - STRICTLY DISPLAY ONLY THE REGISTERED CHART TYPE */}
      <div
        className="card p-2 sm:p-4 space-y-4 overflow-x-auto scrollbar-none w-full max-w-full"
        aria-live="polite"
        aria-label={`Tooth chart for ${patientType === 'child' ? 'Primary Child teeth' : 'Permanent Adult teeth'}`}
      >
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-soft">Loading patient tooth records...</div>
        ) : (
          <div className="w-full min-w-[440px] sm:min-w-0 space-y-4">
            {patientType === 'child' ? (
              /* PRIMARY (CHILD) 20-TEETH CHART ONLY */
              <>
                {/* UPPER ARCH (Maxillary Primary) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] sm:text-xs font-bold text-ink-soft uppercase tracking-wider px-1 gap-1">
                    <span>Upper Right (55 - 51)</span>
                    <span className="text-brand font-display font-extrabold text-[10px] sm:text-xs">PRIMARY UPPER ARCH (MAXILLA)</span>
                    <span>Upper Left (61 - 65)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3 bg-bg/40 p-1.5 sm:p-2.5 rounded-2xl border border-border">
                    {/* Quadrant 5: Upper Right */}
                    <div className="flex justify-end items-center gap-0.5 sm:gap-1 min-w-0">
                      {PRIMARY_QUAD_UPPER_RIGHT.map(renderToothCard)}
                    </div>
                    {/* Quadrant 6: Upper Left */}
                    <div className="flex justify-start items-center gap-0.5 sm:gap-1 border-l border-border/80 pl-1 sm:pl-2.5 min-w-0">
                      {PRIMARY_QUAD_UPPER_LEFT.map(renderToothCard)}
                    </div>
                  </div>
                </div>

                {/* BITE LINE DIVIDER */}
                <div className="relative flex items-center justify-center my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed border-brand/30"></div>
                  </div>
                  <span className="relative bg-surface px-3 py-0.5 text-[8px] sm:text-[9px] font-mono font-bold text-brand border border-brand/20 rounded-full">
                    PRIMARY OCCLUSAL BITE LINE
                  </span>
                </div>

                {/* LOWER ARCH (Mandibular Primary) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] sm:text-xs font-bold text-ink-soft uppercase tracking-wider px-1 gap-1">
                    <span>Lower Right (85 - 81)</span>
                    <span className="text-brand font-display font-extrabold text-[10px] sm:text-xs">PRIMARY LOWER ARCH (MANDIBLE)</span>
                    <span>Lower Left (71 - 75)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3 bg-bg/40 p-1.5 sm:p-2.5 rounded-2xl border border-border">
                    {/* Quadrant 8: Lower Right */}
                    <div className="flex justify-end items-center gap-0.5 sm:gap-1 min-w-0">
                      {PRIMARY_QUAD_LOWER_RIGHT.map(renderToothCard)}
                    </div>
                    {/* Quadrant 7: Lower Left */}
                    <div className="flex justify-start items-center gap-0.5 sm:gap-1 border-l border-border/80 pl-1 sm:pl-2.5 min-w-0">
                      {PRIMARY_QUAD_LOWER_LEFT.map(renderToothCard)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* PERMANENT (ADULT) 32-TEETH CHART ONLY */
              <>
                {/* UPPER ARCH (Maxillary Permanent) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] sm:text-xs font-bold text-ink-soft uppercase tracking-wider px-1 gap-1">
                    <span>Maxillary Right (18 - 11)</span>
                    <span className="text-brand font-display font-extrabold text-[10px] sm:text-xs">UPPER ARCH (MAXILLA)</span>
                    <span>Maxillary Left (21 - 28)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3 bg-bg/40 p-1.5 sm:p-2.5 rounded-2xl border border-border">
                    {/* Quadrant 1: Upper Right */}
                    <div className="flex justify-end items-center gap-0.5 sm:gap-1 min-w-0">
                      {QUAD_UPPER_RIGHT.map(renderToothCard)}
                    </div>
                    {/* Quadrant 2: Upper Left */}
                    <div className="flex justify-start items-center gap-0.5 sm:gap-1 border-l border-border/80 pl-1 sm:pl-2.5 min-w-0">
                      {QUAD_UPPER_LEFT.map(renderToothCard)}
                    </div>
                  </div>
                </div>

                {/* BITE LINE DIVIDER */}
                <div className="relative flex items-center justify-center my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed border-brand/30"></div>
                  </div>
                  <span className="relative bg-surface px-3 py-0.5 text-[8px] sm:text-[9px] font-mono font-bold text-brand border border-brand/20 rounded-full">
                    OCCLUSAL BITE LINE
                  </span>
                </div>

                {/* LOWER ARCH (Mandibular Permanent) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] sm:text-xs font-bold text-ink-soft uppercase tracking-wider px-1 gap-1">
                    <span>Mandibular Right (48 - 41)</span>
                    <span className="text-brand font-display font-extrabold text-[10px] sm:text-xs">LOWER ARCH (MANDIBLE)</span>
                    <span>Mandibular Left (31 - 38)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3 bg-bg/40 p-1.5 sm:p-2.5 rounded-2xl border border-border">
                    {/* Quadrant 4: Lower Right */}
                    <div className="flex justify-end items-center gap-0.5 sm:gap-1 min-w-0">
                      {QUAD_LOWER_RIGHT.map(renderToothCard)}
                    </div>
                    {/* Quadrant 3: Lower Left */}
                    <div className="flex justify-start items-center gap-0.5 sm:gap-1 border-l border-border/80 pl-1 sm:pl-2.5 min-w-0">
                      {QUAD_LOWER_LEFT.map(renderToothCard)}
                    </div>
                  </div>
                </div>
              </>
            )}
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
                  <option value="Caries">Caries [D]</option>
                  <option value="Missing">Missing [M]</option>
                  <option value="Filling">Filling [F]</option>
                  <option value="RCT">RCT [RCT]</option>
                  <option value="Crown">Crown [Cr]</option>
                  <option value="Bridge">Bridge [Br]</option>
                  <option value="Implant">Implant [I]</option>
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
              <p>Select any tooth to view its treatment log across all visits.</p>
            </div>
          ) : selectedTeeth.length === 1 ? (
            /* SINGLE TOOTH SELECTION LOG */
            <div className="space-y-3 max-h-[360px] overflow-y-auto scrollbar-none pr-1">
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
            <div className="space-y-4 max-h-[380px] overflow-y-auto scrollbar-none pr-1">
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
