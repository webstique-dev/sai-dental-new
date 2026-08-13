import { useEffect, useState } from 'react';
import { UserPlus, Power, AlertCircle, Edit3, KeyRound, CheckCircle2, X, ShieldAlert } from 'lucide-react';
import api from '../../api/axios.js';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

const ROLE_BADGE = {
  admin: 'bg-role-adminSoft text-role-admin',
  receptionist: 'bg-role-receptionSoft text-role-reception',
  doctor: 'bg-role-doctorSoft text-role-doctor',
};

export default function AdminUsers() {
  const { showSuccess, showError } = useNotification();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/users', form);
      setForm({ name: '', email: '', phone: '', password: '', role: 'receptionist' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(id) {
    try {
      const { data } = await api.patch(`/users/${id}/disable`);
      setUsers((prev) =>
        prev.map((u) => ((u.id === id || u._id === id) ? data.user : u))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user.');
    }
  }

  // --- EDIT USER HANDLERS ---
  function openEdit(u) {
    setEditingUser(u);
    setEditForm({ name: u.name || '', phone: u.phone || '', role: u.role || 'receptionist' });
    setPendingRoleChange(null);
    setError('');
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    const userId = editingUser.id || editingUser._id;
    if (editForm.role !== editingUser.role) {
      // Show confirmation dialog before changing role
      setPendingRoleChange({
        id: userId,
        name: editForm.name,
        oldRole: editingUser.role,
        newRole: editForm.role,
      });
      return;
    }

    submitUserUpdate(userId, { name: editForm.name, phone: editForm.phone, role: editForm.role });
  }

  async function submitUserUpdate(id, payload) {
    setError('');
    try {
      const { data } = await api.patch(`/users/${id}`, payload);
      setUsers((prev) =>
        prev.map((u) => ((u.id === id || u._id === id) ? data.user : u))
      );
      setEditingUser(null);
      setPendingRoleChange(null);
      showSuccess(`Updated role for ${data.user.name} successfully.`);
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
    setResetError('');
    setResetSuccess('');
  }

  async function handleResetPasswordSubmit(e) {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (resetPasswords.newPassword !== resetPasswords.confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    if (resetPasswords.newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }

    const userId = resetUser.id || resetUser._id;
    try {
      await api.post(`/users/${userId}/reset-password`, {
        newPassword: resetPasswords.newPassword,
      });
      setResetSuccess(
        `Password reset successfully for ${resetUser.name}! Please share the new password with the user securely.`
      );
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to reset password.');
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

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-state-dangerSoft px-3.5 py-3 text-sm text-state-danger border border-state-danger/20">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ADD USER FORM */}
      {showForm && (
        <form onSubmit={handleCreate} className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Full name *</label>
            <input
              required
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Email *</label>
            <input
              required
              type="email"
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Phone</label>
            <input
              className="input-field"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Role *</label>
            <select
              className="input-field font-semibold"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="receptionist">Receptionist</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-ink">Temporary password *</label>
            <input
              required
              minLength={6}
              type="text"
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating…' : 'Create user'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* USER LIST TABLE */}
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-bg">
            <tr>
              <th className="px-4 py-3 font-semibold text-ink-soft">Name</th>
              <th className="px-4 py-3 font-semibold text-ink-soft">Email & Phone</th>
              <th className="px-4 py-3 font-semibold text-ink-soft">Role</th>
              <th className="px-4 py-3 font-semibold text-ink-soft">Status</th>
              <th className="px-4 py-3 font-semibold text-ink-soft text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-soft">Loading users…</td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-soft">No users registered yet.</td>
              </tr>
            )}
            {users.map((u) => {
              const uId = u.id || u._id;
              return (
                <tr key={uId} className="border-b border-border last:border-0 hover:bg-bg/40">
                  <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    <div>{u.email}</div>
                    {u.phone && <div className="text-xs text-ink-soft/70">{u.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge capitalize ${ROLE_BADGE[u.role] || ''}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge capitalize ${
                        u.status === 'active' ? 'bg-state-successSoft text-state-success' : 'bg-state-dangerSoft text-state-danger'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(u)}
                        title="Edit User"
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand-light/30 border border-transparent hover:border-brand/20 transition-colors"
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>

                      <button
                        onClick={() => openResetPassword(u)}
                        title="Reset Password"
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                      >
                        <KeyRound size={14} />
                        Reset Pass
                      </button>

                      <button
                        onClick={() => toggleStatus(uId)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:bg-bg border border-transparent hover:border-border"
                      >
                        <Power size={14} />
                        {u.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-md max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Edit3 size={18} className="text-brand" /> Edit Staff User Details
              </h3>
              <button onClick={() => setEditingUser(null)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Email (Read-Only)</label>
                <input
                  disabled
                  type="text"
                  className="input-field bg-bg text-ink-soft cursor-not-allowed"
                  value={editingUser.email}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  className="input-field"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Phone Number</label>
                <input
                  type="text"
                  className="input-field"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Role *</label>
                <select
                  className="input-field font-semibold"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="receptionist">Receptionist</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REUSABLE ROLE CHANGE CONFIRMATION POPUP */}
      <ConfirmModal
        isOpen={Boolean(pendingRoleChange)}
        onClose={() => setPendingRoleChange(null)}
        onConfirm={confirmRoleChange}
        title="Confirm User Role Change"
        message={
          pendingRoleChange ? (
            <div className="space-y-2">
              <p>
                Change <strong>{pendingRoleChange.name}</strong>'s role from{' '}
                <span className="badge capitalize bg-slate-100 text-slate-800">{pendingRoleChange.oldRole}</span> to{' '}
                <span className="badge capitalize bg-brand-light text-brand-dark font-bold">
                  {pendingRoleChange.newRole}
                </span>
                ?
              </p>
              <p className="text-[11px] text-ink-soft">
                Changing a user's role modifies what clinic features, patient records, and operational tabs they can access.
              </p>
            </div>
          ) : (
            'Are you sure you want to change this user role?'
          )
        }
        confirmText="Confirm Role Change"
        cancelText="Cancel"
        variant="warning"
      />

      {/* RESET PASSWORD MODAL */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-md max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <KeyRound size={18} className="text-amber-600" /> Reset Password for {resetUser.name}
              </h3>
              <button onClick={() => setResetUser(null)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            {resetSuccess ? (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs space-y-4">
                  <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-4 font-medium text-emerald-900 border border-emerald-200">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{resetSuccess}</span>
                  </div>
                </div>
                <div className="flex justify-end px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    onClick={() => setResetUser(null)}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                  {resetError && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                      <AlertCircle size={16} className="text-rose-600 shrink-0" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">New Password *</label>
                    <input
                      required
                      minLength={6}
                      type="text"
                      className="input-field"
                      placeholder="Minimum 6 characters"
                      value={resetPasswords.newPassword}
                      onChange={(e) =>
                        setResetPasswords({ ...resetPasswords, newPassword: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Confirm New Password *</label>
                    <input
                      required
                      minLength={6}
                      type="text"
                      className="input-field"
                      placeholder="Re-enter new password"
                      value={resetPasswords.confirmPassword}
                      onChange={(e) =>
                        setResetPasswords({ ...resetPasswords, confirmPassword: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => setResetUser(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-xs bg-amber-600 hover:bg-amber-700 text-white">
                    Reset Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
