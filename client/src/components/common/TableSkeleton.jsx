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

export default TableSkeleton;
