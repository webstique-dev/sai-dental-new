import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  History, Search, UserSquare2, Calendar, Stethoscope, Activity, Pill,
  FileHeart, ChevronDown, ChevronUp, Filter, FileText, Bell, LayoutList,
  CalendarDays, RefreshCw, X
} from 'lucide-react';
import api from '../../api/axios.js';
import DocumentsPanel from '../../components/common/DocumentsPanel.jsx';
import ToothChart from './consultation/ToothChart.jsx';

const STATUS_BADGE_CLASSES = {
  Planned: 'bg-slate-100 text-slate-800 border-slate-200',
  Approved: 'bg-blue-100 text-blue-800 border-blue-200',
  'In Progress': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

const SEVERITY_BADGES = {
  Mild: 'bg-blue-100 text-blue-800 border-blue-200',
  Moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  Severe: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function PatientHistory() {
  const { patientId: urlPatientId } = useParams();

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(urlPatientId || '');
  const [emrData, setEmrData] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingEMR, setLoadingEMR] = useState(false);

  // View Mode: 'timeline' (default) vs 'table'
  const [viewMode, setViewMode] = useState('timeline');

  // Search & Filter Controls State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [sortOption, setSortOption] = useState('dateDesc'); // 'dateDesc' | 'dateAsc' | 'doctorAsc' | 'doctorDesc'

  // Expanded visit detail cards/rows
  const [expandedConsultations, setExpandedConsultations] = useState({});

  // Sync urlPatientId with state when route changes
  useEffect(() => {
    if (urlPatientId) {
      setSelectedPatientId(urlPatientId);
    }
  }, [urlPatientId]);

  // Fetch patient directory selector list
  useEffect(() => {
    async function fetchPatients() {
      try {
        setLoadingPatients(true);
        const res = await api.get('/patients');
        const list = res.data?.patients || [];
        setPatients(list);

        if (!selectedPatientId && list.length > 0) {
          setSelectedPatientId(list[0]._id || list[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch patient directory:', err);
      } finally {
        setLoadingPatients(false);
      }
    }
    fetchPatients();
  }, []);

  // Fetch single EMR aggregation endpoint
  const fetchEMR = async () => {
    if (!selectedPatientId) return;
    try {
      setLoadingEMR(true);
      const res = await api.get(`/patients/${selectedPatientId}/emr`);
      const data = res.data || {};
      setEmrData(data);

      // Expand most recent consultation by default
      if (data.consultations && data.consultations.length > 0) {
        const firstId = data.consultations[0].consultationId || data.consultations[0].id;
        setExpandedConsultations({ [firstId]: true });
      } else {
        setExpandedConsultations({});
      }
    } catch (err) {
      console.error('Failed to load patient EMR:', err);
      setEmrData(null);
    } finally {
      setLoadingEMR(false);
    }
  };

  useEffect(() => {
    fetchEMR();
  }, [selectedPatientId]);

  const toggleConsultationExpand = (cId) => {
    setExpandedConsultations((prev) => ({
      ...prev,
      [cId]: !prev[cId],
    }));
  };

  const patient = emrData?.patient || {};
  const fullName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';
  const rawConsultations = emrData?.consultations || [];
  const followUps = emrData?.followUps || [];

  const dobStr = patient.dateOfBirth
    ? new Date(patient.dateOfBirth).toLocaleDateString()
    : null;

  // Derive unique doctor list for doctor filter dropdown
  const availableDoctors = useMemo(() => {
    const names = rawConsultations
      .map((c) => c.doctor?.name)
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [rawConsultations]);

  // Transform and flatten consultations for searching, filtering, and sorting
  const flattenedHistoryRows = useMemo(() => {
    return rawConsultations.map((c) => {
      const dateObj = c.date ? new Date(c.date) : new Date();
      const dateStr = dateObj.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const doctorName = c.doctor?.name ? `Dr. ${c.doctor.name}` : 'Staff Doctor';

      // Diagnoses Summary
      const diagnosisItems = (c.diagnoses || []).map((d) => {
        let s = d.diagnosis;
        if (d.severity) s += ` (${d.severity})`;
        if (d.relatedTeeth && d.relatedTeeth.length > 0) s += ` [#${d.relatedTeeth.join(', #')}]`;
        return s;
      });
      const diagnosisSummary = diagnosisItems.length > 0 ? diagnosisItems.join(' • ') : '—';

      // Treatment Plans Summary
      const treatmentItems = (c.treatmentPlans || []).map((tp) => {
        let s = tp.treatment;
        if (tp.tooth) s += ` (Tooth #${tp.tooth})`;
        if (tp.status) s += ` - ${tp.status}`;
        return s;
      });
      const treatmentSummary = treatmentItems.length > 0 ? treatmentItems.join(' • ') : '—';

      // Prescriptions Summary
      const rxMedicines = [];
      (c.prescriptions || []).forEach((rx) => {
        (rx.medicines || []).forEach((m) => {
          let s = m.medicine;
          if (m.dosage) s += ` ${m.dosage}`;
          rxMedicines.push(s);
        });
      });
      const prescriptionSummary = rxMedicines.length > 0 ? rxMedicines.join(', ') : '—';

      // Examination & Notes Summary
      const examItems = [];
      if (c.examination) {
        if (c.examination.extraoral && c.examination.extraoral.length > 0) {
          examItems.push(`Extraoral: ${c.examination.extraoral.map((e) => e.finding).join(', ')}`);
        }
        if (c.examination.softTissue && c.examination.softTissue.length > 0) {
          examItems.push(`Soft Tissue: ${c.examination.softTissue.map((st) => st.area).join(', ')}`);
        }
        if (c.examination.gingivalFindings && c.examination.gingivalFindings.length > 0) {
          examItems.push(`Gingival: ${c.examination.gingivalFindings.join(', ')}`);
        }
      }
      let notesSummary = c.notes || '';
      if (examItems.length > 0) {
        notesSummary = notesSummary ? `${examItems.join(' | ')} • ${notesSummary}` : examItems.join(' | ');
      }
      if (!notesSummary) notesSummary = '—';

      const searchableText = `${dateStr} ${doctorName} ${c.doctor?.specialization || ''} ${diagnosisSummary} ${treatmentSummary} ${prescriptionSummary} ${notesSummary} ${c.notes || ''}`.toLowerCase();

      return {
        cId: c.consultationId || c.id,
        raw: c,
        dateObj,
        dateStr,
        doctorName,
        doctorRawName: c.doctor?.name || '',
        doctorSpecialization: c.doctor?.specialization || '',
        diagnosisSummary,
        treatmentSummary,
        prescriptionSummary,
        notesSummary,
        searchableText,
      };
    });
  }, [rawConsultations]);

  // Filter and sort history rows
  const filteredHistoryRows = useMemo(() => {
    let result = [...flattenedHistoryRows];

    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((row) => row.searchableText.includes(q));
    }

    // Doctor Filter
    if (doctorFilter) {
      result = result.filter((row) => row.doctorRawName === doctorFilter);
    }

    // Date From Filter
    if (dateFrom) {
      const fromObj = new Date(dateFrom);
      fromObj.setHours(0, 0, 0, 0);
      result = result.filter((row) => row.dateObj >= fromObj);
    }

    // Date To Filter
    if (dateTo) {
      const toObj = new Date(dateTo);
      toObj.setHours(23, 59, 59, 999);
      result = result.filter((row) => row.dateObj <= toObj);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOption === 'dateDesc') {
        return b.dateObj - a.dateObj;
      }
      if (sortOption === 'dateAsc') {
        return a.dateObj - b.dateObj;
      }
      if (sortOption === 'doctorAsc') {
        return a.doctorName.localeCompare(b.doctorName);
      }
      if (sortOption === 'doctorDesc') {
        return b.doctorName.localeCompare(a.doctorName);
      }
      return b.dateObj - a.dateObj;
    });

    return result;
  }, [flattenedHistoryRows, searchQuery, doctorFilter, dateFrom, dateTo, sortOption]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setDoctorFilter('');
    setSortOption('dateDesc');
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo || doctorFilter || sortOption !== 'dateDesc';

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <History size={26} className="text-brand" /> Patient Medical History & EMR Log
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Strictly view-only historical log of all past consultations, clinical findings, diagnoses, tooth chart state, and follow-ups.
          </p>
        </div>

        {/* Patient Selection Dropdown */}
        <div className="w-full sm:w-80">
          <label className="block text-xs font-semibold text-ink-soft mb-1">Select Patient Directory:</label>
          <select
            disabled={loadingPatients}
            className="input-field py-2 text-xs font-semibold"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
          >
            {patients.map((p) => {
              const pId = p._id || p.id;
              return (
                <option key={pId} value={pId}>
                  {p.firstName} {p.lastName} (OP: {p.opNumber || 'N/A'})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* PATIENT HEADER & DEMOGRAPHICS CARD */}
      {loadingEMR ? (
        <div className="card p-8 text-center text-xs text-ink-soft">Loading patient EMR records...</div>
      ) : !patient._id ? (
        <div className="card p-8 text-center text-xs text-ink-soft">Please select a patient to view EMR records.</div>
      ) : (
        <div className="card p-5 space-y-4 bg-surface border-brand/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-brand-dark font-bold text-xl">
                <UserSquare2 size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold text-ink">{fullName}</h2>
                  <span className="badge bg-brand-light/40 text-brand-dark font-mono font-bold border border-brand/30">
                    OP #{patient.opNumber || 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-ink-soft mt-0.5">
                  Age: <span className="font-semibold text-ink">{patient.age !== undefined && patient.age !== null ? `${patient.age} yrs` : 'N/A'}</span> • Sex:{' '}
                  <span className="font-semibold text-ink">{patient.sex || 'N/A'}</span> • Phone:{' '}
                  <span className="font-semibold text-ink">{patient.phone || 'N/A'}</span>
                </p>
              </div>
            </div>

            <div className="text-xs text-ink-soft text-left sm:text-right">
              <span className="font-bold text-brand text-sm">{rawConsultations.length}</span> Total Recorded Visit(s)
              {dobStr && <span className="block text-[11px]">DOB: {dobStr}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-bg border border-border">
              <span className="text-ink-soft font-semibold block mb-0.5">Occupation & Address:</span>
              <span className="font-medium text-ink block truncate">
                {patient.occupation || 'No occupation listed'}
              </span>
              <span className="text-ink-soft text-[11px] block truncate mt-0.5">
                {patient.address || 'No address listed'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-bg border border-border">
              <span className="text-ink-soft font-semibold block mb-0.5">Vitals & Lifestyle:</span>
              <span className="font-medium text-ink block">
                BP: {patient.vitals?.bp || 'N/A'} | RBS: {patient.vitals?.rbs || 'N/A'}
              </span>
              <span className="text-ink-soft text-[11px] block truncate mt-0.5">
                Habits: {patient.habits && patient.habits.length > 0 ? (Array.isArray(patient.habits) ? patient.habits.join(', ') : patient.habits) : 'None reported'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-bg border border-border">
              <span className="text-ink-soft font-semibold block mb-0.5">Medical History & Rx:</span>
              <span className="font-bold text-amber-800 block truncate">
                {patient.medicalHistory && patient.medicalHistory.length > 0
                  ? (Array.isArray(patient.medicalHistory) ? patient.medicalHistory.join(', ') : patient.medicalHistory)
                  : 'No medical alerts'}
              </span>
              <span className="text-ink-soft text-[11px] block truncate mt-0.5">
                Meds: {patient.currentMedications || 'None reported'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-bg border border-border">
              <span className="text-ink-soft font-semibold block mb-0.5">Dental History:</span>
              <span className="font-medium text-ink text-[11px] line-clamp-2">
                {patient.dentalHistory || 'No previous dental history reported'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* READ-ONLY CURRENT TOOTH CHART */}
      {selectedPatientId && (
        <div className="card p-5 space-y-3 bg-surface">
          <div className="border-b border-border pb-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Activity size={18} className="text-brand" /> Current Dental Tooth Chart (32 FDI Teeth)
            </h3>
            <span className="text-[11px] text-ink-soft font-medium bg-bg px-2 py-0.5 rounded border border-border">
              Read-Only EMR View
            </span>
          </div>

          <ToothChart patientId={selectedPatientId} isReadOnly={true} />
        </div>
      )}

      {/* HISTORICAL VISIT LOG SECTION */}
      <div className="card p-5 space-y-4 bg-surface">
        {/* TOP BAR: SECTION TITLE & VIEW MODE TOGGLE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <Calendar size={18} className="text-brand" /> Clinical Visit History Log ({filteredHistoryRows.length} Visits)
            </h3>
            <p className="text-xs text-ink-soft">
              Search and filter across doctor, diagnosis, treatment, and prescription details.
            </p>
          </div>

          {/* VIEW MODE TOGGLE BUTTONS */}
          <div className="inline-flex p-1 rounded-xl bg-bg border border-border self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'timeline'
                  ? 'bg-surface text-brand shadow-sm border border-border/80'
                  : 'text-ink-soft hover:text-ink'
                }`}
            >
              <CalendarDays size={14} /> Timeline View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table'
                  ? 'bg-surface text-brand shadow-sm border border-border/80'
                  : 'text-ink-soft hover:text-ink'
                }`}
            >
              <LayoutList size={14} /> Table View
            </button>
          </div>
        </div>

        {/* SEARCH, FILTER & SORT CONTROLS BAR */}
        <div className="space-y-3 p-3.5 rounded-xl bg-bg/50 border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="text"
                className="input-field pl-9 py-1.5 text-xs"
                placeholder="Search by doctor name, diagnosis, treatment procedure, medicine, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold self-end sm:self-auto shrink-0"
              >
                <X size={13} /> Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div>
              <label className="block font-semibold text-ink-soft mb-1">From Date</label>
              <input
                type="date"
                className="input-field py-1.5 font-mono text-xs"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-soft mb-1">To Date</label>
              <input
                type="date"
                className="input-field py-1.5 font-mono text-xs"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-soft mb-1">Doctor Filter</label>
              <select
                className="input-field py-1.5 text-xs font-semibold"
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
              >
                <option value="">All Attending Doctors</option>
                {availableDoctors.map((docName) => (
                  <option key={docName} value={docName}>
                    Dr. {docName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink-soft mb-1">Sort Order</label>
              <select
                className="input-field py-1.5 text-xs font-semibold"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="dateDesc">Date: Newest First</option>
                <option value="dateAsc">Date: Oldest First</option>
                <option value="doctorAsc">Doctor: A – Z</option>
                <option value="doctorDesc">Doctor: Z – A</option>
              </select>
            </div>
          </div>
        </div>

        {/* VIEW RENDER: TIMELINE OR TABLE */}
        {loadingEMR ? (
          <div className="p-12 text-center text-xs text-ink-soft">Loading clinical history...</div>
        ) : rawConsultations.length === 0 ? (
          /* EMPTY STATE 1: NO HISTORY AT ALL */
          <div className="p-12 text-center text-xs text-ink-soft space-y-2 border border-dashed border-border rounded-xl">
            <History size={32} className="mx-auto text-ink-soft/40" />
            <p className="font-semibold text-ink text-sm">No visit history yet for this patient</p>
            <p>Clinical visit records will appear here once consultations are completed.</p>
          </div>
        ) : filteredHistoryRows.length === 0 ? (
          /* EMPTY STATE 2: NO FILTER RESULTS */
          <div className="p-12 text-center text-xs text-ink-soft space-y-3 border border-dashed border-border rounded-xl">
            <Filter size={32} className="mx-auto text-ink-soft/40" />
            <p className="font-semibold text-ink text-sm">No visit records match your search/filter criteria</p>
            <p>Try broadening your search terms, date range, or doctor filter.</p>
            <button
              onClick={handleResetFilters}
              className="btn-secondary text-xs py-1.5 px-3 font-semibold mx-auto inline-flex items-center gap-1"
            >
              <RefreshCw size={13} /> Reset Filters
            </button>
          </div>
        ) : viewMode === 'timeline' ? (
          /* MODE 1: TIMELINE VIEW */
          <div className="space-y-4 pt-2 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-border/70">
            {filteredHistoryRows.map((row) => {
              const c = row.raw;
              const isExpanded = !!expandedConsultations[row.cId];
              const isCompleted = c.status === 'Completed';

              return (
                <div key={row.cId} className="relative pl-10">
                  {/* Timeline Marker Dot */}
                  <div className="absolute left-2 top-4 -translate-x-1/2 h-5 w-5 rounded-full border-2 border-brand bg-surface flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-brand" />
                  </div>

                  <div className="card overflow-hidden border border-border hover:border-brand/30 transition-all">
                    {/* Header: Click to Toggle Expansion */}
                    <div
                      onClick={() => toggleConsultationExpand(row.cId)}
                      className="p-4 bg-bg/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-bg/80 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-ink">{row.dateStr}</span>
                          <span
                            className={`badge border text-[10px] ${isCompleted
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-purple-100 text-purple-800 border-purple-200'
                              }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-ink-soft">
                          Attending Doctor: <strong className="text-ink">{row.doctorName}</strong>{' '}
                          {row.doctorSpecialization ? `(${row.doctorSpecialization})` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-ink-soft">
                        <span className="text-[11px] font-semibold">
                          {isExpanded ? 'Collapse Details' : 'Expand Details'}
                        </span>
                        <button type="button" className="p-1 hover:text-ink">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* COLLAPSED SUMMARY PREVIEW (WHEN NOT FULLY EXPANDED) */}
                    {!isExpanded && (
                      <div className="p-3.5 bg-surface border-t border-border/60 text-xs space-y-1.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <div>
                            <span className="font-bold text-ink-soft block">Diagnosis:</span>
                            <span className="text-ink truncate block font-medium">{row.diagnosisSummary}</span>
                          </div>
                          <div>
                            <span className="font-bold text-ink-soft block">Treatment:</span>
                            <span className="text-ink truncate block font-medium">{row.treatmentSummary}</span>
                          </div>
                          <div>
                            <span className="font-bold text-ink-soft block">Prescription:</span>
                            <span className="text-brand truncate block font-medium">{row.prescriptionSummary}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* EXPANDED FULL UN-SUMMARIZED CLINICAL DETAIL */}
                    {isExpanded && (
                      <div className="p-5 space-y-5 border-t border-border bg-surface text-xs animate-in fade-in duration-150">
                        {/* Closing Summary Notes if present */}
                        {c.notes && (
                          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-1">
                            <span className="font-bold text-[11px] uppercase tracking-wider block text-amber-800 flex items-center gap-1">
                              <FileText size={13} /> Doctor Closing Summary Notes:
                            </span>
                            <p className="whitespace-pre-wrap">{c.notes}</p>
                          </div>
                        )}

                        {/* 1. EXAMINATION SUMMARY */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-ink-soft uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-border pb-1">
                            <FileHeart size={14} className="text-brand" /> 1. Clinical Examination Findings
                          </h4>
                          {c.examination ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-2.5 rounded-lg bg-bg border border-border space-y-1">
                                <span className="font-bold text-ink block">Extraoral:</span>
                                {c.examination.extraoral?.length > 0 ? (
                                  c.examination.extraoral.map((item, i) => (
                                    <div key={i} className="text-[11px] text-ink-soft">
                                      • <strong className="text-ink">{item.finding}</strong>{item.notes ? `: ${item.notes}` : ''}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-ink-soft/50 italic">No extraoral findings</span>
                                )}
                              </div>

                              <div className="p-2.5 rounded-lg bg-bg border border-border space-y-1">
                                <span className="font-bold text-ink block">Soft Tissue:</span>
                                {c.examination.softTissue?.length > 0 ? (
                                  c.examination.softTissue.map((item, i) => (
                                    <div key={i} className="text-[11px] text-ink-soft">
                                      • <strong className="text-ink">{item.area}</strong>{item.notes ? `: ${item.notes}` : ''}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-ink-soft/50 italic">No soft tissue findings</span>
                                )}
                              </div>

                              <div className="p-2.5 rounded-lg bg-bg border border-border space-y-1">
                                <span className="font-bold text-ink block">Gingival / Periodontal:</span>
                                {c.examination.gingivalFindings?.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {c.examination.gingivalFindings.map((g, i) => (
                                      <span key={i} className="badge bg-teal-50 text-teal-800 border border-teal-200 text-[10px]">
                                        {g}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-ink-soft/50 italic">No gingival findings</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-ink-soft/50 italic">No clinical examination recorded during this visit.</p>
                          )}
                        </div>

                        {/* 2. DIAGNOSES LIST */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-ink-soft uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-border pb-1">
                            <Stethoscope size={14} className="text-brand" /> 2. Clinical Diagnoses ({c.diagnoses?.length || 0})
                          </h4>
                          {c.diagnoses?.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {c.diagnoses.map((d) => (
                                <div key={d._id} className="p-3 rounded-xl border border-border bg-bg/40 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-ink text-xs">{d.diagnosis}</span>
                                    {d.severity && (
                                      <span className={`badge text-[10px] border ${SEVERITY_BADGES[d.severity] || SEVERITY_BADGES.Mild}`}>
                                        {d.severity}
                                      </span>
                                    )}
                                  </div>
                                  {d.clinicalFindings && (
                                    <p className="text-ink-soft text-[11px]">{d.clinicalFindings}</p>
                                  )}
                                  {d.relatedTeeth?.length > 0 && (
                                    <p className="text-[10px] text-brand font-mono font-semibold pt-0.5">
                                      Related Teeth: #{d.relatedTeeth.join(', #')}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-ink-soft/50 italic">No diagnoses recorded during this visit.</p>
                          )}
                        </div>

                        {/* 3. TREATMENT PLANS LIST */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-ink-soft uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-border pb-1">
                            <Activity size={14} className="text-brand" /> 3. Treatment Procedures & Plans ({c.treatmentPlans?.length || 0})
                          </h4>
                          {c.treatmentPlans?.length > 0 ? (
                            <div className="space-y-2">
                              {c.treatmentPlans.map((tp) => (
                                <div
                                  key={tp._id}
                                  className="p-3 rounded-xl border border-border bg-bg/20 flex items-center justify-between gap-3"
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-ink">{tp.treatment}</span>
                                      {tp.tooth && (
                                        <span className="badge bg-brand-light/40 text-brand-dark font-mono text-[10px]">
                                          Tooth #{tp.tooth}
                                        </span>
                                      )}
                                    </div>
                                    {tp.description && <p className="text-ink-soft text-[11px]">{tp.description}</p>}
                                    {tp.notes && <p className="text-ink-soft/70 text-[10px] italic">Notes: {tp.notes}</p>}
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className={`badge text-[10px] border ${STATUS_BADGE_CLASSES[tp.status] || STATUS_BADGE_CLASSES.Planned}`}>
                                      {tp.status}
                                    </span>
                                    <p className="font-bold font-mono text-emerald-700 text-xs mt-1">₹{tp.estimatedCost || 0}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-ink-soft/50 italic">No treatment procedures recorded during this visit.</p>
                          )}
                        </div>

                        {/* 4. PRESCRIPTIONS (RX) */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-ink-soft uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-border pb-1">
                            <Pill size={14} className="text-brand" /> 4. Prescribed Medications ({c.prescriptions?.length || 0})
                          </h4>
                          {c.prescriptions?.length > 0 ? (
                            <div className="space-y-2">
                              {c.prescriptions.map((rx) => (
                                <div key={rx._id} className="p-3 rounded-xl border border-border bg-bg/30 space-y-2">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-bg font-semibold text-ink-soft border-b border-border">
                                        <tr>
                                          <th className="py-1.5 px-2">Medicine</th>
                                          <th className="py-1.5 px-2">Dosage</th>
                                          <th className="py-1.5 px-2">Frequency</th>
                                          <th className="py-1.5 px-2">Duration</th>
                                          <th className="py-1.5 px-2">Instructions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border">
                                        {rx.medicines?.map((m, i) => (
                                          <tr key={i}>
                                            <td className="py-1.5 px-2 font-bold text-brand">{m.medicine}</td>
                                            <td className="py-1.5 px-2">{m.dosage || '—'}</td>
                                            <td className="py-1.5 px-2">{m.frequency || '—'}</td>
                                            <td className="py-1.5 px-2">{m.duration || '—'}</td>
                                            <td className="py-1.5 px-2 text-ink-soft">{m.instructions || '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-ink-soft/50 italic">No prescriptions recorded during this visit.</p>
                          )}
                        </div>

                        {/* 5. INVESTIGATIONS */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-ink-soft uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-border pb-1">
                            <Search size={14} className="text-brand" /> 5. Diagnostic Investigations ({c.investigations?.length || 0})
                          </h4>
                          {c.investigations?.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {c.investigations.map((inv) => (
                                <div key={inv._id} className="p-3 rounded-xl border border-border bg-bg/40 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-ink">{inv.type}</span>
                                    <span className="text-[10px] font-semibold text-ink-soft bg-surface px-1.5 py-0.5 rounded border border-border">
                                      {inv.reason}
                                    </span>
                                  </div>
                                  {inv.result ? (
                                    <p className="text-emerald-800 text-[11px] font-medium bg-emerald-50 p-1.5 rounded border border-emerald-200">
                                      Result: {inv.result}
                                    </p>
                                  ) : (
                                    <p className="text-amber-800 text-[11px] italic bg-amber-50 p-1.5 rounded border border-amber-200">
                                      Pending lab results
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-ink-soft/50 italic">No investigations ordered during this visit.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* MODE 2: TABLE VIEW */
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-border bg-bg/60 font-semibold text-ink-soft text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Diagnosis</th>
                  <th className="px-4 py-3">Treatment</th>
                  <th className="px-4 py-3">Prescription</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredHistoryRows.map((row) => {
                  const isExpanded = !!expandedConsultations[row.cId];
                  const c = row.raw;

                  return (
                    <tr
                      key={row.cId}
                      onClick={() => toggleConsultationExpand(row.cId)}
                      className="hover:bg-bg/60 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-ink">
                        {row.dateStr}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-ink">{row.doctorName}</div>
                        {row.doctorSpecialization && (
                          <div className="text-[10px] text-ink-soft">{row.doctorSpecialization}</div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <span className="text-ink line-clamp-2">{row.diagnosisSummary}</span>
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <span className="text-ink line-clamp-2">{row.treatmentSummary}</span>
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <span className="text-brand font-medium line-clamp-2">{row.prescriptionSummary}</span>
                      </td>

                      <td className="px-4 py-3.5 max-w-xs text-ink-soft">
                        <span className="line-clamp-2">{row.notesSummary}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOLLOW-UPS LIST SECTION */}
      {selectedPatientId && (
        <div className="card p-5 space-y-3 bg-surface">
          <div className="border-b border-border pb-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Bell size={18} className="text-brand" /> Patient Follow-Up Recommendations ({followUps.length})
            </h3>
          </div>

          {followUps.length === 0 ? (
            <p className="text-xs text-ink-soft/60 italic">No follow-ups recorded for this patient.</p>
          ) : (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-bg font-semibold text-ink-soft border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Recommended Date</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Instructions</th>
                    <th className="py-2.5 px-3">Treatment Note</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {followUps.map((fu) => (
                    <tr key={fu._id || fu.id} className="hover:bg-bg/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-ink whitespace-nowrap">
                        {fu.recommendedDate ? new Date(fu.recommendedDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-brand">{fu.reason || '—'}</td>
                      <td className="py-2.5 px-3 text-ink-soft">{fu.instructions || '—'}</td>
                      <td className="py-2.5 px-3 text-ink-soft">{fu.treatmentStatus || '—'}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`badge border text-[10px] ${fu.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : fu.status === 'Scheduled'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                        >
                          {fu.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PATIENT DOCUMENTS VAULT */}
      {selectedPatientId && (
        <DocumentsPanel patientId={selectedPatientId} title="Patient Clinical & Diagnostic Documents" />
      )}
    </div>
  );
}
