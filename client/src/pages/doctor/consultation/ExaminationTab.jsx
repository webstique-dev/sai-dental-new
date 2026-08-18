import { useState, useEffect } from 'react';
import { Save, Check, FileHeart } from 'lucide-react';
import api from '../../../api/axios.js';
import { useNotification } from '../../../context/NotificationContext.jsx';

const EXTRAORAL_OPTIONS = ['Facial Symmetry', 'TMJ', 'Lymph Nodes', 'Swelling'];

const SOFT_TISSUE_AREAS = [
  'Labial / Buccal Mucosa',
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

export default function ExaminationTab({ consultation, isReadOnly = false }) {
  const consultationId = consultation?._id || consultation?.id;
  const patientId = consultation?.patient?._id || consultation?.patient?.id;
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Extraoral state: array of { finding, notes }
  const [extraoral, setExtraoral] = useState([]);
  // Soft tissue state: array of { area, notes }
  const [softTissue, setSoftTissue] = useState([]);
  // Gingival findings state: array of selected strings
  const [gingivalFindings, setGingivalFindings] = useState([]);
  // Periodontal details notes
  const [periodontalDetails, setPeriodontalDetails] = useState('');
  // Overall examination notes
  const [overallNotes, setOverallNotes] = useState('');

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
          setPeriodontalDetails(exam.periodontalDetails || '');
          setOverallNotes(exam.overallNotes || '');
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
    if (isReadOnly) return;
    if (isExtraoralSelected(finding)) {
      setExtraoral(extraoral.filter((e) => e.finding !== finding));
    } else {
      setExtraoral([...extraoral, { finding, notes: '' }]);
    }
  };

  const updateExtraoralNotes = (finding, notes) => {
    if (isReadOnly) return;
    setExtraoral(extraoral.map((e) => (e.finding === finding ? { ...e, notes } : e)));
  };

  // Soft tissue handlers
  const isSoftTissueSelected = (area) => softTissue.some((s) => s.area === area);

  const toggleSoftTissue = (area) => {
    if (isReadOnly) return;
    if (isSoftTissueSelected(area)) {
      setSoftTissue(softTissue.filter((s) => s.area !== area));
    } else {
      setSoftTissue([...softTissue, { area, notes: '' }]);
    }
  };

  const updateSoftTissueNotes = (area, notes) => {
    if (isReadOnly) return;
    setSoftTissue(softTissue.map((s) => (s.area === area ? { ...s, notes } : s)));
  };

  // Gingival findings handlers
  const toggleGingival = (finding) => {
    if (isReadOnly) return;
    if (gingivalFindings.includes(finding)) {
      setGingivalFindings(gingivalFindings.filter((g) => g !== finding));
    } else {
      setGingivalFindings([...gingivalFindings, finding]);
    }
  };

  // Save handler (upserts single examination document per consultation)
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;
    setSaving(true);
    try {
      const payload = {
        consultation: consultationId,
        patient: patientId,
        extraoral,
        softTissue,
        gingivalFindings,
        periodontalDetails,
        overallNotes,
      };

      await api.post('/examinations', payload);
      showSuccess('Clinical examination findings saved successfully!');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save examination findings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-sm text-ink-soft">Loading examination data...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* TOP SAVE ACTION BAR */}
      {!isReadOnly && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 card p-4 bg-surface border-brand/20 shadow-sm">
          <div>
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <FileHeart size={18} className="text-brand" /> Clinical Examination Findings
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Record extraoral, intraoral soft tissue, and periodontal findings below.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-5 py-2.5 text-xs flex items-center justify-center gap-2 font-bold shrink-0 shadow-sm"
          >
            <Save size={15} />
            <span>{saving ? 'Saving Examination...' : 'Save Examination Findings'}</span>
          </button>
        </div>
      )}

      {/* 1. EXTRAORAL EXAMINATION */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
            1. Extraoral Examination
          </h3>
          <p className="text-xs text-ink-soft">
            Select findings and enter clinical observations for extraoral structures.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {EXTRAORAL_OPTIONS.map((finding) => {
            const selected = isExtraoralSelected(finding);
            return (
              <button
                type="button"
                key={finding}
                disabled={isReadOnly}
                onClick={() => toggleExtraoral(finding)}
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
                  <span>{finding}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detailed notes for selected extraoral findings */}
        {extraoral.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border/60">
            <p className="text-xs font-semibold text-ink-soft">Additional Details per Extraoral Finding:</p>
            {extraoral.map((item) => (
              <div key={item.finding} className="space-y-1">
                <label className="block text-xs font-bold text-ink">{item.finding}</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  className="input-field py-1.5 text-xs"
                  placeholder={`e.g. Additional details for ${item.finding}...`}
                  value={item.notes || ''}
                  onChange={(e) => updateExtraoralNotes(item.finding, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. INTRAORAL SOFT TISSUE EXAMINATION */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
            2. Intraoral Soft Tissue Examination
          </h3>
          <p className="text-xs text-ink-soft">
            Inspect mucosal structures and document clinical observations.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {SOFT_TISSUE_AREAS.map((area) => {
            const selected = isSoftTissueSelected(area);
            return (
              <button
                type="button"
                key={area}
                disabled={isReadOnly}
                onClick={() => toggleSoftTissue(area)}
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
                  <span>{area}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detailed notes for selected soft tissue areas */}
        {softTissue.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border/60">
            <p className="text-xs font-semibold text-ink-soft">Additional Details per Soft Tissue Area:</p>
            {softTissue.map((item) => (
              <div key={item.area} className="space-y-1">
                <label className="block text-xs font-bold text-ink">{item.area}</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  className="input-field py-1.5 text-xs"
                  placeholder={`e.g. Additional details for ${item.area}...`}
                  value={item.notes || ''}
                  onChange={(e) => updateSoftTissueNotes(item.area, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. GINGIVAL & PERIODONTAL FINDINGS */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
            3. Gingival & Periodontal Findings
          </h3>
          <p className="text-xs text-ink-soft">
            Select periodontal status descriptors and enter clinical details.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {GINGIVAL_OPTIONS.map((finding) => {
            const selected = gingivalFindings.includes(finding);
            return (
              <button
                type="button"
                key={finding}
                disabled={isReadOnly}
                onClick={() => toggleGingival(finding)}
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
                  <span>{finding}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Clinical Details</label>
          <textarea
            rows={2}
            disabled={isReadOnly}
            className="input-field text-xs"
            placeholder="Additional periodontal observations..."
            value={periodontalDetails}
            onChange={(e) => setPeriodontalDetails(e.target.value)}
          />
        </div>
      </div>

      {/* 4. OVERALL EXAMINATION NOTES */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
            4. Overall Examination Notes
          </h3>
          <p className="text-xs text-ink-soft">
            Comprehensive diagnostic summary notes for clinical examination.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Overall Examination Notes</label>
          <textarea
            rows={4}
            disabled={isReadOnly}
            className="input-field text-xs"
            placeholder="Enter additional clinical observations..."
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
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
            <span>{saving ? 'Saving Examination...' : 'Save Examination Findings'}</span>
          </button>
        </div>
      )}
    </form>
  );
}
