import { useState, useEffect } from 'react';
import {
  ScrollText, Filter, Calendar, User, ShieldCheck, UserSquare2, RefreshCw, ChevronLeft, ChevronRight, ArrowRight, Activity, Search, X,
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

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <ScrollText size={26} className="text-brand" /> System Audit Trail & Logs
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Immutable cross-cutting activity trail logging staff actions, clinical updates, and billing operations.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(page)}
          className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Logs
        </button>
      </div>

      {/* FILTERS BAR */}
      <div className="card p-4 space-y-3 bg-surface">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-display text-xs font-bold text-ink flex items-center gap-1.5">
            <Filter size={15} className="text-brand" /> Filter Audit Logs
          </h3>
          {(roleFilter || entityFilter || dateFrom || dateTo) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-medium"
            >
              <X size={13} /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-ink-soft mb-1">Staff Role</label>
            <select
              className="input-field py-1.5 text-xs font-semibold"
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
              className="input-field py-1.5 text-xs font-semibold"
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
              inputClassName="py-1 text-xs"
            />
          </div>

          <div>
            <DatePicker
              label="To Date"
              value={dateTo}
              onChange={(date, dateStr) => setDateTo(dateStr)}
              inputClassName="py-1 text-xs"
            />
          </div>
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-bg font-semibold text-ink-soft">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User & Role</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Patient Context</th>
                <th className="px-4 py-3">State Diff (Prev → New)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-soft space-y-1">
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
                      <td className="px-4 py-3 font-mono text-[11px] text-ink-soft whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">{userName}</div>
                        <span className={`badge text-[10px] ${ROLE_BADGES[userRole] || 'bg-bg text-ink-soft'}`}>
                          {userRole}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-semibold text-brand text-xs">
                        {log.action}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`badge border text-[10px] ${ENTITY_BADGES[log.targetEntity] || 'bg-bg text-ink-soft'}`}>
                          {log.targetEntity}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-ink-soft">
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

                      <td className="px-4 py-3 text-xs">
                        <StateDiffViewer previousValue={log.previousValue} newValue={log.newValue} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* PAGINATION FOOTER */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg/40 text-xs">
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
      </div>
    </div>
  );
}
