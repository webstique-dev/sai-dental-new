import { useState, useEffect } from 'react';
import { DatabaseBackup, Download, CheckCircle2, ShieldAlert, FileCode, Clock, Server, FileText } from 'lucide-react';
import api from '../../api/axios.js';

export default function Backup() {
  const [downloading, setDownloading] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState(() => {
    return localStorage.getItem('dental_last_backup_time') || null;
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleDownloadBackup = async () => {
    setDownloading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const todayStr = new Date().toISOString().split('T')[0];
      const filename = `dental_clinic_backup_${todayStr}.json`;

      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      const nowIso = new Date().toLocaleString();
      localStorage.setItem('dental_last_backup_time', nowIso);
      setLastBackupTime(nowIso);
      setSuccessMessage('Clinic backup JSON successfully generated and downloaded.');
    } catch (err) {
      console.error('Backup download failed:', err);
      setErrorMessage('Failed to generate clinic backup. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Banner */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
          <DatabaseBackup size={26} className="text-brand" /> Clinic Data Backup & Export
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Generate an instant snapshot export of all clinic patients, clinical charts, billing records, and settings.
        </p>
      </div>

      {/* Main Action Card */}
      <div className="card p-6 space-y-5 bg-surface border-brand/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <FileCode className="text-brand" size={18} /> Manual JSON Backup Export
            </h2>
            <p className="text-xs text-ink-soft">
              Creates a structured JSON document containing full relational clinic records.
            </p>
          </div>

          <button
            disabled={downloading}
            onClick={handleDownloadBackup}
            className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm shrink-0"
          >
            <Download size={16} className={downloading ? 'animate-bounce' : ''} />
            {downloading ? 'Generating JSON Export...' : 'Download Clinic Backup'}
          </button>
        </div>

        {/* Feedback alerts */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Last Downloaded Timestamp */}
        <div className="flex items-center gap-2 text-xs text-ink-soft bg-bg p-3 rounded-lg border border-border">
          <Clock size={15} className="text-brand shrink-0" />
          <span>
            Last manual backup downloaded:{' '}
            {lastBackupTime ? (
              <strong className="text-ink font-mono">{lastBackupTime}</strong>
            ) : (
              <span className="italic">No recent download recorded on this device</span>
            )}
          </span>
        </div>
      </div>

      {/* Backup Contents & Security Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5 space-y-3">
          <h3 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
            <Server size={15} className="text-brand" /> Included Data Collections
          </h3>
          <ul className="text-xs text-ink space-y-2">
            {[
              'Patients Directory & Medical Histories',
              'Appointments & Queue Entries',
              'Invoices & Payment Log History',
              'Doctor Consultations & Examinations',
              'FDI Tooth Chart Condition Records',
              'Diagnoses, Treatment Plans & Procedures',
              'Prescriptions & Investigation Orders',
              'Follow-Up Schedules & Patient Notes',
              'Clinical Document Metadata & Clinic Settings',
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-ink-soft">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5 space-y-3 bg-slate-50/50">
          <h3 className="font-display text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert size={15} className="text-amber-600" /> Privacy & Exclusions
          </h3>
          <div className="text-xs text-ink-soft space-y-3">
            <p>
              To protect staff security and compliance standards, the following items are strictly excluded from standard clinical data exports:
            </p>
            <ul className="space-y-1.5 list-disc pl-4 text-ink-soft">
              <li>User passwords and authentication tokens</li>
              <li>System access Audit Logs</li>
            </ul>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 space-y-1">
              <strong>Note on Automatic Backups:</strong>
              <p>Automated cloud backup schedules and full database restore utilities are planned as future infrastructure enhancements.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
