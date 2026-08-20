import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth, ROLE_HOME } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { validateName, validateEmail, validatePhone } from '../utils/validators.js';

const ROLES_CONFIG = [
  { role: 'admin', title: 'Admin' },
  { role: 'receptionist', title: 'Receptionist' },
  { role: 'doctor', title: 'Doctor' },
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

    const nameErr = validateName(name, 'Full Name', true);
    if (nameErr) {
      showError(nameErr);
      return;
    }

    const emailErr = validateEmail(email, true);
    if (emailErr) {
      showError(emailErr);
      return;
    }

    if (phone) {
      const phoneErr = validatePhone(phone, false);
      if (phoneErr) {
        showError(phoneErr);
        return;
      }
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
    <div className="flex min-h-screen w-full items-center justify-center bg-white md:bg-[#f4f4f6] p-0 md:p-4 lg:p-6">
      {/* Main Split Card Container */}
      <div className="w-full min-h-screen md:min-h-[600px] max-w-5xl rounded-none md:rounded-[32px] bg-white p-2.5 md:p-3 shadow-none md:shadow-xl md:shadow-slate-200/60 border-0 md:border md:border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 items-stretch">

        {/* Left Column: Full Hero Image (Hidden under 768px) */}
        <div className="hidden md:block relative rounded-[24px] overflow-hidden min-h-[300px] lg:min-h-[580px] bg-[#e8e7e3]">
          <img
            src="https://res.cloudinary.com/rlokioxu/image/upload/v1787221031/Login-image_b3unca.png"
            alt="Sai Dental Registration Graphic"
            className="w-full h-full object-cover rounded-[24px]"
          />
        </div>

        {/* Right Column: Form Container */}
        <div className="flex flex-col justify-center px-4 py-8 sm:px-8 lg:px-12 w-full max-w-md mx-auto md:max-w-none">
          {/* Top Brand Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <img
              src="https://res.cloudinary.com/rlokioxu/image/upload/v1787051057/Sai-dental_logo_xkwusa.png"
              alt="Sai Dental"
              className="h-8 w-auto object-contain"
            />
          </div>

          {/* Heading & Subheading */}
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create Account
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
              Select your role and enter details to register your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Operational Role Selector (Pills) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Operational Role <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES_CONFIG.map((rc) => {
                  const isSelected = selectedRole === rc.role;
                  return (
                    <button
                      type="button"
                      key={rc.role}
                      onClick={() => setSelectedRole(rc.role)}
                      className={`py-2 px-3 rounded-full text-xs font-bold transition-all text-center border ${isSelected
                          ? 'bg-[linear-gradient(135deg,#1E64EA_0%,#2090F0_50%,#14C9FE_100%)] text-white border-transparent shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                    >
                      {rc.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-500 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="signup-name"
                type="text"
                required
                autoComplete="off"
                placeholder="e.g. Dr. Sarah Jenkins or John Smith"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s'.-]/g, ''))}
                className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-xs text-[#0B1A2E] font-medium focus:outline-none focus:border-[#1E64EA] focus:ring-4 focus:ring-[#1E64EA]/15 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-500 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="name@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-xs text-[#0B1A2E] font-medium focus:outline-none focus:border-[#1E64EA] focus:ring-4 focus:ring-[#1E64EA]/15 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label htmlFor="signup-phone" className="block text-xs font-semibold text-slate-500 mb-1">
                  Phone (Optional)
                </label>
                <input
                  id="signup-phone"
                  type="tel"
                  maxLength={10}
                  autoComplete="off"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-xs text-[#0B1A2E] font-medium focus:outline-none focus:border-[#1E64EA] focus:ring-4 focus:ring-[#1E64EA]/15 transition-all placeholder:text-slate-400 font-mono"
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-500 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-full border border-slate-200 px-4 py-2.5 pr-10 text-xs text-[#0B1A2E] font-medium focus:outline-none focus:border-[#1E64EA] focus:ring-4 focus:ring-[#1E64EA]/15 transition-all placeholder:text-slate-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-500 mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full rounded-full border px-4 py-2.5 pr-10 text-xs text-[#0B1A2E] font-medium focus:outline-none focus:ring-4 transition-all placeholder:text-slate-400 font-mono ${confirmPassword && password !== confirmPassword
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                        : 'border-slate-200 focus:border-[#1E64EA] focus:ring-[#1E64EA]/15'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Mismatch Warning */}
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1">Passwords do not match.</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !selectedRole}
              className="w-full rounded-full bg-[linear-gradient(135deg,#1E64EA_0%,#2090F0_50%,#14C9FE_100%)] text-white hover:brightness-105 active:scale-[0.99] py-3.5 px-6 font-bold text-sm shadow-md shadow-blue-500/20 transition-all mt-3 disabled:opacity-60"
            >
              {submitting ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>

          {/* Footer Link */}
          <p className="text-center text-xs font-medium text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#1E64EA] hover:underline transition-colors">
              Log in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
