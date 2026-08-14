import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  History, Search, UserSquare2, Calendar, Stethoscope, Activity, Pill,
  FileHeart, Filter, FileText, RefreshCw, X, Eye, Clock, CheckCircle2,
  Printer, ChevronRight, User
} from 'lucide-react';
import api from '../../api/axios.js';
import DatePicker from '../../components/common/DatePicker.jsx';

const ALL_FDI_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
];

const STATUS_BADGE_CLASSES = {
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'In Consultation': 'bg-purple-100 text-purple-800 border-purple-200',
  'Checked-In': 'bg-amber-100 text-amber-800 border-amber-200',
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

const SEVERITY_BADGES = {
  Mild: 'bg-blue-100 text-blue-800 border-blue-200',
  Moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  Severe: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function PatientHistory() {
  const { patientId: urlPatientId } = useParams();

  const [visits, setVisits] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [patientSearch, setPatientSearch] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Visit for Read-Only "Visit Summary" Panel
  const [selectedVisit, setSelectedVisit] = useState(null);

  // Load doctors list for dropdown filter
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await api.get('/users/doctors');
        setDoctors(res.data?.doctors || []);
      } catch (err) {
        console.error('Failed to load doctors list:', err);
      }
    }
    fetchDoctors();
  }, []);

  // Fetch visit encounters log
  const fetchVisits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (patientSearch && patientSearch.trim()) {
        params.append('search', patientSearch.trim());
      }
      if (doctorFilter) {
        params.append('doctor', doctorFilter);
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
      }
      if (urlPatientId) {
        params.append('patient', urlPatientId);
      }

      const res = await api.get(`/consultations?${params.toString()}`);
      setVisits(res.data?.visits || res.data?.consultations || []);
    } catch (err) {
      console.error('Failed to fetch visit history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVisits();
    }, 250);
    return () => clearTimeout(timer);
  }, [patientSearch, doctorFilter, dateFrom, dateTo, urlPatientId]);

  // Filter client-side by status if statusFilter is selected
  const filteredVisits = useMemo(() => {
    if (!statusFilter) return visits;
    return visits.filter((v) => v.status === statusFilter);
  }, [visits, statusFilter]);

  const handleResetFilters = () => {
    setPatientSearch('');
    setDoctorFilter('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('');
  };

  const hasActiveFilters = Boolean(patientSearch || doctorFilter || dateFrom || dateTo || statusFilter);

  // Compute aggregate stats
  const totalEncounters = filteredVisits.length;
  const completedVisitsCount = filteredVisits.filter((v) => v.status === 'Completed').length;
  const inConsultationCount = filteredVisits.filter((v) => v.status === 'In Consultation' || v.status === 'In Progress').length;
  const uniquePatientsCount = new Set(filteredVisits.map((v) => v.patient?._id || v.patient?.id || v.patient)).size;

  // Extract teeth affected in the selected visit for Tooth Chart Snapshot
  const visitTeethSnapshotMap = useMemo(() => {
    if (!selectedVisit) return {};
    const map = {};

    // Collect teeth from diagnoses
    (selectedVisit.diagnoses || []).forEach((d) => {
      (d.relatedTeeth || []).forEach((tNum) => {
        if (!map[tNum]) map[tNum] = [];
        map[tNum].push(`Diagnosis: ${d.diagnosis}`);
      });
    });

    // Collect teeth from treatment plans
    (selectedVisit.treatmentPlans || []).forEach((tp) => {
      if (tp.tooth) {
        if (!map[tp.tooth]) map[tp.tooth] = [];
        map[tp.tooth].push(`Plan: ${tp.treatment}`);
      }
    });

    // Collect teeth from treatment records
    (selectedVisit.treatmentRecords || []).forEach((tr) => {
      if (tr.tooth) {
        if (!map[tr.tooth]) map[tr.tooth] = [];
        map[tr.tooth].push(`Record: ${tr.procedure}`);
      }
    });

    return map;
  }, [selectedVisit]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <History size={26} className="text-brand" /> Chronological Patient Visit History Log
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Every row represents a single visit encounter. Click any row to inspect read-only Visit Summary details.
          </p>
        </div>

        <button
          onClick={fetchVisits}
          className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Visit Log
        </button>
      </div>

      {/* Aggregate Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 bg-surface border-border flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand-light/40 text-brand">
            <History size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">Total Encounters</span>
            <span className="font-display text-xl font-bold text-ink">{totalEncounters}</span>
          </div>
        </div>

        <div className="card p-4 bg-surface border-border flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">Completed Visits</span>
            <span className="font-display text-xl font-bold text-emerald-800">{completedVisitsCount}</span>
          </div>
        </div>

        <div className="card p-4 bg-surface border-border flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-100 text-purple-800">
            <Activity size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">In Consultation</span>
            <span className="font-display text-xl font-bold text-purple-800">{inConsultationCount}</span>
          </div>
        </div>

        <div className="card p-4 bg-surface border-border flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-100 text-blue-800">
            <UserSquare2 size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">Patients Represented</span>
            <span className="font-display text-xl font-bold text-blue-800">{uniquePatientsCount}</span>
          </div>
        </div>
      </div>

      {/* FILTERS BAR: Date Range, Doctor, Patient Name/OP */}
      <div className="card p-4 space-y-3 bg-surface border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <Filter size={15} className="text-brand" /> Filter Visit History Log
          </h3>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold self-end sm:self-auto"
            >
              <X size={13} /> Reset All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* 1. Patient Search */}
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              className="input-field pl-9 py-1.5 text-xs"
              placeholder="Search Patient Name, OP Number, or Phone..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
            {patientSearch && (
              <button
                onClick={() => setPatientSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 2. Doctor Filter */}
          <div>
            <select
              className="input-field py-1.5 text-xs font-medium"
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
            >
              <option value="">All Attending Doctors</option>
              {doctors.map((d) => (
                <option key={d._id || d.id} value={d._id || d.id}>
                  Dr. {d.name} ({d.specialization || 'General'})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Date From */}
          <div>
            <DatePicker
              value={dateFrom}
              onChange={(date, dateStr) => setDateFrom(dateStr)}
              placeholder="From Visit Date"
              inputClassName="py-1 text-xs"
            />
          </div>

          {/* 4. Date To */}
          <div>
            <DatePicker
              value={dateTo}
              onChange={(date, dateStr) => setDateTo(dateStr)}
              placeholder="To Visit Date"
              inputClassName="py-1 text-xs"
            />
          </div>
        </div>
      </div>

      {/* VISIT HISTORY TABLE */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-bg/40 font-display text-xs font-bold text-ink flex items-center justify-between">
          <span>Encounters Log Table ({filteredVisits.length} Records)</span>
          <span className="text-[11px] text-ink-soft font-normal">Click any row to open Visit Summary</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-ink-soft">Loading visit encounters...</div>
        ) : filteredVisits.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <History size={36} className="mx-auto text-ink-soft/40" />
            <p className="font-display text-base font-semibold text-ink">No visit encounters recorded</p>
            <p className="text-xs text-ink-soft">
              {hasActiveFilters
                ? 'No encounters match your current search/date/doctor filters.'
                : 'Visits will automatically log here as patients check in and consult.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Patient Name</th>
                  <th className="px-4 py-3.5">OP Number</th>
                  <th className="px-4 py-3.5">Visit Date</th>
                  <th className="px-4 py-3.5">Check-In Time</th>
                  <th className="px-4 py-3.5">Check-Out Time</th>
                  <th className="px-4 py-3.5">Attending Doctor</th>
                  <th className="px-4 py-3.5">Purpose / Reason</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredVisits.map((visit) => {
                  const visitId = visit._id || visit.id;
                  const patient = visit.patient || {};
                  const doctor = visit.doctor || {};
                  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';
                  const doctorName = doctor.name ? `Dr. ${doctor.name}` : 'Staff Doctor';

                  const dateStr = visit.visitDate
                    ? new Date(visit.visitDate).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                    : 'N/A';

                  const checkInStr = visit.checkInTime
                    ? new Date(visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'N/A';

                  const checkOutStr = visit.checkOutTime
                    ? new Date(visit.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : (visit.status === 'In Consultation' ? 'In Progress' : '—');

                  const statusDisplay = visit.status === 'In Progress' ? 'In Consultation' : (visit.status || 'Completed');

                  return (
                    <tr
                      key={visitId}
                      onClick={() => setSelectedVisit(visit)}
                      className="hover:bg-bg/60 cursor-pointer transition-colors group"
                    >
                      {/* Patient Name */}
                      <td className="px-4 py-3.5 font-bold text-ink">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
                            <User size={14} />
                          </div>
                          <div>
                            <span className="group-hover:text-brand transition-colors block">{patientName}</span>
                            <span className="text-[10px] text-ink-soft font-normal">
                              {patient.age ? `${patient.age}y` : ''} {patient.sex ? `/ ${patient.sex}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* OP Number */}
                      <td className="px-4 py-3.5 font-mono font-bold text-brand whitespace-nowrap">
                        {patient.opNumber ? `#${patient.opNumber}` : '—'}
                      </td>

                      {/* Visit Date */}
                      <td className="px-4 py-3.5 font-semibold text-ink whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-brand shrink-0" />
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      {/* Check-In Time */}
                      <td className="px-4 py-3.5 font-mono text-ink-soft whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock size={12} className="text-emerald-600 shrink-0" />
                          <span>{checkInStr}</span>
                        </div>
                      </td>

                      {/* Check-Out Time */}
                      <td className="px-4 py-3.5 font-mono text-ink-soft whitespace-nowrap">
                        {checkOutStr}
                      </td>

                      {/* Attending Doctor */}
                      <td className="px-4 py-3.5 font-semibold text-ink whitespace-nowrap">
                        <div>
                          <span>{doctorName}</span>
                          {doctor.specialization && (
                            <span className="block text-[10px] font-normal text-ink-soft">{doctor.specialization}</span>
                          )}
                        </div>
                      </td>

                      {/* Purpose / Reason for Visit */}
                      <td className="px-4 py-3.5 text-ink font-medium max-w-xs truncate">
                        {visit.reason || 'General Consult'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`badge border text-[10px] ${STATUS_BADGE_CLASSES[statusDisplay] || 'bg-slate-100 text-slate-800'}`}>
                          {statusDisplay}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVisit(visit);
                          }}
                          className="btn-secondary py-1 px-2.5 text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <Eye size={13} /> View Summary
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

      {/* READ-ONLY "VISIT SUMMARY" PANEL / MODAL */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-150">
          <div className="card w-full max-w-3xl max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-2xl border-brand/20">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand text-white flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-ink">
                      Visit Summary Log
                    </h3>
                    <span className={`badge border text-[10px] ${STATUS_BADGE_CLASSES[selectedVisit.status === 'In Progress' ? 'In Consultation' : selectedVisit.status] || 'bg-emerald-100 text-emerald-800'}`}>
                      {selectedVisit.status === 'In Progress' ? 'In Consultation' : selectedVisit.status}
                    </span>
                  </div>
                  <p className="text-xs text-ink-soft">
                    Visit Date:{' '}
                    <strong className="text-ink">
                      {new Date(selectedVisit.visitDate).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* <button
                  onClick={() => window.print()}
                  className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
                  title="Print Visit Summary"
                >
                  <Printer size={14} /> Print
                </button> */}

                <button
                  onClick={() => setSelectedVisit(null)}
                  className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-bg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs font-sans">
              {/* Patient & Doctor Banner */}
              <div className="p-4 rounded-xl bg-bg border border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block mb-1">Patient Details</span>
                  <div className="font-display text-sm font-bold text-ink">
                    {[selectedVisit.patient?.firstName, selectedVisit.patient?.lastName].filter(Boolean).join(' ') || 'Patient'}
                  </div>
                  <div className="text-xs text-ink-soft mt-0.5">
                    OP Number: <strong className="font-mono text-brand font-bold">#{selectedVisit.patient?.opNumber || 'N/A'}</strong>
                    {selectedVisit.patient?.age ? ` • Age: ${selectedVisit.patient.age}y` : ''}
                    {selectedVisit.patient?.sex ? ` • Sex: ${selectedVisit.patient.sex}` : ''}
                  </div>
                  {selectedVisit.patient?.phone && (
                    <div className="text-[11px] text-ink-soft mt-0.5">Phone: {selectedVisit.patient.phone}</div>
                  )}
                </div>

                <div className="sm:border-l sm:border-border sm:pl-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block mb-1">Encounter Metadata</span>
                  <div className="font-semibold text-ink">
                    Attending Doctor: <strong>Dr. {selectedVisit.doctor?.name || 'Staff Doctor'}</strong>
                  </div>
                  <div className="text-xs text-ink-soft mt-1 space-y-0.5">
                    <div>
                      Check-In Time:{' '}
                      <strong className="font-mono text-ink">
                        {selectedVisit.checkInTime ? new Date(selectedVisit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </strong>
                    </div>
                    <div>
                      Check-Out Time:{' '}
                      <strong className="font-mono text-ink">
                        {selectedVisit.checkOutTime ? new Date(selectedVisit.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Progress'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1. CHIEF COMPLAINT / PURPOSE OF VISIT */}
              <div className="space-y-2">
                <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2 border-b border-border pb-1">
                  <FileText size={15} className="text-brand" /> 1. Chief Complaint & Purpose for Visit
                </h4>
                <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1.5">
                  <div className="font-semibold text-ink">
                    Reason: <span className="font-bold text-brand">{selectedVisit.reason || 'General Consultation'}</span>
                  </div>
                  {selectedVisit.notes ? (
                    <div className="text-xs text-ink-soft bg-bg p-2.5 rounded-lg border border-border/60">
                      <span className="font-semibold text-ink block mb-0.5">Clinical Notes:</span>
                      <p className="whitespace-pre-wrap">{selectedVisit.notes}</p>
                    </div>
                  ) : (
                    <p className="text-ink-soft/60 italic text-[11px]">No clinical notes recorded for this visit.</p>
                  )}
                </div>
              </div>

              {/* 2. DIAGNOSES RECORDED */}
              <div className="space-y-2">
                <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2 border-b border-border pb-1">
                  <Stethoscope size={15} className="text-brand" /> 2. Diagnoses Recorded ({selectedVisit.diagnoses?.length || 0})
                </h4>
                {selectedVisit.diagnoses && selectedVisit.diagnoses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedVisit.diagnoses.map((d, idx) => (
                      <div key={d._id || idx} className="p-3 rounded-xl border border-border bg-surface space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink text-xs">{d.diagnosis}</span>
                          {d.severity && (
                            <span className={`badge text-[10px] border ${SEVERITY_BADGES[d.severity] || SEVERITY_BADGES.Mild}`}>
                              {d.severity} Severity
                            </span>
                          )}
                        </div>
                        {d.clinicalFindings && (
                          <p className="text-xs text-ink-soft">{d.clinicalFindings}</p>
                        )}
                        {d.relatedTeeth && d.relatedTeeth.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            <span className="text-[10px] font-semibold text-ink-soft">Teeth:</span>
                            {d.relatedTeeth.map((tNum) => (
                              <span key={tNum} className="px-1.5 py-0.5 rounded bg-brand-light/30 text-brand-dark font-mono font-bold text-[10px]">
                                #{tNum}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-soft/60 italic text-[11px] p-3 rounded-xl border border-border bg-bg/40">
                    No diagnoses recorded during this visit.
                  </p>
                )}
              </div>

              {/* 3. TREATMENT PERFORMED / PLANNED */}
              <div className="space-y-2">
                <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2 border-b border-border pb-1">
                  <Activity size={15} className="text-brand" /> 3. Treatment Performed & Planned
                </h4>
                {((selectedVisit.treatmentRecords && selectedVisit.treatmentRecords.length > 0) || (selectedVisit.treatmentPlans && selectedVisit.treatmentPlans.length > 0)) ? (
                  <div className="space-y-2">
                    {/* Performed Treatment Records */}
                    {selectedVisit.treatmentRecords?.map((tr, idx) => (
                      <div key={tr._id || idx} className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-900">{tr.procedure}</span>
                            <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px]">
                              Actually Performed
                            </span>
                            {tr.tooth && (
                              <span className="badge bg-surface text-ink font-mono text-[10px] border border-border">
                                Tooth #{tr.tooth}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-emerald-700 text-xs">₹{tr.charges || 0}</span>
                      </div>
                    ))}

                    {/* Intended Treatment Plans */}
                    {selectedVisit.treatmentPlans?.map((tp, idx) => (
                      <div key={tp._id || idx} className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink">{tp.treatment}</span>
                            <span className="badge bg-slate-100 text-slate-700 text-[10px]">
                              Planned Step
                            </span>
                            {tp.tooth && (
                              <span className="badge bg-brand-light/30 text-brand-dark font-mono text-[10px]">
                                Tooth #{tp.tooth}
                              </span>
                            )}
                          </div>
                          {tp.notes && <p className="text-ink-soft text-[11px] mt-0.5">{tp.notes}</p>}
                        </div>
                        <span className="font-mono font-bold text-brand text-xs">₹{tp.estimatedCost || 0}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-soft/60 italic text-[11px] p-3 rounded-xl border border-border bg-bg/40">
                    No treatment procedures recorded during this visit.
                  </p>
                )}
              </div>

              {/* 4. TOOTH CHART SNAPSHOT AS OF VISIT DATE */}
              <div className="space-y-2">
                <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2 border-b border-border pb-1">
                  <Activity size={15} className="text-brand" /> 4. Tooth Chart Snapshot for Visit Date
                </h4>
                <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                  <p className="text-[11px] text-ink-soft">
                    FDI 32-tooth arch overview showing teeth affected during this specific visit encounter:
                  </p>

                  <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 p-2 rounded-xl bg-bg border border-border text-center">
                    {ALL_FDI_TEETH.map((tNum) => {
                      const isAffected = Boolean(visitTeethSnapshotMap[tNum]);
                      return (
                        <div
                          key={tNum}
                          title={isAffected ? visitTeethSnapshotMap[tNum].join('\n') : `Tooth #${tNum}`}
                          className={`p-1.5 rounded-lg text-[10px] font-mono font-bold transition-all ${isAffected
                            ? 'bg-brand text-white shadow-sm ring-2 ring-brand/40'
                            : 'bg-surface border border-border/60 text-ink-soft/60'
                            }`}
                        >
                          #{tNum}
                        </div>
                      );
                    })}
                  </div>

                  {Object.keys(visitTeethSnapshotMap).length > 0 ? (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-bold text-ink">Teeth Addressed During Visit:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(visitTeethSnapshotMap).map(([tNum, details]) => (
                          <span key={tNum} className="px-2 py-0.5 rounded-md bg-brand-light/40 text-brand-dark font-mono font-bold text-[11px] border border-brand-light">
                            #{tNum}: {details[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-ink-soft/60 italic text-[11px]">No specific teeth isolated for procedure in this visit.</span>
                  )}
                </div>
              </div>

              {/* 5. PRESCRIPTIONS ISSUED */}
              <div className="space-y-2">
                <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2 border-b border-border pb-1">
                  <Pill size={15} className="text-brand" /> 5. Prescriptions Issued ({selectedVisit.prescriptions?.length || 0})
                </h4>
                {selectedVisit.prescriptions && selectedVisit.prescriptions.length > 0 ? (
                  <div className="space-y-3">
                    {selectedVisit.prescriptions.map((rx, idx) => (
                      <div key={rx._id || idx} className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-bg font-semibold text-ink-soft border-b border-border">
                              <tr>
                                <th className="py-1.5 px-2">#</th>
                                <th className="py-1.5 px-2">Medicine Name</th>
                                <th className="py-1.5 px-2">Dosage</th>
                                <th className="py-1.5 px-2">Frequency</th>
                                <th className="py-1.5 px-2">Duration</th>
                                <th className="py-1.5 px-2">Instructions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {rx.medicines?.map((m, mIdx) => (
                                <tr key={mIdx}>
                                  <td className="py-1.5 px-2 font-bold text-ink-soft">{mIdx + 1}</td>
                                  <td className="py-1.5 px-2 font-bold text-brand">{m.medicine}</td>
                                  <td className="py-1.5 px-2">{m.dosage || '—'}</td>
                                  <td className="py-1.5 px-2 font-mono font-bold text-ink">{m.frequency || '—'}</td>
                                  <td className="py-1.5 px-2">{m.duration || '—'}</td>
                                  <td className="py-1.5 px-2 text-ink-soft italic">{m.instructions || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {rx.notes && (
                          <div className="text-[11px] text-ink-soft italic bg-bg p-2 rounded border border-border/50">
                            Notes: {rx.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-soft/60 italic text-[11px] p-3 rounded-xl border border-border bg-bg/40">
                    No prescription issued for this visit.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            {/* <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-bg/50 shrink-0">
              {selectedVisit.patient?._id ? (
                <Link
                  to={`/reception/patients/${selectedVisit.patient._id}`}
                  className="text-xs text-brand hover:underline font-semibold flex items-center gap-1"
                >
                  View Patient Record <ChevronRight size={14} />
                </Link>
              ) : <div />}

              <button
                type="button"
                onClick={() => setSelectedVisit(null)}
                className="btn-secondary py-1.5 px-4 text-xs font-semibold"
              >
                Close Summary
              </button>
            </div> */}
          </div>
        </div>
      )}
    </div>
  );
}
