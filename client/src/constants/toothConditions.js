/**
 * Single source of truth for Tooth Conditions across the system.
 * Shared by FDI Anatomical Tooth Chart, Consultation workflows, and Follow-Up forms.
 */

export const TOOTH_CONDITIONS = [
  'Healthy',
  'Caries',
  'Decayed',
  'Missing',
  'Filling',
  'RCT',
  'Crown',
  'Bridge',
  'Implant',
  'Extraction',
  'Restored',
  'Prosthetic',
  'Mobility',
  'Other',
];

export const CONDITION_CODES = {
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
  Mobility: { code: 'Mob', color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300', dot: 'bg-fuchsia-500' },
  Other: { code: 'O', color: 'bg-gray-100 text-gray-800 border-gray-300', dot: 'bg-gray-400' },
};

export const INITIAL_CONDITION_OPTIONS = TOOTH_CONDITIONS.map((c) => {
  const code = CONDITION_CODES[c]?.code || c.slice(0, 3).toUpperCase();
  return `${c} [${code}]`;
});

import { capitalizeWords } from '../utils/formatters.js';

export function sanitizeSingleCondition(cond) {
  if (!cond || typeof cond !== 'string') {
    return { name: 'Healthy', code: 'H', formatted: 'Healthy [H]' };
  }
  const bracketMatches = cond.match(/\[(.*?)\]/g);
  let code = '';
  if (bracketMatches && bracketMatches.length > 0) {
    code = bracketMatches[0].replace(/[\[\]]/g, '').trim().toUpperCase();
  }
  const cleanName = capitalizeWords(cond.replace(/\[.*?\]/g, '').trim()) || 'Healthy';
  if (!code) {
    if (CONDITION_CODES[cleanName]) {
      code = CONDITION_CODES[cleanName].code;
    } else {
      code = cleanName.slice(0, 3).toUpperCase();
    }
  }
  return {
    name: cleanName,
    code,
    formatted: `${cleanName} [${code}]`,
  };
}

export function parseConditions(cond) {
  if (!cond) return [sanitizeSingleCondition('Healthy [H]')];
  if (Array.isArray(cond)) {
    return cond.map((c) => sanitizeSingleCondition(c));
  }
  if (typeof cond === 'string' && cond.includes(',')) {
    const parts = cond.split(',').map((s) => s.trim()).filter(Boolean);
    const unique = [];
    const seen = new Set();
    for (const p of parts) {
      const parsed = sanitizeSingleCondition(p);
      const key = parsed.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(parsed);
      }
    }
    return unique.length > 0 ? unique : [sanitizeSingleCondition('Healthy [H]')];
  }
  return [sanitizeSingleCondition(cond)];
}

export function sanitizeCondition(cond) {
  if (!cond) {
    const defaultObj = sanitizeSingleCondition('Healthy [H]');
    return {
      ...defaultObj,
      isMultiple: false,
      conditions: [defaultObj],
    };
  }

  const conds = parseConditions(cond);
  if (conds.length === 1) {
    return {
      ...conds[0],
      isMultiple: false,
      conditions: conds,
    };
  }

  return {
    name: conds.map((c) => c.name).join(', '),
    code: conds.map((c) => c.code).join(', '),
    formatted: conds.map((c) => c.formatted).join(', '),
    isMultiple: true,
    conditions: conds,
  };
}

export function getConditionCodeObj(cond) {
  if (!cond) return { code: 'H', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' };

  const sanitized = sanitizeCondition(cond);
  const baseName = sanitized.conditions?.[0]?.name || sanitized.name;
  const code = sanitized.conditions?.[0]?.code || sanitized.code;

  if (CONDITION_CODES[baseName]) {
    return {
      ...CONDITION_CODES[baseName],
      code: code || CONDITION_CODES[baseName].code,
    };
  }

  return {
    code: code || baseName.slice(0, 3).toUpperCase(),
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    dot: 'bg-indigo-500',
  };
}

export const CONDITION_SVG_STYLES = {
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
  Mobility: { fill: '#FAE8FF', stroke: '#C026D3' },
  Other: { fill: '#F3F4F6', stroke: '#6B7280' },
};
