import { useState, useEffect } from 'react';
import {
  FileText, Search, UserSquare2, Filter, Upload, Trash2, Download, CheckCircle2, AlertTriangle, HardDrive,
} from 'lucide-react';
import api from '../../api/axios.js';
import DocumentsPanel from '../../components/common/DocumentsPanel.jsx';

export default function AdminDocuments() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(true);

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
        console.error('Failed to load patients:', err);
      } finally {
        setLoadingPatients(false);
      }
    }
    fetchPatients();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <FileText size={26} className="text-brand" /> Clinic-Wide Patient Documents & Records
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Admin document management portal to inspect, upload, download, and manage patient files.
          </p>
        </div>

        {/* Patient Filter Select */}
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

      {loadingPatients ? (
        <div className="card p-6 space-y-4 bg-surface animate-pulse">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-28 bg-slate-100 rounded-xl" />
            <div className="h-28 bg-slate-100 rounded-xl" />
            <div className="h-28 bg-slate-100 rounded-xl" />
          </div>
        </div>
      ) : selectedPatientId ? (
        <DocumentsPanel
          patientId={selectedPatientId}
          title="Clinical & Administrative Document Vault"
        />
      ) : (
        <div className="card p-12 text-center text-xs text-ink-soft">
          Select a patient from the dropdown above to view documents.
        </div>
      )}
    </div>
  );
}
