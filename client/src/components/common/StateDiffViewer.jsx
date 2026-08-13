import { useState } from 'react';
import { ArrowRight, Eye, X, FileDiff, Sparkles } from 'lucide-react';

const IGNORED_KEYS = new Set(['_id', '__v', 'createdAt', 'updatedAt', 'password', 'id', '__typename']);

function formatKeyName(key) {
  if (!key) return '';
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace('Op Number', 'OP Number')
    .replace('Bp', 'BP')
    .replace('Rbs', 'RBS')
    .trim();
}

function formatPrimitiveValue(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      if (val.length === 0) return null;
      return val
        .map((item) => {
          if (typeof item === 'object' && item !== null) {
            return item.name || item.medicine || item.diagnosis || item.title || JSON.stringify(item);
          }
          return String(item);
        })
        .join(', ');
    }
    // Flatten simple objects like vitals { bp: '120/80', rbs: '100' }
    const pairs = Object.entries(val)
      .filter(([k, v]) => !IGNORED_KEYS.has(k) && v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${formatKeyName(k)}: ${typeof v === 'object' ? formatPrimitiveValue(v) : v}`);
    return pairs.length > 0 ? pairs.join(' | ') : null;
  }
  return String(val);
}

function extractDiffEntries(prev, next) {
  const isPrevObj = prev && typeof prev === 'object' && !Array.isArray(prev);
  const isNextObj = next && typeof next === 'object' && !Array.isArray(next);

  if (!isPrevObj && !isNextObj) {
    const prevFormatted = formatPrimitiveValue(prev);
    const nextFormatted = formatPrimitiveValue(next);
    if (prevFormatted !== nextFormatted) {
      return [{ key: 'Value', prev: prevFormatted, next: nextFormatted, type: 'changed' }];
    }
    return [];
  }

  const prevObj = isPrevObj ? prev : {};
  const nextObj = isNextObj ? next : {};

  const allKeys = Array.from(
    new Set([...Object.keys(prevObj), ...Object.keys(nextObj)])
  ).filter((k) => !IGNORED_KEYS.has(k));

  const diffs = [];

  for (const k of allKeys) {
    const pVal = prevObj[k];
    const nVal = nextObj[k];

    const pFormatted = formatPrimitiveValue(pVal);
    const nFormatted = formatPrimitiveValue(nVal);

    if (pVal !== undefined && pVal !== null && (nVal === undefined || nVal === null)) {
      diffs.push({ key: formatKeyName(k), prev: pFormatted, next: null, type: 'removed' });
    } else if ((pVal === undefined || pVal === null) && nVal !== undefined && nVal !== null) {
      diffs.push({ key: formatKeyName(k), prev: null, next: nFormatted, type: 'added' });
    } else if (pFormatted !== nFormatted) {
      diffs.push({ key: formatKeyName(k), prev: pFormatted, next: nFormatted, type: 'changed' });
    }
  }

  return diffs;
}

export default function StateDiffViewer({ previousValue, newValue }) {
  const [showModal, setShowModal] = useState(false);

  const diffs = extractDiffEntries(previousValue, newValue);

  // If no diff or both empty
  if (!previousValue && !newValue) {
    return <span className="text-ink-soft/40 italic">—</span>;
  }

  // Primitive or empty diffs fallback
  if (diffs.length === 0) {
    const prevFmt = formatPrimitiveValue(previousValue);
    const nextFmt = formatPrimitiveValue(newValue);

    if (!previousValue && newValue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
          <Sparkles size={12} className="text-emerald-600 shrink-0" />
          <span>{nextFmt || 'New Record Created'}</span>
        </span>
      );
    }

    return (
      <span className="font-semibold text-ink text-xs">
        {nextFmt || prevFmt || 'Updated'}
      </span>
    );
  }

  const visibleDiffs = diffs.slice(0, 2);
  const hasMore = diffs.length > 2;

  return (
    <div className="space-y-1 text-xs">
      <div className="flex flex-wrap items-center gap-1.5 max-w-md">
        {visibleDiffs.map((d, idx) => {
          if (d.type === 'changed') {
            return (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] shadow-2xs"
              >
                <span className="font-bold text-ink-soft">{d.key}:</span>
                {d.prev && (
                  <span className="line-through text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-mono">
                    {d.prev}
                  </span>
                )}
                <ArrowRight size={12} className="text-ink-soft shrink-0" />
                {d.next && (
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                    {d.next}
                  </span>
                )}
              </div>
            );
          }
          if (d.type === 'added') {
            return (
              <div
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium"
              >
                <span className="font-bold">{d.key}:</span>
                <span className="font-bold">{d.next}</span>
              </div>
            );
          }
          if (d.type === 'removed') {
            return (
              <div
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium"
              >
                <span className="font-bold">{d.key}:</span>
                <span className="line-through">{d.prev}</span>
              </div>
            );
          }
          return null;
        })}

        {hasMore && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-light/40 text-brand text-[11px] font-bold hover:bg-brand-light transition-colors"
          >
            <Eye size={12} /> +{diffs.length - 2} more
          </button>
        )}
      </div>

      {/* DETAILED INSPECT DIFF MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-xl p-6 space-y-4 bg-surface max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                <FileDiff size={18} className="text-brand" /> Detailed Audit State Diff ({diffs.length} Fields Changed)
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-ink-soft hover:text-ink hover:bg-bg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-hidden border border-border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg font-semibold text-ink-soft border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Field</th>
                    <th className="py-2.5 px-3">Previous State</th>
                    <th className="py-2.5 px-3">New State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {diffs.map((d, i) => (
                    <tr key={i} className="hover:bg-bg/40">
                      <td className="py-2.5 px-3 font-bold text-ink whitespace-nowrap">{d.key}</td>
                      <td className="py-2.5 px-3">
                        {d.prev ? (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-mono font-medium border border-rose-200 block w-fit">
                            {d.prev}
                          </span>
                        ) : (
                          <span className="text-ink-soft/40 italic">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {d.next ? (
                          <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono font-bold border border-emerald-200 block w-fit">
                            {d.next}
                          </span>
                        ) : (
                          <span className="text-ink-soft/40 italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
