import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, Users, CalendarDays, ClipboardList, Wallet, Bell, FileBarChart,
  Stethoscope, UserSquare2, History, Activity, Grid3x3, FileHeart, Pill,
  ShieldCheck, Building2, Settings, ScrollText, DatabaseBackup, X,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
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
  ],
  doctor: [
    { to: '/doctor', label: 'Dashboard', icon: LayoutGrid, end: true },
    { to: '/doctor/queue', label: 'My Appointments', icon: CalendarDays },
    { to: '/doctor/patients', label: 'Patients', icon: UserSquare2 },
    { to: '/doctor/prescriptions', label: 'Prescriptions', icon: Pill },
    { to: '/doctor/follow-ups', label: 'Follow-Ups', icon: Bell },
    { to: '/doctor/reports', label: 'Reports & Analytics', icon: FileBarChart },
    { to: '/doctor/account', label: 'My Account', icon: UserSquare2 },
  ],
};

const ROLE_META = {
  admin: { label: 'Admin', dot: 'bg-role-admin', icon: ShieldCheck },
  receptionist: { label: 'Receptionist', dot: 'bg-role-reception', icon: Building2 },
  doctor: { label: 'Doctor', dot: 'bg-role-doctor', icon: Stethoscope },
};

export default function Sidebar({ role, open, onClose, isCollapsed = false, onToggleCollapse = () => {} }) {
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
        className={`fixed top-0 left-0 bottom-0 z-40 flex h-screen flex-col border-r border-border bg-surface transition-all duration-300 ${
          open ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Header */}
        <div className={`flex items-center border-b border-border py-4 ${isCollapsed ? 'px-3 justify-center' : 'px-5 justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={
                isCollapsed
                  ? 'https://res.cloudinary.com/rlokioxu/image/upload/v1787051057/Sai-dental-fav-logo_uu55ug.png'
                  : 'https://res.cloudinary.com/rlokioxu/image/upload/v1787051057/Sai-dental_logo_xkwusa.png'
              }
              alt="Sai Dental Logo"
              className={`object-contain rounded-lg transition-all duration-300 ${isCollapsed ? 'h-8 w-8' : 'h-10 w-auto'}`}
            />
          </div>

          {/* Mobile close button */}
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-bg lg:hidden" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              title={isCollapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-xl py-2.5 text-sm font-medium transition-all ${
                  isCollapsed ? 'lg:justify-center lg:px-2 px-3 gap-3' : 'px-3 gap-3'
                } ${
                  isActive
                    ? 'bg-brand-light text-brand-dark font-bold'
                    : 'text-ink-soft hover:bg-bg hover:text-ink'
                }`
              }
            >
              <Icon size={19} strokeWidth={2} className="shrink-0" />
              <span className={`truncate transition-opacity duration-200 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                {label}
              </span>
            </NavLink>
          ))}

          {role === 'doctor' && (
            <div className="pt-4 mt-4 border-t border-border space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-ink-soft/70 mb-2 transition-all">
                  Consultation Tools
                </p>
              )}
              {[
                { label: 'Clinical Examination', icon: FileHeart },
                { label: 'Tooth Chart', icon: Grid3x3 },
                { label: 'Diagnosis', icon: Stethoscope },
                { label: 'Treatment Plans', icon: Activity },
                { label: 'Patient History', icon: History },
              ].map(({ label, icon: ToolIcon }) => (
                <div
                  key={label}
                  className={`flex items-center rounded-xl py-2 text-xs font-medium text-ink-soft/60 bg-bg/30 cursor-default select-none opacity-80 ${
                    isCollapsed ? 'lg:justify-center lg:px-2 px-3 gap-3' : 'px-3 gap-3'
                  }`}
                  title={label}
                >
                  <ToolIcon size={17} strokeWidth={2} className="shrink-0" />
                  <span className={`truncate ${isCollapsed ? 'lg:hidden' : 'block'}`}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Desktop Collapse Toggle Button at Bottom */}
        <div className="border-t border-border p-3">
          <button
            onClick={onToggleCollapse}
            className={`hidden lg:flex items-center rounded-xl text-ink-soft hover:bg-bg hover:text-ink transition-all w-full ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-3'
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={19} className="shrink-0" />
            ) : (
              <>
                <PanelLeftClose size={19} className="shrink-0" />
                <span className="text-sm font-medium truncate">Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

export { ROLE_META };
