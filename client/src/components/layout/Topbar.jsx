import { useState } from 'react';
import { Menu, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_META } from './Sidebar.jsx';

export default function Topbar({ onMenuClick, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = ROLE_META[user.role];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const AVATAR_BG = {
    admin: 'bg-role-admin',
    receptionist: 'bg-role-reception',
    doctor: 'bg-role-doctor',
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/90 px-5 py-3.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-1.5 hover:bg-bg lg:hidden" aria-label="Open menu">
          <Menu size={20} />
        </button>
        <h1 className="font-display text-lg font-bold text-ink">{title}</h1>
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-xl border border-border px-2.5 py-1.5 hover:bg-bg"
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${AVATAR_BG[user.role]}`}
          >
            {initials}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold leading-tight text-ink">{user.name}</span>
            <span className="block text-xs leading-tight text-ink-soft">{meta.label}</span>
          </span>
          <ChevronDown size={16} className="text-ink-soft" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-state-danger hover:bg-state-dangerSoft"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
