import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  History, Search, UserSquare2, Calendar, Stethoscope, Activity, Pill,
  FileHeart, IndianRupee, ArrowRight, CheckCircle2, Clock, ChevronDown, ChevronUp,
  Filter, AlertTriangle, FileText, Lock, Eye, Sparkles, Check, Bell
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
  const [expandedConsultations, setExpandedConsultations] = useState({});

  // Sync urlPatientId with state when URL route changes
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
  useEffect(() => {
    if (!selectedPatientId) return;

    async function fetchEMR() {
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
    }

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
  const consultations = emrData?.consultations || [];
  const followUps = emrData?.followUps || [];

  const dobStr = patient.dateOfBirth
    ? new Date(patient.dateOfBirth).toLocaleDateString()
    : null;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <History size={26} className="text-brand" /> Patient Medical History (EMR)
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Unified Electronic Medical Record tracking multi-visit clinical findings, diagnoses, tooth history, prescriptions, and follow-ups.
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
              <span className="font-bold text-brand text-sm">{consultations.length}</span> Recorded Clinical Visit(s)
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

      {/* VISIT HISTORY TIMELINE (ACCORDION PER CONSULTATION) */}
      {loadingEMR ? (
        <div className="card p-12 text-center text-xs text-ink-soft">Loading clinical visit timeline...</div>
      ) : consultations.length === 0 ? (
        <div className="card p-12 text-center text-xs text-ink-soft space-y-2">
          <History size={32} className="mx-auto text-ink-soft/40" />
          <p className="font-semibold text-ink">No consultation records found for this patient.</p>
          <p>Visits will appear here once consultations are initiated and completed by a doctor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <Calendar size={18} className="text-brand" /> Visit History Timeline ({consultations.length} Visits)
            </h3>
            <span className="text-xs text-ink-soft">Click any visit to expand or collapse details.</span>
          </div>

          <div className="space-y-4">
            {consultations.map((c, idx) => {
              const cId = c.consultationId || c.id;
              const isExpanded = !!expandedConsultations[cId];
              const dateStr = c.date
                ? new Date(c.date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'N/A';

              const isCompleted = c.status === 'Completed';

              return (
                <div
                  key={cId}
                  className="card overflow-hidden border border-border hover:border-brand/30 transition-all"
                >
                  {/* ACCORDION HEADER */}
                  <div
                    onClick={() => toggleConsultationExpand(cId)}
                    className="p-4 bg-bg/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-bg/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-brand-light/40 text-brand flex items-center justify-center font-bold text-sm shrink-0">
                        #{consultations.length - idx}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-ink">{dateStr}</span>
                          <span
                            className={`badge border text-[10px] ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-purple-100 text-purple-800 border-purple-200'
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-ink-soft mt-0.5">
                          Doctor: <strong>Dr. {c.doctor?.name || 'Staff Doctor'}</strong>{' '}
                          {c.doctor?.specialization ? `(${c.doctor.specialization})` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        to={`/doctor/consultation/${cId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="btn-secondary py-1 px-2.5 text-xs font-semibold flex items-center gap-1"
                      >
                        <Eye size={13} /> Open Workspace
                      </Link>

                      <button type="button" className="p-1 text-ink-soft hover:text-ink">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* ACCORDION CONTENT BODY */}
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
                          <Stethoscope size={14} className="text-brand" /> 2. Clinical Diagnoses ({c.diagnoses.length})
                        </h4>
                        {c.diagnoses.length > 0 ? (
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
                          <Activity size={14} className="text-brand" /> 3. Treatment Procedures & Plans ({c.treatmentPlans.length})
                        </h4>
                        {c.treatmentPlans.length > 0 ? (
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
                          <Pill size={14} className="text-brand" /> 4. Prescribed Medications ({c.prescriptions.length})
                        </h4>
                        {c.prescriptions.length > 0 ? (
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
                          <Search size={14} className="text-brand" /> 5. Diagnostic Investigations ({c.investigations.length})
                        </h4>
                        {c.investigations.length > 0 ? (
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
              );
            })}
          </div>
        </div>
      )}

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
                          className={`badge border text-[10px] ${
                            fu.status === 'Completed'
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
