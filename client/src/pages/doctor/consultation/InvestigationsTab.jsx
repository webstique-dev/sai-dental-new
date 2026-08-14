import { useState, useEffect } from 'react';
import { Search, Save, Check } from 'lucide-react';
import api from '../../../api/axios.js';
import { useNotification } from '../../../context/NotificationContext.jsx';

const INVESTIGATION_TYPES = ['RVG / IOPA', 'OPG', 'CBCT', 'Other'];

export default function InvestigationsTab({ consultation, isReadOnly = false }) {
  const consultationId = consultation?._id || consultation?.id;
  const patientId = consultation?.patient?._id || consultation?.patient?.id;
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Selected investigation types array: ['RVG / IOPA', 'OPG', ...]
  const [selectedTypes, setSelectedTypes] = useState([]);
  // Other investigation custom text
  const [otherText, setOtherText] = useState('');
  // Object mapping type -> optional details text: { 'RVG / IOPA': 'IOPA taken for tooth 36' }
  const [investigationDetails, setInvestigationDetails] = useState({});
  // Overall findings notes
  const [findings, setFindings] = useState('');

  // Fetch investigations for this consultation
  useEffect(() => {
    async function fetchInvestigations() {
      if (!consultationId) return;
      try {
        setLoading(true);
        const res = await api.get(`/investigations?consultation=${consultationId}`);
        const list = res.data?.investigations || [];
        if (list.length > 0) {
          const doc = list.find((i) => i.selectedTypes && i.selectedTypes.length > 0) || list[0];
          if (doc) {
            setSelectedTypes(doc.selectedTypes || (doc.type ? [doc.type] : []));
            setOtherText(doc.otherText || '');
            setInvestigationDetails(doc.investigationDetails || {});
            setFindings(doc.findings || doc.result || doc.notes || '');
          }
        }
      } catch (err) {
        console.error('Failed to load investigations:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvestigations();
  }, [consultationId]);

  const isTypeSelected = (type) => selectedTypes.includes(type);

  const toggleType = (type) => {
    if (isReadOnly) return;
    if (isTypeSelected(type)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleDetailChange = (type, detailValue) => {
    if (isReadOnly) return;
    setInvestigationDetails({
      ...investigationDetails,
      [type]: detailValue,
    });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;
    setSaving(true);
    try {
      const payload = {
        consultation: consultationId,
        patient: patientId,
        selectedTypes,
        otherText: isTypeSelected('Other') ? otherText.trim() : '',
        investigationDetails,
        findings: findings ? findings.trim() : '',
      };

      await api.post('/investigations', payload);
      showSuccess('Investigation findings saved successfully!');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save investigations.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-sm text-ink-soft">Loading investigations data...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 1. INVESTIGATIONS SELECTOR */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <Search size={18} className="text-brand" /> 1. Investigations
          </h3>
          <p className="text-xs text-ink-soft">
            Select required diagnostic investigations and enter detail observations per investigation.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {INVESTIGATION_TYPES.map((type) => {
            const selected = isTypeSelected(type);
            return (
              <button
                type="button"
                key={type}
                disabled={isReadOnly}
                onClick={() => toggleType(type)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  selected
                    ? 'border-brand bg-brand-light/30 text-brand-dark shadow-sm'
                    : 'border-border bg-surface text-ink-soft hover:bg-bg'
                } ${isReadOnly ? 'cursor-not-allowed opacity-90' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selected ? 'bg-brand border-brand text-white' : 'border-border bg-surface'}`}>
                    {selected && <Check size={11} />}
                  </span>
                  <span>{type}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Other Investigation Custom Input */}
        {isTypeSelected('Other') && (
          <div className="pt-2 border-t border-border/60">
            <label className="block text-xs font-bold text-ink mb-1">Other Investigation</label>
            <input
              type="text"
              disabled={isReadOnly}
              className="input-field text-xs py-1.5"
              placeholder="Enter custom investigation name..."
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
            />
          </div>
        )}

        {/* Investigation Details per selected type */}
        {selectedTypes.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-border/60">
            <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider">Investigation Details</h4>
            {selectedTypes.map((type) => (
              <div key={type} className="space-y-1">
                <label className="block text-xs font-bold text-ink">
                  {type === 'Other' && otherText ? `Other (${otherText})` : type} Details:
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  className="input-field py-1.5 text-xs"
                  placeholder={`e.g. Details for ${type}...`}
                  value={investigationDetails[type] || ''}
                  onChange={(e) => handleDetailChange(type, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. FINDINGS */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
            2. Findings
          </h3>
          <p className="text-xs text-ink-soft">
            Record radiographic observations, clinical findings, and diagnostic interpretations.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Findings Notes</label>
          <textarea
            rows={4}
            disabled={isReadOnly}
            className="input-field text-xs"
            placeholder="Enter findings from the investigation..."
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
          />
        </div>
      </div>

      {/* SAVE BUTTON BAR */}
      {!isReadOnly && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-6 py-2.5 text-xs flex items-center gap-2"
          >
            <Save size={16} />
            <span>{saving ? 'Saving Investigations...' : 'Save Investigations'}</span>
          </button>
        </div>
      )}
    </form>
  );
}
