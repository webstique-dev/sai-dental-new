import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/axios.js';
import {
  X,
  User,
  Activity,
  Calendar,
  Clock,
  Pill,
  FileText,
  Stethoscope,
  ExternalLink,
  Phone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function CompletedConsultationModal({
  isOpen,
  onClose,
  item = null,
  consultationId = null,
  appointmentId = null,
  patientId = null,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summaryData, setSummaryData] = useState(null);

  // Derive IDs
  const activeConsultId = consultationId || item?.consultationId || item?.consultation?._id || item?.consultation;
  const activeApptId = appointmentId || item?.appointmentId || item?.appointment?._id || item?.appointment || (item?.type === 'Appointment' ? item?.id : null);
  const activeQueueId = item?.queueEntryId || item?.queueEntry?._id || item?.queueEntry || (item?.token ? item?.id : null);
  const activePatientId = patientId || item?.patient?._id || item?.patient?.id || item?.patient;

  useEffect(() => {
    if (!isOpen) {
      setSummaryData(null);
      setError('');
      return;
    }

    let isMounted = true;

    async function fetchSummary() {
      setLoading(true);
      setError('');
      try {
        let endpoint = '';
        if (activeConsultId && activeConsultId !== 'by-visit') {
          endpoint = `/consultations/${activeConsultId}/complete-summary`;
        } else {
          const params = new URLSearchParams();
          if (activeConsultId) params.append('consultationId', activeConsultId);
          if (activeApptId) params.append('appointmentId', activeApptId);
          if (activeQueueId) params.append('queueId', activeQueueId);
          if (activePatientId) params.append('patientId', activePatientId);
          endpoint = `/consultations/summary/by-visit?${params.toString()}`;
        }

        const res = await api.get(endpoint);
        if (isMounted) {
          setSummaryData(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch consultation complete summary:', err);
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load consultation details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSummary();

    // Keyboard ESC listener
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, activeConsultId, activeApptId, activeQueueId, activePatientId, onClose]);

  if (!isOpen) return null;

  // Resolve objects from summaryData or fallback to item
  const resolvedPatient = summaryData?.patient || item?.patient || {};
  const resolvedDoctor = summaryData?.doctor || item?.doctor || {};
  const resolvedConsultation = summaryData?.consultation || item?.consultation || {};
  const resolvedVitals = summaryData?.vitals || resolvedPatient?.vitals || null;
  const toothFindings = summaryData?.toothFindings || [];
  const diagnoses = summaryData?.diagnoses || [];
  const treatmentRecords = summaryData?.treatmentRecords || [];
  const treatmentPlans = summaryData?.treatmentPlans || [];
  const prescriptions = summaryData?.prescriptions || [];
  const followUp = summaryData?.followUp || null;
  const clinicalNotes = summaryData?.clinicalNotes || resolvedConsultation?.clinicalNotes || resolvedConsultation?.notes || item?.notes || '';

  const patientName = [resolvedPatient?.firstName, resolvedPatient?.lastName].filter(Boolean).join(' ') || 'Patient';
  const targetPatientId = resolvedPatient?._id || resolvedPatient?.id || activePatientId;
  const opNumber = resolvedPatient?.opNumber ? `#${resolvedPatient.opNumber}` : 'Not recorded';
  const patientType = resolvedPatient?.patientType || (resolvedPatient?.age !== undefined && Number(resolvedPatient?.age) < 12 ? 'Child' : 'Adult');

  const visitDate = resolvedConsultation?.startedAt || item?.endTime || item?.startTime || item?.date || new Date();
  const dateFormatted = new Date(visitDate).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formatTime = (d) => {
    if (!d) return 'Not recorded';
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return 'Not recorded';
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleNavigateToPatient = () => {
    if (!targetPatientId) return;
    onClose();
    if (user?.role === 'receptionist') {
      navigate(`/reception/patients/${targetPatientId}`);
    } else {
      navigate(`/doctor/patients/${targetPatientId}`);
    }
  };

  const renderNotRecorded = (text = 'Not recorded') => (
    <span className="text-ink-soft/70 italic font-normal text-xs">{text}</span>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-4xl max-h-[90vh] flex flex-col bg-surface shadow-2xl border border-border rounded-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Completed Consultation Details"
      >
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-border bg-gradient-to-r from-bg to-brand-light/30 shrink-0 gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-base sm:text-lg font-bold text-ink truncate">
                {patientName}
              </h3>
              <span className="badge bg-brand-light/60 text-brand font-mono font-bold text-xs border border-brand/20">
                {opNumber}
              </span>
              <span className="badge bg-purple-50 text-purple-800 border-purple-200 text-xs font-semibold">
                {patientType}
              </span>
              <span className="badge bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 size={12} /> Completed Visit
              </span>
            </div>
            <p className="text-xs text-ink-soft flex items-center gap-3 flex-wrap">
              <span>Visit Date: <strong className="text-ink font-semibold">{dateFormatted}</strong></span>
              <span>•</span>
              <span>Attending: <strong className="text-ink font-semibold">Dr. {resolvedDoctor?.name || 'Staff Doctor'}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {targetPatientId && (
              <button
                type="button"
                onClick={handleNavigateToPatient}
                className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                title="Open Patient Full Details"
              >
                <User size={14} />
                <span>View Patient</span>
                <ExternalLink size={12} className="opacity-80" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-bg/80 border border-border transition-colors"
              aria-label="Close popup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs font-sans">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-solid border-brand border-r-transparent align-[-0.125em]" />
              <p className="text-xs text-ink-soft font-medium">Loading completed consultation records...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* SECTION 1: PATIENT DETAILS & CONTACT */}
              <div className="card p-4 bg-bg/50 border border-border space-y-3">
                <div className="flex items-center justify-between border-b border-border/70 pb-2">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <User size={14} className="text-brand" /> Patient Details
                  </h4>
                  {targetPatientId && (
                    <button
                      type="button"
                      onClick={handleNavigateToPatient}
                      className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1"
                    >
                      Full Profile <ExternalLink size={11} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">Age / Sex</span>
                    <span className="font-semibold text-ink">
                      {resolvedPatient?.age !== undefined && resolvedPatient?.age !== null && resolvedPatient?.age !== '' ? `${resolvedPatient.age} yrs` : 'Not recorded'}{' '}
                      {resolvedPatient?.sex ? `/ ${resolvedPatient.sex}` : ''}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">Primary Phone</span>
                    <span className="font-semibold text-ink font-mono flex items-center gap-1">
                      {resolvedPatient?.primaryPhone || resolvedPatient?.phone ? (
                        <>
                          <Phone size={11} className="text-brand" />
                          {resolvedPatient.primaryPhone || resolvedPatient.phone}
                        </>
                      ) : (
                        renderNotRecorded()
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">Secondary Phone</span>
                    <span className="font-semibold text-ink font-mono">
                      {resolvedPatient?.secondaryPhone || renderNotRecorded()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">Occupation</span>
                    <span className="font-semibold text-ink">
                      {resolvedPatient?.occupation || renderNotRecorded()}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">Residential Address</span>
                    <span className="font-medium text-ink">
                      {resolvedPatient?.address || renderNotRecorded()}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-ink-soft block">Medical Alerts / History</span>
                    <span className="font-medium text-ink">
                      {resolvedPatient?.medicalHistory && resolvedPatient.medicalHistory.length > 0
                        ? (Array.isArray(resolvedPatient.medicalHistory) ? resolvedPatient.medicalHistory.join(', ') : resolvedPatient.medicalHistory)
                        : renderNotRecorded('None recorded')}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: VISIT & TIMINGS SUMMARY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card p-4 bg-surface border border-border space-y-2">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Calendar size={14} className="text-brand" /> Visit Reason & Info
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-ink-soft text-[11px] block">Primary Reason / Complaint</span>
                      <p className="font-bold text-ink text-sm">
                        {resolvedConsultation?.reason || item?.reason || renderNotRecorded()}
                      </p>
                    </div>
                    <div>
                      <span className="text-ink-soft text-[11px] block">Visit Type</span>
                      <span className="badge bg-slate-100 text-slate-800 border-slate-200 text-[10px]">
                        {item?.type || 'Consultation'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card p-4 bg-surface border border-border space-y-2">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Clock size={14} className="text-brand" /> Consultation Timings
                  </h4>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-soft block font-sans">Checked-In</span>
                      <span className="font-bold text-ink">{formatTime(item?.checkInTime || resolvedConsultation?.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-soft block font-sans">Started</span>
                      <span className="font-bold text-ink">{formatTime(resolvedConsultation?.startedAt || item?.startTime)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-soft block font-sans">Ended</span>
                      <span className="font-bold text-emerald-700">{formatTime(resolvedConsultation?.closedAt || item?.endTime)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: RECORDED VITALS */}
              <div className="card p-4 bg-surface border border-border space-y-3">
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <Activity size={14} className="text-brand" /> Recorded Vitals
                </h4>

                {resolvedVitals ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 bg-bg/60 rounded-xl border border-border">
                      <span className="text-[10px] uppercase font-bold text-ink-soft block">Blood Pressure</span>
                      <span className="font-bold text-ink font-mono">{resolvedVitals.bp || resolvedVitals.bloodPressure || renderNotRecorded()}</span>
                    </div>
                    <div className="p-2.5 bg-bg/60 rounded-xl border border-border">
                      <span className="text-[10px] uppercase font-bold text-ink-soft block">Pulse / Heart Rate</span>
                      <span className="font-bold text-ink font-mono">{resolvedVitals.pulse ? `${resolvedVitals.pulse} bpm` : renderNotRecorded()}</span>
                    </div>
                    <div className="p-2.5 bg-bg/60 rounded-xl border border-border">
                      <span className="text-[10px] uppercase font-bold text-ink-soft block">SpO2</span>
                      <span className="font-bold text-ink font-mono">{resolvedVitals.spo2 ? `${resolvedVitals.spo2}%` : renderNotRecorded()}</span>
                    </div>
                    <div className="p-2.5 bg-bg/60 rounded-xl border border-border">
                      <span className="text-[10px] uppercase font-bold text-ink-soft block">Temperature</span>
                      <span className="font-bold text-ink font-mono">{resolvedVitals.temperature ? `${resolvedVitals.temperature} °F` : renderNotRecorded()}</span>
                    </div>
                    <div className="p-2.5 bg-bg/60 rounded-xl border border-border">
                      <span className="text-[10px] uppercase font-bold text-ink-soft block">Weight</span>
                      <span className="font-bold text-ink font-mono">{resolvedVitals.weight ? `${resolvedVitals.weight} kg` : renderNotRecorded()}</span>
                    </div>
                    <div className="p-2.5 bg-bg/60 rounded-xl border border-border">
                      <span className="text-[10px] uppercase font-bold text-ink-soft block">Height</span>
                      <span className="font-bold text-ink font-mono">{resolvedVitals.height ? `${resolvedVitals.height} cm` : renderNotRecorded()}</span>
                    </div>
                    <div className="p-2.5 bg-bg/60 rounded-xl border border-border">
                      <span className="text-[10px] uppercase font-bold text-ink-soft block">BMI</span>
                      <span className="font-bold text-ink font-mono">{resolvedVitals.bmi || renderNotRecorded()}</span>
                    </div>
                    <div className="p-2.5 bg-bg/60 rounded-xl border border-border">
                      <span className="text-[10px] uppercase font-bold text-ink-soft block">Blood Sugar</span>
                      <span className="font-bold text-ink font-mono">{resolvedVitals.bloodSugar || resolvedVitals.rbs || renderNotRecorded()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-ink-soft bg-bg/50 p-3 rounded-xl border border-border text-center">
                    {renderNotRecorded('No vitals were recorded for this consultation.')}
                  </p>
                )}
              </div>

              {/* SECTION 4: TOOTH CHART FINDINGS & DIAGNOSES */}
              <div className="card p-4 bg-surface border border-border space-y-3">
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <Sparkles size={14} className="text-brand" /> Tooth Chart Findings & Diagnoses
                </h4>

                {toothFindings.length > 0 || diagnoses.length > 0 ? (
                  <div className="space-y-2">
                    {toothFindings.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {toothFindings.map((tf, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-bg/50 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="h-6 w-6 rounded-lg bg-brand text-white font-mono font-bold text-xs flex items-center justify-center">
                                #{tf.toothNumber}
                              </span>
                              <div>
                                <span className="font-bold text-ink">{tf.condition}</span>
                                {tf.notes && <p className="text-[11px] text-ink-soft italic">{tf.notes}</p>}
                              </div>
                            </div>
                            {tf.treatment && (
                              <span className="badge bg-brand-light text-brand text-[10px] font-bold">
                                {tf.treatment}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {diagnoses.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase text-ink-soft block">Clinical Diagnoses:</span>
                        {diagnoses.map((d, idx) => (
                          <div key={idx} className="p-2 rounded-xl bg-amber-50/60 border border-amber-200/80 text-amber-950 flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold">{d.diagnosis}</span>
                              {d.clinicalFindings && <p className="text-[11px] text-amber-900/80 mt-0.5">{d.clinicalFindings}</p>}
                            </div>
                            {d.severity && (
                              <span className="badge bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                                {d.severity}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-ink-soft bg-bg/50 p-3 rounded-xl border border-border text-center">
                    {renderNotRecorded('No tooth findings or diagnoses recorded.')}
                  </p>
                )}
              </div>

              {/* SECTION 5: TREATMENTS & PROCEDURES PERFORMED */}
              <div className="card p-4 bg-surface border border-border space-y-3">
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <Stethoscope size={14} className="text-brand" /> Treatments & Procedures
                </h4>

                {treatmentRecords.length > 0 || treatmentPlans.length > 0 ? (
                  <div className="space-y-2">
                    {treatmentRecords.map((tr, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border bg-bg/50 gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink">{tr.procedure}</span>
                            {tr.tooth && (
                              <span className="badge bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                                Tooth #{tr.tooth}
                              </span>
                            )}
                            <span className="badge bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                              Completed
                            </span>
                          </div>
                          {tr.notes && <p className="text-[11px] text-ink-soft italic">{tr.notes}</p>}
                        </div>
                        {tr.charges !== undefined && tr.charges !== null && (
                          <span className="font-mono font-bold text-ink self-end sm:self-auto">
                            ₹{Number(tr.charges).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}

                    {treatmentPlans.map((tp, idx) => (
                      <div key={`tp-${idx}`} className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-950">{tp.title || 'Planned Treatment'}</span>
                          <span className="badge bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold">
                            {tp.status || 'Planned'}
                          </span>
                        </div>
                        {tp.procedures && tp.procedures.length > 0 && (
                          <div className="text-[11px] text-indigo-900/80 space-y-0.5">
                            {tp.procedures.map((proc, pIdx) => (
                              <div key={pIdx} className="flex justify-between">
                                <span>• {proc.procedureName || proc.procedure} {proc.toothNumber ? `(Tooth #${proc.toothNumber})` : ''}</span>
                                {proc.cost && <span className="font-mono font-semibold">₹{proc.cost}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-soft bg-bg/50 p-3 rounded-xl border border-border text-center">
                    {renderNotRecorded('No treatments or procedures recorded.')}
                  </p>
                )}
              </div>

              {/* SECTION 6: CLINICAL NOTES */}
              <div className="card p-4 bg-surface border border-border space-y-2">
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <FileText size={14} className="text-brand" /> Clinical Notes & Advice
                </h4>
                {clinicalNotes && clinicalNotes.trim() ? (
                  <div className="p-3 rounded-xl bg-bg/60 border border-border text-xs text-ink whitespace-pre-wrap leading-relaxed">
                    {clinicalNotes}
                  </div>
                ) : (
                  <p className="text-ink-soft bg-bg/50 p-3 rounded-xl border border-border text-center">
                    {renderNotRecorded('No clinical notes recorded for this visit.')}
                  </p>
                )}
              </div>

              {/* SECTION 7: PRESCRIPTIONS (Rx) */}
              <div className="card p-4 bg-surface border border-border space-y-3">
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <Pill size={14} className="text-brand" /> Prescriptions (Rx)
                </h4>

                {prescriptions.length > 0 && prescriptions.some((p) => p.medicines && p.medicines.length > 0) ? (
                  <div className="space-y-3">
                    {prescriptions.map((rx, rIdx) => (
                      <div key={rIdx} className="rounded-xl border border-border bg-bg/40 p-3 space-y-2">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-border/80 font-bold text-ink-soft text-[10px] uppercase">
                              <tr>
                                <th className="pb-1.5">#</th>
                                <th className="pb-1.5">Medicine</th>
                                <th className="pb-1.5">Dosage</th>
                                <th className="pb-1.5">Frequency</th>
                                <th className="pb-1.5">Duration</th>
                                <th className="pb-1.5">Instructions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {rx.medicines?.map((m, mIdx) => (
                                <tr key={mIdx}>
                                  <td className="py-1.5 text-ink-soft font-mono font-bold">{mIdx + 1}</td>
                                  <td className="py-1.5 font-bold text-ink">{m.medicine}</td>
                                  <td className="py-1.5 text-ink-soft">{m.dosage || '—'}</td>
                                  <td className="py-1.5 font-mono text-brand font-bold">{m.frequency || '—'}</td>
                                  <td className="py-1.5 text-ink-soft">{m.duration || '—'}</td>
                                  <td className="py-1.5 text-ink-soft italic">{m.instructions || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {rx.notes && (
                          <p className="text-[11px] text-ink-soft italic pt-1 border-t border-border/40">
                            <strong>Note: </strong>{rx.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-soft bg-bg/50 p-3 rounded-xl border border-border text-center">
                    {renderNotRecorded('No prescriptions recorded.')}
                  </p>
                )}
              </div>

              {/* SECTION 8: NEXT FOLLOW-UP DETAILS */}
              <div className="card p-4 bg-surface border border-border space-y-3">
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <Calendar size={14} className="text-brand" /> Next Follow-Up Details
                </h4>

                {followUp && followUp.recommendedDate ? (
                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-600" /> Scheduled Follow-Up:
                      </span>
                      <span className="font-mono font-bold text-ink bg-surface px-2.5 py-1 rounded-lg border border-emerald-200">
                        {new Date(followUp.recommendedDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at {followUp.scheduledAppointment?.time || followUp.time || '10:00 AM'}
                      </span>
                    </div>

                    {followUp.reason && (
                      <div>
                        <span className="font-semibold text-ink-soft">Reason / Procedure: </span>
                        <span className="font-bold text-ink">{followUp.reason}</span>
                      </div>
                    )}

                    {followUp.instructions && (
                      <div>
                        <span className="font-semibold text-ink-soft">Patient Instructions: </span>
                        <span className="italic text-ink">{followUp.instructions}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-ink-soft bg-bg/50 p-3 rounded-xl border border-border text-center">
                    {renderNotRecorded('No next follow-up appointment was scheduled during this consultation.')}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
          <div>
            {targetPatientId && (
              <button
                type="button"
                onClick={handleNavigateToPatient}
                className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 shadow-sm"
              >
                <User size={14} />
                <span>View Patient</span>
                <ExternalLink size={12} className="opacity-80" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
