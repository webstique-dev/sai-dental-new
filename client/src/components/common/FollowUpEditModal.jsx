import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar, Clock, Stethoscope, FileText, Save, X, RefreshCw, AlertCircle, CalendarCheck, Tag, StickyNote
} from 'lucide-react';
import api from '../../api/axios.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import DatePicker from './DatePicker.jsx';
import SplitTimeInput from './SplitTimeInput.jsx';
import EditableCombobox from './EditableCombobox.jsx';
import { formatPatientFullName, capitalizeWords } from '../../utils/formatters.js';
import { FOLLOW_UP_REASONS, PROCEDURE_TREATMENT_STATUSES } from '../../constants/followUpOptions.js';

export default function FollowUpEditModal({
  isOpen,
  followUp,
  patient,
  onClose,
  onSuccess,
}) {
  const { showSuccess, showError } = useNotification();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    recommendedDate: '',
    time: '10:00 AM',
    reason: '',
    instructions: '',
    treatmentStatus: '',
    notes: '',
  });

  // Initialize form data
  useEffect(() => {
    if (!isOpen || !followUp) return;

    let dateVal = '';
    if (followUp.recommendedDate) {
      dateVal = new Date(followUp.recommendedDate).toISOString().split('T')[0];
    } else if (followUp.date) {
      dateVal = new Date(followUp.date).toISOString().split('T')[0];
    }

    const timeVal = followUp.time || followUp.scheduledAppointment?.time || '10:00 AM';

    setFormData({
      recommendedDate: dateVal,
      time: timeVal,
      reason: followUp.reason || followUp.procedure || '',
      instructions: followUp.instructions || '',
      treatmentStatus: followUp.treatmentStatus || '',
      notes: followUp.notes || '',
    });
    setError('');
  }, [isOpen, followUp]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!followUp) return;

    const targetId = followUp._id || followUp.id;
    if (!formData.recommendedDate) {
      setError('Please select a follow-up date.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        recommendedDate: formData.recommendedDate,
        time: formData.time,
        doctor: followUp.doctor?._id || followUp.doctor?.id || followUp.doctor || undefined,
        reason: capitalizeWords((formData.reason || '').trim()),
        instructions: capitalizeWords((formData.instructions || '').trim()),
        treatmentStatus: formData.treatmentStatus || '',
        notes: capitalizeWords((formData.notes || '').trim()),
      };

      const res = await api.put(`/follow-ups/${targetId}`, payload);
      const updated = res.data?.followUp || {
        ...followUp,
        ...payload,
      };

      showSuccess('Follow-up record updated successfully.');
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      console.error('Failed to update follow-up:', err);
      const errMsg = err.response?.data?.message || 'Failed to update follow-up.';
      setError(errMsg);
      showError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const targetPatient = patient || followUp?.patient;
  const patientDisplayName = formatPatientFullName(targetPatient) || 'Patient';
  const opNo = targetPatient?.opNumber || followUp?.opNumber || 'N/A';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 sm:p-4 backdrop-blur-xs animate-fadeIn overflow-hidden">
      <div className="card w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
              <CalendarCheck size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-base font-bold text-ink truncate">Edit Follow-Up Record</h3>
                <span className="badge bg-purple-100 text-purple-900 border border-purple-200 font-mono font-bold text-[10px] shrink-0">
                  OP #{opNo}
                </span>
              </div>
              <p className="text-xs text-ink-soft truncate mt-0.5">
                Patient: <span className="font-bold text-ink">{patientDisplayName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-bg transition-colors cursor-pointer shrink-0 ml-2"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs scrollbar-none no-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2 animate-fadeIn">
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-brand" />
                <span>Follow-Up Date</span>
                <span className="text-rose-600 font-bold">*</span>
              </label>
              <DatePicker
                required
                value={formData.recommendedDate}
                onChange={(d, dStr) => setFormData((prev) => ({ ...prev, recommendedDate: dStr }))}
                inputClassName="py-1.5 text-xs h-[38px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1.5">
                <Clock size={13} className="text-brand" />
                <span>Time Slot</span>
              </label>
              <SplitTimeInput
                label=""
                value={formData.time}
                onChange={(newTime) => setFormData((prev) => ({ ...prev, time: newTime }))}
              />
            </div>
          </div>

          {/* Reason / Recommended Procedure */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1.5">
              <Stethoscope size={13} className="text-brand" />
              <span>Reason / Recommended Procedure</span>
            </label>
            <EditableCombobox
              options={FOLLOW_UP_REASONS}
              value={formData.reason}
              onChange={(val) => setFormData((prev) => ({ ...prev, reason: capitalizeWords(val) }))}
              placeholder="e.g. Suture Removal, Crown Fitting, Routine Review..."
              inputClassName="py-1.5 text-xs"
            />
          </div>

          {/* Treatment Stage / Status */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1.5">
              <Tag size={13} className="text-brand" />
              <span>Treatment Stage / Status</span>
            </label>
            <select
              value={formData.treatmentStatus}
              onChange={(e) => setFormData((prev) => ({ ...prev, treatmentStatus: e.target.value }))}
              className="input-field py-2 text-xs"
            >
              <option value="">Select Stage / Status (Optional)...</option>
              {PROCEDURE_TREATMENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Clinical Instructions */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1.5">
              <FileText size={13} className="text-brand" />
              <span>Clinical Instructions</span>
            </label>
            <textarea
              rows={2}
              value={formData.instructions}
              onChange={(e) => setFormData((prev) => ({ ...prev, instructions: capitalizeWords(e.target.value) }))}
              placeholder="Instructions for patient care or receptionist booking notes..."
              className="input-field text-xs py-2 resize-none"
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1.5">
              <StickyNote size={13} className="text-brand" />
              <span>Internal Clinical Notes</span>
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: capitalizeWords(e.target.value) }))}
              placeholder="Additional private notes for the clinical team..."
              className="input-field text-xs py-2 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border bg-bg/50 shrink-0">
          <button
            type="button"
            className="btn-secondary py-1.5 px-4 text-xs font-bold cursor-pointer"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary py-1.5 px-5 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving...' : 'Update Follow-Up'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
