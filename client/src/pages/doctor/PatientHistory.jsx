import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History, Search, UserSquare2, Calendar, Stethoscope, Activity, Pill,
  FileHeart, IndianRupee, ArrowRight, CheckCircle2, Clock, ChevronRight, Filter, AlertTriangle, FileText,
} from 'lucide-react';
import api from '../../api/axios.js';

export default function PatientHistory() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Patient timeline records
  const [consultations, setConsultations] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // Fetch patient list for directory selector
  useEffect(() => {
    async function fetchPatients() {
      try {
        setLoadingPatients(true);
        const res = await api.get('/patients');
        const list = res.data?.patients || [];
        setPatients(list);
        if (list.length > 0) {
          setSelectedPatientId(list[0]._id || list[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch patients:', err);
      } finally {
        setLoadingPatients(false);
      }
    }
    fetchPatients();
  }, []);

  // Fetch timeline data when patient selected
  useEffect(() => {
    if (!selectedPatientId) return;

    const patientObj = patients.find((p) => (p._id || p.id) === selectedPatientId);
    setSelectedPatient(patientObj || null);

    async function fetchPatientTimeline() {
      try {
        setLoadingHistory(true);
        const [cRes, dRes, tpRes, rxRes, invRes, billRes] = await Promise.all([
          api.get(`/consultations?patient=${selectedPatientId}`),
          api.get(`/diagnoses?patient=${selectedPatientId}`),
          api.get(`/treatment-plans?patient=${selectedPatientId}`),
          api.get(`/prescriptions?patient=${selectedPatientId}`),
          api.get(`/investigations?patient=${selectedPatientId}`),
          api.get(`/invoices?patient=${selectedPatientId}`),
        ]);

        setConsultations(cRes.data?.consultations || []);
        setDiagnoses(dRes.data?.diagnoses || []);
        setTreatmentPlans(tpRes.data?.treatmentPlans || []);
        setPrescriptions(rxRes.data?.prescriptions || []);
        setInvestigations(invRes.data?.investigations || []);
        setInvoices(billRes.data?.invoices || []);
      } catch (err) {
        console.error('Failed to load patient history:', err);
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchPatientTimeline();
  }, [selectedPatientId, patients]);

  const fullName = selectedPatient
    ? [selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(' ')
    : '';

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <History size={26} className="text-brand" /> Patient Medical History
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Read-only multi-visit timeline tracking examinations, diagnoses, treatment plans, Rx, and billing status.
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

      {/* Selected Patient Overview Card */}
      {selectedPatient && (
        <div className="card p-5 space-y-4 bg-surface border-brand/20">
          <div className="flex items-center gap-3.5 border-b border-border pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <UserSquare2 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-ink">{fullName}</h2>
                <span className="badge bg-brand-light/40 text-brand-dark font-mono font-bold">
                  OP #{selectedPatient.opNumber}
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                Age: {selectedPatient.age || 'N/A'} yrs • Sex: {selectedPatient.sex || 'N/A'} • Phone: {selectedPatient.phone || 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-ink-soft font-medium block">Medical History:</span>
              <span className="font-semibold text-ink">
                {selectedPatient.medicalHistory?.length
                  ? selectedPatient.medicalHistory.join(', ')
                  : 'None reported'}
              </span>
            </div>
            <div>
              <span className="text-ink-soft font-medium block">Current Medications:</span>
              <span className="font-semibold text-ink">{selectedPatient.currentMedications || 'None'}</span>
            </div>
            <div>
              <span className="text-ink-soft font-medium block">Total Recorded Visits:</span>
              <span className="font-bold text-brand">{consultations.length} Visits</span>
            </div>
          </div>
        </div>
      )}

      {/* CHRONOLOGICAL MULTI-VISIT TIMELINE */}
      {loadingHistory ? (
        <div className="card p-12 text-center text-xs text-ink-soft">
          Loading patient multi-visit timeline...
        </div>
      ) : consultations.length === 0 ? (
        <div className="card p-12 text-center text-xs text-ink-soft space-y-2">
          <History size={32} className="mx-auto text-ink-soft/40" />
          <p className="font-semibold text-ink">No consultation records found for this patient.</p>
          <p>Visits will appear here once consultations are initiated and closed by a doctor.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
            <Calendar size={18} className="text-brand" /> Visit History Timeline ({consultations.length})
          </h3>

          <div className="space-y-6 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-border/70">
            {consultations.map((consult, index) => {
              const consultId = consult._id || consult.id;
              const dateStr = consult.createdAt
                ? new Date(consult.createdAt).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A';

              // Filter sub-records for this specific consultation visit
              const visitDiagnoses = diagnoses.filter(
                (d) => (d.consultation?._id || d.consultation) === consultId
              );
              const visitPlans = treatmentPlans.filter(
                (p) => (p.consultation?._id || p.consultation) === consultId
              );
              const visitRx = prescriptions.filter(
                (r) => (r.consultation?._id || r.consultation) === consultId
              );
              const visitInvestigations = investigations.filter(
                (i) => (i.consultation?._id || i.consultation) === consultId
              );

              return (
                <div key={consultId} className="relative pl-10">
                  {/* Timeline Dot */}
                  <div className="absolute left-2 top-4 -translate-x-1/2 h-5 w-5 rounded-full border-2 border-brand bg-surface flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-brand" />
                  </div>

                  <div className="card p-5 space-y-4 hover:border-brand/30 transition-colors">
                    {/* Visit Header Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-base font-bold text-ink">{dateStr}</span>
                          <span
                            className={`badge border ${
                              consult.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-purple-100 text-purple-800 border-purple-200'
                            }`}
                          >
                            {consult.status}
                          </span>
                        </div>
                        <p className="text-xs text-ink-soft mt-0.5">
                          Attending Doctor: <strong>Dr. {consult.doctor?.name || 'Doctor'}</strong>{' '}
                          {consult.doctor?.specialization ? `(${consult.doctor.specialization})` : ''}
                        </p>
                      </div>

                      <Link
                        to={`/doctor/consultation/${consultId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        View Full Workspace <ArrowRight size={14} />
                      </Link>
                    </div>

                    {/* Content Section: Diagnoses */}
                    {visitDiagnoses.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-ink-soft uppercase tracking-wider block">
                          Diagnoses ({visitDiagnoses.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {visitDiagnoses.map((d) => (
                            <div key={d._id} className="p-2.5 rounded-xl border border-border bg-bg/40 text-xs">
                              <p className="font-bold text-ink">{d.diagnosis}</p>
                              {d.severity && (
                                <span className="badge bg-blue-100 text-blue-800 border border-blue-200 text-[10px] mt-1">
                                  {d.severity}
                                </span>
                              )}
                              {d.relatedTeeth?.length > 0 && (
                                <p className="text-[11px] text-ink-soft mt-1 font-mono">
                                  Teeth: #{d.relatedTeeth.join(', #')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Section: Treatment Plans */}
                    {visitPlans.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-ink-soft uppercase tracking-wider block">
                          Treatment Procedures ({visitPlans.length}):
                        </span>
                        <div className="space-y-2">
                          {visitPlans.map((tp) => (
                            <div
                              key={tp._id}
                              className="p-3 rounded-xl border border-border bg-surface text-xs flex items-center justify-between gap-2"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-ink">{tp.treatment}</span>
                                  {tp.tooth && (
                                    <span className="badge bg-brand-light/30 text-brand-dark font-mono text-[10px]">
                                      Tooth #{tp.tooth}
                                    </span>
                                  )}
                                </div>
                                {tp.description && (
                                  <p className="text-ink-soft text-[11px]">{tp.description}</p>
                                )}
                              </div>

                              <div className="text-right">
                                <span className="badge bg-slate-100 text-slate-800 border-slate-200 text-[10px]">
                                  {tp.status}
                                </span>
                                <p className="font-bold text-brand mt-0.5">₹{tp.estimatedCost || 0}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Section: Prescriptions */}
                    {visitRx.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-ink-soft uppercase tracking-wider block">
                          Prescriptions (Rx):
                        </span>
                        {visitRx.map((rx) => (
                          <div key={rx._id} className="p-3 rounded-xl border border-border bg-bg/30 text-xs space-y-1">
                            <p className="font-bold text-brand">Rx Medicines:</p>
                            <div className="flex flex-wrap gap-2">
                              {rx.medicines?.map((m, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 rounded-md bg-surface border border-border text-[11px] font-semibold"
                                >
                                  {m.medicine} ({m.dosage}) - {m.frequency}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content Section: Investigations */}
                    {visitInvestigations.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-ink-soft uppercase tracking-wider block">
                          Investigations & Lab Reports:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {visitInvestigations.map((inv) => (
                            <div key={inv._id} className="p-2.5 rounded-xl border border-border bg-surface text-xs">
                              <p className="font-bold text-ink">{inv.type}: {inv.reason}</p>
                              {inv.result ? (
                                <p className="text-emerald-700 text-[11px] mt-1">Result: {inv.result}</p>
                              ) : (
                                <p className="text-amber-700 text-[11px] italic mt-1">Pending lab results</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* READ-ONLY BILLING HISTORY SECTION */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <IndianRupee size={18} className="text-brand" /> Read-Only Patient Billing Overview
            </h3>
            <p className="text-xs text-ink-soft">
              Billing summary fetched from Reception invoices (Read-Only for Doctor).
            </p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <p className="text-xs text-ink-soft">No invoices generated for this patient yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft">
                <tr>
                  <th className="px-3 py-2">Invoice #</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Total Amount</th>
                  <th className="px-3 py-2">Paid Amount</th>
                  <th className="px-3 py-2">Balance</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {invoices.map((inv) => (
                  <tr key={inv._id || inv.id} className="hover:bg-bg/40">
                    <td className="px-3 py-2.5 font-mono font-bold text-brand">{inv.invoiceNumber || inv._id}</td>
                    <td className="px-3 py-2.5 text-ink-soft">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-ink">₹{inv.totalAmount || 0}</td>
                    <td className="px-3 py-2.5 text-emerald-700 font-semibold">₹{inv.paidAmount || 0}</td>
                    <td className="px-3 py-2.5 text-rose-600 font-semibold">₹{inv.balance || 0}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`badge border ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
