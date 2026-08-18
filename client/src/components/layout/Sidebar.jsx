import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, Users, CalendarDays, ClipboardList, Wallet, Bell, FileBarChart,
  Stethoscope, UserSquare2, History, Activity, Grid3x3, FileHeart, Pill,
  ShieldCheck, Building2, Settings, ScrollText, DatabaseBackup, X,
} from 'lucide-react';

// Nav sets mirror PRD section 30 exactly, per role.
const NAV = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutGrid, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/patients', label: 'Patients', icon: UserSquare2 },
    { to: '/admin/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/admin/billing', label: 'Billing', icon: Wallet },
    { to: '/admin/treatments', label: 'Treatments', icon: Activity },
    { to: '/admin/reports', label: 'Reports & Analytics', icon: FileBarChart },
    { to: '/admin/settings', label: 'Clinic Settings', icon: Settings },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { to: '/admin/backup', label: 'Backup', icon: DatabaseBackup },
  ],
  receptionist: [
    { to: '/reception', label: 'Dashboard', icon: LayoutGrid, end: true },
    { to: '/reception/patients', label: 'Patients', icon: UserSquare2 },
    { to: '/reception/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/reception/queue', label: 'Check-In / Queue', icon: ClipboardList },
    // { to: '/reception/billing', label: 'Billing & Payments', icon: Wallet },
    // { to: '/reception/follow-ups', label: 'Follow-Ups', icon: Bell },
  ],
  doctor: [
    { to: '/doctor', label: 'Dashboard', icon: LayoutGrid, end: true },
    { to: '/doctor/queue', label: 'My Appointments', icon: CalendarDays },
    { to: '/doctor/patients', label: 'Patients', icon: UserSquare2 },
    { to: '/doctor/prescriptions', label: 'Prescriptions', icon: Pill },
    { to: '/doctor/follow-ups', label: 'Follow-Ups', icon: Bell },
    { to: '/doctor/reports', label: 'Reports & Analytics', icon: FileBarChart },
  ],
};

const ROLE_META = {
  admin: { label: 'Admin', dot: 'bg-role-admin', icon: ShieldCheck },
  receptionist: { label: 'Receptionist', dot: 'bg-role-reception', icon: Building2 },
  doctor: { label: 'Doctor', dot: 'bg-role-doctor', icon: Stethoscope },
};

export default function Sidebar({ role, open, onClose }) {
  const items = NAV[role] || [];
  const meta = ROLE_META[role];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed z-40 flex h-screen w-72 flex-col border-r border-border bg-surface
          transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <div className="flex items-center gap-2.5">
            <img
              src="https://res.cloudinary.com/rlokioxu/image/upload/v1787051057/Sai-dental_logo_xkwusa.png"
              alt="Sai Dental Logo"
              className="h-10 w-auto object-contain rounded-lg"
            />
            {/* <div>
              <p className="font-display text-[14px] font-bold leading-tight text-ink">Sai Dental Clinic</p>
              <p className="text-[11px] font-medium text-ink-soft">Digital Platform</p>
            </div> */}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-bg lg:hidden" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {meta.label} workspace
          </span>
        </div> */}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                  ? 'bg-brand-light text-brand-dark'
                  : 'text-ink-soft hover:bg-bg hover:text-ink'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}

          {role === 'doctor' && (
            <div className="pt-4 mt-4 border-t border-border space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-ink-soft/70 mb-2">
                Consultation Tools
              </p>
              {[
                { label: 'Clinical Examination', icon: FileHeart },
                { label: 'Tooth Chart', icon: Grid3x3 },
                { label: 'Diagnosis', icon: Stethoscope },
                { label: 'Treatment Plans', icon: Activity },
                { label: 'Patient History', icon: History },
              ].map(({ label, icon: ToolIcon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-ink-soft/60 bg-bg/30 cursor-default select-none opacity-80"
                  title="Available during patient consultation"
                >
                  <ToolIcon size={16} strokeWidth={2} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}

export { ROLE_META };
