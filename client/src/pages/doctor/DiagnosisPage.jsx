import { useState, useEffect, useMemo } from 'react';
import {
  Stethoscope, Search, ArrowLeft, Eye, UserSquare2, RefreshCw, X, Plus, Calendar
} from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import DiagnosisTab from './consultation/DiagnosisTab.jsx';
import DoctorPatientHeader from '../../components/common/DoctorPatientHeader.jsx';

export default function DiagnosisPage() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  // Filter controls
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchDiagnosesList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get(`/consultations?${params.toString()}`);
      setConsultations(res.data?.consultations || []);
    } catch (err) {
      console.error('Failed to load diagnoses list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDiagnosesList();
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
            <ArrowLeft size={16} /> Back to Clinical Diagnoses Directory
          </button>

          <span className={`badge border text-xs ${isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>
            {isCompleted ? 'Historical / Read-Only' : 'Active Visit Diagnosis'}
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
                Doctor: <strong>Dr. {selectedConsultation.doctor?.name || 'Staff Doctor'}</strong> • Diagnosis Date:{' '}
                <strong>{new Date(selectedConsultation.visitDate || selectedConsultation.startedAt || selectedConsultation.createdAt).toLocaleDateString()}</strong>
              </p>
            </div>
          </div>
        </div>

        <DiagnosisTab consultation={selectedConsultation} isReadOnly={isCompleted} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <Stethoscope size={26} className="text-brand" /> Clinical Diagnoses Records
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Directory of clinical diagnoses linked to examinations and specific FDI teeth with severity ratings.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={16} /> New Diagnosis Entry
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
            placeholder="From Diagnosis Date"
            value={dateFrom}
            onChange={(d, dStr) => setDateFrom(dStr)}
            inputClassName="py-1.5 text-xs"
          />
          <DatePicker
            placeholder="To Diagnosis Date"
            value={dateTo}
            onChange={(d, dStr) => setDateTo(dStr)}
            inputClassName="py-1.5 text-xs"
          />
        </div>
      </div>

      {/* DIAGNOSES TABLE */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-ink-soft">Loading diagnosis records...</div>
        ) : consultations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Stethoscope size={36} className="mx-auto text-ink-soft/40" />
            <p className="font-display text-base font-semibold text-ink">No diagnosis records found</p>
            <p className="text-xs text-ink-soft">
              {hasActiveFilters ? 'Try adjusting your search criteria.' : 'Click "New Diagnosis Entry" to log a clinical diagnosis.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Patient Name</th>
                  <th className="px-5 py-3.5">OP Number</th>
                  <th className="px-5 py-3.5">Diagnosis Date</th>
                  <th className="px-5 py-3.5">Diagnosis Summary</th>
                  <th className="px-5 py-3.5">Doctor</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {consultations.map((c) => {
                  const cId = c._id || c.id;
                  const p = c.patient || {};
                  const patientName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Patient';
                  const diagDateStr = c.startedAt || c.visitDate || c.createdAt
                    ? new Date(c.startedAt || c.visitDate || c.createdAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })
                    : 'N/A';

                  const diagnosesList = c.diagnoses || [];
                  const diagSummary = diagnosesList.length > 0
                    ? diagnosesList.map((d) => `${d.diagnosis}${d.relatedTeeth?.length ? ` (#${d.relatedTeeth.join(', #')})` : ''}`).join(' • ')
                    : 'No specific diagnosis logged yet';

                  const doctorName = c.doctor?.name ? `Dr. ${c.doctor.name}` : 'Staff Doctor';

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
                        {diagDateStr}
                      </td>

                      <td className="px-5 py-4 text-ink max-w-sm font-medium">
                        <span className="line-clamp-2">{diagSummary}</span>
                      </td>

                      <td className="px-5 py-4 font-semibold text-ink whitespace-nowrap">
                        {doctorName}
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

      {/* NEW DIAGNOSIS MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-xl p-6 bg-surface space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Stethoscope size={18} className="text-brand" /> Start New Diagnosis Entry
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <DoctorPatientHeader
              title="Select Patient Workspace"
              description="Choose a patient from today's active queue or directory to record clinical diagnoses."
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
