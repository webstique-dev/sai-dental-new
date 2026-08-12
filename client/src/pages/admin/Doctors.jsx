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

      {/* DOCTORS GRID */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading doctor roster & stats...</div>
      ) : doctors.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Stethoscope size={36} className="mx-auto text-ink-soft/40" />
          <p className="font-display text-base font-semibold text-ink">No Doctor Accounts Found</p>
          <p className="text-xs text-ink-soft">Go to Admin &gt; Users to create new staff accounts with the 'doctor' role.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((doc) => {
            const dId = doc._id || doc.id;
            const prof = profilesMap[dId] || {};
            const stats = statsMap[dId] || { patientsHandled: 0, consultationsCount: 0, treatmentsCompleted: 0, followUpsCount: 0 };
            const isActive = doc.status !== 'inactive';

            return (
              <div
                key={dId}
                onClick={() => handleOpenEdit(doc)}
                className="card p-5 space-y-4 hover:border-brand/40 transition-all cursor-pointer relative group"
              >
                {/* Status Indicator */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-bold text-ink group-hover:text-brand transition-colors">
                        Dr. {doc.name}
                      </h3>
                    </div>
                    <p className="text-xs text-ink-soft font-medium">{prof.specialization || doc.specialization || 'General Dentistry'}</p>
                    <p className="text-[11px] text-ink-soft/70">{prof.qualification || 'BDS'}</p>
                  </div>

                  <span
                    className={`badge text-[10px] ${
                      isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Consultation Fee & Schedule info */}
                <div className="flex items-center justify-between text-xs bg-bg p-2.5 rounded-lg border border-border">
                  <div className="flex items-center gap-1 font-semibold text-ink">
                    <DollarSign size={14} className="text-emerald-600" />
                    <span>Fee: ₹{prof.consultationFee ?? 500}</span>
                  </div>
                  <div className="flex items-center gap-1 text-ink-soft">
                    <Clock size={14} className="text-brand" />
                    <span>Schedule Configured</span>
                  </div>
                </div>

                {/* Stats Snapshot */}
                <div className="grid grid-cols-4 gap-2 pt-1 text-center border-t border-border/60">
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-ink-soft font-semibold">Patients</div>
                    <div className="text-sm font-bold text-ink">{stats.patientsHandled}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-ink-soft font-semibold">Visits</div>
                    <div className="text-sm font-bold text-brand">{stats.consultationsCount}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-ink-soft font-semibold">Treatments</div>
                    <div className="text-sm font-bold text-indigo-700">{stats.treatmentsCompleted}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-ink-soft font-semibold">Followups</div>
                    <div className="text-sm font-bold text-emerald-700">{stats.followUpsCount}</div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <span className="text-xs text-brand font-semibold group-hover:underline flex items-center gap-1">
                    <Edit3 size={13} /> Edit Profile & Schedule
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT DOCTOR PROFILE & SCHEDULE MODAL */}
      {editingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="card max-w-2xl w-full p-6 space-y-5 bg-surface max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
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

            {feedback.msg && (
              <div
                className={`p-3 rounded text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? <CheckCircle2 size={15} /> : <ShieldAlert size={15} />}
                <span>{feedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
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
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {profileForm.workingHours.map((wh, idx) => (
                    <div
                      key={wh.day}
                      className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-2.5 rounded-lg border text-xs ${
                        wh.isAvailable ? 'bg-bg border-border' : 'bg-slate-100/60 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="w-24 font-bold text-ink flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={wh.isAvailable}
                          onChange={(e) => handleWorkingHourChange(idx, 'isAvailable', e.target.checked)}
                          className="rounded border-border text-brand focus:ring-brand"
                        />
                        <span>{wh.day}</span>
                      </div>

                      {wh.isAvailable ? (
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-[11px] text-ink-soft">Start:</span>
                          <input
                            type="time"
                            className="input-field py-1 text-xs w-28 font-mono"
                            value={wh.startTime}
                            onChange={(e) => handleWorkingHourChange(idx, 'startTime', e.target.value)}
                          />
                          <span className="text-[11px] text-ink-soft">End:</span>
                          <input
                            type="time"
                            className="input-field py-1 text-xs w-28 font-mono"
                            value={wh.endTime}
                            onChange={(e) => handleWorkingHourChange(idx, 'endTime', e.target.value)}
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-rose-700 italic">Off Duty / Not Available</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
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
