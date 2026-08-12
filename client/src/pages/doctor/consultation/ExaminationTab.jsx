import { useState, useEffect } from 'react';
import { CheckCircle2, Save, AlertTriangle, FileText, Check, Shield } from 'lucide-react';
import api from '../../../api/axios.js';

const EXTRAORAL_OPTIONS = ['Facial Symmetry', 'TMJ', 'Lymph Nodes', 'Swelling'];

const SOFT_TISSUE_AREAS = [
  'Labial/Buccal Mucosa',
  'Tongue',
  'Floor of Mouth',
  'Gingiva',
  'Hard Palate',
  'Soft Palate',
];

const GINGIVAL_OPTIONS = [
  'Healthy',
  'Gingivitis',
  'Periodontitis',
  'Enlargement',
  'Recession',
  'Bleeding on Probing',
];

export default function ExaminationTab({ consultation }) {
  const consultationId = consultation?._id || consultation?.id;
  const patientId = consultation?.patient?._id || consultation?.patient?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Extraoral state: array of { finding, notes }
  const [extraoral, setExtraoral] = useState([]);
  // Soft tissue state: array of { area, notes }
  const [softTissue, setSoftTissue] = useState([]);
  // Gingival findings state: array of selected strings
  const [gingivalFindings, setGingivalFindings] = useState([]);

  // Fetch existing examination for this consultation
  useEffect(() => {
    async function fetchExamination() {
      if (!consultationId) return;
      try {
        setLoading(true);
        const res = await api.get(`/examinations?consultation=${consultationId}`);
        const exam = res.data?.examination;
        if (exam) {
          setExtraoral(exam.extraoral || []);
          setSoftTissue(exam.softTissue || []);
          setGingivalFindings(exam.gingivalFindings || []);
        }
      } catch (err) {
        console.error('Failed to load examination:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchExamination();
  }, [consultationId]);

  // Extraoral handlers
  const isExtraoralSelected = (finding) => extraoral.some((e) => e.finding === finding);

  const toggleExtraoral = (finding) => {
    if (isExtraoralSelected(finding)) {
      setExtraoral(extraoral.filter((e) => e.finding !== finding));
    } else {
      setExtraoral([...extraoral, { finding, notes: '' }]);
    }
  };

  const updateExtraoralNotes = (finding, notes) => {
    setExtraoral(extraoral.map((e) => (e.finding === finding ? { ...e, notes } : e)));
  };

  // Soft tissue handlers
  const isSoftTissueSelected = (area) => softTissue.some((s) => s.area === area);

  const toggleSoftTissue = (area) => {
    if (isSoftTissueSelected(area)) {
      setSoftTissue(softTissue.filter((s) => s.area !== area));
    } else {
      setSoftTissue([...softTissue, { area, notes: '' }]);
    }
  };

  const updateSoftTissueNotes = (area, notes) => {
    setSoftTissue(softTissue.map((s) => (s.area === area ? { ...s, notes } : s)));
  };

  // Gingival findings handlers
  const toggleGingival = (finding) => {
    if (gingivalFindings.includes(finding)) {
      setGingivalFindings(gingivalFindings.filter((g) => g !== finding));
    } else {
      setGingivalFindings([...gingivalFindings, finding]);
    }
  };

  // Save handler (upserts single examination document per consultation)
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const payload = {
        consultation: consultationId,
        patient: patientId,
        extraoral,
        softTissue,
        gingivalFindings,
      };

      await api.post('/examinations', payload);
      setSuccessMessage('Clinical examination findings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save examination findings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-sm text-ink-soft">Loading examination data...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Save Success Banner */}
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

      {/* SECTION 1: EXTRAORAL EXAMINATION */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
            1. Extraoral Examination
          </h3>
          <p className="text-xs text-ink-soft">
            Select findings and enter clinical notes for facial symmetry, TMJ, lymph nodes, or swelling.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {EXTRAORAL_OPTIONS.map((finding) => {
            const selected = isExtraoralSelected(finding);
            return (
              <button
                type="button"
                key={finding}
                onClick={() => toggleExtraoral(finding)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  selected
                    ? 'border-brand bg-brand-light/30 text-brand-dark shadow-sm'
                    : 'border-border bg-surface text-ink-soft hover:bg-bg'
                }`}
              >
                <span>{finding}</span>
                {selected && <Check size={14} className="text-brand" />}
              </button>
            );
          })}
        </div>

        {/* Detailed notes for selected extraoral findings */}
        {extraoral.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border/60">
            <p className="text-xs font-semibold text-ink-soft">Extraoral Notes per Finding:</p>
            {extraoral.map((item) => (
              <div key={item.finding} className="space-y-1">
                <label className="block text-xs font-bold text-ink">{item.finding}</label>
                <input
                  type="text"
                  className="input-field py-1.5 text-xs"
                  placeholder={`Notes for ${item.finding}...`}
                  value={item.notes || ''}
                  onChange={(e) => updateExtraoralNotes(item.finding, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: INTRAORAL SOFT TISSUE */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
            2. Intraoral Soft Tissue Examination
          </h3>
          <p className="text-xs text-ink-soft">
            Check areas inspected or displaying lesions/abnormalities, and document observations.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {SOFT_TISSUE_AREAS.map((area) => {
            const selected = isSoftTissueSelected(area);
            return (
              <button
                type="button"
                key={area}
                onClick={() => toggleSoftTissue(area)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  selected
                    ? 'border-brand bg-brand-light/30 text-brand-dark shadow-sm'
                    : 'border-border bg-surface text-ink-soft hover:bg-bg'
                }`}
              >
                <span>{area}</span>
                {selected && <Check size={14} className="text-brand" />}
              </button>
            );
          })}
        </div>

        {/* Detailed notes for selected soft tissue areas */}
        {softTissue.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border/60">
            <p className="text-xs font-semibold text-ink-soft">Soft Tissue Inspection Notes:</p>
            {softTissue.map((item) => (
              <div key={item.area} className="space-y-1">
                <label className="block text-xs font-bold text-ink">{item.area}</label>
                <input
                  type="text"
                  className="input-field py-1.5 text-xs"
                  placeholder={`Observations for ${item.area}...`}
                  value={item.notes || ''}
                  onChange={(e) => updateSoftTissueNotes(item.area, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: GINGIVAL FINDINGS */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
            3. Gingival & Periodontal Findings
          </h3>
          <p className="text-xs text-ink-soft">
            Select all applicable periodontic condition descriptors.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {GINGIVAL_OPTIONS.map((finding) => {
            const selected = gingivalFindings.includes(finding);
            return (
              <button
                type="button"
                key={finding}
                onClick={() => toggleGingival(finding)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  selected
                    ? 'border-brand bg-brand-light/30 text-brand-dark shadow-sm'
                    : 'border-border bg-surface text-ink-soft hover:bg-bg'
                }`}
              >
                <span>{finding}</span>
                {selected && <Check size={14} className="text-brand" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* SAVE BUTTON BAR */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary px-6 py-2.5 text-xs flex items-center gap-2"
        >
          <Save size={16} />
          <span>{saving ? 'Saving Examination...' : 'Save Examination Findings'}</span>
        </button>
      </div>
    </form>
  );
}
