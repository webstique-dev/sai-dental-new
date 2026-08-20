import { useState, useEffect, useMemo } from 'react';
import {
  Grid3x3, Search, ArrowLeft, Eye, UserSquare2, RefreshCw, X, Plus, Calendar, Activity
} from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import ToothChart from './consultation/ToothChart.jsx';
import DoctorPatientHeader from '../../components/common/DoctorPatientHeader.jsx';
import { TableSkeleton } from '../../components/common/TableSkeleton.jsx';

export default function ToothChartPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  // Filter controls
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchPatientsToothCharts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/patients?${params.toString()}`);
      const list = res.data?.patients || [];

      // Fetch tooth chart summary for each patient
      const populatedPatients = await Promise.all(
        list.map(async (p) => {
          const pId = p._id || p.id;
          try {
            const chartRes = await api.get(`/tooth-chart/${pId}`);
            const teeth = chartRes.data?.teeth || [];

            // Filter non-healthy teeth to list affected teeth
            const affected = teeth.filter((t) => t.currentCondition && t.currentCondition !== 'Healthy');
            const lastUpdated = teeth.reduce((latest, t) => {
              const d = t.updatedAt ? new Date(t.updatedAt) : null;
              return d && (!latest || d > latest) ? d : latest;
            }, null);

            return {
              ...p,
              affectedTeeth: affected,
              lastUpdated: lastUpdated || (p.updatedAt ? new Date(p.updatedAt) : new Date()),
            };
          } catch (err) {
            return { ...p, affectedTeeth: [], lastUpdated: new Date() };
          }
        })
      );

      // Client-side date filtering on lastUpdated if set
      let filtered = populatedPatients;
      if (dateFrom) {
        const fromD = new Date(dateFrom);
        fromD.setHours(0, 0, 0, 0);
        filtered = filtered.filter((p) => new Date(p.lastUpdated) >= fromD);
      }
      if (dateTo) {
        const toD = new Date(dateTo);
        toD.setHours(23, 59, 59, 999);
        filtered = filtered.filter((p) => new Date(p.lastUpdated) <= toD);
      }

      setPatients(filtered);
    } catch (err) {
      console.error('Failed to load patient tooth charts list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatientsToothCharts();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, dateFrom, dateTo]);

  const handleResetFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = Boolean(search || dateFrom || dateTo);

  // If a patient is selected for Viewing/Editing Tooth Chart
  if (selectedPatient) {
    const pId = selectedPatient._id || selectedPatient.id;
    const patientName = [selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(' ') || 'Patient';

    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedPatient(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
          >
            <ArrowLeft size={16} /> Back to Tooth Charts Directory
          </button>

          <span className="badge bg-brand-light/40 text-brand-dark font-mono font-bold text-xs border border-brand/30">
            OP #{selectedPatient.opNumber || 'N/A'}
          </span>
        </div>

        {/* Patient Banner */}
        <div className="card p-4 bg-surface border-brand/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center font-bold text-lg">
              <UserSquare2 size={22} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">{patientName}</h2>
              <p className="text-xs text-ink-soft mt-0.5">
                Age: <strong>{selectedPatient.age !== undefined ? `${selectedPatient.age}y` : 'N/A'}</strong> • Sex:{' '}
                <strong>{selectedPatient.sex || 'N/A'}</strong> • Phone: <strong>{selectedPatient.phone || 'N/A'}</strong>
              </p>
            </div>
          </div>
        </div>

        <ToothChart
          patientId={pId}
          consultationId={selectedConsultation?._id || selectedConsultation?.id}
          isReadOnly={selectedConsultation?.status === 'Completed'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <Grid3x3 size={26} className="text-brand" /> FDI Dental Tooth Charts
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Directory of patient FDI 32-tooth charts, affected teeth conditions, and tooth record histories.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={16} /> Open Patient Tooth Chart
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
            placeholder="From Last Updated Date"
            value={dateFrom}
            onChange={(d, dStr) => setDateFrom(dStr)}
            inputClassName="py-1.5 text-xs"
          />
          <DatePicker
            placeholder="To Last Updated Date"
            value={dateTo}
            onChange={(d, dStr) => setDateTo(dStr)}
            inputClassName="py-1.5 text-xs"
          />
        </div>
      </div>

      {/* TOOTH CHARTS TABLE */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : patients.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Grid3x3 size={36} className="mx-auto text-ink-soft/40" />
            <p className="font-display text-base font-semibold text-ink">No tooth chart records found</p>
            <p className="text-xs text-ink-soft">
              {hasActiveFilters ? 'Try adjusting your search criteria.' : 'Click "Open Patient Tooth Chart" to select a patient.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Patient Name</th>
                  <th className="px-5 py-3.5">OP Number</th>
                  <th className="px-5 py-3.5">Last Updated</th>
                  <th className="px-5 py-3.5">Teeth Affected</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patients.map((p) => {
                  const pId = p._id || p.id;
                  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Patient';
                  const updatedStr = p.lastUpdated
                    ? new Date(p.lastUpdated).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })
                    : 'N/A';

                  const affected = p.affectedTeeth || [];

                  return (
                    <tr
                      key={pId}
                      onClick={() => setSelectedPatient(p)}
                      className="hover:bg-bg/60 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4 font-bold text-ink">
                        <div className="flex items-center gap-2">
                          <UserSquare2 size={16} className="text-brand shrink-0" />
                          <span className="group-hover:text-brand transition-colors">{fullName}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono font-bold text-brand whitespace-nowrap">
                        {p.opNumber ? `#${p.opNumber}` : '—'}
                      </td>

                      <td className="px-5 py-4 text-ink-soft whitespace-nowrap">
                        {updatedStr}
                      </td>

                      <td className="px-5 py-4 text-ink max-w-sm">
                        {affected.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {affected.slice(0, 4).map((t) => (
                              <span
                                key={t.toothNumber}
                                className="px-1.5 py-0.5 rounded bg-brand-light/30 text-brand-dark font-mono font-bold text-[10px] border border-brand/20"
                              >
                                #{t.toothNumber} ({t.currentCondition})
                              </span>
                            ))}
                            {affected.length > 4 && (
                              <span className="text-[10px] text-ink-soft font-semibold">
                                +{affected.length - 4} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-soft/60 italic">All teeth healthy / no conditions logged</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPatient(p);
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

      {/* NEW TOOTH CHART MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-xl p-6 bg-surface space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Grid3x3 size={18} className="text-brand" /> Select Patient Tooth Chart
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <DoctorPatientHeader
              title="Select Patient Workspace"
              description="Choose a patient from today's queue or directory to view/edit their FDI 32-tooth chart."
              icon={UserSquare2}
              onPatientChange={(pId, c) => {
                if (c && c.patient) {
                  setSelectedPatient(c.patient);
                  setSelectedConsultation(c);
                  setShowNewModal(false);
                } else if (pId) {
                  const targetP = patients.find((item) => (item._id || item.id) === pId);
                  if (targetP) {
                    setSelectedPatient(targetP);
                    setShowNewModal(false);
                  }
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
