import { useState, useEffect } from 'react';
import {
  Activity, Plus, Search, Edit3, CheckCircle2, XCircle, X, Save, Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../api/axios.js';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { TableSkeleton } from '../../components/common/TableSkeleton.jsx';

export default function AdminTreatments() {
  const { showSuccess, showError } = useNotification();
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [expandedTreatmentId, setExpandedTreatmentId] = useState(null);

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
    if (!formData.name.trim()) {
      showError('Procedure name is required.');
      return;
    }

    setSaving(true);
    try {
      if (editingTreatment) {
        const tId = editingTreatment._id || editingTreatment.id;
        await api.patch(`/treatments/${tId}`, formData);
        showSuccess('Treatment catalog item updated.');
      } else {
        await api.post('/treatments', formData);
        showSuccess('New treatment catalog item added.');
      }

      setShowAddModal(false);
      setEditingTreatment(null);
      fetchTreatments();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save treatment.');
    } finally {
      setSaving(false);
    }
  };

  const hasActiveFilters = Boolean(search || categoryFilter || activeFilter);

  return (
    <div className="space-y-6 max-w-7xl w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink flex items-center gap-2 min-w-0 leading-tight">
            <Activity size={26} className="text-brand shrink-0" />
            <span className="truncate sm:whitespace-normal">Treatment & Procedure Catalog</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed break-words">
            Manage standardized procedure codes, default cost estimates, and categories for doctor plans and billing line items.
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          <Plus size={16} /> <span>Add Catalog Item</span>
        </button>
      </div>

      {/* Desktop Filter Bar (≥768px) */}
      <div className="hidden md:block card p-4 bg-surface border-border space-y-3">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              className="input-field pl-9 py-2 text-xs w-full"
              placeholder="Search procedure name, code, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink">
                <X size={14} />
              </button>
            )}
          </div>

          <div>
            <select
              className="input-field py-2 text-xs font-semibold w-full"
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
              className="input-field py-2 text-xs font-semibold w-full"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="true">Active Catalog Items</option>
              <option value="false">Deactivated Items</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
                setActiveFilter('');
              }}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold"
            >
              <X size={13} /> Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Mobile Collapsible Filter Accordion (<768px down to 320px) */}
      <div className="block md:hidden card p-3.5 bg-surface border border-border shadow-xs space-y-3 rounded-2xl max-w-full overflow-hidden">
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-ink gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-brand-light/30 text-brand-dark flex items-center justify-center font-bold text-xs shrink-0">
              <Filter size={14} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="font-bold text-ink">Filters & Search</span>
              {hasActiveFilters && (
                <span className="badge bg-brand text-white text-[10px] py-0.5 px-2 font-bold shrink-0">
                  Active Filters
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-ink-soft font-semibold shrink-0">
            <span>{isMobileFilterOpen ? 'Hide' : 'Filter'}</span>
            {isMobileFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {isMobileFilterOpen && (
          <div className="pt-2 border-t border-border/70 space-y-3 animate-in fade-in duration-150 text-xs">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="text"
                className="input-field pl-9 py-1.5 text-xs w-full"
                placeholder="Search procedures..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              <select
                className="input-field py-1.5 text-xs font-semibold w-full"
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

              <select
                className="input-field py-1.5 text-xs font-semibold w-full"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="true">Active Catalog Items</option>
                <option value="false">Deactivated Items</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('');
                  setActiveFilter('');
                }}
                className="btn-secondary w-full py-1.5 text-xs text-rose-600 font-semibold flex items-center justify-center gap-1"
              >
                <X size={13} /> Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* CATALOG TABLE & CARDS */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : treatments.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-soft">
            No treatment catalog items found. Click "Add Catalog Item" to populate procedures.
          </div>
        ) : (
          <>
            {/* Desktop Table View (≥768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Code</th>
                    <th className="px-5 py-3.5">Treatment / Procedure</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5 text-right">Default Cost (₹)</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {treatments.map((t) => {
                    const tId = t._id || t.id;
                    return (
                      <tr key={tId} className={`hover:bg-bg/60 transition-colors ${!t.isActive ? 'opacity-60 bg-slate-50/50' : ''}`}>
                        <td className="px-5 py-4 font-mono font-bold text-brand whitespace-nowrap">
                          {t.code || '—'}
                        </td>

                        <td className="px-5 py-4 font-bold text-ink whitespace-nowrap text-sm">
                          {t.name}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                            {t.category || 'General'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-ink-soft max-w-[240px] truncate">
                          {t.description || '—'}
                        </td>

                        <td className="px-5 py-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap text-sm">
                          ₹{(t.defaultCost || 0).toLocaleString()}
                        </td>

                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <span
                            className={`badge font-bold border text-[10px] ${t.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                          >
                            {t.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            title="Edit Procedure"
                            className="btn-secondary py-1 px-2.5 text-[11px] inline-flex items-center gap-1"
                          >
                            <Edit3 size={13} /> Edit
                          </button>

                          <button
                            onClick={() => setPendingToggleTreatment(t)}
                            title={t.isActive ? 'Deactivate Catalog Item' : 'Reactivate Catalog Item'}
                            className={`py-1 px-2.5 text-[11px] font-semibold rounded-xl border transition-colors inline-flex items-center gap-1 ${t.isActive
                              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              }`}
                          >
                            {t.isActive ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                            <span>{t.isActive ? 'Disable' : 'Activate'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Collapsible Cards View (<768px down to 320px) */}
            <div className="block md:hidden divide-y divide-border">
              {treatments.map((t) => {
                const tId = t._id || t.id;
                const isExpanded = expandedTreatmentId === tId;

                return (
                  <div key={tId} className={`p-4 space-y-3 hover:bg-bg/40 transition-colors ${!t.isActive ? 'opacity-60 bg-slate-50/50' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-ink text-sm truncate">{t.name}</span>
                          <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                            {t.category || 'General'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-ink-soft flex-wrap">
                          {t.code && <span className="font-bold text-brand">#{t.code}</span>}
                          <span className="font-bold text-emerald-700">₹{(t.defaultCost || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedTreatmentId(isExpanded ? null : tId)}
                        className="p-1.5 rounded-lg border border-border text-ink-soft hover:text-ink hover:bg-bg shrink-0 mt-0.5"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-border/70 space-y-3 text-xs animate-in fade-in duration-150">
                        <div className="grid grid-cols-2 gap-2 text-ink-soft bg-bg/50 p-2.5 rounded-xl border border-border">
                          <div className="col-span-2">
                            <span className="block text-[10px] font-semibold uppercase text-ink-soft">Description</span>
                            <span className="font-medium text-ink">{t.description || 'No description provided.'}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-semibold uppercase text-ink-soft">Default Cost</span>
                            <span className="font-mono font-bold text-emerald-700">₹{(t.defaultCost || 0).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-semibold uppercase text-ink-soft">Status</span>
                            <span className={`badge font-bold text-[10px] ${t.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                              {t.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="btn-secondary py-1 px-3 text-[11px] flex items-center gap-1"
                          >
                            <Edit3 size={13} /> Edit
                          </button>

                          <button
                            onClick={() => setPendingToggleTreatment(t)}
                            className={`py-1 px-3 text-[11px] font-semibold rounded-xl border transition-colors flex items-center gap-1 ${t.isActive
                              ? 'border-amber-300 bg-amber-50 text-amber-800'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              }`}
                          >
                            {t.isActive ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                            <span>{t.isActive ? 'Disable' : 'Activate'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ADD / EDIT CATALOG MODAL */}
      {(showAddModal || editingTreatment) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-2 sm:p-4 overflow-hidden !mt-0">
          <div className="card max-w-lg w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150 !mt-0 !my-0">
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

            <form onSubmit={handleSaveTreatment} className="flex flex-col flex-1 overflow-hidden min-h-0 !mt-0 !mb-0">
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-3 text-xs">
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
