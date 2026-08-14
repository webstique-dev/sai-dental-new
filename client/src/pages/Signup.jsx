import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Building2, Stethoscope, ArrowRight, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuth, ROLE_HOME } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';

const ROLES_CONFIG = [
  {
    role: 'admin',
    title: 'Admin',
    description: 'Manages users, settings, and clinic-wide oversight',
    icon: ShieldCheck,
    selectedClasses: 'border-role-admin bg-role-adminSoft/50 text-role-admin shadow-sm',
    badgeClass: 'bg-role-admin text-white',
  },
  {
    role: 'receptionist',
    title: 'Receptionist',
    description: 'Manages patient flow, appointments, and billing',
    icon: Building2,
    selectedClasses: 'border-role-reception bg-role-receptionSoft/50 text-role-reception shadow-sm',
    badgeClass: 'bg-role-reception text-white',
  },
  {
    role: 'doctor',
    title: 'Doctor',
    description: 'Manages clinical care, diagnosis, and treatment',
    icon: Stethoscope,
    selectedClasses: 'border-role-doctor bg-role-doctorSoft/50 text-role-doctor shadow-sm',
    badgeClass: 'bg-role-doctor text-white',
  },
];

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { showError, showSuccess } = useNotification();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedRole) {
      showError('Please select a role for your account.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);

    try {
      const user = await signup({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role: selectedRole,
      });

      showSuccess(`Account created successfully! Welcome, ${user.name}.`);
      const home = ROLE_HOME[user.role] || '/';
      navigate(home, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create account. Please try again.';
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 sm:p-6 font-body">
      <div className="w-full max-w-xl space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand text-white font-display text-xl font-extrabold shadow-md mb-1">
            DC
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">Create Clinic Staff Account</h1>
          <p className="text-xs text-ink-soft">
            Register your account to access your assigned role dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-5 bg-surface">
          {/* Step 1: Select Role */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-ink uppercase tracking-wider">
              Select Your Operational Role *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ROLES_CONFIG.map((rc) => {
                const Icon = rc.icon;
                const isSelected = selectedRole === rc.role;

                return (
                  <div
                    key={rc.role}
                    onClick={() => setSelectedRole(rc.role)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${isSelected
                      ? rc.selectedClasses
                      : 'border-border bg-bg/40 text-ink-soft hover:border-border/80 hover:bg-bg'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon size={20} className={isSelected ? 'text-current' : 'text-ink-soft'} />
                      {isSelected && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rc.badgeClass}`}>
                          Selected
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-display text-sm font-bold text-ink">{rc.title}</h3>
                      <p className="text-[11px] text-ink-soft leading-snug mt-0.5">{rc.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Credentials Inputs */}
          <div className="space-y-4 text-xs border-t border-border pt-4">
            <div>
              <label className="block font-semibold text-ink-soft mb-1">Full Name *</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Dr. Sarah Jenkins or John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  className="input-field"
                  placeholder="name@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Password * (Min 6 chars)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="input-field font-mono pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-soft hover:text-ink"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className={`input-field font-mono pr-10 ${confirmPassword && password !== confirmPassword ? 'border-rose-400 focus:ring-rose-200' : ''
                      }`}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-soft hover:text-ink"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">Passwords do not match.</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !selectedRole}
            className="w-full btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-sm mt-2"
          >
            <UserPlus size={16} />
            {submitting ? 'Creating Account...' : 'Complete Registration & Sign In'}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="text-center text-xs text-ink-soft">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline inline-flex items-center gap-1">
            Log in here <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
