import React from 'react';

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="overflow-x-auto animate-pulse">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-5 py-3.5">
                <div className="h-3.5 w-20 rounded bg-slate-200" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx}>
              <td className="px-5 py-4 whitespace-nowrap">
                <div className="h-4 w-28 rounded-md bg-slate-200" />
                <div className="h-3 w-16 rounded bg-slate-200/70 mt-1.5" />
              </td>
              <td className="px-5 py-4">
                <div className="h-4 w-36 rounded-md bg-slate-200" />
                <div className="h-3 w-24 rounded bg-slate-200/70 mt-1.5" />
              </td>
              <td className="px-5 py-4">
                <div className="h-4 w-24 rounded-md bg-slate-200" />
              </td>
              <td className="px-5 py-4">
                <div className="h-6 w-20 rounded-full bg-slate-200" />
              </td>
              <td className="px-5 py-4">
                <div className="h-6 w-20 rounded-full bg-slate-200" />
              </td>
              {cols >= 6 && (
                <td className="px-5 py-4 text-right">
                  <div className="h-8 w-24 rounded-xl bg-slate-200 ml-auto" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReceptionistDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-64 rounded-xl bg-slate-200" />
        <div className="h-3.5 w-80 rounded-lg bg-slate-200/70" />
      </div>

      {/* 4 Stat Cards Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded-md bg-slate-200" />
              <div className="h-10 w-10 rounded-xl bg-slate-100" />
            </div>
            <div className="h-8 w-16 rounded-lg bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="card p-5 space-y-4 bg-white border border-slate-200/80 shadow-sm">
        <div className="h-5 w-32 rounded-md bg-slate-200" />
        <div className="flex flex-wrap gap-3 pt-1">
          <div className="h-10 w-36 rounded-xl bg-slate-200" />
          <div className="h-10 w-36 rounded-xl bg-slate-200" />
          <div className="h-10 w-36 rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 space-y-4 lg:col-span-2 bg-surface border border-slate-200">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="h-24 bg-slate-100 rounded-xl" />
            <div className="h-24 bg-slate-100 rounded-xl" />
            <div className="h-24 bg-slate-100 rounded-xl" />
            <div className="h-24 bg-slate-100 rounded-xl" />
          </div>
        </div>
        <div className="card p-5 space-y-4 bg-surface border border-slate-200">
          <div className="h-6 w-36 bg-slate-200 rounded" />
          <div className="h-56 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function PatientDirectorySkeleton({ rows = 6 }) {
  return (
    <div className="w-full space-y-4 animate-pulse">
      {/* Desktop / Tablet Table View Skeleton (hidden on mobile, visible md and up) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="border-b border-border bg-bg/60 font-semibold text-ink-soft text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5"><div className="h-3.5 w-20 bg-slate-200 rounded-md" /></th>
              <th className="px-5 py-3.5"><div className="h-3.5 w-28 bg-slate-200 rounded-md" /></th>
              <th className="px-5 py-3.5"><div className="h-3.5 w-24 bg-slate-200 rounded-md" /></th>
              <th className="px-5 py-3.5"><div className="h-3.5 w-16 bg-slate-200 rounded-md" /></th>
              <th className="px-5 py-3.5"><div className="h-3.5 w-20 bg-slate-200 rounded-md" /></th>
              <th className="px-5 py-3.5"><div className="h-3.5 w-24 bg-slate-200 rounded-md" /></th>
              <th className="px-5 py-3.5 text-right"><div className="h-3.5 w-16 bg-slate-200 rounded-md ml-auto" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {Array.from({ length: rows }).map((_, idx) => (
              <tr key={idx} className="hover:bg-bg/40">
                <td className="px-5 py-4"><div className="h-4 w-16 bg-slate-200 font-mono rounded-md" /></td>
                <td className="px-5 py-4">
                  <div className="h-4 w-36 bg-slate-200 rounded-md" />
                  <div className="h-3 w-20 bg-slate-200/70 rounded mt-1.5" />
                </td>
                <td className="px-5 py-4"><div className="h-4 w-24 bg-slate-200 rounded-md" /></td>
                <td className="px-5 py-4"><div className="h-4 w-16 bg-slate-200 rounded-md" /></td>
                <td className="px-5 py-4"><div className="h-5 w-16 bg-slate-200 rounded-full" /></td>
                <td className="px-5 py-4"><div className="h-4 w-24 bg-slate-200 rounded-md" /></td>
                <td className="px-5 py-4 text-right"><div className="h-7 w-20 bg-slate-200 rounded-xl ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View Skeleton (visible on mobile < md, hidden on md and up) */}
      <div className="block md:hidden space-y-3">
        {Array.from({ length: Math.min(rows, 4) }).map((_, idx) => (
          <div key={idx} className="card p-4 bg-surface border border-border shadow-xs space-y-3 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-slate-200 rounded-md" />
                  <div className="h-3 w-20 bg-slate-200/70 rounded-md" />
                </div>
              </div>
              <div className="h-5 w-14 bg-slate-200 rounded-full" />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="h-3.5 w-24 bg-slate-200/70 rounded-md" />
              <div className="h-3.5 w-20 bg-slate-200/70 rounded-md justify-self-end" />
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <div className="h-3.5 w-28 bg-slate-200/70 rounded-md" />
              <div className="h-7 w-20 bg-slate-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrescriptionDirectorySkeleton({ rows = 5 }) {
  return (
    <div className="w-full space-y-4 animate-pulse">
      {/* Desktop / Tablet Table View Skeleton (hidden on mobile, visible md and up) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="border-b border-border bg-bg/60 font-semibold text-ink-soft text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5"><div className="h-3.5 w-28 bg-slate-200 rounded-md" /></th>
              <th className="px-5 py-3.5"><div className="h-3.5 w-20 bg-slate-200 rounded-md" /></th>
              <th className="px-5 py-3.5"><div className="h-3.5 w-16 bg-slate-200 rounded-md" /></th>
              <th className="px-5 py-3.5"><div className="h-3.5 w-24 bg-slate-200 rounded-md" /></th>
              <th className="px-5 py-3.5"><div className="h-3.5 w-28 bg-slate-200 rounded-md" /></th>
              <th className="px-5 py-3.5"><div className="h-3.5 w-20 bg-slate-200 rounded-md" /></th>
              <th className="px-5 py-3.5 text-right"><div className="h-3.5 w-16 bg-slate-200 rounded-md ml-auto" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {Array.from({ length: rows }).map((_, idx) => (
              <tr key={idx} className="hover:bg-bg/40">
                <td className="px-5 py-4">
                  <div className="h-4 w-36 bg-slate-200 rounded-md" />
                  <div className="h-3 w-20 bg-slate-200/70 rounded mt-1.5" />
                </td>
                <td className="px-5 py-4"><div className="h-4 w-16 bg-slate-200 font-mono rounded-md" /></td>
                <td className="px-5 py-4"><div className="h-4 w-16 bg-slate-200 rounded-md" /></td>
                <td className="px-5 py-4"><div className="h-4 w-24 bg-slate-200 rounded-md" /></td>
                <td className="px-5 py-4"><div className="h-4 w-24 bg-slate-200 rounded-md" /></td>
                <td className="px-5 py-4"><div className="h-5 w-24 bg-slate-200 rounded-full" /></td>
                <td className="px-5 py-4 text-right"><div className="h-7 w-20 bg-slate-200 rounded-xl ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View Skeleton (visible on mobile < md, hidden on md and up) */}
      <div className="block md:hidden space-y-3">
        {Array.from({ length: Math.min(rows, 4) }).map((_, idx) => (
          <div key={idx} className="card p-4 bg-surface border border-border shadow-xs space-y-3 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-slate-200 rounded-md" />
                  <div className="h-3 w-20 bg-slate-200/70 rounded-md" />
                </div>
              </div>
              <div className="h-5 w-20 bg-slate-200 rounded-full" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="h-3.5 w-24 bg-slate-200/70 rounded-md" />
              <div className="h-3.5 w-20 bg-slate-200/70 rounded-md justify-self-end" />
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <div className="h-3.5 w-28 bg-slate-200/70 rounded-md" />
              <div className="h-7 w-20 bg-slate-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrescriptionCardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-4 rounded-xl border border-border bg-surface space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-32 bg-slate-200 rounded-md" />
              <div className="h-3.5 w-20 bg-slate-200/70 rounded-md" />
            </div>
            <div className="h-7 w-20 bg-slate-200 rounded-lg" />
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-3.5 w-3/4 bg-slate-200/70 rounded-md" />
            <div className="h-3.5 w-1/2 bg-slate-200/70 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DoctorAccountSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="card p-6 bg-surface border border-border space-y-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="h-5 w-36 bg-slate-200 rounded-full" />
          <div className="h-3 w-28 bg-slate-200/70 rounded-md" />
        </div>
        <div className="h-7 w-64 bg-slate-200 rounded-xl" />
        <div className="h-3.5 w-96 max-w-full bg-slate-200/70 rounded-md" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-6 bg-surface border border-border rounded-2xl">
            <div className="border-b border-border pb-4 flex items-center justify-between">
              <div className="h-5 w-48 bg-slate-200 rounded-md" />
              <div className="h-4 w-20 bg-slate-200/70 rounded-md" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-3.5 w-24 bg-slate-200/70 rounded-md" />
                <div className="h-10 w-full bg-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="h-3.5 w-24 bg-slate-200/70 rounded-md" />
                <div className="h-10 w-full bg-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="h-3.5 w-24 bg-slate-200/70 rounded-md" />
                <div className="h-10 w-full bg-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="h-3.5 w-24 bg-slate-200/70 rounded-md" />
                <div className="h-10 w-full bg-slate-200 rounded-xl" />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="h-3.5 w-28 bg-slate-200/70 rounded-md" />
              <div className="h-10 w-full bg-slate-200 rounded-xl" />
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <div className="h-10 w-36 bg-slate-200 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Stats Card Skeleton */}
        <div className="space-y-6">
          <div className="card p-5 bg-surface border border-border space-y-4 rounded-2xl">
            <div className="h-4 w-40 bg-slate-200 rounded-md" />
            <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 space-y-3">
              <div className="h-5 w-32 bg-slate-200 rounded-md" />
              <div className="h-3 w-40 bg-slate-200/70 rounded-md" />
              <div className="h-3 w-28 bg-slate-200/70 rounded-md" />
            </div>
          </div>

          <div className="card p-5 bg-surface border border-border space-y-4 rounded-2xl">
            <div className="h-4 w-32 bg-slate-200 rounded-md" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-16 bg-slate-100 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TableSkeleton;
