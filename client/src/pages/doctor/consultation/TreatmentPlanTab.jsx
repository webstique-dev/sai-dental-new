import { useState, useEffect } from 'react';
import {
  Activity, Plus, Trash2, Check,
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

  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [treatmentRecords, setTreatmentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [submittingRecord, setSubmittingRecord] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Delete confirmation state
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form State: Add Treatment Plan (Planned Treatment)
  const [planToothNumber, setPlanToothNumber] = useState('');
  const [planProcedure, setPlanProcedure] = useState('');
  const [planPriority, setPlanPriority] = useState('Normal');
  const [planEstimatedCost, setPlanEstimatedCost] = useState('');
  const [planNotes, setPlanNotes] = useState('');

  // Form State: Add Treatment Record (Performed Treatment)
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordToothNumber, setRecordToothNumber] = useState('');
  const [recordProcedure, setRecordProcedure] = useState('');
  const [recordCharges, setRecordCharges] = useState('');
  const [recordNextAppointment, setRecordNextAppointment] = useState('');

  const fetchData = async () => {
    if (!consultationId) return;
    try {
      setLoading(true);
      const [plansRes, recordsRes] = await Promise.all([
        api.get(`/treatment-plans?consultation=${consultationId}`),
        api.get(`/treatment-records?consultation=${consultationId}`).catch(() => ({ data: { treatmentRecords: [] } })),
      ]);
      setTreatmentPlans(plansRes.data?.treatmentPlans || []);
      setTreatmentRecords(recordsRes.data?.treatmentRecords || []);
    } catch (err) {
      console.error('Failed to load treatment plans and records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [consultationId]);

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
        tooth: planToothNumber ? Number(planToothNumber) : null,
        treatment: planProcedure.trim(),
        estimatedCost: Number(planEstimatedCost) || 0,
        priority: planPriority,
        notes: planNotes ? planNotes.trim() : '',
        status: 'Planned',
      };

      await api.post('/treatment-plans', payload);
      showSuccess('Planned treatment added successfully!');

      setPlanToothNumber('');
      setPlanProcedure('');
      setPlanPriority('Normal');
      setPlanEstimatedCost('');
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
        nextAppointment: recordNextAppointment ? new Date(recordNextAppointment) : null,
      };

      await api.post('/treatment-records', payload);
      showSuccess('Performed treatment record logged successfully!');

      setRecordToothNumber('');
      setRecordProcedure('');
      setRecordCharges('');
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

  const totalEstimatedCharges = treatmentPlans.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
  const totalPerformedCharges = treatmentRecords.reduce((sum, r) => sum + (r.charges || 0), 0);

  return (
    <div className="space-y-8">
      {/* SECTION 1: TREATMENT PLAN (PLANNED TREATMENT) */}
      <div className="space-y-4">
        <div className="border-b border-border pb-2 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2 uppercase tracking-wider">
              <Activity size={18} className="text-brand" /> 1. Treatment Plan (Intended / Planned)
            </h3>
            <p className="text-xs text-ink-soft">
              Define intended procedures for future treatment steps.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-ink-soft">Total Estimated Charges: </span>
            <span className="font-bold text-brand font-mono text-sm">₹{totalEstimatedCharges.toLocaleString()}</span>
          </div>
        </div>

        {/* Form: Add Treatment Plan */}
        {!isReadOnly && (
          <div className="card p-4 space-y-3 bg-surface border-border">
            <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider">Add Treatment Plan</h4>
            <form onSubmit={handleAddPlan} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Tooth No.</label>
                  <input
                    type="number"
                    className="input-field font-mono"
                    placeholder="e.g. 16"
                    value={planToothNumber}
                    onChange={(e) => setPlanToothNumber(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-ink-soft mb-1">Procedure *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Root Canal Therapy, Scaling, Composite Filling"
                    value={planProcedure}
                    onChange={(e) => setPlanProcedure(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Priority</label>
                  <select
                    className="input-field"
                    value={planPriority}
                    onChange={(e) => setPlanPriority(e.target.value)}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Estimated Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field font-mono"
                    placeholder="e.g. 8000"
                    value={planEstimatedCost}
                    onChange={(e) => setPlanEstimatedCost(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-ink-soft mb-1">Notes</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Treatment details..."
                    value={planNotes}
                    onChange={(e) => setPlanNotes(e.target.value)}
                  />
                </div>
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
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-bg/40 font-display text-xs font-bold text-ink">
            Planned Treatments Table ({treatmentPlans.length})
          </div>

          {loading ? (
            <div className="p-6 text-center text-xs text-ink-soft">Loading treatment plans...</div>
          ) : treatmentPlans.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-soft">No planned treatments recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Tooth</th>
                    <th className="px-4 py-3">Procedure</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Estimated Charges</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {treatmentPlans.map((plan) => {
                    const planId = plan._id || plan.id;
                    return (
                      <tr key={planId} className="hover:bg-bg/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-ink">
                          {plan.tooth ? `#${plan.tooth}` : 'General'}
                        </td>

                        <td className="px-4 py-3 font-semibold text-ink">
                          {plan.treatment}
                          {plan.notes && <span className="block text-[11px] text-ink-soft italic font-normal">{plan.notes}</span>}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`badge border ${PRIORITY_BADGE_CLASSES[plan.priority] || 'bg-blue-50 text-blue-700'}`}>
                            {plan.priority || 'Normal'}
                          </span>
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

      {/* SECTION 2: TREATMENT RECORD (PERFORMED TREATMENT) */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="border-b border-border pb-2 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2 uppercase tracking-wider">
              <Activity size={18} className="text-emerald-600" /> 2. Treatment Record (Actually Performed)
            </h3>
            <p className="text-xs text-ink-soft">
              Record procedures that were actually completed during this visit.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-ink-soft">Total Performed Charges: </span>
            <span className="font-bold text-emerald-700 font-mono text-sm">₹{totalPerformedCharges.toLocaleString()}</span>
          </div>
        </div>

        {/* Form: Add Treatment Record */}
        {!isReadOnly && (
          <div className="card p-4 space-y-3 bg-surface border-border">
            <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider">Add Treatment Record</h4>
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
                    className="input-field font-mono"
                    placeholder="e.g. 16"
                    value={recordToothNumber}
                    onChange={(e) => setRecordToothNumber(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-ink-soft mb-1">Procedure *</label>
                  <input
                    type="text"
                    className="input-field"
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
                    className="input-field font-mono"
                    placeholder="e.g. 8000"
                    value={recordCharges}
                    onChange={(e) => setRecordCharges(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <DatePicker
                    label="Next Appointment"
                    value={recordNextAppointment}
                    onChange={(date, dateStr) => setRecordNextAppointment(dateStr)}
                    minDate={new Date()}
                  />
                </div>
                <div className="flex items-end justify-end">
                  <button type="submit" disabled={submittingRecord} className="btn-primary py-2 text-xs">
                    <Plus size={14} />
                    <span>{submittingRecord ? 'Logging...' : 'Add Treatment Record'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Table: Treatment Record List */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-bg/40 font-display text-xs font-bold text-ink">
            Performed Treatment Records Table ({treatmentRecords.length})
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
                    <th className="px-4 py-3">Procedure</th>
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
