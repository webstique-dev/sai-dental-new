import { useState, useEffect } from 'react';
import {
  FileText, Upload, Download, Trash2, HardDrive, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import ConfirmModal from './ConfirmModal.jsx';
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
  const { showSuccess, showError } = useNotification();
  const isAdmin = user?.role === 'admin';

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingDeleteDoc, setPendingDeleteDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType] = useState('X-Ray');
  const [customName, setCustomName] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchDocuments = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const res = await api.get(`/documents/patient/${patientId}`);
      setDocuments(res.data?.documents || []);
    } catch (err) {
      console.error('Failed to fetch patient documents:', err);
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
      showError('Please select a file to upload.');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('patientId', patientId);
      if (consultationId) formData.append('consultationId', consultationId);
      formData.append('documentType', docType);
      if (customName) formData.append('customName', customName);

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showSuccess('Document uploaded successfully.');
      setShowUploadModal(false);
      setSelectedFile(null);
      setCustomName('');
      fetchDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
      showError(err.response?.data?.message || 'Failed to upload document file.');
    } finally {
      setUploading(false);
    }
  };

  const confirmDeleteDocument = async () => {
    if (!pendingDeleteDoc) return;
    if (!isAdmin) {
      showError('Only clinic Administrators can delete patient documents.');
      return;
    }

    setDeleting(true);

    try {
      await api.delete(`/documents/${pendingDeleteDoc.id}`);
      showSuccess(`Document "${pendingDeleteDoc.name}" deleted successfully.`);
      setDocuments((prev) => prev.filter((d) => (d._id || d.id) !== pendingDeleteDoc.id));
      setPendingDeleteDoc(null);
    } catch (err) {
      console.error('Failed to delete document:', err);
      showError(err.response?.data?.message || 'Failed to delete document. Only Admin can delete.');
    } finally {
      setDeleting(false);
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

      {/* Document List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-ink-soft">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-ink-soft space-y-2">
          <HardDrive size={32} className="mx-auto text-ink-soft/40" />
          <p className="font-semibold text-ink">No attachments found</p>
          <p className="text-[11px]">Upload clinical X-Rays, prescriptions, or bills for this patient.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg font-semibold text-ink-soft border-b border-border">
              <tr>
                <th className="py-3 px-4">Document Details</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Uploaded By</th>
                <th className="py-3 px-4">Date & Size</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents.map((doc) => {
                const docId = doc._id || doc.id;
                const fileUrl = doc.fileUrl ? `${doc.fileUrl}` : '#';

                return (
                  <tr key={docId} className="hover:bg-bg/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-ink">{doc.originalName || doc.fileName}</div>
                      {doc.customName && (
                        <div className="text-[11px] text-brand font-medium">{doc.customName}</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`badge ${TYPE_BADGES[doc.documentType] || 'bg-slate-100 text-slate-800'}`}
                      >
                        {doc.documentType || 'Other'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-ink-soft">
                      {doc.uploadedBy ? doc.uploadedBy.name : 'System'}
                    </td>

                    <td className="py-3 px-4 text-ink-soft">
                      <div>
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </div>
                      <div className="text-[10px] opacity-75">{formatFileSize(doc.fileSize)}</div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
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
                            onClick={() => setPendingDeleteDoc({ id: docId, name: doc.originalName || doc.fileName })}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800"
                            title="Delete Document (Admin Only)"
                          >
                            <Trash2 size={14} />
                            Delete
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

      {/* REUSABLE DELETE CONFIRMATION POPUP */}
      <ConfirmModal
        isOpen={Boolean(pendingDeleteDoc)}
        onClose={() => setPendingDeleteDoc(null)}
        onConfirm={confirmDeleteDocument}
        title="Delete Patient Document"
        message={
          pendingDeleteDoc ? (
            <span>
              Are you sure you want to delete{' '}
              <strong className="text-ink font-bold">{pendingDeleteDoc.name}</strong>? This action cannot be undone.
            </span>
          ) : (
            'Are you sure you want to delete this document attachment?'
          )
        }
        confirmText="Delete Document"
        cancelText="Cancel"
        variant="delete"
        loading={deleting}
      />

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-md max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Upload size={18} className="text-brand" /> Upload Patient Document
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
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
              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={uploading} className="btn-primary text-xs">
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
