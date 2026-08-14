import { useState, useEffect } from 'react';
import {
  Activity, Plus, Trash2, Check, Stethoscope, Clock, ShieldCheck, Link2, Tag, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '../../../api/axios.js';
import DatePicker from '../../../components/common/DatePicker.jsx';
import ConfirmModal from '../../../components/common/ConfirmModal.jsx';
import { useNotification } from '../../../context/NotificationContext.jsx';

const STATUS_BADGE_CLASSES = {
  Planned: 'bg-slate-100 text-slate-800 border-slate-200',
  Approved: 'bg-blue-100 text-blue-800 border-blue-200',
  'In Progress': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

const PRIORITY_BADGE_CLASSES = {
  Normal: 'bg-blue-50 text-blue-700 border-blue-200',
  Low: 'bg-blue-50 text-blue-700 border-blue-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Urgent: 'bg-rose-50 text-rose-700 border-rose-200',
  High: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function TreatmentPlanTab({ consultation, isReadOnly = false }) {
  const consultationId = consultation?._id || consultation?.id;
  const patientId = consultation?.patient?._id || consultation?.patient?.id;
  const { showSuccess, showError } = useNotification();

  const [diagnoses, setDiagnoses] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [treatmentRecords, setTreatmentRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddDiagnosis, setShowAddDiagnosis] = useState(false);
  const [submittingDiag, setSubmittingDiag] = useState(false);
  const [diagText, setDiagText] = useState('');
  const [diagSeverity, setDiagSeverity] = useState('');
  const [diagFindings, setDiagFindings] = useState('');

  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [submittingRecord, setSubmittingRecord] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Delete confirmation state
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form State: Add Treatment Plan (Planned Treatment)
  const [planDiagnosisId, setPlanDiagnosisId] = useState('');
  const [planToothNumber, setPlanToothNumber] = useState('');
  const [planProcedure, setPlanProcedure] = useState('');
  const [planPriority, setPlanPriority] = useState('Normal');
  const [planEstimatedCost, setPlanEstimatedCost] = useState('');
  const [planEstimatedDuration, setPlanEstimatedDuration] = useState('1 sitting');
  const [planNotes, setPlanNotes] = useState('');

  // Form State: Add Treatment Record (Performed Treatment)
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordToothNumber, setRecordToothNumber] = useState('');
  const [recordProcedure, setRecordProcedure] = useState('');
  const [recordCharges, setRecordCharges] = useState('');
  const [recordActualDuration, setRecordActualDuration] = useState('30 mins');
  const [recordNextAppointment, setRecordNextAppointment] = useState('');

  const fetchData = async () => {
    if (!consultationId) return;
    try {
      setLoading(true);
      const [diagRes, plansRes, recordsRes] = await Promise.all([
        api.get(`/diagnoses?consultation=${consultationId}`).catch(() => ({ data: { diagnoses: [] } })),
        api.get(`/treatment-plans?consultation=${consultationId}`),
        api.get(`/treatment-records?consultation=${consultationId}`).catch(() => ({ data: { treatmentRecords: [] } })),
      ]);
      setDiagnoses(diagRes.data?.diagnoses || []);
      setTreatmentPlans(plansRes.data?.treatmentPlans || []);
      setTreatmentRecords(recordsRes.data?.treatmentRecords || []);
    } catch (err) {
      console.error('Failed to load consultation treatment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [consultationId]);

  // Quick Add Diagnosis Handler
  const handleQuickAddDiagnosis = async (e) => {
    e.preventDefault();
    if (isReadOnly || !diagText.trim()) return;
    setSubmittingDiag(true);
    try {
      await api.post('/diagnoses', {
        consultation: consultationId,
        patient: patientId,
        diagnosis: diagText.trim(),
        severity: diagSeverity || undefined,
        clinicalFindings: diagFindings ? diagFindings.trim() : '',
      });
      showSuccess('Diagnosis added successfully!');
      setDiagText('');
      setDiagSeverity('');
      setDiagFindings('');
      setShowAddDiagnosis(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to add diagnosis.');
    } finally {
      setSubmittingDiag(false);
    }
  };

  // When diagnosis selection changes, auto-fill tooth if linked
  const handleDiagnosisSelect = (diagId) => {
    setPlanDiagnosisId(diagId);
    if (!diagId) return;
    const selectedDiag = diagnoses.find((d) => (d._id || d.id) === diagId);
    if (selectedDiag && selectedDiag.tooth) {
      setPlanToothNumber(String(selectedDiag.tooth));
    }
  };

  // Handle Add Planned Treatment
  const handleAddPlan = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!planProcedure || !planProcedure.trim()) {
      showError('Procedure name is required.');
      return;
    }

    setSubmittingPlan(true);
    try {
      const payload = {
        consultation: consultationId,
        patient: patientId,
        diagnosis: planDiagnosisId || undefined,
        tooth: planToothNumber ? Number(planToothNumber) : null,
        treatment: planProcedure.trim(),
        estimatedCost: Number(planEstimatedCost) || 0,
        estimatedDuration: planEstimatedDuration ? planEstimatedDuration.trim() : '1 sitting',
        priority: planPriority,
        notes: planNotes ? planNotes.trim() : '',
        status: 'Planned',
      };

      await api.post('/treatment-plans', payload);
      showSuccess('Planned treatment added successfully!');

      setPlanDiagnosisId('');
      setPlanToothNumber('');
      setPlanProcedure('');
      setPlanPriority('Normal');
      setPlanEstimatedCost('');
      setPlanEstimatedDuration('1 sitting');
      setPlanNotes('');

      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to add treatment plan.');
    } finally {
      setSubmittingPlan(false);
    }
  };

  // Handle Add Performed Treatment Record
  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!recordProcedure || !recordProcedure.trim()) {
      showError('Procedure name is required for treatment record.');
      return;
    }

    setSubmittingRecord(true);
    try {
      const payload = {
        consultation: consultationId,
        patient: patientId,
        date: recordDate ? new Date(recordDate) : new Date(),
        tooth: recordToothNumber ? Number(recordToothNumber) : null,
        procedure: recordProcedure.trim(),
        charges: Number(recordCharges) || 0,
        actualDuration: recordActualDuration ? recordActualDuration.trim() : '30 mins',
        nextAppointment: recordNextAppointment ? new Date(recordNextAppointment) : null,
      };

      await api.post('/treatment-records', payload);
      showSuccess('Performed treatment record logged successfully!');

      setRecordToothNumber('');
      setRecordProcedure('');
      setRecordCharges('');
      setRecordActualDuration('30 mins');
      setRecordNextAppointment('');

      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to log treatment record.');
    } finally {
      setSubmittingRecord(false);
    }
  };

  // Status Change for Planned Treatment
  const handleStatusChange = async (planId, newStatus) => {
    if (isReadOnly) return;
    setUpdatingId(planId);
    try {
      await api.patch(`/treatment-plans/${planId}`, { status: newStatus });
      showSuccess(
        newStatus === 'Completed'
          ? 'Treatment marked as Completed!'
          : `Treatment plan status updated to ${newStatus}.`
      );
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update plan status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmDeletePlan = async () => {
    if (!deletingPlan || isReadOnly) return;
    setDeleteLoading(true);
    const planId = deletingPlan._id || deletingPlan.id;
    try {
      await api.delete(`/treatment-plans/${planId}`);
      showSuccess('Treatment plan deleted successfully.');
      setTreatmentPlans((prev) => prev.filter((p) => (p._id || p.id) !== planId));
      setDeletingPlan(null);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete treatment plan.');
      setDeletingPlan(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDeleteRecord = async () => {
    if (!deletingRecord || isReadOnly) return;
    setDeleteLoading(true);
    const recId = deletingRecord._id || deletingRecord.id;
    try {
      await api.delete(`/treatment-records/${recId}`);
      showSuccess('Treatment record deleted successfully.');
      setTreatmentRecords((prev) => prev.filter((r) => (r._id || r.id) !== recId));
      setDeletingRecord(null);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete treatment record.');
      setDeletingRecord(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Totals calculations
  const totalEstimatedCharges = treatmentPlans.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
  const totalPerformedCharges = treatmentRecords.reduce((sum, r) => sum + (r.charges || 0), 0);

  // Formatted duration totals summary
  const estimatedDurationsList = treatmentPlans.map((p) => p.estimatedDuration).filter(Boolean);
  const performedDurationsList = treatmentRecords.map((r) => r.actualDuration).filter(Boolean);

  return (
    <div className="space-y-8 text-xs">
      {/* CONTINUOUS WORKFLOW SECTION 0: VISIT DIAGNOSES SUMMARY */}
      <div className="card p-4 space-y-3 bg-brand-soft/20 border-brand-light/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-brand" />
            <h4 className="font-display font-bold text-ink text-xs uppercase tracking-wider">
              Visit Diagnoses ({diagnoses.length})
            </h4>
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setShowAddDiagnosis(!showAddDiagnosis)}
              className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
            >
              {showAddDiagnosis ? <ChevronUp size={14} /> : <Plus size={14} />}
              <span>{showAddDiagnosis ? 'Hide Add Diagnosis' : 'Quick Add Diagnosis'}</span>
            </button>
          )}
        </div>

        {/* Saved Visit Diagnoses Badges */}
        {diagnoses.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {diagnoses.map((d) => (
              <span
                key={d._id || d.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface border border-border text-xs font-medium text-ink shadow-2xs"
              >
                <Tag size={12} className="text-brand" />
                <span className="font-bold">{d.diagnosis}</span>
                {d.severity && (
                  <span className="text-[10px] font-semibold text-brand px-1 bg-brand-light/30 rounded">
                    {d.severity}
                  </span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-ink-soft italic text-xs">No clinical diagnoses logged yet for this visit.</p>
        )}

        {/* Quick Add Diagnosis Panel */}
        {showAddDiagnosis && !isReadOnly && (
          <form onSubmit={handleQuickAddDiagnosis} className="pt-2 border-t border-brand-light/40 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  required
                  className="input-field py-1 text-xs"
                  placeholder="Diagnosis Title (e.g. Irreversible Pulpitis, Dental Caries)"
                  value={diagText}
                  onChange={(e) => setDiagText(e.target.value)}
                />
              </div>
              <div>
                <select
                  className="input-field py-1 text-xs"
                  value={diagSeverity}
                  onChange={(e) => setDiagSeverity(e.target.value)}
                >
                  <option value="">Severity (Optional)</option>
                  <option value="Mild">Mild</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={submittingDiag} className="btn-primary py-1 px-3 text-xs">
                {submittingDiag ? 'Saving...' : 'Save Diagnosis'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* SECTION 1: TREATMENT PLAN (INTENDED / PLANNED) */}
      <div className="space-y-4">
        <div className="border-b border-border pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2 uppercase tracking-wider">
              <Activity size={18} className="text-brand" /> 1. Treatment Plan (Diagnosis → Intended Plan)
            </h3>
            <p className="text-xs text-ink-soft">
              Link treatments traceably to saved visit diagnoses, with estimated cost & duration.
            </p>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-[11px] text-ink-soft block">Est. Duration:</span>
              <span className="font-bold text-ink font-mono text-xs">
                {estimatedDurationsList.length > 0 ? estimatedDurationsList.join(', ') : '—'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-ink-soft block">Total Est. Charges:</span>
              <span className="font-bold text-brand font-mono text-sm">₹{totalEstimatedCharges.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Form: Add Treatment Plan */}
        {!isReadOnly && (
          <div className="card p-4 space-y-3 bg-surface border-border">
            <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <Plus size={14} className="text-brand" /> Add Planned Treatment Item
            </h4>
            <form onSubmit={handleAddPlan} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Linked Diagnosis Dropdown */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-ink-soft mb-1 flex items-center gap-1">
                    <Link2 size={13} className="text-brand" /> Linked Diagnosis *
                  </label>
                  <select
                    className="input-field text-xs"
                    value={planDiagnosisId}
                    onChange={(e) => handleDiagnosisSelect(e.target.value)}
                  >
                    <option value="">Select Diagnosis for this Visit</option>
                    {diagnoses.map((d) => (
                      <option key={d._id || d.id} value={d._id || d.id}>
                        {d.tooth ? `Tooth #${d.tooth}: ` : ''}{d.diagnosis} ({d.severity || 'Moderate'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Tooth No.</label>
                  <input
                    type="number"
                    className="input-field font-mono text-xs"
                    placeholder="e.g. 16"
                    value={planToothNumber}
                    onChange={(e) => setPlanToothNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Priority</label>
                  <select
                    className="input-field text-xs"
                    value={planPriority}
                    onChange={(e) => setPlanPriority(e.target.value)}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-ink-soft mb-1">Planned Procedure *</label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    placeholder="e.g. Root Canal Therapy, Scaling, Crown Fit"
                    value={planProcedure}
                    onChange={(e) => setPlanProcedure(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Est. Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field font-mono text-xs"
                    placeholder="e.g. 8000"
                    value={planEstimatedCost}
                    onChange={(e) => setPlanEstimatedCost(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1 flex items-center gap-1">
                    <Clock size={13} className="text-ink-soft" /> Est. Duration
                  </label>
                  <select
                    className="input-field text-xs font-medium"
                    value={planEstimatedDuration}
                    onChange={(e) => setPlanEstimatedDuration(e.target.value)}
                  >
                    <option value="1 sitting">1 sitting (30 mins)</option>
                    <option value="2 sittings">2 sittings</option>
                    <option value="3 sittings">3 sittings</option>
                    <option value="45 mins">45 mins</option>
                    <option value="60 mins">60 mins</option>
                    <option value="90 mins">90 mins</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Clinical Notes</label>
                <input
                  type="text"
                  className="input-field text-xs"
                  placeholder="Notes, procedure details, or instructions..."
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-1">
                <button type="submit" disabled={submittingPlan} className="btn-primary py-2 text-xs">
                  <Plus size={14} />
                  <span>{submittingPlan ? 'Adding...' : 'Add Treatment Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table: Treatment Plan List */}
        <div className="card overflow-hidden border border-border">
          <div className="px-4 py-3 border-b border-border bg-bg/40 font-display text-xs font-bold text-ink">
            Planned Treatments ({treatmentPlans.length})
          </div>

          {loading ? (
            <div className="p-6 text-center text-xs text-ink-soft">Loading treatment plans...</div>
          ) : treatmentPlans.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-soft">No planned treatments recorded for this visit.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Linked Diagnosis</th>
                    <th className="px-4 py-3">Tooth</th>
                    <th className="px-4 py-3">Procedure</th>
                    <th className="px-4 py-3">Est. Duration</th>
                    <th className="px-4 py-3">Est. Charges</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {treatmentPlans.map((plan) => {
                    const planId = plan._id || plan.id;
                    const linkedDiag = plan.diagnosis
                      ? typeof plan.diagnosis === 'object'
                        ? plan.diagnosis.diagnosis
                        : 'Linked'
                      : null;

                    return (
                      <tr key={planId} className="hover:bg-bg/40 transition-colors">
                        <td className="px-4 py-3">
                          {linkedDiag ? (
                            <span className="badge bg-brand-soft text-brand border border-brand/20 font-medium text-[11px]">
                              {linkedDiag}
                            </span>
                          ) : (
                            <span className="text-ink-soft italic text-[11px]">Unlinked</span>
                          )}
                        </td>

                        <td className="px-4 py-3 font-mono font-bold text-ink">
                          {plan.tooth ? `#${plan.tooth}` : 'General'}
                        </td>

                        <td className="px-4 py-3 font-semibold text-ink">
                          {plan.treatment}
                          {plan.notes && <span className="block text-[11px] text-ink-soft italic font-normal">{plan.notes}</span>}
                        </td>

                        <td className="px-4 py-3 font-medium text-ink-soft">
                          {plan.estimatedDuration || '1 sitting'}
                        </td>

                        <td className="px-4 py-3 font-mono font-bold text-brand">
                          ₹{plan.estimatedCost?.toLocaleString() || 0}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`badge border ${STATUS_BADGE_CLASSES[plan.status] || 'bg-slate-100 text-slate-800'}`}>
                            {plan.status || 'Planned'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          {!isReadOnly && (
                            <div className="flex items-center justify-end gap-1.5">
                              {plan.status !== 'Completed' && (
                                <button
                                  type="button"
                                  disabled={updatingId === planId}
                                  onClick={() => handleStatusChange(planId, 'Completed')}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100"
                                >
                                  <Check size={12} /> Mark Completed
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setDeletingPlan(plan)}
                                title="Delete Plan"
                                className="p-1 text-ink-soft hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
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

      {/* SECTION 2: TREATMENT RECORD (ACTUALLY PERFORMED) */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="border-b border-border pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2 uppercase tracking-wider">
              <Activity size={18} className="text-emerald-600" /> 2. Treatment Record (Actually Performed)
            </h3>
            <p className="text-xs text-ink-soft">
              Record procedures that were completed during this visit with actual duration and charges.
            </p>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-[11px] text-ink-soft block">Actual Duration:</span>
              <span className="font-bold text-ink font-mono text-xs">
                {performedDurationsList.length > 0 ? performedDurationsList.join(', ') : '—'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-ink-soft block">Total Performed Charges:</span>
              <span className="font-bold text-emerald-700 font-mono text-sm">₹{totalPerformedCharges.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Form: Add Treatment Record */}
        {!isReadOnly && (
          <div className="card p-4 space-y-3 bg-surface border-border">
            <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <Plus size={14} className="text-emerald-600" /> Log Completed Procedure Record
            </h4>
            <form onSubmit={handleAddRecord} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div>
                  <DatePicker
                    label="Date"
                    value={recordDate}
                    onChange={(date, dateStr) => setRecordDate(dateStr)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Tooth No</label>
                  <input
                    type="number"
                    className="input-field font-mono text-xs"
                    placeholder="e.g. 16"
                    value={recordToothNumber}
                    onChange={(e) => setRecordToothNumber(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-ink-soft mb-1">Procedure Performed *</label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    placeholder="e.g. RCT Access & Preparation, Scaling"
                    value={recordProcedure}
                    onChange={(e) => setRecordProcedure(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field font-mono text-xs"
                    placeholder="e.g. 8000"
                    value={recordCharges}
                    onChange={(e) => setRecordCharges(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1 flex items-center gap-1">
                    <Clock size={13} className="text-emerald-600" /> Actual Duration
                  </label>
                  <select
                    className="input-field text-xs font-medium"
                    value={recordActualDuration}
                    onChange={(e) => setRecordActualDuration(e.target.value)}
                  >
                    <option value="15 mins">15 mins</option>
                    <option value="30 mins">30 mins</option>
                    <option value="45 mins">45 mins</option>
                    <option value="60 mins">60 mins</option>
                    <option value="90 mins">90 mins</option>
                    <option value="1 sitting">1 sitting</option>
                  </select>
                </div>

                <div>
                  <DatePicker
                    label="Next Recall / Appointment"
                    value={recordNextAppointment}
                    onChange={(date, dateStr) => setRecordNextAppointment(dateStr)}
                    minDate={new Date()}
                  />
                </div>

                <div className="flex items-end justify-end">
                  <button type="submit" disabled={submittingRecord} className="btn-primary py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus size={14} />
                    <span>{submittingRecord ? 'Logging...' : 'Log Treatment Record'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Table: Treatment Record List */}
        <div className="card overflow-hidden border border-border">
          <div className="px-4 py-3 border-b border-border bg-bg/40 font-display text-xs font-bold text-ink">
            Performed Treatment Records ({treatmentRecords.length})
          </div>

          {loading ? (
            <div className="p-6 text-center text-xs text-ink-soft">Loading treatment records...</div>
          ) : treatmentRecords.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-soft">No performed treatment records logged for this visit.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Tooth No</th>
                    <th className="px-4 py-3">Procedure Performed</th>
                    <th className="px-4 py-3">Actual Duration</th>
                    <th className="px-4 py-3">Charges</th>
                    <th className="px-4 py-3">Next Appointment</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {treatmentRecords.map((rec) => {
                    const recId = rec._id || rec.id;
                    const dateDisplay = rec.date
                      ? new Date(rec.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'N/A';
                    const nextAptDisplay = rec.nextAppointment
                      ? new Date(rec.nextAppointment).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—';

                    return (
                      <tr key={recId} className="hover:bg-bg/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">{dateDisplay}</td>

                        <td className="px-4 py-3 font-mono font-bold text-ink">
                          {rec.tooth ? `#${rec.tooth}` : 'General'}
                        </td>

                        <td className="px-4 py-3 font-bold text-ink">{rec.procedure}</td>

                        <td className="px-4 py-3 text-ink-soft font-medium">{rec.actualDuration || '30 mins'}</td>

                        <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                          ₹{rec.charges?.toLocaleString() || 0}
                        </td>

                        <td className="px-4 py-3 text-ink-soft font-mono">{nextAptDisplay}</td>

                        <td className="px-4 py-3 text-right">
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => setDeletingRecord(rec)}
                              title="Delete Record"
                              className="p-1 text-ink-soft hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
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

      {/* CONFIRM DELETE PLAN MODAL */}
      <ConfirmModal
        isOpen={Boolean(deletingPlan)}
        onClose={() => setDeletingPlan(null)}
        onConfirm={confirmDeletePlan}
        title="Confirm Delete Treatment Plan"
        message={
          deletingPlan ? (
            <p className="text-xs">
              Are you sure you want to delete planned treatment{' '}
              <strong className="text-ink font-bold font-mono">"{deletingPlan.treatment}"</strong>?
            </p>
          ) : (
            'Are you sure you want to delete this treatment plan?'
          )
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleteLoading}
      />

      {/* CONFIRM DELETE RECORD MODAL */}
      <ConfirmModal
        isOpen={Boolean(deletingRecord)}
        onClose={() => setDeletingRecord(null)}
        onConfirm={confirmDeleteRecord}
        title="Confirm Delete Performed Treatment Record"
        message={
          deletingRecord ? (
            <p className="text-xs">
              Are you sure you want to delete performed procedure{' '}
              <strong className="text-ink font-bold font-mono">"{deletingRecord.procedure}"</strong>?
            </p>
          ) : (
            'Are you sure you want to delete this treatment record?'
          )
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
