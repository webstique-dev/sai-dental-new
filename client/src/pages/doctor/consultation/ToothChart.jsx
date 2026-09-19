import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Save,
  History,
  Layers,
  Info,
  Check,
  RefreshCw,
  X,
  Shield,
  Loader2,
  ChevronDown,
  Plus,
  Trash2,
  MousePointerClick,
  Sparkles,
  Stethoscope,
  FileText,
} from 'lucide-react';
import api from '../../../api/axios.js';
import ConfirmModal from '../../../components/common/ConfirmModal.jsx';

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

import {
  TOOTH_CONDITIONS,
  CONDITION_CODES,
  INITIAL_CONDITION_OPTIONS,
  CONDITION_SVG_STYLES,
  getConditionCodeObj,
  sanitizeCondition,
} from '../../../constants/toothConditions.js';

const CUSTOM_SVG_STYLE = { fill: '#E0E7FF', stroke: '#6366F1' };

function getToothSvgStyle(condition) {
  const parsed = sanitizeCondition(condition);
  return CONDITION_SVG_STYLES[parsed.name] || CUSTOM_SVG_STYLE;
}

/**
 * ConditionCombobox:
 * - Displays ALL available conditions when opened (does not restrict to only currently selected value)
 * - Supports typing to search/filter across all available conditions
 * - Supports adding and soft-deleting custom conditions
 */
function ConditionCombobox({ value, onChange, options, onDeleteCustomCondition }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sanitizedValue = sanitizeCondition(value);

  // Strictly deduplicate options by clean normalized name
  const uniqueOptions = [];
  const seenNames = new Set();
  for (const opt of options) {
    const parsed = sanitizeCondition(opt);
    const key = parsed.name.toLowerCase().trim();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      uniqueOptions.push(parsed.formatted);
    }
  }

  // If searchQuery is empty, show ALL unique options. Otherwise filter by search text.
  const filteredOptions = searchQuery.trim()
    ? uniqueOptions.filter((opt) => {
        const parsed = sanitizeCondition(opt);
        const q = searchQuery.trim().toLowerCase();
        return (
          opt.toLowerCase().includes(q) ||
          parsed.name.toLowerCase().includes(q) ||
          parsed.code.toLowerCase().includes(q)
        );
      })
    : uniqueOptions;

  const exactMatch = uniqueOptions.some((opt) => {
    const parsed = sanitizeCondition(opt);
    const q = searchQuery.trim().toLowerCase();
    return parsed.name.toLowerCase() === q || opt.toLowerCase() === q;
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          autoComplete="off"
          className="input-field w-full font-semibold pr-8 cursor-pointer"
          placeholder="Select or search condition..."
          value={isOpen ? searchQuery : sanitizedValue.formatted}
          onFocus={() => {
            setIsOpen(true);
            setSearchQuery(''); // Show ALL conditions on focus
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen((prev) => !prev);
            if (!isOpen) setSearchQuery('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink p-1"
        >
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto scrollbar-none bg-surface border border-border rounded-xl shadow-xl py-1 text-xs">
          <div className="px-3 py-1.5 text-[10px] font-bold text-ink-soft uppercase tracking-wider border-b border-border/60 bg-bg/40 flex items-center justify-between sticky top-0 bg-surface z-10">
            <span>All Available Conditions ({filteredOptions.length})</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-brand hover:underline font-semibold"
              >
                Show all
              </button>
            )}
          </div>

          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const parsed = sanitizeCondition(opt);
              const codeObj = getConditionCodeObj(opt);
              const isSelected =
                sanitizedValue.name.toLowerCase() === parsed.name.toLowerCase();

              return (
                <div
                  key={opt}
                  className={`w-full px-3 py-2 hover:bg-brand-light/40 font-semibold flex items-center justify-between cursor-pointer transition-colors group ${
                    isSelected ? 'bg-brand-light/60 text-brand font-bold' : 'text-ink'
                  }`}
                  onClick={() => {
                    onChange(parsed.formatted);
                    setSearchQuery('');
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-5 h-5 rounded text-[9px] font-mono font-extrabold flex items-center justify-center shrink-0 border ${codeObj.color}`}
                    >
                      {codeObj.code}
                    </span>
                    <span className="truncate">{parsed.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSelected && <Check size={14} className="text-brand" />}
                    {onDeleteCustomCondition && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomCondition(opt);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-opacity"
                        title={`Remove "${parsed.name}" condition from active use`}
                        aria-label={`Remove "${parsed.name}" condition`}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-3 py-3 text-ink-soft italic text-center">
              No matching condition found
            </div>
          )}

          {searchQuery.trim() && !exactMatch && (
            <button
              type="button"
              className="w-full text-left px-3 py-2.5 bg-brand-light/30 hover:bg-brand-light/60 text-brand font-bold border-t border-border flex items-center gap-1.5"
              onClick={() => {
                const parsed = sanitizeCondition(searchQuery.trim());
                onChange(parsed.formatted);
                setSearchQuery('');
                setIsOpen(false);
              }}
            >
              <Plus size={13} /> Add custom condition: "{sanitizeCondition(searchQuery.trim()).name}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function getToothType(tNum) {
  const digit = tNum % 10;
  const isPrimary =
    (tNum >= 51 && tNum <= 55) ||
    (tNum >= 61 && tNum <= 65) ||
    (tNum >= 71 && tNum <= 75) ||
    (tNum >= 81 && tNum <= 85);

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
  let baseName = condition || 'Healthy';
  if (condition && condition.includes('[')) {
    baseName = condition.split('[')[0].trim();
  }
  const cfg = getToothSvgStyle(condition);
  const isMissing = baseName === 'Missing' || baseName === 'Extraction';

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
        {toothType === 'incisor' && (
          <path
            d="M 16 42 Q 25 47 34 42"
            fill="none"
            stroke={cfg.stroke}
            strokeWidth="1.2"
            opacity="0.5"
          />
        )}
        {toothType === 'canine' && (
          <path
            d="M 16 44 Q 25 49 34 44"
            fill="none"
            stroke={cfg.stroke}
            strokeWidth="1.2"
            opacity="0.5"
          />
        )}
        {toothType === 'premolar' && (
          <path
            d="M 14 42 Q 25 47 36 42"
            fill="none"
            stroke={cfg.stroke}
            strokeWidth="1.2"
            opacity="0.5"
          />
        )}
        {toothType === 'molar' && (
          <path
            d="M 11 40 Q 25 45 39 40"
            fill="none"
            stroke={cfg.stroke}
            strokeWidth="1.2"
            opacity="0.5"
          />
        )}

        {/* SPECIAL CONDITION OVERLAYS */}
        {(baseName === 'Caries' || baseName === 'Decayed') && (
          <circle cx="25" cy="62" r="6.5" fill="#F43F5E" stroke="#9F1239" strokeWidth="1.5" />
        )}

        {baseName === 'Filling' && (
          <path
            d="M 17 56 Q 25 51 33 56 Q 35 68 25 73 Q 15 68 17 56 Z"
            fill="#2563EB"
            opacity="0.85"
            stroke="#1D4ED8"
            strokeWidth="1"
          />
        )}

        {baseName === 'RCT' && (
          <path
            d="M 25 8 L 25 65 M 19 12 L 25 45 M 31 12 L 25 45"
            fill="none"
            stroke="#9333EA"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {(baseName === 'Crown' || baseName === 'Bridge') && (
          <path
            d="M 10 46 Q 25 40 40 46 L 38 76 Q 25 80 12 76 Z"
            fill="#F59E0B"
            fillOpacity="0.4"
            stroke="#D97706"
            strokeWidth="2.2"
          />
        )}

        {baseName === 'Implant' && (
          <g stroke="#0891B2" strokeWidth="2.2" strokeLinecap="round">
            <line x1="16" y1="12" x2="34" y2="12" />
            <line x1="18" y1="20" x2="32" y2="20" />
            <line x1="20" y1="28" x2="30" y2="28" />
            <line x1="22" y1="36" x2="28" y2="36" />
          </g>
        )}

        {baseName === 'Mobility' && (
          <g
            stroke="#C026D3"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <path d="M 13 47 Q 19 42, 25 47 T 37 47" />
            <path d="M 13 57 Q 19 52, 25 57 T 37 57" />
            <path d="M 10 52 L 14 52 M 36 52 L 40 52" strokeWidth="2" />
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

function formatRelativeTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 45) return 'Just now';
  if (diffSec < 90) return '1 min ago';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mins ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} wk${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatExactDateTime(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Compact Condition Picker Popup Component
 * - NO dark opacity/overlay background (completely transparent click-outside)
 * - Displays all available condition options
 * - Anchors next to clicked tooth and stays on screen
 * - Select-then-Save flow with explicit Clear Selection option
 */
function CompactConditionPopup({
  isOpen,
  anchorEl,
  targetTeeth,
  currentCondition,
  initialTreatment = '',
  initialNotes = '',
  conditionOptions,
  onSave,
  onClose,
  onClearSelection,
  onDeleteCustomCondition,
  isSaving,
}) {
  const [pendingCondition, setPendingCondition] = useState(currentCondition || 'Healthy [H]');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [treatment, setTreatment] = useState(initialTreatment || '');
  const [notes, setNotes] = useState(initialNotes || '');
  const [isTreatmentOpen, setIsTreatmentOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const popupRef = useRef(null);

  // Sync initial state when opened
  useEffect(() => {
    if (isOpen) {
      setPendingCondition(currentCondition || 'Healthy [H]');
      setShowCustomInput(false);
      setCustomName('');
      setCustomCode('');
      setTreatment(initialTreatment || '');
      setNotes(initialNotes || '');
      setIsTreatmentOpen(false); // Collapsed by default as requested
      setIsNotesOpen(false); // Collapsed by default as requested
    }
  }, [isOpen, currentCondition, initialTreatment, initialNotes]);

  // Viewport-aware position calculations
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 340, maxHeight: 480 });

  useEffect(() => {
    if (!isOpen || !anchorEl) return;

    function calculatePosition() {
      const rect = anchorEl.getBoundingClientRect();
      const popupWidth = Math.min(360, window.innerWidth - 16);
      const estimatedHeight = 440;

      // Center horizontally on anchor, clamp to viewport edges
      let left = rect.left + rect.width / 2 - popupWidth / 2;
      left = Math.max(8, Math.min(window.innerWidth - popupWidth - 8, left));

      // Check space above vs below
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top = 0;
      let availableMaxHeight = 480;

      if (spaceBelow >= 320 || spaceBelow >= spaceAbove) {
        top = rect.bottom + 6;
        availableMaxHeight = Math.max(260, window.innerHeight - top - 12);
      } else {
        top = Math.max(10, rect.top - estimatedHeight - 6);
        availableMaxHeight = Math.max(260, rect.top - 16);
      }

      setCoords({
        top,
        left,
        width: popupWidth,
        maxHeight: availableMaxHeight,
      });
    }

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isOpen, anchorEl]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !anchorEl) return null;

  const handleSelectCondition = (cond) => {
    const parsed = sanitizeCondition(cond);
    setPendingCondition(parsed.formatted);
  };

  const handleAddCustomCondition = (e) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const cleanName = customName.replace(/[\[\]]/g, '').trim();
    const cleanCode = customCode.replace(/[\[\]]/g, '').trim().toUpperCase() || cleanName.slice(0, 3).toUpperCase();
    const parsed = sanitizeCondition(`${cleanName} [${cleanCode}]`);
    setPendingCondition(parsed.formatted);
    setShowCustomInput(false);
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    onSave({
      condition: pendingCondition,
      treatment: treatment.trim(),
      notes: notes.trim(),
    });
  };

  const isMulti = targetTeeth.length > 1;
  const pendingParsed = sanitizeCondition(pendingCondition);
  const currentCodeObj = getConditionCodeObj(pendingCondition);

  // Strictly deduplicate by normalized clean name so each condition appears ONLY once
  const allDisplayConditions = [];
  const seenPopupNames = new Set();
  const sourceOptions = conditionOptions && conditionOptions.length > 0 ? conditionOptions : INITIAL_CONDITION_OPTIONS;

  for (const opt of sourceOptions) {
    const parsed = sanitizeCondition(opt);
    const key = parsed.name.toLowerCase().trim();
    if (!seenPopupNames.has(key)) {
      seenPopupNames.add(key);
      allDisplayConditions.push(parsed.formatted);
    }
  }

  return (
    <>
      {/* Invisible Transparent Click-Outside Layer (NO black opacity/overlay background) */}
      <div
        className="fixed inset-0 z-40 bg-transparent pointer-events-auto"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Compact Popover Box */}
      <div
        ref={popupRef}
        style={{
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          width: `${coords.width}px`,
          maxHeight: `${coords.maxHeight}px`,
        }}
        className="fixed z-50 bg-surface border border-border/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn text-xs"
        role="dialog"
        aria-label="Tooth Condition Picker"
      >
        {/* Header with Clear Selection & Close */}
        <div className="p-3 bg-bg/80 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-bold text-ink text-sm shrink-0">
              {isMulti ? `${targetTeeth.length} Teeth` : `Tooth #${targetTeeth[0]}`}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border truncate ${currentCodeObj.color}`}
            >
              {pendingParsed.formatted}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onClearSelection}
              className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
              title="Deselect this tooth"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-ink-soft hover:text-ink hover:bg-surface transition-colors"
              title="Close picker without saving"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content Body: Conditions Grid + Collapsible Details */}
        <div className="p-3 overflow-y-auto space-y-3 scrollbar-none flex-1">
          {/* Section: Condition Picker (Primary Required Field) */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-ink-soft flex items-center justify-between">
              <span>Condition * ({allDisplayConditions.length} Available):</span>
              <span className="text-[10px] text-ink-soft/70">Select condition</span>
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-3 gap-1.5">
              {allDisplayConditions.map((opt) => {
                const parsed = sanitizeCondition(opt);
                const codeObj = getConditionCodeObj(opt);
                const isSelected =
                  pendingParsed.name.toLowerCase() === parsed.name.toLowerCase();

                return (
                  <div
                    key={opt}
                    className={`relative group flex items-center justify-between px-2 py-2 rounded-xl border text-left font-semibold transition-all select-none min-h-[38px] cursor-pointer ${
                      isSelected
                        ? 'bg-brand-light/60 border-brand ring-2 ring-brand text-brand font-bold shadow-sm scale-[1.02]'
                        : 'bg-surface border-border hover:bg-bg/90 hover:border-brand/40 text-ink'
                    }`}
                    onClick={() => handleSelectCondition(parsed.formatted)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className={`w-4 h-4 rounded-md font-mono text-[9px] font-extrabold flex items-center justify-center shrink-0 border ${codeObj.color}`}
                      >
                        {codeObj.code}
                      </span>
                      <span className="text-[11px] truncate">{parsed.name}</span>
                    </div>

                    {/* Soft delete condition */}
                    {onDeleteCustomCondition && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomCondition(opt);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-opacity"
                        title={`Remove "${parsed.name}" condition from active use`}
                        aria-label={`Remove "${parsed.name}" condition`}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom Condition Form / Trigger */}
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full py-1.5 px-2 rounded-lg border border-dashed border-border hover:border-brand/60 text-ink-soft hover:text-brand font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus size={13} /> Add Custom Condition...
              </button>
            ) : (
              <form
                onSubmit={handleAddCustomCondition}
                className="p-2.5 rounded-xl bg-brand-light/20 border border-brand/30 space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-brand">
                  <span>Add Custom Condition</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="text-ink-soft hover:text-ink"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    placeholder="Name (e.g. Veneer)"
                    className="col-span-2 input-field py-1 text-xs"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Code (VN)"
                    maxLength={4}
                    className="input-field uppercase font-mono py-1 text-xs"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full btn-secondary py-1 text-xs font-bold text-brand hover:bg-brand-light/40"
                >
                  Apply Custom Selection
                </button>
              </form>
            )}
          </div>

          {/* Collapsible Section 1: Treatment Performed / Planned (Collapsed by default) */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-bg/30 transition-all">
            <button
              type="button"
              onClick={() => setIsTreatmentOpen((prev) => !prev)}
              className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-surface transition-colors select-none"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Stethoscope size={13} className="text-brand shrink-0" />
                <span className="font-bold text-[11px] text-ink truncate">
                  Treatment Performed / Planned
                </span>
                {treatment.trim() && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" title="Treatment entered" />
                )}
              </div>
              <ChevronDown
                size={14}
                className={`text-ink-soft transition-transform duration-200 shrink-0 ${
                  isTreatmentOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isTreatmentOpen && (
              <div className="p-2.5 pt-1 border-t border-border/60 space-y-1.5 bg-surface animate-fadeIn">
                <input
                  type="text"
                  placeholder="e.g. Composite Restoration, Root Canal, Crown..."
                  className="input-field py-1.5 text-xs"
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Collapsible Section 2: Clinical Notes (Collapsed by default) */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-bg/30 transition-all">
            <button
              type="button"
              onClick={() => setIsNotesOpen((prev) => !prev)}
              className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-surface transition-colors select-none"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText size={13} className="text-brand shrink-0" />
                <span className="font-bold text-[11px] text-ink truncate">
                  Clinical Notes
                </span>
                {notes.trim() && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" title="Notes entered" />
                )}
              </div>
              <ChevronDown
                size={14}
                className={`text-ink-soft transition-transform duration-200 shrink-0 ${
                  isNotesOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isNotesOpen && (
              <div className="p-2.5 pt-1 border-t border-border/60 space-y-1.5 bg-surface animate-fadeIn">
                <textarea
                  rows={2}
                  placeholder="Add specific clinical notes or observations for this tooth..."
                  className="input-field py-1.5 text-xs resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions: Explicit Select-Then-Save Buttons */}
        <div className="p-2.5 bg-bg/90 border-t border-border flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="btn-secondary py-1.5 px-3 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default function ToothChart({
  patientId,
  consultationId,
  isReadOnly = false,
  patient = null,
}) {
  const [teethMap, setTeethMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [inspectedTeeth, setInspectedTeeth] = useState([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [patientType, setPatientType] = useState('adult'); // 'adult' | 'child'

  // Compact Popup state
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupAnchorEl, setPopupAnchorEl] = useState(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form state for updating selected tooth/teeth from detail panel
  const [formCondition, setFormCondition] = useState('Healthy [H]');
  const [iconicCode, setIconicCode] = useState('');
  const [formTreatment, setFormTreatment] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [conditionOptions, setConditionOptions] = useState(INITIAL_CONDITION_OPTIONS);

  // Scoped Deletion confirmation for the single most recent historical entry
  const [historyItemToDelete, setHistoryItemToDelete] = useState(null);
  const [isConfirmHistoryDeleteOpen, setIsConfirmHistoryDeleteOpen] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);

  // Condition Soft-Deletion confirmation
  const [conditionToSoftDelete, setConditionToSoftDelete] = useState(null);
  const [isConfirmConditionDeleteOpen, setIsConfirmConditionDeleteOpen] = useState(false);
  const [isDeletingCondition, setIsDeletingCondition] = useState(false);

  const handleRequestDeleteHistory = (toothNumber, historyItem) => {
    setHistoryItemToDelete({
      toothNumber,
      historyId: historyItem._id,
      condition: historyItem.condition || 'Healthy',
      date: historyItem.date,
      treatment: historyItem.treatment || '',
    });
    setIsConfirmHistoryDeleteOpen(true);
  };

  const handleConfirmDeleteHistory = async () => {
    if (!historyItemToDelete) return;
    const { toothNumber, historyId } = historyItemToDelete;

    try {
      setIsDeletingHistory(true);
      await api.delete(`/tooth-chart/${patientId}/${toothNumber}/history/${historyId}`);
      setSuccessMessage(`Removed most recent history entry for Tooth #${toothNumber}`);
      setIsConfirmHistoryDeleteOpen(false);
      setHistoryItemToDelete(null);
      await fetchToothChart();
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      console.error('Failed to delete tooth history entry:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to remove tooth history entry.');
    } finally {
      setIsDeletingHistory(false);
    }
  };

  // Condition soft-delete handler
  const handleRequestDeleteCondition = (condStr) => {
    const parsed = sanitizeCondition(condStr);
    setConditionToSoftDelete({ name: parsed.name, formatted: parsed.formatted, raw: condStr });
    setIsConfirmConditionDeleteOpen(true);
  };

  const handleConfirmDeleteCondition = async () => {
    if (!conditionToSoftDelete) return;
    try {
      setIsDeletingCondition(true);
      await api.delete(`/tooth-chart/conditions/${encodeURIComponent(conditionToSoftDelete.name)}`);
      setConditionOptions((prev) =>
        prev.filter((c) => {
          const parsed = sanitizeCondition(c);
          return (
            parsed.name.toLowerCase() !== conditionToSoftDelete.name.toLowerCase() &&
            c !== conditionToSoftDelete.raw &&
            c !== conditionToSoftDelete.formatted
          );
        })
      );
      setSuccessMessage(`Condition "${conditionToSoftDelete.name}" removed from active conditions.`);
      setIsConfirmConditionDeleteOpen(false);
      setConditionToSoftDelete(null);
      await fetchConditions();
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      console.error('Failed to soft delete condition:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to remove condition.');
    } finally {
      setIsDeletingCondition(false);
    }
  };

  const isNewCustomCondition = (cond) => {
    if (!cond || !cond.trim()) return false;
    const parsed = sanitizeCondition(cond);
    const targetName = parsed.name.toLowerCase();
    return !conditionOptions.some((opt) => {
      const optParsed = sanitizeCondition(opt);
      return optParsed.name.toLowerCase() === targetName;
    });
  };

  // Clear Selection Handler (clears all selections, inspected state, and closes popup)
  const handleClearSelection = () => {
    setSelectedTeeth([]);
    setInspectedTeeth([]);
    setIsPopupOpen(false);
  };

  // Fetch active tooth conditions from backend
  const fetchConditions = async () => {
    try {
      const res = await api.get('/tooth-chart/conditions');
      const loaded = res.data?.options || [];
      const unique = [];
      const seen = new Set();
      for (const opt of loaded) {
        const parsed = sanitizeCondition(opt);
        const key = parsed.name.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(parsed.formatted);
        }
      }
      if (unique.length > 0) {
        setConditionOptions(unique);
      }
    } catch (err) {
      console.error('Failed to load conditions:', err);
    }
  };

  useEffect(() => {
    fetchConditions();
  }, []);

  // Load patientType strictly from patient registration record
  useEffect(() => {
    if (patient) {
      const type =
        patient.patientType === 'child' || patient.age < 12
          ? 'child'
          : 'adult';
      setPatientType(type);
    }
  }, [patient]);

  const fetchToothChart = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const res = await api.get(`/tooth-chart/${patientId}`);
      const map = {};
      (res.data.teeth || []).forEach((t) => {
        map[t.toothNumber] = t;
      });
      setTeethMap(map);
    } catch (err) {
      console.error('Failed to fetch tooth chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToothChart();
  }, [patientId]);

  // Handle Tooth Click
  const handleToothClick = (tNum, e) => {
    const targetElement = e ? e.currentTarget : null;

    if (multiSelectMode) {
      // In Multi-Select mode: clicking a tooth only selects/deselects it without opening the popup
      const isAlready = selectedTeeth.includes(tNum);
      const updated = isAlready
        ? selectedTeeth.filter((t) => t !== tNum)
        : [...selectedTeeth, tNum];

      setSelectedTeeth(updated);
      setInspectedTeeth(updated);
      setIsPopupOpen(false); // DO NOT open popup immediately during multi-select
    } else {
      // Single-select mode: toggle selection if clicking the already selected single tooth
      if (selectedTeeth.length === 1 && selectedTeeth[0] === tNum && isPopupOpen) {
        handleClearSelection();
        return;
      }

      setSelectedTeeth([tNum]);
      setInspectedTeeth([tNum]);

      const current = teethMap[tNum]?.currentCondition || 'Healthy [H]';
      const parsedCurrent = sanitizeCondition(current);
      setFormCondition(parsedCurrent.formatted);
      if (!conditionOptions.some((o) => sanitizeCondition(o).name.toLowerCase() === parsedCurrent.name.toLowerCase())) {
        setConditionOptions((prev) => [...prev, parsedCurrent.formatted]);
      }
      setIconicCode('');
      setFormTreatment('');
      setFormNotes('');

      // Open compact popup anchored directly to the clicked tooth in single-select mode
      if (!isReadOnly) {
        setPopupAnchorEl(targetElement);
        setIsPopupOpen(true);
      }
    }
  };

  // Open condition popup for multi-selected teeth when user clicks "Done / Continue"
  const handleOpenMultiConditionPopup = (e) => {
    if (isReadOnly || selectedTeeth.length === 0) return;
    setPopupAnchorEl(e ? e.currentTarget : null);
    setIsPopupOpen(true);
  };

  // Save handler for the compact condition picker popup
  const handleSavePopupCondition = async (payload) => {
    if (isReadOnly) return;
    const targetList = selectedTeeth.length > 0 ? selectedTeeth : inspectedTeeth;
    if (targetList.length === 0) return;

    let chosenCondition = payload;
    let chosenTreatment = '';
    let chosenNotes = '';

    if (payload && typeof payload === 'object') {
      chosenCondition = payload.condition;
      chosenTreatment = payload.treatment || '';
      chosenNotes = payload.notes || '';
    }

    const parsed = sanitizeCondition(chosenCondition);
    const saveCondition = parsed.formatted;

    if (isNewCustomCondition(parsed.name)) {
      // Persist custom condition on backend
      try {
        await api.post('/tooth-chart/conditions', {
          name: parsed.name,
          code: parsed.code,
        });
      } catch (e) {
        console.warn('Condition already exists or failed to save to conditions collection:', e);
      }
    }

    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      if (targetList.length === 1) {
        const tNum = targetList[0];
        await api.patch(`/tooth-chart/${patientId}/${tNum}`, {
          condition: saveCondition,
          treatment: chosenTreatment,
          notes: chosenNotes,
          consultationId,
        });
      } else {
        await api.post(`/tooth-chart/${patientId}/bulk`, {
          teeth: targetList,
          condition: saveCondition,
          treatment: chosenTreatment,
          notes: chosenNotes,
          consultationId,
        });
      }

      if (!conditionOptions.some((o) => sanitizeCondition(o).name.toLowerCase() === parsed.name.toLowerCase())) {
        setConditionOptions((prev) => [...prev, saveCondition]);
      }

      setSuccessMessage(
        `Updated ${targetList.length === 1 ? `Tooth #${targetList[0]}` : `${targetList.length} teeth`} to ${parsed.name}!`
      );

      // Close popup and automatically unselect/clear the selection state for single and multi-select
      setIsPopupOpen(false);
      setSelectedTeeth([]);
      setInspectedTeeth([]);
      setPopupAnchorEl(null);
      setFormCondition(saveCondition);
      setFormTreatment('');
      setFormNotes('');

      await fetchToothChart();
      await fetchConditions();
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update tooth chart.');
    } finally {
      setSaving(false);
    }
  };

  // Detail panel save handler (for full notes / treatment entry)
  const handleSaveCondition = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    const targetList = selectedTeeth.length > 0 ? selectedTeeth : inspectedTeeth;
    if (targetList.length === 0) {
      setErrorMessage('Please select one or more teeth on the chart first.');
      return;
    }

    if (!formCondition.trim()) {
      setErrorMessage('Please select or enter a condition.');
      return;
    }

    const parsed = sanitizeCondition(formCondition);
    if (iconicCode.trim()) {
      parsed.code = iconicCode.replace(/[\[\]]/g, '').trim().toUpperCase();
      parsed.formatted = `${parsed.name} [${parsed.code}]`;
    }
    const saveCondition = parsed.formatted;

    if (isNewCustomCondition(parsed.name)) {
      try {
        await api.post('/tooth-chart/conditions', {
          name: parsed.name,
          code: parsed.code,
        });
      } catch (e) {
        console.warn('Failed to save custom condition to collection:', e);
      }
    }

    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      if (targetList.length === 1) {
        const tNum = targetList[0];
        await api.patch(`/tooth-chart/${patientId}/${tNum}`, {
          condition: saveCondition,
          treatment: formTreatment,
          notes: formNotes,
          consultationId,
        });
      } else {
        await api.post(`/tooth-chart/${patientId}/bulk`, {
          teeth: targetList,
          condition: saveCondition,
          treatment: formTreatment,
          notes: formNotes,
          consultationId,
        });
      }

      if (!conditionOptions.some((o) => sanitizeCondition(o).name.toLowerCase() === parsed.name.toLowerCase())) {
        setConditionOptions((prev) => [...prev, saveCondition]);
      }

      setSuccessMessage(
        `Updated ${targetList.length === 1 ? `Tooth #${targetList[0]}` : `${targetList.length} teeth`} to ${parsed.name}!`
      );

      // Automatically unselect/clear the selection state
      setSelectedTeeth([]);
      setInspectedTeeth([]);
      setIsPopupOpen(false);
      setPopupAnchorEl(null);
      setIconicCode('');
      setFormTreatment('');
      setFormNotes('');
      await fetchToothChart();
      await fetchConditions();
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update tooth chart.');
    } finally {
      setSaving(false);
    }
  };

  const renderToothCard = (tNum) => {
    const record = teethMap[tNum] || {};
    const cond = record.currentCondition || 'Healthy [H]';
    const codeCfg = getConditionCodeObj(cond);
    const isSelected = selectedTeeth.includes(tNum) || inspectedTeeth.includes(tNum);
    const activeHistoryCount = (record.history || []).filter((h) => !h.deleted).length;
    const hasHistory = activeHistoryCount > 0;
    const isLowerArch = (tNum >= 31 && tNum <= 48) || (tNum >= 71 && tNum <= 85);

    return (
      <button
        type="button"
        key={tNum}
        onClick={(e) => handleToothClick(tNum, e)}
        className={`flex flex-col items-center justify-between p-0.5 sm:p-1 rounded-lg sm:rounded-xl border transition-all duration-150 relative select-none flex-1 max-w-[34px] xs:max-w-[40px] sm:max-w-[46px] min-w-[24px] sm:min-w-[30px] min-h-[85px] xs:min-h-[95px] sm:min-h-[110px] ${
          isSelected
            ? 'border-brand bg-brand-light/40 shadow-md ring-2 ring-brand scale-105 z-10'
            : 'border-border bg-surface hover:bg-bg/80 hover:border-brand/50'
        }`}
      >
        {/* UPPER ARCH */}
        {!isLowerArch ? (
          <>
            <span className="font-mono text-[9px] xs:text-[10px] sm:text-xs font-bold text-ink leading-none">
              {tNum}
            </span>

            <ToothSvg tNum={tNum} condition={cond} isSelected={isSelected} />

            <div className="flex flex-col items-center gap-0.5 w-full min-w-0">
              <span
                className={`px-1 py-0.2 rounded text-[7px] xs:text-[8px] sm:text-[9px] font-extrabold uppercase leading-tight border ${codeCfg.color}`}
              >
                {codeCfg.code}
              </span>
              {hasHistory ? (
                <span className="text-[7px] sm:text-[8px] font-bold text-brand flex items-center justify-center gap-0.5 w-full">
                  <History size={8} /> {activeHistoryCount}
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
                  <History size={8} /> {activeHistoryCount}
                </span>
              ) : (
                <span className="text-[7px] text-ink-soft/30">—</span>
              )}
              <span
                className={`px-1 py-0.2 rounded text-[7px] xs:text-[8px] sm:text-[9px] font-extrabold uppercase leading-tight border ${codeCfg.color}`}
              >
                {codeCfg.code}
              </span>
            </div>

            <ToothSvg tNum={tNum} condition={cond} isSelected={isSelected} />

            <span className="font-mono text-[9px] xs:text-[10px] sm:text-xs font-bold text-ink leading-none">
              {tNum}
            </span>
          </>
        )}
      </button>
    );
  };

  const displayTeeth = selectedTeeth.length > 0 ? selectedTeeth : inspectedTeeth;
  const selectedToothSingle = displayTeeth.length === 1 ? teethMap[displayTeeth[0]] : null;
  const totalHistoryCount = displayTeeth.reduce(
    (acc, tNum) => acc + ((teethMap[tNum]?.history || []).filter((h) => !h.deleted).length),
    0
  );

  // Collect all active history items across all teeth for overall patient timeline
  const allPatientHistory = [];
  Object.entries(teethMap).forEach(([tNumStr, record]) => {
    const tNum = Number(tNumStr);
    if (record && Array.isArray(record.history)) {
      const activeHist = record.history.filter((h) => !h.deleted);
      activeHist.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      const latestId = activeHist[0]?._id;

      activeHist.forEach((h) => {
        allPatientHistory.push({
          ...h,
          toothNumber: tNum,
          currentCondition: record.currentCondition,
          isToothLatest: h._id === latestId,
        });
      });
    }
  });
  allPatientHistory.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const historySubtitleText = loading
    ? 'Loading treatment history...'
    : displayTeeth.length === 0
    ? allPatientHistory.length > 0
      ? `Overall patient timeline (${allPatientHistory.length} total ${allPatientHistory.length === 1 ? 'activity entry' : 'activity entries'})`
      : 'No treatment history recorded for this patient yet.'
    : displayTeeth.length === 1
    ? `Treatment history for Tooth #${displayTeeth[0]}`
    : `Treatment history for selected teeth (${displayTeeth.join(', ')})`;

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200 animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800 border border-rose-200 animate-fadeIn">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Chart Toolbar & Dentition Summary */}
      <div className="card p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3">
          {/* Left: Title & Dentition Badge */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
            <Layers size={18} className="text-brand shrink-0" />
            <h3 className="font-display text-sm font-bold text-ink">
              FDI Anatomical Interactive Tooth Chart
            </h3>
            <span className="badge bg-brand-light/50 text-brand-dark border border-brand/20 text-xs font-semibold px-2.5 py-0.5 shrink-0">
              {patientType === 'child'
                ? 'Pediatric Dentition (20 Primary Teeth)'
                : 'Adult Dentition (32 Permanent Teeth)'}
            </span>
          </div>

          {/* Right: Actions (Multi-Select toggle + Done / Clear Action Group) */}
          <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
            {/* Multi-Select Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextMode = !multiSelectMode;
                setMultiSelectMode(nextMode);
                setIsPopupOpen(false);
                if (!nextMode) {
                  setSelectedTeeth([]);
                  setInspectedTeeth([]);
                }
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 min-h-[34px] shrink-0 select-none ${
                multiSelectMode
                  ? 'bg-purple-600 text-white border-purple-700 shadow-sm ring-2 ring-purple-300'
                  : 'bg-surface border-border text-ink-soft hover:text-ink hover:bg-bg/80 hover:border-brand/40'
              }`}
              title={multiSelectMode ? 'Click to disable multi-select mode' : 'Enable multi-select mode to select multiple teeth'}
            >
              <MousePointerClick size={14} />
              <span>{multiSelectMode ? 'Multi-Select Active' : 'Enable Multi-Select'}</span>
            </button>

            {/* Action buttons grouped together */}
            {selectedTeeth.length > 0 && multiSelectMode && (
              <button
                type="button"
                onClick={handleOpenMultiConditionPopup}
                className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm rounded-xl min-h-[34px] shrink-0"
                title="Set condition for selected teeth"
              >
                <Sparkles size={14} />
                <span>Done / Continue ({selectedTeeth.length})</span>
              </button>
            )}

            {displayTeeth.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="btn-secondary py-1.5 px-2.5 text-xs font-bold text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 flex items-center justify-center gap-1 shadow-2xs rounded-xl min-h-[34px] transition-colors shrink-0"
                title="Deselect all selected teeth"
              >
                <X size={14} />
                <span>Clear Selection {displayTeeth.length === 1 ? `(#${displayTeeth[0]})` : `(${displayTeeth.length})`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Condition Legend Badges */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] pt-0.5 select-none">
          {['Healthy', 'Caries', 'Missing', 'Filling', 'RCT', 'Crown', 'Bridge', 'Implant', 'Mobility'].map(
            (label) => {
              const cfg = CONDITION_CODES[label];
              if (!cfg) return null;
              return (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${cfg.color}`}
                >
                  <span className="font-mono text-[10px] font-bold">[{cfg.code}]</span>
                  <span>{label}</span>
                </span>
              );
            }
          )}
        </div>
      </div>

      {/* FDI CHART GRID ARCHES */}
      <div
        className="card p-2 sm:p-4 space-y-4 overflow-x-auto scrollbar-none w-full max-w-full relative"
        aria-live="polite"
        aria-label={`Tooth chart for ${patientType === 'child' ? 'Primary Child teeth' : 'Permanent Adult teeth'}`}
      >
        {/* Multi-Select Active Action Banner directly above tooth chart */}
        {multiSelectMode && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50 border-2 border-purple-300 rounded-2xl p-3 shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-purple-600 text-white shadow-xs shrink-0">
                <MousePointerClick size={14} /> Multi-Select Mode
              </span>
              {selectedTeeth.length > 0 ? (
                <span className="text-xs font-bold text-purple-950 truncate">
                  Selected {selectedTeeth.length} {selectedTeeth.length === 1 ? 'Tooth' : 'Teeth'}:{' '}
                  <span className="font-mono text-purple-700 font-extrabold">
                    {selectedTeeth.map((t) => `#${t}`).join(', ')}
                  </span>
                </span>
              ) : (
                <span className="text-xs text-purple-800 font-medium">
                  Click any teeth to select them without popup interruptions.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {selectedTeeth.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-surface border border-rose-200 rounded-xl hover:bg-rose-50 shadow-xs flex items-center gap-1.5 transition-colors"
                    title="Clear all selected teeth"
                  >
                    <X size={13} /> Clear Selection
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenMultiConditionPopup}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                    title="Set condition for all selected teeth"
                  >
                    <Sparkles size={14} /> Done / Continue ({selectedTeeth.length})
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Single-Select Quick Clear Banner when multiSelectMode is false and a tooth is selected */}
        {!multiSelectMode && displayTeeth.length > 0 && (
          <div className="flex items-center justify-between bg-brand-light/30 border border-brand/30 rounded-xl px-3 py-2 text-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="font-bold text-brand">
                Tooth #{displayTeeth[0]} Selected
              </span>
              <span className="text-ink-soft">
                Current: <strong className="text-brand-dark">{sanitizeCondition(teethMap[displayTeeth[0]]?.currentCondition).name}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-surface border border-rose-200 rounded-lg hover:bg-rose-50 shadow-xs flex items-center gap-1 transition-colors"
            >
              <X size={13} /> Clear Selection
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-sm text-ink-soft flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-brand" />
            <span>Loading patient tooth records...</span>
          </div>
        ) : (
          <div className="w-full min-w-[440px] sm:min-w-0 space-y-4">
            {patientType === 'child' ? (
              /* PRIMARY (CHILD) 20-TEETH CHART */
              <>
                {/* UPPER ARCH */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] sm:text-xs font-bold text-ink-soft uppercase tracking-wider px-1 gap-1">
                    <span>Upper Right (55 - 51)</span>
                    <span className="text-brand font-display font-extrabold text-[10px] sm:text-xs">
                      PRIMARY UPPER ARCH (MAXILLA)
                    </span>
                    <span>Upper Left (61 - 65)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3 bg-bg/40 p-1.5 sm:p-2.5 rounded-2xl border border-border">
                    <div className="flex justify-end items-center gap-0.5 sm:gap-1 min-w-0">
                      {PRIMARY_QUAD_UPPER_RIGHT.map(renderToothCard)}
                    </div>
                    <div className="flex justify-start items-center gap-0.5 sm:gap-1 border-l border-border/80 pl-1 sm:pl-2.5 min-w-0">
                      {PRIMARY_QUAD_UPPER_LEFT.map(renderToothCard)}
                    </div>
                  </div>
                </div>

                {/* BITE LINE */}
                <div className="relative flex items-center justify-center my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed border-brand/30"></div>
                  </div>
                  <span className="relative bg-surface px-3 py-0.5 text-[8px] sm:text-[9px] font-mono font-bold text-brand border border-brand/20 rounded-full">
                    PRIMARY OCCLUSAL BITE LINE
                  </span>
                </div>

                {/* LOWER ARCH */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] sm:text-xs font-bold text-ink-soft uppercase tracking-wider px-1 gap-1">
                    <span>Lower Right (85 - 81)</span>
                    <span className="text-brand font-display font-extrabold text-[10px] sm:text-xs">
                      PRIMARY LOWER ARCH (MANDIBLE)
                    </span>
                    <span>Lower Left (71 - 75)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3 bg-bg/40 p-1.5 sm:p-2.5 rounded-2xl border border-border">
                    <div className="flex justify-end items-center gap-0.5 sm:gap-1 min-w-0">
                      {PRIMARY_QUAD_LOWER_RIGHT.map(renderToothCard)}
                    </div>
                    <div className="flex justify-start items-center gap-0.5 sm:gap-1 border-l border-border/80 pl-1 sm:pl-2.5 min-w-0">
                      {PRIMARY_QUAD_LOWER_LEFT.map(renderToothCard)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* PERMANENT (ADULT) 32-TEETH CHART */
              <>
                {/* UPPER ARCH */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] sm:text-xs font-bold text-ink-soft uppercase tracking-wider px-1 gap-1">
                    <span>Maxillary Right (18 - 11)</span>
                    <span className="text-brand font-display font-extrabold text-[10px] sm:text-xs">
                      UPPER ARCH (MAXILLA)
                    </span>
                    <span>Maxillary Left (21 - 28)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3 bg-bg/40 p-1.5 sm:p-2.5 rounded-2xl border border-border">
                    <div className="flex justify-end items-center gap-0.5 sm:gap-1 min-w-0">
                      {QUAD_UPPER_RIGHT.map(renderToothCard)}
                    </div>
                    <div className="flex justify-start items-center gap-0.5 sm:gap-1 border-l border-border/80 pl-1 sm:pl-2.5 min-w-0">
                      {QUAD_UPPER_LEFT.map(renderToothCard)}
                    </div>
                  </div>
                </div>

                {/* BITE LINE */}
                <div className="relative flex items-center justify-center my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed border-brand/30"></div>
                  </div>
                  <span className="relative bg-surface px-3 py-0.5 text-[8px] sm:text-[9px] font-mono font-bold text-brand border border-brand/20 rounded-full">
                    OCCLUSAL BITE LINE
                  </span>
                </div>

                {/* LOWER ARCH */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] sm:text-xs font-bold text-ink-soft uppercase tracking-wider px-1 gap-1">
                    <span>Mandibular Right (48 - 41)</span>
                    <span className="text-brand font-display font-extrabold text-[10px] sm:text-xs">
                      LOWER ARCH (MANDIBLE)
                    </span>
                    <span>Mandibular Left (31 - 38)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3 bg-bg/40 p-1.5 sm:p-2.5 rounded-2xl border border-border">
                    <div className="flex justify-end items-center gap-0.5 sm:gap-1 min-w-0">
                      {QUAD_LOWER_RIGHT.map(renderToothCard)}
                    </div>
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

      {/* COMPACT CONDITION PICKER POPUP (No black overlay) */}
      <CompactConditionPopup
        isOpen={isPopupOpen}
        anchorEl={popupAnchorEl}
        targetTeeth={selectedTeeth.length > 0 ? selectedTeeth : inspectedTeeth}
        currentCondition={
          displayTeeth.length === 1
            ? teethMap[displayTeeth[0]]?.currentCondition || 'Healthy [H]'
            : 'Healthy [H]'
        }
        initialTreatment={
          displayTeeth.length === 1
            ? formTreatment || ''
            : ''
        }
        initialNotes={
          displayTeeth.length === 1
            ? formNotes || ''
            : ''
        }
        conditionOptions={conditionOptions}
        onSave={handleSavePopupCondition}
        onClose={() => setIsPopupOpen(false)}
        onClearSelection={handleClearSelection}
        onDeleteCustomCondition={handleRequestDeleteCondition}
        isSaving={saving}
      />

      {/* DETAIL INSPECTION & FULL UPDATE FORM PANEL (Independent of popup) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Detailed Treatment & Notes Form */}
        {!isReadOnly && (
          <div className="lg:col-span-5 card p-5 space-y-4">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                  <Sparkles size={16} className="text-brand" />
                  {displayTeeth.length === 0
                    ? 'Record Finding for Selected Teeth'
                    : displayTeeth.length === 1
                    ? `Update Tooth #${displayTeeth[0]}`
                    : `Update ${displayTeeth.length} Selected Teeth (${displayTeeth.join(', ')})`}
                </h4>
                <p className="text-xs text-ink-soft">
                  {displayTeeth.length > 0
                    ? 'Add clinical notes and treatments performed or planned.'
                    : 'Click any tooth on the chart above to inspect and update.'}
                </p>
              </div>

              {displayTeeth.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
                >
                  <X size={13} /> Clear
                </button>
              )}
            </div>

            <form onSubmit={handleSaveCondition} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Condition *</label>
                <ConditionCombobox
                  value={formCondition}
                  onChange={(val) => setFormCondition(val)}
                  options={conditionOptions}
                  onDeleteCustomCondition={handleRequestDeleteCondition}
                />
                <p className="text-[11px] text-ink-soft mt-1">
                  Displays all available conditions. Select any condition or type to add custom.
                </p>

                {isNewCustomCondition(formCondition) && (
                  <div className="mt-2.5 p-3 bg-brand-light/30 border border-brand/20 rounded-xl space-y-1.5 animate-fadeIn">
                    <label className="block font-semibold text-brand text-xs">
                      Iconic Letter / Short Code for "{formCondition}"
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      className="input-field uppercase font-mono text-xs"
                      placeholder="e.g. FL, FR, F1 (1-3 letters)"
                      value={iconicCode}
                      onChange={(e) => setIconicCode(e.target.value.toUpperCase())}
                    />
                    <p className="text-[10px] text-ink-soft">
                      Short code to display on the tooth badge.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Treatment Performed / Planned
                </label>
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
                disabled={saving || displayTeeth.length === 0}
                className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={16} />
                <span>
                  {saving
                    ? 'Saving Record...'
                    : displayTeeth.length === 0
                    ? 'Select Tooth Above'
                    : `Save Details for ${displayTeeth.length === 1 ? `Tooth #${displayTeeth[0]}` : `${displayTeeth.length} Teeth`}`}
                </span>
              </button>
            </form>
          </div>
        )}

        {/* Right Col: Treatment History Log (Timeline / Card Activity Stream) */}
        <div className={`${isReadOnly ? 'lg:col-span-12' : 'lg:col-span-7'} card p-5 space-y-4`}>
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h4 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                <History size={16} className="text-brand" /> Historical Treatment Log
              </h4>
              <p className="text-xs text-ink-soft">{historySubtitleText}</p>
            </div>
            {displayTeeth.length > 1 ? (
              <span className="badge bg-purple-50 text-purple-800 border border-purple-200 text-xs font-mono">
                {displayTeeth.length} Teeth Selected
              </span>
            ) : displayTeeth.length === 1 ? (
              <span className="badge bg-brand-light/60 text-brand-dark border border-brand/20 text-xs font-mono font-bold">
                Tooth #{displayTeeth[0]}
              </span>
            ) : allPatientHistory.length > 0 ? (
              <span className="badge bg-slate-100 text-slate-700 border border-slate-200 text-xs font-mono">
                {allPatientHistory.length} Logged
              </span>
            ) : null}
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-ink-soft flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-brand" />
              <span>Loading treatment history...</span>
            </div>
          ) : displayTeeth.length === 0 ? (
            /* OVERALL PATIENT TIMELINE (NO SPECIFIC TOOTH SELECTED) */
            allPatientHistory.length === 0 ? (
              <div className="p-12 text-center text-xs text-ink-soft space-y-2">
                <History size={32} className="mx-auto text-ink-soft/40" />
                <p className="font-semibold text-ink text-sm">No treatment activity logged yet</p>
                <p>Select any tooth on the FDI chart above to record conditions, treatments, or clinical notes.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto scrollbar-none pr-1">
                <div className="divide-y divide-border border border-border/60 rounded-xl overflow-hidden bg-surface shadow-sm">
                  {allPatientHistory.map((h, idx) => {
                    const isLatestOverall = idx === 0;
                    const parsedCond = sanitizeCondition(h.condition);
                    const condObj = getConditionCodeObj(h.condition);
                    const relTime = formatRelativeTime(h.date);
                    const exactTime = formatExactDateTime(h.date);

                    return (
                      <div
                        key={h._id || idx}
                        className={`p-3.5 text-xs space-y-2 hover:bg-bg/40 transition-colors ${
                          isLatestOverall ? 'bg-surface/90 border-l-4 border-l-brand' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            {/* Tooth Number Badge */}
                            <span className="font-mono font-bold text-xs bg-brand-light/60 text-brand-dark px-2 py-0.5 rounded-lg border border-brand/20 shrink-0">
                              Tooth #{h.toothNumber}
                            </span>

                            {/* Condition Code & Name */}
                            <div className="inline-flex items-center gap-1.5 bg-bg/80 border border-border/80 px-2 py-0.5 rounded-lg shadow-xs shrink-0">
                              <span
                                className={`w-4 h-4 rounded text-[9px] font-mono font-extrabold flex items-center justify-center shrink-0 border ${condObj.color}`}
                              >
                                {condObj.code}
                              </span>
                              <span className="font-bold text-ink text-xs whitespace-nowrap">
                                {parsedCond.name}
                              </span>
                            </div>

                            {/* Relative & Exact Timestamp */}
                            {relTime && (
                              <span
                                className="text-[10px] font-bold text-brand bg-brand-light/40 px-2 py-0.5 rounded-md border border-brand/20 whitespace-nowrap"
                                title={exactTime}
                              >
                                {relTime}
                              </span>
                            )}
                            {exactTime && (
                              <span className="text-[11px] text-ink-soft font-medium whitespace-nowrap hidden sm:inline">
                                • {exactTime}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            {!isReadOnly && h.isToothLatest && (
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteHistory(h.toothNumber, h)}
                                className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 inline-flex items-center justify-center transition-colors shadow-xs"
                                title={`Delete last entry for Tooth #${h.toothNumber}`}
                                aria-label={`Delete last entry for Tooth #${h.toothNumber}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {h.treatment && (
                          <div className="text-xs pl-0.5">
                            <span className="font-semibold text-ink-soft">Treatment: </span>
                            <span className="font-bold text-ink">{h.treatment}</span>
                          </div>
                        )}

                        {h.notes && (
                          <div className="text-[11px] pl-0.5 text-ink-soft">
                            <span className="font-semibold">Notes: </span>
                            <span className="italic text-ink/80">{h.notes}</span>
                          </div>
                        )}

                        <div className="text-[10px] text-ink-soft/70 text-right pt-0.5">
                          Recorded by: Dr. {h.doctor?.name || 'Doctor'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : displayTeeth.length === 1 ? (
            /* SINGLE TOOTH SELECTION LOG */
            <div className="space-y-3 max-h-[420px] overflow-y-auto scrollbar-none pr-1">
              {(() => {
                const activeHistory = (selectedToothSingle?.history || [])
                  .filter((h) => !h.deleted)
                  .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

                if (activeHistory.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-ink-soft space-y-1">
                      <Shield size={24} className="mx-auto text-ink-soft/40" />
                      <p className="font-semibold text-ink">No historical treatments recorded yet.</p>
                      <p>
                        Tooth #{displayTeeth[0]} is currently marked as{' '}
                        <span className="text-brand font-bold">
                          {selectedToothSingle?.currentCondition || 'Healthy'}
                        </span>
                        .
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-border border border-border/60 rounded-xl overflow-hidden bg-surface shadow-sm">
                    {activeHistory.map((h, idx) => {
                      const tNum = displayTeeth[0];
                      const isMostRecent = idx === 0;
                      const parsedCond = sanitizeCondition(h.condition);
                      const condObj = getConditionCodeObj(h.condition);
                      const relTime = formatRelativeTime(h.date);
                      const exactTime = formatExactDateTime(h.date);

                      return (
                        <div
                          key={h._id || idx}
                          className={`p-3.5 text-xs space-y-2 hover:bg-bg/40 transition-colors ${
                            isMostRecent ? 'bg-surface/90 border-l-4 border-l-brand' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <div className="inline-flex items-center gap-1.5 bg-bg/80 border border-border/80 px-2 py-0.5 rounded-lg shadow-xs shrink-0">
                                <span
                                  className={`w-4 h-4 rounded text-[9px] font-mono font-extrabold flex items-center justify-center shrink-0 border ${condObj.color}`}
                                >
                                  {condObj.code}
                                </span>
                                <span className="font-bold text-ink text-xs whitespace-nowrap">
                                  {parsedCond.name}
                                </span>
                              </div>
                              {isMostRecent && (
                                <span className="text-[10px] bg-brand-light/60 text-brand px-2 py-0.5 rounded-md font-bold border border-brand/20 whitespace-nowrap">
                                  Latest Entry
                                </span>
                              )}
                              {relTime && (
                                <span
                                  className="text-[10px] font-bold text-brand bg-brand-light/40 px-2 py-0.5 rounded-md border border-brand/20 whitespace-nowrap"
                                  title={exactTime}
                                >
                                  {relTime}
                                </span>
                              )}
                              {exactTime && (
                                <span className="text-[11px] text-ink-soft font-medium whitespace-nowrap hidden sm:inline">
                                  • {exactTime}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                              {!isReadOnly && isMostRecent && (
                                <button
                                  type="button"
                                  onClick={() => handleRequestDeleteHistory(tNum, h)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 inline-flex items-center justify-center transition-colors shadow-xs"
                                  title="Delete last entry"
                                  aria-label="Delete last entry"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                          {h.treatment && (
                            <div className="text-xs pl-0.5">
                              <span className="font-semibold text-ink-soft">Treatment: </span>
                              <span className="font-bold text-ink">{h.treatment}</span>
                            </div>
                          )}

                          {h.notes && (
                            <div className="text-[11px] pl-0.5 text-ink-soft">
                              <span className="font-semibold">Notes: </span>
                              <span className="italic text-ink/80">{h.notes}</span>
                            </div>
                          )}

                          <div className="text-[10px] text-ink-soft/70 text-right pt-0.5">
                            Recorded by: Dr. {h.doctor?.name || 'Doctor'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            /* MULTIPLE TEETH SELECTION LOG */
            <div className="space-y-4 max-h-[420px] overflow-y-auto scrollbar-none pr-1">
              {totalHistoryCount === 0 ? (
                <div className="p-8 text-center text-xs text-ink-soft space-y-2 bg-bg/30 rounded-xl border border-border">
                  <Shield size={28} className="mx-auto text-ink-soft/40" />
                  <p className="font-semibold text-ink text-sm">No treatment history found</p>
                  <p className="text-ink-soft">
                    No previous treatment history found for {formatTeethListPhrase(displayTeeth)}.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayTeeth.map((tNum) => {
                    const record = teethMap[tNum] || {};
                    const activeHistory = (record.history || [])
                      .filter((h) => !h.deleted)
                      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

                    return (
                      <div
                        key={tNum}
                        className="border border-border rounded-xl p-3.5 space-y-2.5 bg-bg/30"
                      >
                        <div className="flex items-center justify-between border-b border-border/70 pb-2">
                          <span className="font-mono font-bold text-sm text-ink flex items-center gap-2">
                            Tooth #{tNum}
                          </span>
                          <span className="text-xs font-semibold text-ink-soft">
                            Current:{' '}
                            <span className="text-brand font-bold">
                              {sanitizeCondition(record.currentCondition).name}
                            </span>
                          </span>
                        </div>

                        {activeHistory.length > 0 ? (
                          <div className="divide-y divide-border border border-border/60 rounded-xl overflow-hidden bg-surface shadow-sm">
                            {activeHistory.map((h, idx) => {
                              const isMostRecent = idx === 0;
                              const parsedCond = sanitizeCondition(h.condition);
                              const condObj = getConditionCodeObj(h.condition);
                              const relTime = formatRelativeTime(h.date);
                              const exactTime = formatExactDateTime(h.date);

                              return (
                                <div
                                  key={h._id || idx}
                                  className={`p-3.5 text-xs space-y-2 hover:bg-bg/40 transition-colors ${
                                    isMostRecent ? 'bg-surface/90 border-l-4 border-l-brand' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                                      <div className="inline-flex items-center gap-1.5 bg-bg/80 border border-border/80 px-2 py-0.5 rounded-lg shadow-xs shrink-0">
                                        <span
                                          className={`w-4 h-4 rounded text-[9px] font-mono font-extrabold flex items-center justify-center shrink-0 border ${condObj.color}`}
                                        >
                                          {condObj.code}
                                        </span>
                                        <span className="font-bold text-ink text-xs whitespace-nowrap">
                                          {parsedCond.name}
                                        </span>
                                      </div>
                                      {isMostRecent && (
                                        <span className="text-[10px] bg-brand-light/60 text-brand px-2 py-0.5 rounded-md font-bold border border-brand/20 whitespace-nowrap">
                                          Latest Entry
                                        </span>
                                      )}
                                      {relTime && (
                                        <span
                                          className="text-[10px] font-bold text-brand bg-brand-light/40 px-2 py-0.5 rounded-md border border-brand/20 whitespace-nowrap"
                                          title={exactTime}
                                        >
                                          {relTime}
                                        </span>
                                      )}
                                      {exactTime && (
                                        <span className="text-[11px] text-ink-soft font-medium whitespace-nowrap hidden sm:inline">
                                          • {exactTime}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                      {!isReadOnly && isMostRecent && (
                                        <button
                                          type="button"
                                          onClick={() => handleRequestDeleteHistory(tNum, h)}
                                          className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 inline-flex items-center justify-center transition-colors shadow-xs"
                                          title="Delete last entry"
                                          aria-label="Delete last entry"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {h.treatment && (
                                    <div className="text-xs pl-0.5">
                                      <span className="font-semibold text-ink-soft">Treatment: </span>
                                      <span className="font-bold text-ink">{h.treatment}</span>
                                    </div>
                                  )}

                                  {h.notes && (
                                    <div className="text-[11px] pl-0.5 text-ink-soft">
                                      <span className="font-semibold">Notes: </span>
                                      <span className="italic text-ink/80">{h.notes}</span>
                                    </div>
                                  )}

                                  <div className="text-[10px] text-ink-soft/70 text-right pt-0.5">
                                    Recorded by: Dr. {h.doctor?.name || 'Doctor'}
                                  </div>
                                </div>
                              );
                            })}
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

      {/* DELETE CONFIRMATION POPUP FOR MOST RECENT TOOTH HISTORY ENTRY */}
      <ConfirmModal
        isOpen={isConfirmHistoryDeleteOpen}
        title="Delete Last Entry"
        message={
          historyItemToDelete
            ? `Remove the most recent entry for Tooth #${historyItemToDelete.toothNumber} — ${historyItemToDelete.condition} on ${
                historyItemToDelete.date
                  ? new Date(historyItemToDelete.date).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'today'
              }? This cannot be undone.`
            : 'Remove the most recent entry for this tooth? This cannot be undone.'
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="delete"
        loading={isDeletingHistory}
        onClose={() => {
          setIsConfirmHistoryDeleteOpen(false);
          setHistoryItemToDelete(null);
        }}
        onConfirm={handleConfirmDeleteHistory}
      />

      {/* CONFIRMATION POPUP FOR CONDITION SOFT DELETE */}
      <ConfirmModal
        isOpen={isConfirmConditionDeleteOpen}
        title="Remove Condition from Active Use"
        message={
          conditionToSoftDelete
            ? `Are you sure you want to soft delete "${conditionToSoftDelete.name}" from active conditions? Existing tooth records using this condition will retain their history.`
            : 'Remove condition from active use?'
        }
        confirmText="Soft Delete Condition"
        cancelText="Cancel"
        variant="delete"
        loading={isDeletingCondition}
        onClose={() => {
          setIsConfirmConditionDeleteOpen(false);
          setConditionToSoftDelete(null);
        }}
        onConfirm={handleConfirmDeleteCondition}
      />
    </div>
  );
}
