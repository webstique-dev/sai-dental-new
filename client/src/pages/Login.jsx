import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
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
  const [rememberLogin, setRememberLogin] = useState(false);
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
    <div className="flex min-h-screen w-full items-center justify-center bg-white md:bg-[#f4f4f6] p-0 md:p-4 lg:p-6">
      {/* Main Split Card Container */}
      <div className="w-full min-h-screen md:min-h-[600px] max-w-5xl rounded-none md:rounded-[32px] bg-white p-2.5 md:p-3 shadow-none md:shadow-xl md:shadow-slate-200/60 border-0 md:border md:border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 items-stretch">

        {/* Left Column: Full Hero Image (Hidden under 768px) */}
        <div className="hidden md:block relative rounded-[24px] overflow-hidden min-h-[300px] lg:min-h-[580px] bg-[#e8e7e3]">
          <img
            src="https://res.cloudinary.com/rlokioxu/image/upload/v1787221031/Login-image_b3unca.png"
            alt="Sai Dental Login Graphic"
            className="w-full h-full object-cover rounded-[24px]"
          />
        </div>

        {/* Right Column: Form Container */}
        <div className="flex flex-col justify-center px-4 py-8 sm:px-8 lg:px-12 w-full max-w-md mx-auto md:max-w-none">
          {/* Top Brand Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <img
              src="https://res.cloudinary.com/rlokioxu/image/upload/v1787051057/Sai-dental_logo_xkwusa.png"
              alt="Sai Dental"
              className="h-14 sm:h-16 md:h-20 w-auto object-contain transition-all"
            />
          </div>

          {/* Heading & Subheading */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Login to your account
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 font-medium">
              Welcome back! Enter your details to log in to your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-500 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="off"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-full border border-slate-200 px-5 py-3.5 text-sm text-[#0B1A2E] font-medium focus:outline-none focus:border-[#1E64EA] focus:ring-4 focus:ring-[#1E64EA]/15 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-500 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Enter your Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-full border border-slate-200 px-5 py-3.5 pr-12 text-sm text-[#0B1A2E] font-medium focus:outline-none focus:border-[#1E64EA] focus:ring-4 focus:ring-[#1E64EA]/15 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Login & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-500 font-medium select-none">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(e) => setRememberLogin(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#1E64EA] focus:ring-[#1E64EA] cursor-pointer"
                />
                <span>Remember login</span>
              </label>

              <button
                type="button"
                onClick={() => showError('Please contact clinic administrator to reset password.')}
                className="font-bold text-[#1E64EA] hover:underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[linear-gradient(135deg,#1E64EA_0%,#2090F0_50%,#14C9FE_100%)] text-white hover:brightness-105 active:scale-[0.99] py-3.5 px-6 font-bold text-sm shadow-md shadow-blue-500/20 transition-all mt-4 disabled:opacity-60"
            >
              {submitting ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Footer Link */}
          <p className="text-center text-xs font-medium text-slate-400 mt-8">
            New here?{' '}
            <Link to="/signup" className="font-bold text-[#1E64EA] hover:underline transition-colors">
              Create account
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
