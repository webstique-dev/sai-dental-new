import { useState, useEffect } from 'react';
import {
  ScrollText, Filter, Calendar, User, ShieldCheck, UserSquare2, RefreshCw, ChevronLeft, ChevronRight, ArrowRight, Activity, Search, X, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../api/axios.js';
import StateDiffViewer from '../../components/common/StateDiffViewer.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import { TableSkeleton } from '../../components/common/TableSkeleton.jsx';

const ROLE_BADGES = {
  admin: 'bg-role-adminSoft text-role-admin',
  receptionist: 'bg-role-receptionSoft text-role-reception',
  doctor: 'bg-role-doctorSoft text-role-doctor',
  system: 'bg-slate-100 text-slate-700',
};

const ENTITY_BADGES = {
  Patient: 'bg-blue-100 text-blue-800 border-blue-200',
  ToothRecord: 'bg-purple-100 text-purple-800 border-purple-200',
  Diagnosis: 'bg-amber-100 text-amber-800 border-amber-200',
  Consultation: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  Invoice: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  User: 'bg-rose-100 text-rose-800 border-rose-200',
  Other: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [roleFilter, setRoleFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Mobile Filter & Cards State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = async (targetPage = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', targetPage);
      params.append('limit', 25);

      if (roleFilter) params.append('role', roleFilter);
      if (entityFilter) params.append('entityType', entityFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      const data = res.data || {};
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [roleFilter, entityFilter, dateFrom, dateTo]);

  const handleResetFilters = () => {
    setRoleFilter('');
    setEntityFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = Boolean(roleFilter || entityFilter || dateFrom || dateTo);

  return (
    <div className="space-y-6 max-w-7xl w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink flex items-center gap-2 min-w-0 leading-tight">
            <ScrollText size={26} className="text-brand shrink-0" />
            <span className="truncate sm:whitespace-normal">System Audit Trail & Logs</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed break-words">
            Immutable cross-cutting activity trail logging staff actions, clinical updates, and billing operations.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(page)}
          className="btn-secondary text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Desktop Filter Bar (≥768px) */}
      <div className="hidden md:block card p-4 space-y-3 bg-surface border-border">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-display text-xs font-bold text-ink flex items-center gap-1.5">
            <Filter size={15} className="text-brand" /> Filter Audit Logs
          </h3>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-medium"
            >
              <X size={13} /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-ink-soft mb-1">Staff Role</label>
            <select
              className="input-field py-1.5 text-xs font-semibold w-full"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="receptionist">Receptionist</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink-soft mb-1">Entity Type</label>
            <select
              className="input-field py-1.5 text-xs font-semibold w-full"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="">All Entity Types</option>
              <option value="Patient">Patient</option>
              <option value="ToothRecord">ToothRecord</option>
              <option value="Diagnosis">Diagnosis</option>
              <option value="Consultation">Consultation</option>
              <option value="Invoice">Invoice</option>
              <option value="User">User</option>
            </select>
          </div>

          <div>
            <DatePicker
              label="From Date"
              value={dateFrom}
              onChange={(date, dateStr) => setDateFrom(dateStr)}
              inputClassName="py-1 text-xs w-full"
            />
          </div>

          <div>
            <DatePicker
              label="To Date"
              value={dateTo}
              onChange={(date, dateStr) => setDateTo(dateStr)}
              inputClassName="py-1 text-xs w-full"
            />
          </div>
        </div>
      </div>

      {/* Mobile Collapsible Filter Accordion (<768px down to 320px) */}
      <div className="block md:hidden card p-3.5 bg-surface border border-border shadow-xs space-y-3 rounded-2xl max-w-full overflow-hidden">
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-ink gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
              <Filter size={14} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="font-bold text-ink">Filters & Search</span>
              {hasActiveFilters && (
                <span className="badge bg-brand text-white text-[10px] py-0.5 px-2 font-bold shrink-0">
                  Active Filters
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-ink-soft font-semibold shrink-0">
            <span>{isMobileFilterOpen ? 'Hide' : 'Filter'}</span>
            {isMobileFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {isMobileFilterOpen && (
          <div className="pt-2 border-t border-border/70 space-y-3 animate-in fade-in duration-150 text-xs">
            <div className="space-y-2.5">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Staff Role</label>
                <select
                  className="input-field py-1.5 text-xs font-semibold w-full"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Entity Type</label>
                <select
                  className="input-field py-1.5 text-xs font-semibold w-full"
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                >
                  <option value="">All Entity Types</option>
                  <option value="Patient">Patient</option>
                  <option value="ToothRecord">ToothRecord</option>
                  <option value="Diagnosis">Diagnosis</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Invoice">Invoice</option>
                  <option value="User">User</option>
                </select>
              </div>

              <DatePicker
                label="From Date"
                value={dateFrom}
                onChange={(date, dateStr) => setDateFrom(dateStr)}
                inputClassName="py-1.5 text-xs w-full"
              />

              <DatePicker
                label="To Date"
                value={dateTo}
                onChange={(date, dateStr) => setDateTo(dateStr)}
                inputClassName="py-1.5 text-xs w-full"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="btn-secondary w-full py-1.5 text-xs text-rose-600 font-semibold flex items-center justify-center gap-1"
              >
                <X size={13} /> Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* AUDIT LOG TABLE & CARDS */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : (
          <>
            {/* Desktop Table View (≥768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-5 py-3.5">User & Role</th>
                    <th className="px-5 py-3.5">Action</th>
                    <th className="px-5 py-3.5">Target Entity</th>
                    <th className="px-5 py-3.5">Patient Context</th>
                    <th className="px-5 py-3.5">State Diff (Prev → New)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-ink-soft space-y-1">
                        <ScrollText size={28} className="mx-auto text-ink-soft/40" />
                        <p className="font-semibold text-ink">No audit log entries found.</p>
                        <p className="text-[11px]">Perform actions like patient registration, diagnosis creation, or role edits to generate log events.</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const logId = log._id || log.id;
                      const userObj = log.user || {};
                      const userName = userObj.name || 'System / Automated';
                      const userRole = userObj.role || 'system';

                      return (
                        <tr key={logId} className="hover:bg-bg/40 transition-colors">
                          <td className="px-5 py-4 font-mono text-[11px] text-ink-soft whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-semibold text-ink">{userName}</div>
                            <span className={`badge uppercase font-bold text-[10px] ${ROLE_BADGES[userRole] || 'bg-bg text-ink-soft'}`}>
                              {userRole}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-bold text-brand text-xs">
                            {log.action}
                          </td>

                          <td className="px-5 py-4">
                            <span className={`badge font-bold border text-[10px] ${ENTITY_BADGES[log.targetEntity] || 'bg-bg text-ink-soft'}`}>
                              {log.targetEntity}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-ink-soft">
                            {log.patient ? (
                              <div>
                                <span className="font-semibold text-ink text-xs block">
                                  {[log.patient.firstName, log.patient.lastName].filter(Boolean).join(' ') || 'Patient'}
                                </span>
                                {log.patient.opNumber && (
                                  <span className="text-[10px] font-mono text-brand font-bold">OP #{log.patient.opNumber}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-ink-soft/50 italic text-[11px]">N/A</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs">
                            <StateDiffViewer previousValue={log.previousValue} newValue={log.newValue} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Collapsible Cards View (<768px down to 320px) */}
            <div className="block md:hidden divide-y divide-border">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-soft space-y-1">
                  <ScrollText size={28} className="mx-auto text-ink-soft/40" />
                  <p className="font-semibold text-ink">No audit log entries found.</p>
                </div>
              ) : (
                logs.map((log) => {
                  const logId = log._id || log.id;
                  const userObj = log.user || {};
                  const userName = userObj.name || 'System / Automated';
                  const userRole = userObj.role || 'system';
                  const isExpanded = expandedLogId === logId;

                  return (
                    <div key={logId} className="p-4 space-y-3 hover:bg-bg/40 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-brand text-xs">{log.action}</span>
                            <span className={`badge uppercase font-bold text-[9px] ${ROLE_BADGES[userRole] || 'bg-bg text-ink-soft'}`}>
                              {userRole}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-ink-soft flex-wrap">
                            <span className="font-medium text-ink">{userName}</span>
                            <span className="font-mono text-[11px]">• {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedLogId(isExpanded ? null : logId)}
                          className="p-1.5 rounded-lg border border-border text-ink-soft hover:text-ink hover:bg-bg shrink-0 mt-0.5"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className={`badge font-bold border text-[10px] ${ENTITY_BADGES[log.targetEntity] || 'bg-bg text-ink-soft'}`}>
                          {log.targetEntity}
                        </span>
                        {log.patient && (
                          <span className="text-[11px] text-ink font-semibold">
                            {[log.patient.firstName, log.patient.lastName].filter(Boolean).join(' ')} {log.patient.opNumber ? `(#${log.patient.opNumber})` : ''}
                          </span>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="pt-2 border-t border-border/70 space-y-3 text-xs animate-in fade-in duration-150">
                          <div className="bg-bg/50 p-2.5 rounded-xl border border-border space-y-1.5">
                            <div className="text-[10px] font-semibold uppercase text-ink-soft">Exact Timestamp</div>
                            <div className="font-mono font-medium text-ink text-[11px]">{new Date(log.timestamp).toLocaleString()}</div>
                          </div>

                          <div className="space-y-1">
                            <span className="block text-[10px] font-semibold uppercase text-ink-soft">State Changes</span>
                            <StateDiffViewer previousValue={log.previousValue} newValue={log.newValue} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* PAGINATION FOOTER */}
            {!loading && logs.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-bg/40 text-xs">
                <div className="text-ink-soft font-medium">
                  Showing Page <span className="font-bold text-ink">{page}</span> of{' '}
                  <span className="font-bold text-ink">{totalPages}</span> ({total} Total Events)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => fetchLogs(page - 1)}
                    className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 disabled:opacity-30"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => fetchLogs(page + 1)}
                    className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 disabled:opacity-30"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
