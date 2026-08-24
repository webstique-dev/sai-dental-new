import { useEffect, useState, useMemo } from 'react';
import { UserPlus, Power, Edit3, KeyRound, X, ShieldAlert, Search, Filter, ChevronDown, ChevronUp, Users } from 'lucide-react';
import api from '../../api/axios.js';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';
import { validateName, validateEmail, validatePhone } from '../../utils/validators.js';
import { TableSkeleton } from '../../components/common/TableSkeleton.jsx';

const ROLE_BADGE = {
  admin: 'bg-role-adminSoft text-role-admin',
  receptionist: 'bg-role-receptionSoft text-role-reception',
  doctor: 'bg-role-doctorSoft text-role-doctor',
};

export default function AdminUsers() {
  const { showSuccess, showError } = useNotification();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Add User Form State
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'receptionist' });
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: '' });
  const [pendingRoleChange, setPendingRoleChange] = useState(null); // stores { user, newRole } for confirmation

  // Reset Password Modal State
  const [resetUser, setResetUser] = useState(null);
  const [resetPasswords, setResetPasswords] = useState({ newPassword: '', confirmPassword: '' });

  // Status Toggle Confirmation State
  const [statusToggleConfirmUser, setStatusToggleConfirmUser] = useState(null);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }

  useSocketEvent('USER_STATUS_UPDATED', () => {
    fetchUsers();
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();

    const nameErr = validateName(form.name, 'Full Name', true);
    if (nameErr) {
      showError(nameErr);
      return;
    }

    const emailErr = validateEmail(form.email, true);
    if (emailErr) {
      showError(emailErr);
      return;
    }

    if (form.phone) {
      const phoneErr = validatePhone(form.phone, false);
      if (phoneErr) {
        showError(phoneErr);
        return;
      }
    }

    if (!form.password || form.password.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/users', {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone ? form.phone.trim() : '',
      });
      showSuccess(`User ${form.name} created successfully.`);
      setForm({ name: '', email: '', phone: '', password: '', role: 'receptionist' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleRequestToggleStatus(u) {
    const isAct = u.status === 'active' || u.isActive === true;
    const userId = u.id || u._id;
    setStatusToggleConfirmUser({
      id: userId,
      name: u.name,
      isCurrentlyActive: isAct,
    });
  }

  async function executeToggleStatus() {
    if (!statusToggleConfirmUser) return;
    const { id, name } = statusToggleConfirmUser;
    setStatusToggleConfirmUser(null);

    try {
      const { data } = await api.patch(`/users/${id}/disable`);
      const updatedUser = data.user;

      setUsers((prev) =>
        prev.map((u) => ((u.id === id || u._id === id) ? updatedUser : u))
      );

      const isNowActive = updatedUser.status === 'active' || updatedUser.isActive === true;
      showSuccess(
        data.message || `User ${updatedUser.name || name} is now ${isNowActive ? 'Active' : 'Inactive'}.`
      );
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update user status.');
    }
  }

  // --- EDIT USER HANDLERS ---
  function openEdit(u) {
    setEditingUser(u);
    setEditForm({ name: u.name || '', phone: u.phone || '', role: u.role || 'receptionist' });
    setPendingRoleChange(null);
  }

  function handleEditSubmit(e) {
    e.preventDefault();

    const nameErr = validateName(editForm.name, 'Full Name', true);
    if (nameErr) {
      showError(nameErr);
      return;
    }

    if (editForm.phone) {
      const phoneErr = validatePhone(editForm.phone, false);
      if (phoneErr) {
        showError(phoneErr);
        return;
      }
    }

    const userId = editingUser.id || editingUser._id;
    if (editForm.role !== editingUser.role) {
      // Show confirmation dialog before changing role
      setPendingRoleChange({
        id: userId,
        name: editForm.name.trim(),
        oldRole: editingUser.role,
        newRole: editForm.role,
      });
      return;
    }

    submitUserUpdate(userId, {
      name: editForm.name.trim(),
      phone: editForm.phone ? editForm.phone.trim() : '',
      role: editForm.role,
    });
  }

  async function submitUserUpdate(id, payload) {
    try {
      const { data } = await api.patch(`/users/${id}`, payload);
      setUsers((prev) =>
        prev.map((u) => ((u.id === id || u._id === id) ? data.user : u))
      );
      setEditingUser(null);
      setPendingRoleChange(null);
      showSuccess(`Updated account details for ${data.user.name} successfully.`);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update user details.');
    }
  }

  async function confirmRoleChange() {
    if (!pendingRoleChange) return;
    await submitUserUpdate(pendingRoleChange.id, {
      name: editForm.name,
      phone: editForm.phone,
      role: pendingRoleChange.newRole,
    });
  }

  // --- RESET PASSWORD HANDLERS ---
  function openResetPassword(u) {
    setResetUser(u);
    setResetPasswords({ newPassword: '', confirmPassword: '' });
  }

  async function handleResetPasswordSubmit(e) {
    e.preventDefault();

    if (resetPasswords.newPassword !== resetPasswords.confirmPassword) {
      showError('Passwords do not match.');
      return;
    }
    if (resetPasswords.newPassword.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    const userId = resetUser.id || resetUser._id;
    try {
      await api.post(`/users/${userId}/reset-password`, {
        newPassword: resetPasswords.newPassword,
      });
      showSuccess(
        `Password reset successfully for ${resetUser.name}!`
      );
      setResetUser(null);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reset password.');
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q);

      const matchesRole = !roleFilter || u.role === roleFilter;
      const isUserActive = u.status === 'active' || u.isActive === true;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'active' && isUserActive) ||
        (statusFilter === 'inactive' && !isUserActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const hasActiveFilters = Boolean(search || roleFilter || statusFilter);

  return (
    <div className="space-y-6 max-w-7xl w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-ink flex items-center gap-2 min-w-0 leading-tight">
            <Users size={24} className="text-brand shrink-0" />
            <span className="truncate sm:whitespace-normal">Users & Staff Accounts</span>
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed break-words">
            Manage staff credentials, role permissions, and active status across the clinic.
          </p>
        </div>

        <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-xs shrink-0 self-start sm:self-auto">
          <UserPlus size={16} />
          <span>Add User</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-4 sm:p-5 space-y-4">
          <h3 className="font-display text-[15px] font-semibold text-ink">Create New Staff User</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-ink-soft">Full Name *</label>
              <input
                type="text"
                required
                className="input-field mt-1 text-xs"
                placeholder="Dr. Jane Smith"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.replace(/[^a-zA-Z\s'.-]/g, '') })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft">Email (Username) *</label>
              <input
                type="email"
                required
                className="input-field mt-1 text-xs"
                placeholder="jane@dental.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft">Phone Number</label>
              <input
                type="tel"
                maxLength={10}
                className="input-field mt-1 text-xs font-mono"
                placeholder="9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft">Initial Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="input-field mt-1 text-xs"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft">Role Access</label>
              <select
                className="input-field mt-1 text-xs"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="receptionist">Receptionist</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary text-xs">
              {submitting ? 'Creating...' : 'Save User'}
            </button>
          </div>
        </form>
      )}

      {/* Desktop Search & Filter Bar (≥768px) */}
      <div className="hidden md:block card p-4 bg-surface border-border space-y-3">
        <div className="flex flex-row items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              className="input-field pl-9 py-2 text-xs w-full"
              placeholder="Search staff by name, email, or phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              className="input-field py-2 text-xs font-semibold w-auto min-w-[150px]"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="admin">Admin</option>
            </select>

            <select
              className="input-field py-2 text-xs font-semibold w-auto min-w-[140px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearch('');
                  setRoleFilter('');
                  setStatusFilter('');
                }}
                className="btn-secondary py-2 px-3 text-xs text-rose-600 font-semibold flex items-center gap-1 shrink-0"
              >
                <X size={14} /> Reset
              </button>
            )}
          </div>
        </div>
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
                placeholder="Search staff accounts..."
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
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="doctor">Doctor</option>
                <option value="receptionist">Receptionist</option>
                <option value="admin">Admin</option>
              </select>

              <select
                className="input-field py-1.5 text-xs font-semibold w-full"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearch('');
                  setRoleFilter('');
                  setStatusFilter('');
                }}
                className="btn-secondary w-full py-1.5 text-xs text-rose-600 font-semibold flex items-center justify-center gap-1"
              >
                <X size={13} /> Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* User Accounts Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-soft">
            {hasActiveFilters ? 'No staff users match your search criteria.' : 'No staff users registered yet.'}
          </div>
        ) : (
          <>
            {/* Desktop Table View (≥768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Phone</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => {
                    const userId = u.id || u._id;
                    const isUserActive = u.status === 'active' || u.isActive === true;

                    return (
                      <tr key={userId} className="hover:bg-bg/40 transition-colors">
                        <td className="px-5 py-4 font-bold text-ink text-sm">{u.name}</td>
                        <td className="px-5 py-4 text-ink-soft font-mono">{u.email}</td>
                        <td className="px-5 py-4 text-ink-soft font-mono">{u.phone || '—'}</td>
                        <td className="px-5 py-4">
                          <span className={`badge uppercase font-bold text-[10px] ${ROLE_BADGE[u.role] || 'bg-bg text-ink-soft'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`badge font-bold border text-[11px] px-2 py-0.5 ${isUserActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                            {isUserActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(u)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-soft hover:text-ink hover:bg-bg p-1.5 rounded-lg transition-colors border border-border"
                              title="Edit User Details & Role"
                            >
                              <Edit3 size={14} /> Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => openResetPassword(u)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:bg-brand-light/30 p-1.5 rounded-lg transition-colors border border-brand/20"
                              title="Reset User Password"
                            >
                              <KeyRound size={14} /> Password
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRequestToggleStatus(u)}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold p-1.5 rounded-lg transition-colors border ${
                                isUserActive
                                  ? 'text-rose-700 bg-rose-50/50 hover:bg-rose-100/70 border-rose-200'
                                  : 'text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100/70 border-emerald-200'
                              }`}
                              title={isUserActive ? 'Deactivate User Account' : 'Activate User Account'}
                            >
                              <Power size={14} />
                              <span>{isUserActive ? 'Disable' : 'Activate'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (<768px down to 320px) */}
            <div className="block md:hidden divide-y divide-border">
              {filteredUsers.map((u) => {
                const userId = u.id || u._id;
                const isUserActive = u.status === 'active' || u.isActive === true;

                return (
                  <div key={userId} className="p-4 space-y-3 hover:bg-bg/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-ink text-sm truncate">{u.name}</span>
                          <span className={`badge uppercase font-bold text-[10px] ${ROLE_BADGE[u.role] || 'bg-bg text-ink-soft'}`}>
                            {u.role}
                          </span>
                        </div>
                        <p className="text-xs text-ink-soft font-mono truncate">{u.email}</p>
                      </div>

                      <span className={`badge font-bold border text-[10px] px-2 py-0.5 shrink-0 ${isUserActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                        {isUserActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-ink-soft pt-1 font-mono">
                      <span>Phone: <span className="font-semibold text-ink">{u.phone || '—'}</span></span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                      >
                        <Edit3 size={13} /> Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => openResetPassword(u)}
                        className="btn-secondary text-[11px] py-1 px-2.5 text-brand flex items-center gap-1 font-semibold"
                      >
                        <KeyRound size={13} /> Password
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRequestToggleStatus(u)}
                        className={`text-[11px] py-1 px-2.5 rounded-xl font-semibold flex items-center gap-1 border ${
                          isUserActive
                            ? 'text-rose-700 bg-rose-50/50 border-rose-200'
                            : 'text-emerald-800 bg-emerald-50/50 border-emerald-200'
                        }`}
                      >
                        <Power size={13} /> {isUserActive ? 'Disable' : 'Activate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="card max-w-md w-full p-6 space-y-4 bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Edit3 size={18} className="text-brand" /> Edit User Account
              </h3>
              <button onClick={() => setEditingUser(null)} className="p-1 text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="input-field py-1.5"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Phone Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  className="input-field py-1.5 font-mono"
                  placeholder="9876543210"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Role Permissions</label>
                <select
                  className="input-field py-1.5 font-medium"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="receptionist">Receptionist</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
                {editForm.role !== editingUser.role && (
                  <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                    <ShieldAlert size={13} /> Changing role requires confirmation step.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-1.5 px-4 text-xs font-semibold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM ROLE CHANGE MODAL */}
      <ConfirmModal
        isOpen={Boolean(pendingRoleChange)}
        onClose={() => setPendingRoleChange(null)}
        onConfirm={confirmRoleChange}
        title="Confirm User Role Modification"
        message={
          pendingRoleChange ? (
            <div className="space-y-2 text-xs">
              <p>
                Are you sure you want to change role for <strong>{pendingRoleChange.name}</strong> from{' '}
                <span className="badge bg-slate-100 text-slate-800 uppercase font-mono">{pendingRoleChange.oldRole}</span> to{' '}
                <span className="badge bg-brand-light/40 text-brand-dark uppercase font-mono">{pendingRoleChange.newRole}</span>?
              </p>
              <p className="text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                This will immediately modify their module access rights across the platform.
              </p>
            </div>
          ) : (
            ''
          )
        }
        confirmText="Confirm Role Change"
        cancelText="Cancel"
        variant="warning"
      />

      {/* RESET PASSWORD MODAL */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="card max-w-md w-full p-6 space-y-4 bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <KeyRound size={18} className="text-brand" /> Reset Password
              </h3>
              <button onClick={() => setResetUser(null)} className="p-1 text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-ink-soft">
              Resetting password for user account: <strong className="text-ink font-mono">{resetUser.email}</strong> ({resetUser.name}).
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input-field py-1.5 font-mono"
                  placeholder="At least 6 characters"
                  value={resetPasswords.newPassword}
                  onChange={(e) => setResetPasswords({ ...resetPasswords, newPassword: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input-field py-1.5 font-mono"
                  placeholder="Re-enter new password"
                  value={resetPasswords.confirmPassword}
                  onChange={(e) => setResetPasswords({ ...resetPasswords, confirmPassword: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-1.5 px-4 text-xs font-semibold">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS TOGGLE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(statusToggleConfirmUser)}
        onClose={() => setStatusToggleConfirmUser(null)}
        onConfirm={executeToggleStatus}
        title={statusToggleConfirmUser?.isCurrentlyActive ? 'Deactivate User Account' : 'Reactivate User Account'}
        message={
          statusToggleConfirmUser ? (
            <div className="space-y-2 text-xs">
              <p>
                Are you sure you want to {statusToggleConfirmUser.isCurrentlyActive ? 'deactivate' : 'reactivate'} staff account <strong>"{statusToggleConfirmUser.name}"</strong>?
              </p>
              <p className={statusToggleConfirmUser.isCurrentlyActive ? "text-rose-800 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-medium" : "text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 font-medium"}>
                {statusToggleConfirmUser.isCurrentlyActive
                  ? "Deactivated users will be prevented from logging in and accessing system features until reactivated."
                  : "This user will regain full system login access."}
              </p>
            </div>
          ) : ''
        }
        confirmText={statusToggleConfirmUser?.isCurrentlyActive ? 'Deactivate Account' : 'Activate Account'}
        cancelText="Cancel"
        variant={statusToggleConfirmUser?.isCurrentlyActive ? 'danger' : 'info'}
      />
    </div>
  );
}
