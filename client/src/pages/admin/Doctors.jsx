import { useState, useEffect, useMemo } from 'react';
import {
  Stethoscope, Edit3, X, Save,
  RefreshCw, Calendar, Search, Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../api/axios.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import { TableSkeleton } from '../../components/common/TableSkeleton.jsx';

const DEFAULT_DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export default function AdminDoctors() {
  const { showSuccess, showError } = useNotification();
  const [doctors, setDoctors] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [expandedDoctorId, setExpandedDoctorId] = useState(null);

  // Edit Modal State
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    email: '',
    specialization: '',
    qualification: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      // 1. Fetch all doctor profiles
      const profRes = await api.get('/doctor-profiles');
      const profileList = profRes.data?.profiles || [];

      // 2. Fetch doctor users list
      const userRes = await api.get('/users?role=doctor');
      const docUsers = userRes.data?.users || [];
      setDoctors(docUsers);

      const pMap = {};
      profileList.forEach((p) => {
        const uId = p.user?._id || p.user?.id || p.user;
        if (uId) {
          pMap[uId.toString()] = p;
        }
      });
      setProfilesMap(pMap);

      // 3. Fetch stats snapshot for each doctor
      const sMap = {};
      await Promise.all(
        docUsers.map(async (doc) => {
          const dId = doc._id || doc.id;
          try {
            const stRes = await api.get(`/doctor-profiles/${dId}/stats`);
            sMap[dId] = stRes.data?.stats || {
              patientsHandled: 0,
              consultationsCount: 0,
              treatmentsCompleted: 0,
              followUpsCount: 0,
            };
          } catch (e) {
            sMap[dId] = { patientsHandled: 0, consultationsCount: 0, treatmentsCompleted: 0, followUpsCount: 0 };
          }
        })
      );
      setStatsMap(sMap);
    } catch (err) {
      console.error('Failed to load doctors management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const handleOpenEdit = (doc) => {
    const dId = doc._id || doc.id;
    const existing = profilesMap[dId] || {};

    setEditingDoctor(doc);
    setProfileForm({
      name: doc.name || '',
      phone: doc.phone || '',
      email: doc.email || '',
      specialization: existing.specialization || doc.specialization || 'General Dentistry',
      qualification: existing.qualification || 'BDS',
      status: doc.status || 'active',
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editingDoctor) return;

    const dId = editingDoctor._id || editingDoctor.id;
    setSaving(true);

    try {
      const payload = {
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
        specialization: profileForm.specialization.trim(),
        qualification: profileForm.qualification.trim(),
        status: profileForm.status,
      };

      const res = await api.patch(`/doctor-profiles/${dId}`, payload);
      const updatedProfile = res.data?.profile;

      if (updatedProfile) {
        setProfilesMap((prev) => ({ ...prev, [dId]: updatedProfile }));
      }

      showSuccess('Doctor profile details updated successfully.');
      setEditingDoctor(null);
      fetchDoctorData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save doctor profile.');
    } finally {
      setSaving(false);
    }
  };

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const dId = doc._id || doc.id;
      const prof = profilesMap[dId] || {};
      return (
        doc.name?.toLowerCase().includes(q) ||
        doc.email?.toLowerCase().includes(q) ||
        prof.specialization?.toLowerCase().includes(q) ||
        prof.qualification?.toLowerCase().includes(q)
      );
    });
  }, [doctors, search, profilesMap]);

  return (
    <div className="space-y-6 max-w-7xl w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink flex items-center gap-2 min-w-0 leading-tight">
            <Stethoscope size={26} className="text-brand shrink-0" />
            <span className="truncate sm:whitespace-normal">Doctor Management & Roster</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed break-words">
            Configure doctor specializations, working schedules, consultation fees, and inspect performance snapshots.
          </p>
        </div>

        <button onClick={fetchDoctorData} className="btn-secondary text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Roster</span>
        </button>
      </div>

      {/* Desktop Search & Filter Bar (≥768px) */}
      <div className="hidden md:block card p-4 bg-surface border-border space-y-3">
        <div className="flex flex-row items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              className="input-field pl-9 py-2 text-xs w-full"
              placeholder="Search doctors by name, specialization, qualification, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink">
                <X size={14} />
              </button>
            )}
          </div>
          <span className="text-xs text-ink-soft font-medium">
            Showing {filteredDoctors.length} of {doctors.length} doctor account(s)
          </span>
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
              {search && (
                <span className="badge bg-brand text-white text-[10px] py-0.5 px-2 font-bold shrink-0 truncate max-w-[120px]">
                  "{search}"
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
                placeholder="Search doctors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="text-[11px] text-ink-soft font-medium">
              Showing {filteredDoctors.length} of {doctors.length} doctor account(s)
            </div>
          </div>
        )}
      </div>

      {/* DOCTORS TABLE & CARDS */}
      {loading ? (
        <div className="card overflow-hidden">
          <TableSkeleton rows={5} cols={6} />
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Stethoscope size={36} className="mx-auto text-ink-soft/40" />
          <p className="font-display text-base font-semibold text-ink">No Doctor Accounts Found</p>
          <p className="text-xs text-ink-soft">
            {search ? 'No doctors match your search query.' : "Go to Admin > Users to create new staff accounts with the 'doctor' role."}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop Table View (≥768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Doctor</th>
                  <th className="px-5 py-3.5">Specialization</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Performance Snapshot</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDoctors.map((doc) => {
                  const dId = doc._id || doc.id;
                  const prof = profilesMap[dId] || {};
                  const stats = statsMap[dId] || { patientsHandled: 0, consultationsCount: 0, treatmentsCompleted: 0, followUpsCount: 0 };
                  const isActive = doc.status !== 'inactive';

                  return (
                    <tr
                      key={dId}
                      onClick={() => handleOpenEdit(doc)}
                      className="hover:bg-bg/60 transition-colors cursor-pointer group"
                    >
                      {/* Doctor Name & Email */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-brand-light/40 text-brand flex items-center justify-center font-bold text-sm shrink-0">
                            <Stethoscope size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-ink text-sm group-hover:text-brand transition-colors flex items-center gap-2">
                              Dr. {doc.name}
                              <span className="text-[10px] font-normal text-ink-soft bg-bg px-1.5 py-0.5 rounded border border-border">
                                {prof.qualification || 'BDS'}
                              </span>
                            </div>
                            <div className="text-[11px] text-ink-soft">{doc.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Specialization */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-semibold text-ink">
                          {prof.specialization || doc.specialization || 'General Dentistry'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`badge text-[10px] ${isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Performance Stats */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 text-[11px]">
                          <div className="bg-bg px-2.5 py-1 rounded-lg border border-border text-center">
                            <span className="text-[10px] text-ink-soft block font-semibold">Patients</span>
                            <span className="font-bold text-ink">{stats.patientsHandled}</span>
                          </div>
                          <div className="bg-bg px-2.5 py-1 rounded-lg border border-border text-center">
                            <span className="text-[10px] text-ink-soft block font-semibold">Visits</span>
                            <span className="font-bold text-brand">{stats.consultationsCount}</span>
                          </div>
                          <div className="bg-bg px-2.5 py-1 rounded-lg border border-border text-center">
                            <span className="text-[10px] text-ink-soft block font-semibold">Treatments</span>
                            <span className="font-bold text-indigo-700">{stats.treatmentsCompleted}</span>
                          </div>
                          <div className="bg-bg px-2.5 py-1 rounded-lg border border-border text-center">
                            <span className="text-[10px] text-ink-soft block font-semibold">Followups</span>
                            <span className="font-bold text-emerald-700">{stats.followUpsCount}</span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(doc);
                          }}
                          className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 font-semibold"
                        >
                          <Edit3 size={14} /> Edit Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (<768px down to 320px) */}
          <div className="block md:hidden divide-y divide-border">
            {filteredDoctors.map((doc) => {
              const dId = doc._id || doc.id;
              const prof = profilesMap[dId] || {};
              const stats = statsMap[dId] || { patientsHandled: 0, consultationsCount: 0, treatmentsCompleted: 0, followUpsCount: 0 };
              const isActive = doc.status !== 'inactive';
              const isExpanded = expandedDoctorId === dId;

              return (
                <div key={dId} className="p-4 space-y-3 hover:bg-bg/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-brand-light/40 text-brand flex items-center justify-center font-bold text-sm shrink-0">
                        <Stethoscope size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-ink text-sm truncate">Dr. {doc.name}</span>
                          <span className="text-[10px] font-normal text-ink-soft bg-bg px-1.5 py-0.5 rounded border border-border shrink-0">
                            {prof.qualification || 'BDS'}
                          </span>
                        </div>
                        <div className="text-xs text-ink-soft truncate font-mono">{doc.email}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedDoctorId(isExpanded ? null : dId)}
                      className="p-1.5 rounded-lg border border-border text-ink-soft hover:text-ink hover:bg-bg shrink-0 mt-0.5"
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-semibold text-brand">
                      {prof.specialization || doc.specialization || 'General Dentistry'}
                    </span>
                    <span className={`badge text-[10px] ${isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t border-border/70 space-y-3 text-xs animate-in fade-in duration-150">
                      <div className="grid grid-cols-2 gap-2 text-ink-soft bg-bg/50 p-2.5 rounded-xl border border-border text-[11px]">
                        <div className="text-center">
                          <span className="block text-[10px] font-semibold text-ink-soft uppercase">Patients</span>
                          <span className="font-bold text-ink text-xs">{stats.patientsHandled}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[10px] font-semibold text-ink-soft uppercase">Visits</span>
                          <span className="font-bold text-brand text-xs">{stats.consultationsCount}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[10px] font-semibold text-ink-soft uppercase">Treatments</span>
                          <span className="font-bold text-indigo-700 text-xs">{stats.treatmentsCompleted}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[10px] font-semibold text-ink-soft uppercase">Follow-Ups</span>
                          <span className="font-bold text-emerald-700 text-xs">{stats.followUpsCount}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(doc)}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold w-full sm:w-auto justify-center"
                        >
                          <Edit3 size={14} /> Edit Profile & Schedule
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EDIT DOCTOR PROFILE MODAL */}
      {editingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-2 sm:p-4 overflow-hidden !mt-0">
          <div className="card max-w-xl w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150 !mt-0 !my-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <div>
                <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                  <Stethoscope size={18} className="text-brand" /> Edit Doctor Profile Details
                </h3>
                <p className="text-xs text-ink-soft">View and update practitioner details for Dr. {editingDoctor.name}</p>
              </div>
              <button onClick={() => setEditingDoctor(null)} className="p-1 text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col flex-1 overflow-hidden min-h-0 !mt-0 !mb-0">
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-4 text-xs">
                {/* Doctor Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Doctor Name *</label>
                    <input
                      type="text"
                      required
                      className="input-field py-1.5"
                      placeholder="Dr. Full Name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Email Address</label>
                    <input
                      type="email"
                      disabled
                      className="input-field py-1.5 bg-bg text-ink-soft cursor-not-allowed"
                      value={profileForm.email}
                    />
                  </div>
                </div>

                {/* Phone Number & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Phone Number</label>
                    <input
                      type="tel"
                      maxLength={10}
                      className="input-field py-1.5 font-mono"
                      placeholder="10-digit phone number"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Account Status</label>
                    <select
                      className="input-field py-1.5"
                      value={profileForm.status}
                      onChange={(e) => setProfileForm({ ...profileForm, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>

                {/* Specialization & Qualification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Specialization *</label>
                    <input
                      type="text"
                      required
                      className="input-field py-1.5"
                      placeholder="e.g. Orthodontics, Endodontics"
                      value={profileForm.specialization}
                      onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Qualification / Degrees</label>
                    <input
                      type="text"
                      className="input-field py-1.5"
                      placeholder="e.g. BDS, MDS, DNB"
                      value={profileForm.qualification}
                      onChange={(e) => setProfileForm({ ...profileForm, qualification: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0 !mt-0 !mb-0">
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
