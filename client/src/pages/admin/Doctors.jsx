import { useState, useEffect } from 'react';
import {
  Stethoscope, Users, CheckCircle2, Award, DollarSign, Clock, Edit3, X, Save,
  ShieldAlert, RefreshCw, Activity, Calendar
} from 'lucide-react';
import api from '../../api/axios.js';

const DEFAULT_DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [profileForm, setProfileForm] = useState({
    specialization: '',
    qualification: '',
    consultationFee: 500,
    workingHours: [],
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', msg: '' });

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

    let hours = existing.workingHours;
    if (!Array.isArray(hours) || hours.length === 0) {
      hours = DEFAULT_DAYS.map((day) => ({
        day,
        startTime: '09:00',
        endTime: '18:00',
        isAvailable: day !== 'Sunday',
      }));
    }

    setEditingDoctor(doc);
    setProfileForm({
      specialization: existing.specialization || doc.specialization || 'General Dentistry',
      qualification: existing.qualification || 'BDS',
      consultationFee: existing.consultationFee ?? 500,
      workingHours: JSON.parse(JSON.stringify(hours)),
    });
    setFeedback({ type: '', msg: '' });
  };

  const handleWorkingHourChange = (idx, field, value) => {
    const updated = [...profileForm.workingHours];
    updated[idx] = { ...updated[idx], [field]: value };
    setProfileForm({ ...profileForm, workingHours: updated });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editingDoctor) return;

    const dId = editingDoctor._id || editingDoctor.id;
    setSaving(true);
    setFeedback({ type: '', msg: '' });

    try {
      const payload = {
        specialization: profileForm.specialization.trim(),
        qualification: profileForm.qualification.trim(),
        consultationFee: Number(profileForm.consultationFee) || 0,
        workingHours: profileForm.workingHours,
      };

      const res = await api.patch(`/doctor-profiles/${dId}`, payload);
      const updatedProfile = res.data?.profile;

      setProfilesMap((prev) => ({ ...prev, [dId]: updatedProfile }));

      setFeedback({ type: 'success', msg: 'Doctor profile and working hours saved.' });
      setTimeout(() => {
        setEditingDoctor(null);
        fetchDoctorData();
      }, 1000);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message || 'Failed to save doctor profile.' });
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
            <Stethoscope size={26} className="text-brand" /> Doctor Management & Roster
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Configure doctor specializations, working schedules, consultation fees, and inspect performance snapshots.
          </p>
        </div>

        <button onClick={fetchDoctorData} className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Roster
        </button>
      </div>

      {/* DOCTORS TABLE */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading doctor roster & stats...</div>
      ) : doctors.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Stethoscope size={36} className="mx-auto text-ink-soft/40" />
          <p className="font-display text-base font-semibold text-ink">No Doctor Accounts Found</p>
          <p className="text-xs text-ink-soft">Go to Admin &gt; Users to create new staff accounts with the 'doctor' role.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Doctor</th>
                  <th className="px-5 py-3.5">Specialization</th>
                  <th className="px-5 py-3.5">Fee</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Performance Snapshot</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {doctors.map((doc) => {
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

                      {/* Consultation Fee */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                          ₹{prof.consultationFee ?? 500}
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
        </div>
      )}

      {/* EDIT DOCTOR PROFILE & SCHEDULE MODAL */}
      {editingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
          <div className="card max-w-2xl w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <div>
                <h3 className="font-display text-base font-bold text-ink">
                  Edit Profile: Dr. {editingDoctor.name}
                </h3>
                <p className="text-xs text-ink-soft">{editingDoctor.email}</p>
              </div>
              <button onClick={() => setEditingDoctor(null)} className="p-1 text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
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

                {/* Specialization, Qualification, Consultation Fee */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Specialization</label>
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
                    <label className="block font-semibold text-ink-soft mb-1">Qualification</label>
                    <input
                      type="text"
                      className="input-field py-1.5"
                      placeholder="e.g. BDS, MDS"
                      value={profileForm.qualification}
                      onChange={(e) => setProfileForm({ ...profileForm, qualification: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Consultation Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="input-field py-1.5 font-mono"
                      value={profileForm.consultationFee}
                      onChange={(e) => setProfileForm({ ...profileForm, consultationFee: e.target.value })}
                    />
                  </div>
                </div>

                {/* Working Hours Schedule Configuration */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <h4 className="font-bold text-ink flex items-center gap-1.5">
                    <Calendar size={15} className="text-brand" /> Working Hours & Weekly Roster
                  </h4>
                  <p className="text-[11px] text-ink-soft">
                    Configure day-wise shifts and availability status for online appointments.
                  </p>

                  <div className="divide-y divide-border border rounded-xl overflow-hidden bg-bg/40">
                    {profileForm.workingHours.map((wh, idx) => (
                      <div key={wh.day} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer w-24 font-bold text-ink shrink-0">
                          <input
                            type="checkbox"
                            checked={wh.isAvailable}
                            onChange={(e) => handleWorkingHourChange(idx, 'isAvailable', e.target.checked)}
                            className="rounded border-border text-brand focus:ring-brand"
                          />
                          <span>{wh.day}</span>
                        </label>

                        {wh.isAvailable ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              className="input-field py-1 px-2 text-xs font-mono"
                              value={wh.startTime}
                              onChange={(e) => handleWorkingHourChange(idx, 'startTime', e.target.value)}
                            />
                            <span className="text-ink-soft font-semibold">to</span>
                            <input
                              type="time"
                              className="input-field py-1 px-2 text-xs font-mono"
                              value={wh.endTime}
                              onChange={(e) => handleWorkingHourChange(idx, 'endTime', e.target.value)}
                            />
                          </div>
                        ) : (
                          <span className="text-rose-600 font-semibold text-[11px] italic bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Day Off / Not Available
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
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
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Profile & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
