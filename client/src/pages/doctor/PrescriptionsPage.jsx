import { useState, useEffect, useMemo } from 'react';
import {
  Pill, Search, ArrowLeft, Eye, UserSquare2, RefreshCw, X, Calendar, Printer, FileText, ChevronRight
} from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import PrescriptionHistoryPanel from '../../components/common/PrescriptionHistoryPanel.jsx';
import { TableSkeleton, PrescriptionDirectorySkeleton } from '../../components/common/TableSkeleton.jsx';

export default function PrescriptionsPage() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Filter controls
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchPrescriptionsList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get(`/consultations?${params.toString()}`);
      setConsultations(res.data?.consultations || []);
    } catch (err) {
      console.error('Failed to load prescriptions list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPrescriptionsList();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, dateFrom, dateTo]);

  const handleResetFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = Boolean(search || dateFrom || dateTo);

  // Group consultations by Patient ID so each patient appears exactly ONCE in the list
  const patientGroups = useMemo(() => {
    const map = new Map();

    consultations.forEach((c) => {
      if (!c.patient) return;
      const p = c.patient;
      const pId = (p._id || p.id || p).toString();

      if (!map.has(pId)) {
        map.set(pId, {
          patient: p,
          consultations: [],
          latestVisitDate: c.startedAt || c.visitDate || c.createdAt,
          totalPrescriptionsCount: 0,
        });
      }

      const group = map.get(pId);
      group.consultations.push(c);

      const rxCount = (c.prescriptions || []).length;
      group.totalPrescriptionsCount += rxCount;

      const thisDate = new Date(c.startedAt || c.visitDate || c.createdAt);
      if (!group.latestVisitDate || thisDate > new Date(group.latestVisitDate)) {
        group.latestVisitDate = c.startedAt || c.visitDate || c.createdAt;
      }
    });

    return Array.from(map.values());
  }, [consultations]);

  // If a Patient is selected to view their complete prescription history
  if (selectedPatient) {
    const p = selectedPatient;
    const patientName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Patient';
    const patientId = p._id || p.id;

    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedPatient(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
          >
            <ArrowLeft size={16} /> Back to Prescriptions Directory
          </button>

          <span className="badge border text-xs bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold">
            Patient Prescription History
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
                {p.age ? `Age: ${p.age} yrs` : ''} {p.sex ? `• Sex: ${p.sex}` : ''} {p.phone ? `• Contact: ${p.phone}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Complete Prescription History Panel for this Patient */}
        <PrescriptionHistoryPanel
          patientId={patientId}
          title={`${patientName}'s Complete Prescription History`}
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
            <Pill size={26} className="text-brand" /> Prescription History Directory
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Directory of patient prescription records, medicine dosages, frequencies, and printable output documents.
          </p>
        </div>
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
            placeholder="From Date Issued"
            value={dateFrom}
            onChange={(d, dStr) => setDateFrom(dStr)}
            inputClassName="py-1.5 text-xs"
          />
          <DatePicker
            placeholder="To Date Issued"
            value={dateTo}
            onChange={(d, dStr) => setDateTo(dStr)}
            inputClassName="py-1.5 text-xs"
          />
        </div>
      </div>

      {/* UNIQUE PATIENT PRESCRIPTIONS TABLE */}
      <div className="card overflow-hidden">
        {loading ? (
          <PrescriptionDirectorySkeleton rows={5} />
        ) : patientGroups.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Pill size={36} className="mx-auto text-ink-soft/40" />
            <p className="font-display text-base font-semibold text-ink">No prescription history available.</p>
            <p className="text-xs text-ink-soft">
              {hasActiveFilters ? 'Try adjusting your search criteria.' : 'Prescriptions created during patient consultations will automatically be recorded here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Patient Name</th>
                  <th className="px-5 py-3.5">OP Number</th>
                  <th className="px-5 py-3.5">Age / Sex</th>
                  <th className="px-5 py-3.5">Phone Number</th>
                  <th className="px-5 py-3.5">Latest Visit Date</th>
                  <th className="px-5 py-3.5">Prescriptions</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patientGroups.map((group) => {
                  const p = group.patient;
                  const pId = p._id || p.id;
                  const patientName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Patient';
                  const latestDateStr = group.latestVisitDate
                    ? new Date(group.latestVisitDate).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })
                    : 'N/A';

                  return (
                    <tr
                      key={pId}
                      onClick={() => setSelectedPatient(p)}
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
                        {p.age ? `${p.age}y` : ''} {p.sex ? `/ ${p.sex}` : ''} {!p.age && !p.sex ? '—' : ''}
                      </td>

                      <td className="px-5 py-4 text-ink-soft whitespace-nowrap">
                        {p.phone || '—'}
                      </td>

                      <td className="px-5 py-4 text-ink-soft whitespace-nowrap">
                        {latestDateStr}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="badge bg-brand-light/50 text-brand-dark font-mono font-bold text-xs">
                          {group.totalPrescriptionsCount} {group.totalPrescriptionsCount === 1 ? 'Prescription' : 'Prescriptions'}
                        </span>
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
                          <Eye size={14} /> View History
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
    </div>
  );
}
