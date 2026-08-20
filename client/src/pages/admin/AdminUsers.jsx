import { useEffect, useState } from 'react';
import { UserPlus, Power, Edit3, KeyRound, X, ShieldAlert } from 'lucide-react';
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Users & Staff Accounts</h2>
          <p className="mt-1 text-sm text-ink-soft">Manage staff credentials, role permissions, and active status.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 space-y-4">
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

      {/* User Accounts Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-soft">No staff users registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const userId = u.id || u._id;
                  const isUserActive = u.status === 'active' || u.isActive === true;

                  return (
                    <tr key={userId} className="hover:bg-bg/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-ink">{u.name}</td>
                      <td className="px-4 py-3 text-ink-soft font-mono">{u.email}</td>
                      <td className="px-4 py-3 text-ink-soft">{u.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${ROLE_BADGE[u.role] || 'bg-bg text-ink-soft'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge font-bold border text-[11px] px-2 py-0.5 ${isUserActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                          {isUserActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-soft hover:text-ink hover:bg-bg p-1.5 rounded-lg transition-colors"
                            title="Edit User Details & Role"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openResetPassword(u)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:bg-brand-light/30 p-1.5 rounded-lg transition-colors"
                            title="Reset User Password"
                          >
                            <KeyRound size={14} />
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
