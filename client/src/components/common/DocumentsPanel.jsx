import { useState, useEffect } from 'react';
import {
  FileText, Upload, Download, Trash2, CheckCircle2, AlertTriangle, Eye, Image, FileCode2, HardDrive, Filter, X, Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/axios.js';

const TYPE_BADGES = {
  'X-Ray': 'bg-blue-100 text-blue-800 border-blue-200',
  Prescription: 'bg-purple-100 text-purple-800 border-purple-200',
  Bill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Clinical Note': 'bg-amber-100 text-amber-800 border-amber-200',
  'Clinical Image': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  Report: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  Other: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function DocumentsPanel({ patientId, consultationId, title = 'Patient Clinical Documents' }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType] = useState('X-Ray');
  const [customName, setCustomName] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchDocuments = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get(`/documents?patient=${patientId}`);
      setDocuments(res.data?.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('patient', patientId);
      formData.append('type', docType);
      if (customName) formData.append('fileName', customName.trim());
      if (consultationId) formData.append('relatedConsultation', consultationId);

      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMsg('Document uploaded successfully!');
      setSelectedFile(null);
      setCustomName('');
      setShowUploadModal(false);
      fetchDocuments();
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Failed to upload document:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!isAdmin) {
      setErrorMsg('Deleting clinical documents is restricted to Admin role only.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await api.delete(`/documents/${id}`);
      setSuccessMsg(`Document "${name}" deleted successfully.`);
      setDocuments((prev) => prev.filter((d) => (d._id || d.id) !== id));
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Failed to delete document:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to delete document. Only Admin can delete.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="card p-5 space-y-4">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-2">
        <div>
          <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
            <FileText size={18} className="text-brand" /> {title}
          </h3>
          <p className="text-xs text-ink-soft">
            Attached medical records, X-Rays, lab reports, and billing receipts.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Upload size={15} /> Upload Document
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-ink-soft">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="p-8 text-center text-xs text-ink-soft space-y-2">
          <HardDrive size={28} className="mx-auto text-ink-soft/40" />
          <p className="font-semibold text-ink">No documents attached for this patient yet.</p>
          <p>Click "Upload Document" above to attach X-Rays, lab reports, or invoices.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft">
              <tr>
                <th className="px-3 py-2.5">Document Name</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Size</th>
                <th className="px-3 py-2.5">Uploaded By</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {documents.map((doc) => {
                const docId = doc._id || doc.id;
                const fileUrl = doc.fileUrl?.startsWith('http')
                  ? doc.fileUrl
                  : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${doc.fileUrl}`;

                return (
                  <tr key={docId} className="hover:bg-bg/40">
                    <td className="px-3 py-3 font-semibold text-ink">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-brand shrink-0" />
                        <span className="truncate max-w-[200px]" title={doc.fileName}>
                          {doc.fileName}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <span className={`badge border ${TYPE_BADGES[doc.type] || TYPE_BADGES.Other}`}>
                        {doc.type}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-ink-soft font-mono text-[11px]">
                      {formatFileSize(doc.fileSize)}
                    </td>

                    <td className="px-3 py-3 text-ink-soft">
                      <span className="font-semibold text-ink">{doc.uploadedBy?.name || 'Staff'}</span>
                      {doc.uploadedBy?.role && (
                        <span className="text-[10px] text-ink-soft/70 capitalize block">
                          ({doc.uploadedBy.role})
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3 text-ink-soft">
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        >
                          <Download size={14} /> Download
                        </a>

                        {/* DELETE ACTION - STRICTLY ADMIN ONLY */}
                        {isAdmin && (
                          <button
                            disabled={deletingId === docId}
                            onClick={() => handleDelete(docId, doc.fileName)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-30"
                            title="Delete Document (Admin Only)"
                          >
                            <Trash2 size={14} />
                            {deletingId === docId ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="card w-full max-w-md p-6 space-y-4 bg-surface">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Upload size={18} className="text-brand" /> Upload Patient Document
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Select File *</label>
                <input
                  required
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  className="block w-full text-xs text-ink-soft file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-light file:text-brand-dark hover:file:bg-brand-light/80 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Document Category *</label>
                <select
                  className="input-field font-semibold"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="X-Ray">X-Ray (IOPAR / OPG / CBCT)</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Bill">Bill / Invoice Receipt</option>
                  <option value="Clinical Note">Clinical Note</option>
                  <option value="Clinical Image">Clinical Intraoral Image</option>
                  <option value="Report">Diagnostic / Lab Report</option>
                  <option value="Other">Other Attachment</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Custom Display Name (Optional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. IOPAR wrt #16 Upper Right"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={uploading} className="btn-primary">
                  {uploading ? 'Uploading File...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
