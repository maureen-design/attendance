import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLES, DEPARTMENTS } from '../data/constants';
import {
  registerSupervisor,
  loginSupervisor,
  sendSupervisorPasswordReset,
  setAdminAuthenticated,
} from '../services/authService';
import {
  setSessionRole,
  setSessionSupervisorName,
  setSessionSupervisorDepartment,
} from '../services/storageService';

// ─── Success Popup ────────────────────────────────────────────────────────────
function SuccessPopup({ onContinue }) {
  return (
    <div className="modal-overlay">
      <div className="success-popup">
        <div className="success-popup__icon" aria-hidden="true">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="28" r="28" fill="#dcfce7" />
            <path
              d="M17 28.5l8 8 14-16"
              stroke="#16a34a"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="success-popup__title">Registration Successful!</h2>
        <p className="success-popup__body">
          Your supervisor account has been created. You now have access to the
          attendance dashboard.
        </p>
        <button
          type="button"
          className="btn btn--primary btn--lg btn--block"
          onClick={onContinue}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

// ─── Forgot-password sheet ────────────────────────────────────────────────────
function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    setError('');
    const result = await sendSupervisorPasswordReset(email.trim());
    setLoading(false);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="sup-auth__section">
      <div className="sup-auth__header">
        <div className="sup-auth__logo" aria-hidden="true">🔑</div>
        <h1>Reset Password</h1>
        <p>Enter the email address linked to your supervisor account.</p>
      </div>

      {sent ? (
        <div className="alert alert--success" role="status">
          ✅ A password-reset link has been sent to <strong>{email}</strong>. Check your inbox.
        </div>
      ) : (
        <form onSubmit={handleSend} className="sup-auth__form" noValidate>
          {error && <div className="alert alert--error" role="alert">{error}</div>}

          <div className="form-field">
            <label htmlFor="reset-email">Email Address</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--lg btn--block"
            disabled={loading}
          >
            {loading ? 'Sending…' : 'Send Reset Email'}
          </button>
        </form>
      )}

      <p className="sup-auth__toggle-hint">
        <button type="button" className="sup-auth__link" onClick={onBack}>
          ← Back to login
        </button>
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SupervisorAuth() {
  const navigate = useNavigate();

  // 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Register fields
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDepartment, setRegDepartment] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regErrors, setRegErrors] = useState({});

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginDepartment, setLoginDepartment] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState({});

  // ── helpers ──
  const clearErrors = () => { setError(''); setRegErrors({}); setLoginErrors({}); };
  const switchMode = (m) => { clearErrors(); setMode(m); };

  // ── register submit ──
  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!regFullName.trim() || regFullName.trim().length < 2)
      errs.fullName = 'Full name must be at least 2 characters.';
    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail))
      errs.email = 'Please enter a valid email address.';
    if (!regDepartment)
      errs.department = 'Please select your department.';
    if (!regPassword || regPassword.length < 6)
      errs.password = 'Password must be at least 6 characters.';
    if (regPassword !== regConfirmPassword)
      errs.confirmPassword = 'Passwords do not match.';

    if (Object.keys(errs).length) { setRegErrors(errs); return; }

    setLoading(true);
    setError('');
    const result = await registerSupervisor(regFullName, regEmail, regDepartment, regPassword);
    setLoading(false);

    if (!result.success) { setError(result.error); return; }

    // Store session info
    setAdminAuthenticated();
    setSessionRole(ROLES.SUPERVISOR);
    setSessionSupervisorName(result.fullName);
    setSessionSupervisorDepartment(result.department);

    setShowSuccess(true);
  };

  // ── login submit ──
  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!loginEmail.trim()) errs.email = 'Please enter your email address.';
    if (!loginDepartment) errs.department = 'Please select your department.';
    if (!loginPassword) errs.password = 'Please enter your password.';

    if (Object.keys(errs).length) { setLoginErrors(errs); return; }

    setLoading(true);
    setError('');
    const result = await loginSupervisor(loginEmail.trim(), loginPassword);
    setLoading(false);

    if (!result.success) { setError(result.error); return; }

    // Store session info
    setAdminAuthenticated();
    setSessionRole(ROLES.SUPERVISOR);
    setSessionSupervisorName(result.fullName);
    setSessionSupervisorDepartment(loginDepartment);

    navigate('/supervisor/dashboard');
  };

  // ── success popup continue ──
  const handleSuccessContinue = () => {
    navigate('/supervisor/dashboard');
  };

  if (showSuccess) {
    return <SuccessPopup onContinue={handleSuccessContinue} />;
  }

  if (mode === 'forgot') {
    return (
      <div className="auth-layout">
        <div className="auth-layout__card">
          <ForgotPassword onBack={() => switchMode('login')} />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-layout__card sup-auth__card">
        {/* ── Tab toggle ── */}
        <div className="sup-auth__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`sup-auth__tab ${mode === 'login' ? 'sup-auth__tab--active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Log In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`sup-auth__tab ${mode === 'register' ? 'sup-auth__tab--active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        {/* ── Shared error banner ── */}
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        {/* ══ LOGIN ══ */}
        {mode === 'login' && (
          <div className="sup-auth__section">
            <div className="sup-auth__header">
              <div className="sup-auth__logo" aria-hidden="true">🔒</div>
              <h1>Supervisor Login</h1>
              <p>Enter your credentials to access the dashboard.</p>
            </div>

            <form onSubmit={handleLogin} className="sup-auth__form" noValidate>
              {/* Email */}
              <div className="form-field">
                <label htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => { setLoginEmail(e.target.value); setLoginErrors(p => ({ ...p, email: '' })); setError(''); }}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  className={loginErrors.email ? 'error' : ''}
                />
                {loginErrors.email && <p className="form-field__error">{loginErrors.email}</p>}
              </div>

              {/* Department */}
              <div className="form-field">
                <label htmlFor="login-department">Department</label>
                <select
                  id="login-department"
                  value={loginDepartment}
                  onChange={(e) => { setLoginDepartment(e.target.value); setLoginErrors(p => ({ ...p, department: '' })); }}
                  required
                  disabled={loading}
                  className={loginErrors.department ? 'error' : ''}
                >
                  <option value="">Select your department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {loginErrors.department && <p className="form-field__error">{loginErrors.department}</p>}
              </div>

              {/* Password */}
              <div className="form-field">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); setLoginErrors(p => ({ ...p, password: '' })); setError(''); }}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  className={loginErrors.password ? 'error' : ''}
                />
                {loginErrors.password && <p className="form-field__error">{loginErrors.password}</p>}
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--lg btn--block"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Log In'}
              </button>
            </form>

            <p className="sup-auth__toggle-hint">
              <button
                type="button"
                className="sup-auth__link"
                onClick={() => switchMode('forgot')}
              >
                Forgot your password?
              </button>
            </p>

            <p className="sup-auth__toggle-hint">
              Don't have an account?{' '}
              <button
                type="button"
                className="sup-auth__link"
                onClick={() => switchMode('register')}
              >
                Register here
              </button>
            </p>
          </div>
        )}

        {/* ══ REGISTER ══ */}
        {mode === 'register' && (
          <div className="sup-auth__section">
            <div className="sup-auth__header">
              <div className="sup-auth__logo" aria-hidden="true">📋</div>
              <h1>Create Account</h1>
              <p>Fill in your details to register as a supervisor.</p>
            </div>

            <form onSubmit={handleRegister} className="sup-auth__form" noValidate>
              {/* Full name */}
              <div className="form-field">
                <label htmlFor="reg-fullname">Full Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  id="reg-fullname"
                  type="text"
                  value={regFullName}
                  onChange={(e) => { setRegFullName(e.target.value); setRegErrors(p => ({ ...p, fullName: '' })); }}
                  placeholder="e.g. Jane Doe"
                  required
                  disabled={loading}
                  className={regErrors.fullName ? 'error' : ''}
                />
                {regErrors.fullName && <p className="form-field__error">{regErrors.fullName}</p>}
              </div>

              {/* Email */}
              <div className="form-field">
                <label htmlFor="reg-email">Email Address <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  id="reg-email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => { setRegEmail(e.target.value); setRegErrors(p => ({ ...p, email: '' })); setError(''); }}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  className={regErrors.email ? 'error' : ''}
                />
                {regErrors.email && <p className="form-field__error">{regErrors.email}</p>}
              </div>

              {/* Department */}
              <div className="form-field">
                <label htmlFor="reg-department">Department <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <select
                  id="reg-department"
                  value={regDepartment}
                  onChange={(e) => { setRegDepartment(e.target.value); setRegErrors(p => ({ ...p, department: '' })); }}
                  required
                  disabled={loading}
                  className={regErrors.department ? 'error' : ''}
                >
                  <option value="">Select your department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {regErrors.department && <p className="form-field__error">{regErrors.department}</p>}
              </div>

              {/* Password */}
              <div className="form-field">
                <label htmlFor="reg-password">Password <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  id="reg-password"
                  type="password"
                  value={regPassword}
                  onChange={(e) => { setRegPassword(e.target.value); setRegErrors(p => ({ ...p, password: '', confirmPassword: '' })); }}
                  placeholder="Minimum 6 characters"
                  required
                  disabled={loading}
                  className={regErrors.password ? 'error' : ''}
                />
                {regErrors.password && <p className="form-field__error">{regErrors.password}</p>}
              </div>

              {/* Confirm password */}
              <div className="form-field">
                <label htmlFor="reg-confirm">Confirm Password <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  id="reg-confirm"
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => { setRegConfirmPassword(e.target.value); setRegErrors(p => ({ ...p, confirmPassword: '' })); }}
                  placeholder="Re-enter password"
                  required
                  disabled={loading}
                  className={regErrors.confirmPassword ? 'error' : ''}
                />
                {regErrors.confirmPassword && <p className="form-field__error">{regErrors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--lg btn--block"
                disabled={loading}
              >
                {loading ? 'Registering…' : 'Create Account'}
              </button>
            </form>

            <p className="sup-auth__toggle-hint">
              Already have an account?{' '}
              <button
                type="button"
                className="sup-auth__link"
                onClick={() => switchMode('login')}
              >
                Log in here
              </button>
            </p>
          </div>
        )}

        {/* Back to home */}
        <div className="sup-auth__back">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate('/')}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            ← Back to role selection
          </button>
        </div>
      </div>
    </div>
  );
}
