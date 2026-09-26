import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar, Clock, UserCheck, Stethoscope, FileText, Save, X, RefreshCw, AlertCircle, CalendarCheck
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

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    recommendedDate: '',
    time: '10:00 AM',
    doctor: '',
    reason: '',
    instructions: '',
    treatmentStatus: '',
    notes: '',
  });

  // Fetch doctors list
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await api.get('/users?role=doctor');
        setDoctors(res.data?.users || []);
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    }
    fetchDoctors();
  }, []);

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
    const docId = followUp.doctor?._id || followUp.doctor?.id || followUp.doctor || '';

    setFormData({
      recommendedDate: dateVal,
      time: timeVal,
      doctor: docId,
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
        doctor: formData.doctor || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-xs animate-fadeIn overflow-hidden">
      <div className="card w-full max-w-xl max-h-[calc(100vh-2rem)] flex flex-col bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
              <CalendarCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-base font-bold text-ink">Edit Follow-Up Record</h3>
                <span className="badge bg-purple-100 text-purple-900 font-mono font-bold text-[10px]">
                  OP #{opNo}
                </span>
              </div>
              <p className="text-xs text-ink-soft">
                Patient: <span className="font-bold text-ink">{patientDisplayName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-bg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs scrollbar-none no-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Follow-Up Date <span className="text-rose-600">*</span>
              </label>
              <DatePicker
                required
                value={formData.recommendedDate}
                onChange={(d, dStr) => setFormData((prev) => ({ ...prev, recommendedDate: dStr }))}
                inputClassName="py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Time Slot
              </label>
              <SplitTimeInput
                value={formData.time}
                onChange={(newTime) => setFormData((prev) => ({ ...prev, time: newTime }))}
              />
            </div>
          </div>

          {/* Assigned Doctor */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Assigned Doctor
            </label>
            <select
              value={formData.doctor}
              onChange={(e) => setFormData((prev) => ({ ...prev, doctor: e.target.value }))}
              className="input-field py-1.5 text-xs"
            >
              <option value="">Select Doctor...</option>
              {doctors.map((doc) => (
                <option key={doc._id || doc.id} value={doc._id || doc.id}>
                  Dr. {doc.name} {doc.specialization ? `(${doc.specialization})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Reason / Procedure */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Reason / Recommended Procedure
            </label>
            <EditableCombobox
              options={FOLLOW_UP_REASONS}
              value={formData.reason}
              onChange={(val) => setFormData((prev) => ({ ...prev, reason: capitalizeWords(val) }))}
              placeholder="e.g. Suture Removal, Crown Fitting, Review..."
              inputClassName="py-1.5 text-xs"
            />
          </div>

          {/* Treatment Status Tag */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Treatment Stage / Status
            </label>
            <select
              value={formData.treatmentStatus}
              onChange={(e) => setFormData((prev) => ({ ...prev, treatmentStatus: e.target.value }))}
              className="input-field py-1.5 text-xs"
            >
              <option value="">Select Stage...</option>
              {PROCEDURE_TREATMENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Clinical Instructions */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Clinical Instructions
            </label>
            <textarea
              rows={2}
              value={formData.instructions}
              onChange={(e) => setFormData((prev) => ({ ...prev, instructions: capitalizeWords(e.target.value) }))}
              placeholder="Instructions for patient or receptionist..."
              className="input-field text-xs py-1.5"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Internal Clinical Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: capitalizeWords(e.target.value) }))}
              placeholder="Additional internal notes..."
              className="input-field text-xs py-1.5"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-bg/40 shrink-0">
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
            className="btn-primary py-1.5 px-5 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
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
