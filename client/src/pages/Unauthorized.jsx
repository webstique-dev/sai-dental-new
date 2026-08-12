import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../context/AuthContext.jsx';

export default function Unauthorized() {
  const { user } = useAuth();
  const home = user ? ROLE_HOME[user.role] : '/login';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-state-dangerSoft text-state-danger">
        <ShieldAlert size={22} />
      </span>
      <h1 className="font-display text-xl font-bold text-ink">You don't have access to this page</h1>
      <p className="max-w-sm text-sm text-ink-soft">
        Your account role doesn't include permission to view this section. If you think this is a
        mistake, ask your clinic administrator to review your role.
      </p>
      <Link to={home} className="btn-primary mt-2">
        Back to my dashboard
      </Link>
    </div>
  );
}
