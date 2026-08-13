import { useState, useEffect } from 'react';
import {
  Activity, Plus, Search, Filter, Edit3, CheckCircle2, XCircle, X, Save,
  ShieldAlert, RefreshCw, DollarSign, Tag, FileText
} from 'lucide-react';
import api from '../../api/axios.js';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

export default function AdminTreatments() {
  const { showSuccess, showError } = useNotification();
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState(null);
  const [pendingToggleTreatment, setPendingToggleTreatment] = useState(null);
  const [toggling, setToggling] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'Endodontics',
    description: '',
    defaultCost: 1000,
    isActive: true,
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', msg: '' });

  const fetchTreatments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (activeFilter) params.append('active', activeFilter);

      const res = await api.get(`/treatments?${params.toString()}`);
      setTreatments(res.data?.treatments || []);
    } catch (err) {
      console.error('Failed to fetch treatments catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTreatments();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, activeFilter]);

  const categories = Array.from(new Set(treatments.map((t) => t.category).filter(Boolean)));

  const handleOpenAdd = () => {
    setEditingTreatment(null);
    setFormData({
      name: '',
      code: '',
      category: 'Endodontics',
      description: '',
      defaultCost: 1000,
      isActive: true,
    });
    setFeedback({ type: '', msg: '' });
    setShowAddModal(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTreatment(t);
    setFormData({
      name: t.name || '',
      code: t.code || '',
      category: t.category || 'Endodontics',
      description: t.description || '',
      defaultCost: t.defaultCost ?? 0,
      isActive: t.isActive !== false,
    });
    setFeedback({ type: '', msg: '' });
    setShowAddModal(true);
  };

  const confirmToggleActive = async () => {
    if (!pendingToggleTreatment) return;
    setToggling(true);
    try {
      const tId = pendingToggleTreatment._id || pendingToggleTreatment.id;
      const newStatus = !pendingToggleTreatment.isActive;
      await api.patch(`/treatments/${tId}`, { isActive: newStatus });
      showSuccess(`Procedure "${pendingToggleTreatment.name}" ${newStatus ? 'activated' : 'deactivated'} successfully.`);
      setPendingToggleTreatment(null);
      fetchTreatments();
    } catch (err) {
      console.error('Failed to toggle treatment status:', err);
      showError(err.response?.data?.message || 'Failed to update procedure status.');
    } finally {
      setToggling(false);
    }
  };

  const handleSaveTreatment = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    setFeedback({ type: '', msg: '' });

    try {
      if (editingTreatment) {
        const tId = editingTreatment._id || editingTreatment.id;
        await api.patch(`/treatments/${tId}`, formData);
        setFeedback({ type: 'success', msg: 'Treatment catalog item updated.' });
      } else {
        await api.post('/treatments', formData);
        setFeedback({ type: 'success', msg: 'New treatment catalog item added.' });
      }

      setTimeout(() => {
        setShowAddModal(false);
        setEditingTreatment(null);
        fetchTreatments();
      }, 800);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message || 'Failed to save treatment.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <Activity size={26} className="text-brand" /> Treatment & Procedure Catalog
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Manage standardized procedure codes, default cost estimates, and categories for doctor plans and billing line items.
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
          <Plus size={16} /> Add Catalog Item
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            className="input-field pl-9 py-2 text-xs"
            placeholder="Search procedure name, code, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <select
            className="input-field py-2 text-xs"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            className="input-field py-2 text-xs"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="true">Active Catalog Items</option>
            <option value="false">Deactivated Items</option>
          </select>
        </div>
      </div>

      {/* CATALOG TABLE */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Treatment / Procedure</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Default Cost (₹)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-soft">
                    Loading treatment catalog...
                  </td>
                </tr>
              ) : treatments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-soft">
                    No treatment catalog items found. Click "Add Catalog Item" to populate procedures.
                  </td>
                </tr>
              ) : (
                treatments.map((t) => {
                  const tId = t._id || t.id;
                  return (
                    <tr key={tId} className={`hover:bg-bg/60 transition-colors ${!t.isActive ? 'opacity-60 bg-slate-50/50' : ''}`}>
                      <td className="px-4 py-3 font-mono font-bold text-brand whitespace-nowrap">
                        {t.code || '—'}
                      </td>

                      <td className="px-4 py-3 font-bold text-ink whitespace-nowrap">
                        {t.name}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="badge bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                          {t.category || 'General'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-ink-soft max-w-[240px] truncate">
                        {t.description || '—'}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        ₹{(t.defaultCost || 0).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`badge text-[10px] ${t.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}
                        >
                          {t.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          title="Edit Procedure"
                          className="btn-secondary py-1 px-2 text-[11px] inline-flex items-center gap-1"
                        >
                          <Edit3 size={13} /> Edit
                        </button>

                        <button
                          onClick={() => setPendingToggleTreatment(t)}
                          title={t.isActive ? 'Deactivate Catalog Item' : 'Reactivate Catalog Item'}
                          className={`py-1 px-2 text-[11px] font-semibold rounded-lg border transition-colors inline-flex items-center gap-1 ${t.isActive
                            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                        >
                          {t.isActive ? (
                            <>
                              <XCircle size={13} /> Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={13} /> Reactivate
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT CATALOG MODAL */}
      {(showAddModal || editingTreatment) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
          <div className="card max-w-lg w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Activity size={18} className="text-brand" />
                {editingTreatment ? 'Edit Catalog Item' : 'Add New Treatment to Catalog'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTreatment(null);
                }}
                className="p-1 text-ink-soft hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTreatment} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 text-xs">
                {feedback.msg && (
                  <div
                    className={`p-3 rounded text-xs flex items-center gap-2 ${feedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                  >
                    {feedback.type === 'success' ? <CheckCircle2 size={15} /> : <ShieldAlert size={15} />}
                    <span>{feedback.msg}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Treatment / Procedure Name</label>
                  <input
                    type="text"
                    required
                    className="input-field py-1.5"
                    placeholder="e.g. Root Canal Treatment"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Short Code</label>
                    <input
                      type="text"
                      className="input-field py-1.5 font-mono"
                      placeholder="e.g. RCT"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Category</label>
                    <input
                      type="text"
                      className="input-field py-1.5"
                      placeholder="e.g. Endodontics, Surgical"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Default Cost (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="input-field py-1.5 font-mono"
                      placeholder="0"
                      value={formData.defaultCost}
                      onChange={(e) => setFormData({ ...formData, defaultCost: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1 font-mono">Estimated Duration (Mins)</label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      className="input-field py-1.5 font-mono"
                      placeholder="30"
                      value={formData.estimatedDuration}
                      onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Description / Notes</label>
                  <textarea
                    rows={2}
                    className="input-field py-1.5"
                    placeholder="Brief procedure scope..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-border text-brand focus:ring-brand"
                  />
                  <label htmlFor="isActive" className="font-semibold text-ink">
                    Active in Catalog (Available for selection in Treatment Plans & Invoices)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingTreatment(null);
                  }}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Catalog Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REUSABLE DEACTIVATION / ACTIVATION CONFIRMATION POPUP */}
      <ConfirmModal
        isOpen={Boolean(pendingToggleTreatment)}
        onClose={() => setPendingToggleTreatment(null)}
        onConfirm={confirmToggleActive}
        title={pendingToggleTreatment?.isActive ? 'Confirm Deactivation' : 'Confirm Activation'}
        message={
          pendingToggleTreatment ? (
            <span>
              Are you sure you want to {pendingToggleTreatment.isActive ? 'deactivate' : 'reactivate'} the catalog procedure{' '}
              <strong className="text-ink font-bold">{pendingToggleTreatment.name}</strong>?
            </span>
          ) : (
            'Are you sure you want to update this catalog item status?'
          )
        }
        confirmText={pendingToggleTreatment?.isActive ? 'Deactivate Item' : 'Reactivate Item'}
        cancelText="Cancel"
        variant={pendingToggleTreatment?.isActive ? 'warning' : 'update'}
        loading={toggling}
      />
    </div>
  );
}
