import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { useAuth, ROLE_HOME } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { validateEmail } from '../utils/validators.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    const emailErr = validateEmail(email, true);
    if (emailErr) {
      showError(emailErr);
      return;
    }

    if (!password) {
      showError('Password is required.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      showSuccess(`Welcome back, ${user.name || 'User'}!`);
      const redirectTo = location.state?.from?.pathname || ROLE_HOME[user.role] || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      showError(err.response?.data?.message || 'Unable to log in. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-auto items-center justify-center">
            <img
              src="https://res.cloudinary.com/rlokioxu/image/upload/v1787051057/Sai-dental_logo_xkwusa.png"
              alt="Sai Dental Logo"
              className="h-14 w-auto object-contain rounded-xl"
            />
          </div>
          {/* <h1 className="font-display text-lg font-bold text-ink">Sai Dental Clinic – Digital Platform</h1> */}
          <p className="mt-1 text-sm text-ink-soft">Sign in to your clinic workspace</p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="card space-y-4 p-6">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@clinic.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-soft hover:text-ink"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-soft">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-brand hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
