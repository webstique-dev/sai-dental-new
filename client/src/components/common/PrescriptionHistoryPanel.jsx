import { useState, useEffect } from 'react';
import { Pill, Calendar, User, Clock, FileText, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import api from '../../api/axios.js';
import { openPrescriptionPDFWindow } from '../../utils/prescriptionPdfGenerator.js';

export default function PrescriptionHistoryPanel({ patientId, title = "Prescription History & Medication Records" }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!patientId) return;

    const fetchPrescriptions = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/prescriptions?patient=${patientId}`);
        const list = res.data?.prescriptions || [];
        setPrescriptions(list);
        if (list.length > 0) {
          setExpandedId(list[0]._id || list[0].id);
        }
      } catch (err) {
        console.error('Failed to load patient prescriptions history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, [patientId]);

  const handlePrint = (e, rx) => {
    if (e) e.stopPropagation();
    openPrescriptionPDFWindow({ rx }, true);
  };

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
          <Pill size={18} className="text-brand" />
          <span>{title}</span>
        </h3>
        <span className="badge bg-brand-light/50 text-brand-dark font-mono text-xs font-bold">
          {prescriptions.length} {prescriptions.length === 1 ? 'Prescription' : 'Prescriptions'}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-8 text-center text-xs text-ink-soft">Loading prescription history...</div>
      ) : prescriptions.length === 0 ? (
        <div className="p-8 text-center space-y-2 border border-dashed border-border rounded-xl">
          <Pill size={32} className="mx-auto text-ink-soft/40" />
          <p className="font-semibold text-xs text-ink">No prescription history on record</p>
          <p className="text-[11px] text-ink-soft">
            Prescriptions generated during clinical consultations will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx, idx) => {
            const rxId = rx._id || rx.id;
            const isExpanded = expandedId === rxId;

            const dateStr = rx.createdAt
              ? new Date(rx.createdAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'N/A';

            const doctorName = rx.recordedBy?.name
              ? `Dr. ${rx.recordedBy.name}`
              : 'Attending Doctor';

            const medicines = rx.medicines || [];

            return (
              <div
                key={rxId || idx}
                className="rounded-xl border border-border bg-bg/40 overflow-hidden transition-colors"
              >
                {/* Header Row */}
                <div className="w-full p-3.5 flex items-center justify-between gap-3 bg-surface hover:bg-bg/60 transition-colors">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : rxId)}
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <div className="h-9 w-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-xs shrink-0">
                      #{prescriptions.length - idx}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-ink">{doctorName}</span>
                        <span className="text-[10px] text-ink-soft">• {dateStr}</span>
                      </div>
                      <p className="text-[11px] text-ink-soft font-medium line-clamp-1">
                        {medicines.length} medicine(s) prescribed: {medicines.map((m) => m.medicine).filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handlePrint(e, rx)}
                      className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 border-brand/30 text-brand hover:bg-brand-light/30 shadow-sm font-semibold"
                      title="Print Prescription PDF"
                    >
                      <Printer size={14} />
                      <span>Print</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : rxId)}
                      className="p-1.5 rounded-lg hover:bg-bg text-ink-soft hover:text-ink transition-colors flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <span>{isExpanded ? 'Hide' : 'Details'}</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 border-t border-border bg-surface space-y-3 text-xs">
                    {/* Medicines Table */}
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-bg/60 border-b border-border text-[10px] font-bold text-ink-soft uppercase">
                          <tr>
                            <th className="px-3 py-2">Medicine Name</th>
                            <th className="px-3 py-2">Dosage</th>
                            <th className="px-3 py-2">Frequency</th>
                            <th className="px-3 py-2">Duration</th>
                            <th className="px-3 py-2">Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {medicines.map((m, mIdx) => (
                            <tr key={mIdx} className="hover:bg-bg/30">
                              <td className="px-3 py-2 font-bold text-ink">{m.medicine || '—'}</td>
                              <td className="px-3 py-2 font-mono text-brand font-semibold">{m.dosage || '—'}</td>
                              <td className="px-3 py-2 text-ink">{m.frequency || '—'}</td>
                              <td className="px-3 py-2 text-ink">{m.duration || '—'}</td>
                              <td className="px-3 py-2 text-ink-soft italic">{m.instructions || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Prescriber Notes */}
                    {rx.notes && (
                      <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 space-y-0.5">
                        <span className="font-bold text-[10px] uppercase tracking-wider block text-amber-800">
                          Prescription Notes:
                        </span>
                        <p className="whitespace-pre-wrap text-xs">{rx.notes}</p>
                      </div>
                    )}

                    {/* Footer Ref Info */}
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] text-ink-soft italic font-mono">
                        Prescription Ref: RX-{(rx._id || rx.id || '000000').slice(-8).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
