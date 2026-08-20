import { useState, useEffect, useMemo } from 'react';
import {
  Activity, Search, ArrowLeft, Eye, UserSquare2, RefreshCw, X, Plus, Calendar
} from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import TreatmentPlanTab from './consultation/TreatmentPlanTab.jsx';
import DoctorPatientHeader from '../../components/common/DoctorPatientHeader.jsx';
import { TableSkeleton } from '../../components/common/TableSkeleton.jsx';

const STATUS_BADGES = {
  Planned: 'bg-slate-100 text-slate-800 border-slate-200',
  Approved: 'bg-blue-100 text-blue-800 border-blue-200',
  'In Progress': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export default function TreatmentPlansPage() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  // Filter controls
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchTreatmentPlansList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get(`/consultations?${params.toString()}`);
      setConsultations(res.data?.consultations || []);
    } catch (err) {
      console.error('Failed to load treatment plans list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTreatmentPlansList();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, dateFrom, dateTo]);

  const handleResetFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = Boolean(search || dateFrom || dateTo);

  // If a record is selected for Viewing/Editing
  if (selectedConsultation) {
    const p = selectedConsultation.patient || {};
    const patientName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Patient';
    const isCompleted = selectedConsultation.status === 'Completed';

    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedConsultation(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
          >
            <ArrowLeft size={16} /> Back to Treatment Plans Directory
          </button>

          <span className={`badge border text-xs ${isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>
            {isCompleted ? 'Historical / Read-Only' : 'Active Visit Treatment Plan'}
          </span>
        </div>

        {/* Patient Banner */}
        <div className="card p-4 bg-surface border-brand/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center font-bold text-lg">
              <UserSquare2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-ink">{patientName}</h2>
                <span className="badge bg-brand-light/40 text-brand-dark font-mono font-bold text-[10px]">
                  OP #{p.opNumber || 'N/A'}
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                Doctor: <strong>Dr. {selectedConsultation.doctor?.name || 'Staff Doctor'}</strong> • Plan Created:{' '}
                <strong>{new Date(selectedConsultation.visitDate || selectedConsultation.startedAt || selectedConsultation.createdAt).toLocaleDateString()}</strong>
              </p>
            </div>
          </div>
        </div>

        <TreatmentPlanTab consultation={selectedConsultation} isReadOnly={isCompleted} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <Activity size={26} className="text-brand" /> Treatment Plans Directory
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Directory of planned and executed dental procedures per patient diagnosis, sequence priorities, and status.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={16} /> Create Treatment Plan
        </button>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="card p-4 space-y-3 bg-surface border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              className="input-field pl-10 py-2 text-xs"
              placeholder="Search by Patient Name, Phone Number, or OP Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold shrink-0"
            >
              <X size={13} /> Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <DatePicker
            placeholder="From Plan Created Date"
            value={dateFrom}
            onChange={(d, dStr) => setDateFrom(dStr)}
            inputClassName="py-1.5 text-xs"
          />
          <DatePicker
            placeholder="To Plan Created Date"
            value={dateTo}
            onChange={(d, dStr) => setDateTo(dStr)}
            inputClassName="py-1.5 text-xs"
          />
        </div>
      </div>

      {/* TREATMENT PLANS TABLE */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : consultations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Activity size={36} className="mx-auto text-ink-soft/40" />
            <p className="font-display text-base font-semibold text-ink">No treatment plan records found</p>
            <p className="text-xs text-ink-soft">
              {hasActiveFilters ? 'Try adjusting your search criteria.' : 'Click "Create Treatment Plan" to plan procedure steps.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Patient Name</th>
                  <th className="px-5 py-3.5">OP Number</th>
                  <th className="px-5 py-3.5">Plan Created</th>
                  <th className="px-5 py-3.5">Procedures</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {consultations.map((c) => {
                  const cId = c._id || c.id;
                  const p = c.patient || {};
                  const patientName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Patient';
                  const planDateStr = c.startedAt || c.visitDate || c.createdAt
                    ? new Date(c.startedAt || c.visitDate || c.createdAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })
                    : 'N/A';

                  const plans = c.treatmentPlans || [];
                  const records = c.treatmentRecords || [];

                  const proceduresSummary = [];
                  plans.forEach((tp) => {
                    proceduresSummary.push(`${tp.treatment}${tp.tooth ? ` (#${tp.tooth})` : ''}`);
                  });
                  records.forEach((tr) => {
                    proceduresSummary.push(`${tr.procedure}${tr.tooth ? ` (#${tr.tooth})` : ''} [Done]`);
                  });

                  const proceduresStr = proceduresSummary.length > 0
                    ? proceduresSummary.join(' • ')
                    : 'No procedure steps planned yet';

                  // Overall Status
                  const overallStatus = c.status === 'Completed' ? 'Completed' : (plans.some((tp) => tp.status === 'In Progress') ? 'In Progress' : (plans.length > 0 ? 'Planned' : 'Planned'));

                  return (
                    <tr
                      key={cId}
                      onClick={() => setSelectedConsultation(c)}
                      className="hover:bg-bg/60 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4 font-bold text-ink">
                        <div className="flex items-center gap-2">
                          <UserSquare2 size={16} className="text-brand shrink-0" />
                          <span className="group-hover:text-brand transition-colors">{patientName}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono font-bold text-brand whitespace-nowrap">
                        {p.opNumber ? `#${p.opNumber}` : '—'}
                      </td>

                      <td className="px-5 py-4 text-ink-soft whitespace-nowrap">
                        {planDateStr}
                      </td>

                      <td className="px-5 py-4 text-ink max-w-sm font-medium">
                        <span className="line-clamp-2">{proceduresStr}</span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`badge border text-[10px] ${STATUS_BADGES[overallStatus] || STATUS_BADGES.Planned}`}>
                          {overallStatus}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedConsultation(c);
                          }}
                          className="btn-secondary py-1 px-3 text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW TREATMENT PLAN MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-xl p-6 bg-surface space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Activity size={18} className="text-brand" /> Create Treatment Plan
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <DoctorPatientHeader
              title="Select Patient Workspace"
              description="Choose a patient from today's active queue or directory to create a treatment plan."
              icon={UserSquare2}
              onPatientChange={(pId, c) => {
                if (c) {
                  setSelectedConsultation(c);
                  setShowNewModal(false);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
