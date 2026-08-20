import { useState, useEffect } from 'react';
import {
  Building2, Clock, CalendarDays, Receipt, Save, RefreshCw, Stethoscope, UserCheck, Star
} from 'lucide-react';
import api from '../../api/axios.js';
import { useNotification } from '../../context/NotificationContext.jsx';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ClinicSettings() {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [clinicName, setClinicName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [primaryDoctor, setPrimaryDoctor] = useState('');
  const [doctorsList, setDoctorsList] = useState([]);
  const [appointmentSlotDurationMinutes, setAppointmentSlotDurationMinutes] = useState(30);
  const [taxRate, setTaxRate] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [workingHours, setWorkingHours] = useState([]);
  const [lastUpdatedInfo, setLastUpdatedInfo] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [settingsRes, doctorsRes] = await Promise.all([
        api.get('/settings').catch(() => ({ data: {} })),
        api.get('/users/doctors').catch(() => ({ data: { doctors: [] } })),
      ]);

      const s = settingsRes.data?.settings || {};
      const dList = doctorsRes.data?.doctors || [];
      setDoctorsList(dList);

      setClinicName(s.clinicName || '');
      setAddress(s.address || '');
      setPhone(s.phone || '');
      setEmail(s.email || '');
      setPrimaryDoctor(s.primaryDoctor?._id || s.primaryDoctor || '');
      setAppointmentSlotDurationMinutes(s.appointmentSlotDurationMinutes || 30);
      setTaxRate(s.taxRate !== undefined ? s.taxRate : 0);
      setCurrency(s.currency || 'INR');

      // Ensure workingHours has all 7 days
      const hoursMap = {};
      (s.workingHours || []).forEach((h) => {
        hoursMap[h.day] = h;
      });

      const fullWorkingHours = DAYS_OF_WEEK.map((day) => {
        const existing = hoursMap[day];
        return {
          day,
          open: existing?.open || '09:00',
          close: existing?.close || '18:00',
          isOpen: existing?.isOpen !== undefined ? existing.isOpen : day !== 'Sunday',
        };
      });

      setWorkingHours(fullWorkingHours);
      if (s.updatedBy) {
        setLastUpdatedInfo({
          name: s.updatedBy.name || 'Admin',
          at: s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '',
        });
      }
    } catch (err) {
      console.error('Failed to load clinic settings:', err);
      showError(err.response?.data?.message || 'Failed to load clinic settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleWorkingHourChange = (index, field, value) => {
    const updated = [...workingHours];
    updated[index][field] = value;
    setWorkingHours(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        clinicName,
        address,
        phone,
        email,
        primaryDoctor: primaryDoctor || null,
        workingHours,
        appointmentSlotDurationMinutes: Number(appointmentSlotDurationMinutes) || 30,
        taxRate: Number(taxRate) || 0,
        currency,
      };

      const res = await api.patch('/settings', payload);
      showSuccess('Clinic settings updated successfully!');
      const s = res.data?.settings;
      if (s?.updatedBy) {
        setLastUpdatedInfo({
          name: s.updatedBy.name || 'Admin',
          at: s.updatedAt ? new Date(s.updatedAt).toLocaleString() : new Date().toLocaleString(),
        });
      }
    } catch (err) {
      console.error('Failed to update clinic settings:', err);
      showError(err.response?.data?.message || 'Failed to update clinic settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl animate-pulse">
        <div className="h-8 w-64 rounded bg-slate-200" />
        <div className="card p-6 space-y-4 bg-surface border border-slate-200">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="card p-6 space-y-4 bg-surface border border-slate-200">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="h-40 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <Building2 size={26} className="text-brand" /> Clinic Settings & Configuration
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Manage global clinic metadata, operational hours, slot durations, and default tax rates.
          </p>
        </div>

        {lastUpdatedInfo && (
          <div className="text-right text-[11px] text-ink-soft bg-surface border border-border px-3 py-1.5 rounded-xl">
            <span>Last updated by: <strong>{lastUpdatedInfo.name}</strong></span>
            {lastUpdatedInfo.at && <span className="block text-ink-soft/70">{lastUpdatedInfo.at}</span>}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: CLINIC INFO */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <Building2 size={18} className="text-brand" /> Clinic Information
            </h3>
            <p className="text-xs text-ink-soft">
              General contact details rendered on invoices, prescriptions, and headers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-ink-soft mb-1">Clinic Name *</label>
              <input
                required
                type="text"
                className="input-field"
                placeholder="e.g. Sai Dental Clinic – Digital Platform"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-soft mb-1">Contact Phone Number</label>
              <input
                type="text"
                className="input-field"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-soft mb-1">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="contact@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-soft mb-1">Clinic Address</label>
              <input
                type="text"
                className="input-field"
                placeholder="123 Healthcare Ave..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* SECTION: PRIMARY DOCTOR CONFIGURATION */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <Stethoscope size={18} className="text-brand" /> Primary Doctor Assignment
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Select the clinic's Primary Doctor. This doctor will be prioritized and made consistently available across all doctor-selection fields in appointments, patient registration, and consultations.
            </p>
          </div>

          <div className="max-w-md text-xs space-y-2">
            <label className="block font-semibold text-ink-soft">Designated Primary Doctor</label>
            <select
              className="input-field font-semibold py-2"
              value={primaryDoctor}
              onChange={(e) => setPrimaryDoctor(e.target.value)}
            >
              <option value="">-- Select Primary Doctor --</option>
              {doctorsList.map((doc) => {
                const docId = doc._id || doc.id;
                return (
                  <option key={docId} value={docId}>
                    Dr. {doc.name} {doc.specialization ? `(${doc.specialization})` : ''} {doc.isPrimary ? '★ [Current Primary]' : ''}
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-ink-soft italic">
              Updating the Primary Doctor automatically updates all doctor selection dropdowns system-wide without producing duplicate doctor entries.
            </p>
          </div>
        </div>

        {/* SECTION 2: WORKING HOURS */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <Clock size={18} className="text-brand" /> Operating Hours (Weekly Schedule)
            </h3>
            <p className="text-xs text-ink-soft">
              Configure clinic opening and closing times for appointment scheduling logic.
            </p>
          </div>

          <div className="divide-y divide-border/60">
            {workingHours.map((wh, idx) => (
              <div key={wh.day} className="py-2.5 grid grid-cols-12 gap-3 items-center text-xs">
                <div className="col-span-4 sm:col-span-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`isOpen-${wh.day}`}
                    checked={wh.isOpen}
                    onChange={(e) => handleWorkingHourChange(idx, 'isOpen', e.target.checked)}
                    className="rounded text-brand focus:ring-brand h-4 w-4"
                  />
                  <label htmlFor={`isOpen-${wh.day}`} className="font-bold text-ink cursor-pointer">
                    {wh.day}
                  </label>
                </div>

                {wh.isOpen ? (
                  <div className="col-span-8 sm:col-span-9 flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-ink-soft">Open:</span>
                      <input
                        type="time"
                        className="input-field py-1 text-xs w-28 font-mono"
                        value={wh.open}
                        onChange={(e) => handleWorkingHourChange(idx, 'open', e.target.value)}
                      />
                    </div>
                    <span className="text-ink-soft/60">—</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-ink-soft">Close:</span>
                      <input
                        type="time"
                        className="input-field py-1 text-xs w-28 font-mono"
                        value={wh.close}
                        onChange={(e) => handleWorkingHourChange(idx, 'close', e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="col-span-8 sm:col-span-9">
                    <span className="badge bg-slate-100 text-slate-600 border-slate-200">
                      Closed / Holiday
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: SCHEDULING & BILLING DEFAULTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Scheduling */}
          <div className="card p-5 space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <CalendarDays size={18} className="text-brand" /> Appointment Scheduling
              </h3>
              <p className="text-xs text-ink-soft">
                Default duration slot for booking patient visits.
              </p>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Slot Duration (Minutes) *
                </label>
                <select
                  className="input-field font-semibold"
                  value={appointmentSlotDurationMinutes}
                  onChange={(e) => setAppointmentSlotDurationMinutes(e.target.value)}
                >
                  <option value={15}>15 minutes (Quick consult)</option>
                  <option value={30}>30 minutes (Standard slot)</option>
                  <option value={45}>45 minutes (Extended procedure)</option>
                  <option value={60}>60 minutes (1 hour procedure)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Billing Defaults */}
          <div className="card p-5 space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Receipt size={18} className="text-brand" /> Billing & Tax Defaults
              </h3>
              <p className="text-xs text-ink-soft">
                Global tax rate percentage and currency code for front-desk invoicing.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="input-field font-semibold"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Currency Code</label>
                <input
                  type="text"
                  className="input-field font-mono font-bold"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="INR"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-8 py-3 text-xs flex items-center gap-2"
          >
            <Save size={16} />
            <span>{saving ? 'Saving Settings...' : 'Save Clinic Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
