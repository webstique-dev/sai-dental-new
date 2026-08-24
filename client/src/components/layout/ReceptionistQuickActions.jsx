import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, X, UserPlus, CalendarDays, ClipboardList, Sparkles } from 'lucide-react';

export default function ReceptionistQuickActions({ isCollapsed = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close popup menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Click outside and ESC key handlers
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = (path, stateObj = {}) => {
    setIsOpen(false);
    navigate(path, { state: stateObj });
  };

  // Dynamic bottom-left positioning based on desktop sidebar state
  // Mobile (<1024px): left-4 bottom-4
  // Desktop (>=1024px): left-24 (when collapsed) or left-72 (when expanded)
  const leftPositionClass = isCollapsed ? 'lg:left-[92px]' : 'lg:left-[272px]';

  return (
    <div
      ref={menuRef}
      className="fixed bottom-4 left-4 z-40 md:hidden"
    >
      {/* POPUP MENU */}
      {isOpen && (
        <div
          className="absolute bottom-full mb-2.5 left-0 w-72 sm:w-80 rounded-2xl border border-border bg-surface p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-3 duration-200"
          role="menu"
          aria-orientation="vertical"
          aria-label="Quick Reception Actions"
        >
          <div className="flex items-center justify-between border-b border-border px-2 pb-2.5 mb-1.5">
            <div className="flex items-center gap-1.5 text-ink font-bold text-xs">
              <Sparkles size={14} className="text-brand shrink-0" />
              <span>Quick Front Desk Actions</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-ink-soft hover:text-ink hover:bg-bg transition-colors"
              aria-label="Close menu"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-1">
            {/* 1. Register New Patient */}
            <button
              type="button"
              onClick={() => handleAction('/reception/patients/register')}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-brand-light/20 text-left transition-colors group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                <UserPlus size={18} />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-ink group-hover:text-brand transition-colors">
                  Register New Patient
                </span>
                <span className="block text-[11px] text-ink-soft truncate">
                  Create new patient file & OP number
                </span>
              </div>
            </button>

            {/* 2. Book Appointment */}
            <button
              type="button"
              onClick={() => handleAction('/reception/appointments', { autoOpenCreate: true })}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50 text-left transition-colors group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <CalendarDays size={18} />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-ink group-hover:text-blue-700 transition-colors">
                  Book Appointment
                </span>
                <span className="block text-[11px] text-ink-soft truncate">
                  Schedule appointment date & time
                </span>
              </div>
            </button>

            {/* 3. Walk-in Patient */}
            <button
              type="button"
              onClick={() => handleAction('/reception/queue', { autoOpenWalkIn: true })}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-orange-50 text-left transition-colors group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-800 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                <ClipboardList size={18} />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-ink group-hover:text-orange-700 transition-colors">
                  Walk-In Patient
                </span>
                <span className="block text-[11px] text-ink-soft truncate">
                  Issue queue token & check in
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* FAB TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Quick Actions Menu"
        className={`inline-flex items-center gap-2 rounded-2xl bg-brand px-3.5 py-2.5 text-xs font-bold text-white shadow-xl hover:bg-brand-dark transition-all duration-200 active:scale-95 border border-white/20 focus:outline-none focus:ring-2 focus:ring-brand/50 ${isOpen ? 'bg-brand-dark ring-2 ring-brand/40' : ''
          }`}
      >
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
          <Plus size={18} strokeWidth={2.5} />
        </div>
        <span className="whitespace-nowrap">Quick Actions</span>
      </button>
    </div>
  );
}
