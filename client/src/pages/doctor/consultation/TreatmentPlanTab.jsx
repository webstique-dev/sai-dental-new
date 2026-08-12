import { useState, useEffect } from 'react';
import {
  Activity, Plus, CheckCircle2, AlertTriangle, IndianRupee, Layers, Tag, ChevronRight, Sparkles, Check,
} from 'lucide-react';
import api from '../../../api/axios.js';

const STATUS_BADGE_CLASSES = {
  Planned: 'bg-slate-100 text-slate-800 border-slate-200',
  Approved: 'bg-blue-100 text-blue-800 border-blue-200',
  'In Progress': 'bg-purple-100 text-purple-800 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

const PRIORITY_BADGE_CLASSES = {
  Low: 'bg-blue-50 text-blue-700 border-blue-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  High: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function TreatmentPlanTab({ consultation, isReadOnly = false }) {
  const consultationId = consultation?._id || consultation?.id;
  const patientId = consultation?.patient?._id || consultation?.patient?.id;

  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [diagnosesOptions, setDiagnosesOptions] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState('');
  const [toothNumber, setToothNumber] = useState('');
  const [treatmentName, setTreatmentName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Planned');

  const fetchData = async () => {
    if (!consultationId) return;
    try {
      setLoading(true);
      const [plansRes, diagRes, catalogRes] = await Promise.all([
        api.get(`/treatment-plans?consultation=${consultationId}`),
        api.get(`/diagnoses?consultation=${consultationId}`),
        api.get('/treatments?active=true').catch(() => ({ data: { treatments: [] } })),
      ]);
      setTreatmentPlans(plansRes.data?.treatmentPlans || []);
      setDiagnosesOptions(diagRes.data?.diagnoses || []);
      setCatalogItems(catalogRes.data?.treatments || []);
    } catch (err) {
      console.error('Failed to load treatment plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [consultationId]);

  const handleAddPlan = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!treatmentName || !treatmentName.trim()) {
      setErrorMessage('Treatment name is required.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const payload = {
        consultation: consultationId,
        patient: patientId,
        diagnosis: selectedDiagnosisId || null,
        tooth: toothNumber ? Number(toothNumber) : null,
        treatment: treatmentName.trim(),
        description: description ? description.trim() : '',
        estimatedCost: Number(estimatedCost) || 0,
        priority,
        notes: notes ? notes.trim() : '',
        status,
      };

      await api.post('/treatment-plans', payload);
      setSuccessMessage('Treatment plan added successfully!');

      // Reset form
      setSelectedDiagnosisId('');
      setToothNumber('');
      setTreatmentName('');
      setDescription('');
      setEstimatedCost('');
      setPriority('Medium');
      setNotes('');
      setStatus('Planned');

      fetchData();
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to add treatment plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (planId, newStatus) => {
    if (isReadOnly) return;
    setUpdatingId(planId);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await api.patch(`/treatment-plans/${planId}`, { status: newStatus });
      setSuccessMessage(
        newStatus === 'Completed'
          ? 'Treatment completed! Updated status and pushed history to tooth chart.'
          : `Treatment plan status updated to ${newStatus}.`
      );
      fetchData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update plan status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalEstimatedCost = treatmentPlans.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800 border border-rose-200">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* FORM: ADD TREATMENT PLAN (Hidden when read-only) */}
      {!isReadOnly && (
        <div className="card p-5 space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Activity size={18} className="text-brand" /> Add Treatment Plan Procedure
            </h3>
            <p className="text-xs text-ink-soft">
              Define procedure steps, link to diagnosis/tooth, set priority, and estimate costs.
            </p>
          </div>

          <form onSubmit={handleAddPlan} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-ink-soft mb-1">Treatment Procedure Name *</label>
                <input
                  type="text"
                  list="doctor-treatment-catalog-list"
                  className="input-field"
                  placeholder="e.g. Root Canal Therapy, Composite Restoration, Scaling & Polishing"
                  value={treatmentName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTreatmentName(val);
                    const match = catalogItems.find((c) => c.name.toLowerCase() === val.toLowerCase());
                    if (match && match.defaultCost !== undefined) {
                      setEstimatedCost(match.defaultCost);
                    }
                  }}
                />
                <datalist id="doctor-treatment-catalog-list">
                  {catalogItems.map((item) => (
                    <option key={item._id || item.id} value={item.name}>
                      {item.category ? `[${item.category}] ` : ''}₹{item.defaultCost || 0}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Tooth Number (Optional)</label>
                <input
                  type="number"
                  className="input-field font-mono"
                  placeholder="e.g. 16"
                  value={toothNumber}
                  onChange={(e) => setToothNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Linked Diagnosis (Optional)</label>
                <select
                  className="input-field"
                  value={selectedDiagnosisId}
                  onChange={(e) => setSelectedDiagnosisId(e.target.value)}
                >
                  <option value="">Select Diagnosis (Optional)</option>
                  {diagnosesOptions.map((d) => {
                    const dId = d._id || d.id;
                    return (
                      <option key={dId} value={dId}>
                        {d.diagnosis} {d.relatedTeeth?.length ? `(Teeth: #${d.relatedTeeth.join(', #')})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Estimated Cost (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  placeholder="e.g. 2500"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Priority</label>
                <select
                  className="input-field"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Description / Procedure Steps</label>
                <textarea
                  rows={2}
                  className="input-field"
                  placeholder="Access cavity, biomechanical preparation, obturation details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Notes</label>
                <textarea
                  rows={2}
                  className="input-field"
                  placeholder="Post-procedure instructions or consent notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <label className="font-semibold text-ink-soft">Initial Status:</label>
                <select
                  className="input-field py-1 text-xs w-36"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Planned">Planned</option>
                  <option value="Approved">Approved</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <button type="submit" disabled={submitting} className="btn-primary">
                <Plus size={16} />
                <span>{submitting ? 'Adding Plan...' : 'Add Treatment Plan'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RUNNING LIST OF TREATMENT PLANS AS CARDS */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-ink">
              Treatment Plans for Current Visit ({treatmentPlans.length})
            </h3>
            <p className="text-xs text-ink-soft">
              Total Estimated Cost: <span className="font-bold text-brand text-sm">₹{totalEstimatedCost.toLocaleString()}</span>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-ink-soft">Loading treatment plans...</div>
        ) : treatmentPlans.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-soft space-y-2">
            <Activity size={28} className="mx-auto text-ink-soft/40" />
            <p className="font-semibold text-ink">No treatment plans recorded for this visit.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {treatmentPlans.map((plan) => {
              const planId = plan._id || plan.id;
              return (
                <div
                  key={planId}
                  className="rounded-xl border border-border p-4 bg-surface hover:border-brand/30 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display text-base font-bold text-ink">{plan.treatment}</h4>
                      {plan.tooth ? (
                        <span className="badge bg-brand-light/40 text-brand-dark border-brand-light font-mono font-bold">
                          Tooth #{plan.tooth}
                        </span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-700 border-slate-200">General</span>
                      )}

                      <span className={`badge border ${PRIORITY_BADGE_CLASSES[plan.priority] || ''}`}>
                        {plan.priority} Priority
                      </span>
                    </div>

                    <div className="text-right font-bold text-brand text-base">
                      ₹{plan.estimatedCost?.toLocaleString() || 0}
                    </div>
                  </div>

                  {plan.description && (
                    <p className="text-xs text-ink">{plan.description}</p>
                  )}

                  {plan.diagnosis && (
                    <div className="text-xs text-ink-soft bg-bg/50 p-2 rounded-lg border border-border/50">
                      <span className="font-semibold text-ink">Diagnosis: </span>
                      {plan.diagnosis.diagnosis}
                    </div>
                  )}

                  {plan.notes && (
                    <p className="text-[11px] text-ink-soft italic">Notes: {plan.notes}</p>
                  )}

                  {/* INLINE STATUS SELECTOR & CONTROLS */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-soft">Status:</span>
                      <span className={`badge border ${STATUS_BADGE_CLASSES[plan.status] || ''}`}>
                        {plan.status}
                      </span>
                    </div>

                    {!isReadOnly && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink-soft">Change Status:</span>
                        <select
                          disabled={updatingId === planId}
                          className="input-field py-1 text-xs font-semibold w-36"
                          value={plan.status}
                          onChange={(e) => handleStatusChange(planId, e.target.value)}
                        >
                          <option value="Planned">Planned</option>
                          <option value="Approved">Approved</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
