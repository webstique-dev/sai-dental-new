import { useState, useEffect } from 'react';
import { User, Stethoscope, Award, Phone, Mail, DollarSign, Save, Sparkles, CheckCircle2, ShieldCheck, Printer } from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

export default function DoctorAccount() {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: 'General Dentistry',
    qualification: 'BDS, MDS',
    consultationFee: 500,
  });

  const [stats, setStats] = useState({
    patientsHandled: 0,
    consultationsCount: 0,
    treatmentsCompleted: 0,
  });

  useEffect(() => {
    if (!user) return;
    const userId = user._id || user.id;

    async function loadDoctorProfile() {
      try {
        setLoading(true);
        const [profRes, statsRes] = await Promise.all([
          api.get(`/doctor-profiles/${userId}`).catch(() => ({ data: {} })),
          api.get(`/doctor-profiles/${userId}/stats`).catch(() => ({ data: {} })),
        ]);

        const profile = profRes.data?.profile || {};
        const u = profile.user || user;

        setFormData({
          name: u.name || user.name || '',
          email: u.email || user.email || '',
          phone: u.phone || user.phone || '',
          specialization: profile.specialization || u.specialization || 'General Dentistry',
          qualification: profile.qualification || 'BDS, MDS - Dental Specialist',
          consultationFee: profile.consultationFee !== undefined ? profile.consultationFee : 500,
        });

        if (statsRes.data?.stats) {
          setStats(statsRes.data.stats);
        }
      } catch (err) {
        console.error('Failed to load doctor account details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDoctorProfile();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const userId = user._id || user.id;

    try {
      setSubmitting(true);
      await api.patch(`/doctor-profiles/${userId}`, {
        name: formData.name,
        phone: formData.phone,
        specialization: formData.specialization,
        qualification: formData.qualification,
        consultationFee: Number(formData.consultationFee),
      });

      showSuccess('Your account & prescription profile details have been updated!');
    } catch (err) {
      console.error('Failed to update doctor profile:', err);
      showError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-ink-soft flex flex-col items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 rounded-full border-2 border-brand border-t-transparent animate-spin mb-3"></div>
        <p className="font-semibold text-ink">Loading account details...</p>
      </div>
    );
  }

  const docDisplayName = formData.name.startsWith('Dr.') ? formData.name : `Dr. ${formData.name}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Page Header Banner */}
      <div className="card p-6 bg-gradient-to-r from-surface via-surface to-brand-light/20 border-border relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="badge bg-brand/10 text-brand font-bold text-xs flex items-center gap-1">
                <ShieldCheck size={13} /> Verified Practitioner
              </span>
              <span className="text-xs text-ink-soft">• Account & Prescriptions</span>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">
              My Account & Doctor Profile
            </h1>
            <p className="text-xs text-ink-soft max-w-2xl font-medium">
              Update your qualifications, specialization, and doctor details. These credentials will automatically appear on all generated prescription slips and official consultation records.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="card p-6 space-y-6 bg-surface">
            <div className="border-b border-border pb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <User size={18} className="text-brand" />
                <span>Personal & Professional Credentials</span>
              </h3>
              <span className="text-xs text-ink-soft font-mono">Role: Doctor</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1">
                  <User size={14} className="text-brand" /> Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="input-field font-semibold"
                  placeholder="e.g. Dr. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <p className="text-[11px] text-ink-soft mt-1">Include "Dr." title if desired.</p>
              </div>

              {/* Email Address (Read Only) */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1">
                  <Mail size={14} className="text-brand" /> Email Address
                </label>
                <input
                  type="email"
                  disabled
                  className="input-field bg-bg cursor-not-allowed opacity-75 font-medium"
                  value={formData.email}
                />
                <p className="text-[11px] text-ink-soft mt-1">Used for system login & notifications.</p>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1">
                  <Phone size={14} className="text-brand" /> Phone Number
                </label>
                <input
                  type="text"
                  className="input-field font-medium font-mono"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {/* Consultation Fee */}
              {/* <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1">
                  <DollarSign size={14} className="text-brand" /> Default Consultation Fee (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  className="input-field font-semibold font-mono"
                  placeholder="500"
                  value={formData.consultationFee}
                  onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                />
              </div> */}

              {/* Specialization */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1">
                  <Stethoscope size={14} className="text-brand" /> Clinical Specialization
                </label>
                <input
                  type="text"
                  className="input-field font-semibold"
                  placeholder="e.g. General Dentistry, Orthodontics & Oral Surgery"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />
              </div>

              {/* Qualifications & Degrees */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1">
                  <Award size={14} className="text-brand" /> Qualifications & Medical Degrees
                </label>
                <input
                  type="text"
                  className="input-field font-semibold"
                  placeholder="e.g. BDS, MDS - Oral & Maxillofacial Surgeon"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                />
                <p className="text-[11px] text-ink-soft mt-1">
                  This degree string will appear below your name on official printed prescription PDFs.
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end border-t border-border pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary text-xs py-2.5 px-6 flex items-center gap-2 shadow-md"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Account Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Prescription Header Preview & Stats */}
        <div className="space-y-6">
          {/* Live Prescription Preview Box */}
          <div className="card p-5 space-y-4 bg-surface border-brand/30 shadow-md">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-sm font-bold text-ink flex items-center gap-1.5">
                <Printer size={16} className="text-brand" />
                <span>Prescription Header Preview</span>
              </h3>
              <span className="badge bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold">
                Live Preview
              </span>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-extrabold text-[#0B1A2E] leading-tight">
                    {docDisplayName || 'Dr. Doctor Name'}
                  </h4>
                  <p className="text-xs font-bold text-[#1E64EA] mt-0.5">
                    {formData.qualification || 'BDS, MDS'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {formData.specialization || 'General Dentistry'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[11px] font-bold text-teal-600 block">
                    RX-0042-8A91
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="border-t border-sky-200/80 pt-2 flex items-center justify-between text-[11px] text-slate-600">
                <span>Phone: <strong className="font-mono">{formData.phone || '+91 98765 43210'}</strong></span>
                {/* <span>Fee: <strong className="font-mono text-emerald-700">₹{formData.consultationFee || 500}</strong></span> */}
              </div>
            </div>

            <p className="text-[11px] text-ink-soft italic text-center">
              Changes saved above will immediately update how your doctor details look when printing patient prescription slips.
            </p>
          </div>

          {/* Doctor Activity Stats */}
          <div className="card p-5 space-y-3 bg-surface">
            <h3 className="font-display text-xs font-bold text-ink uppercase tracking-wider text-ink-soft">
              Clinical Practice Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-bg border border-border/70 text-center">
                <span className="block font-mono font-extrabold text-lg text-brand">
                  {stats.patientsHandled || 0}
                </span>
                <span className="text-[11px] font-semibold text-ink-soft">Patients Handled</span>
              </div>
              <div className="p-3 rounded-xl bg-bg border border-border/70 text-center">
                <span className="block font-mono font-extrabold text-lg text-emerald-600">
                  {stats.consultationsCount || 0}
                </span>
                <span className="text-[11px] font-semibold text-ink-soft">Consultations</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
