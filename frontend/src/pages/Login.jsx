import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logoIcon from '../assets/rex_logo.png';
import { useAppData } from '../context/AppDataContext';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, signUp } = useAppData();
  const redirectPath = searchParams.get('next') || '/dashboard';

  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (mode === 'signin') {
        login({
          email: form.email,
          password: form.password,
        });
      } else {
        signUp({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
        });
      }
      navigate(redirectPath);
    } catch (submitError) {
      setError(submitError.message || 'Unable to continue.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-form-pane">
        <button type="button" className="auth-back" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="auth-brand">
          <img src={logoIcon} alt="Rex AI" className="auth-brand-logo" />
          <span className="auth-brand-name">Rex AI</span>
        </div>

        <div className="auth-card">
          <div className="auth-card-heading">
            <h1>{mode === 'signin' ? 'Login to your account' : 'Create your account'}</h1>
            <p>
              {mode === 'signin'
                ? 'Enter your email below to login to your account'
                : 'Start your policy journey with Rex AI'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' ? (
              <div className="auth-field">
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Jane Doe"
                  value={form.fullName}
                  onChange={(event) => handleChange('fullName', event.target.value)}
                  required
                />
              </div>
            ) : null}

            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={form.email}
                onChange={(event) => handleChange('email', event.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="password">Password</label>
                {mode === 'signin' ? (
                  <a href="#forgot" onClick={(event) => event.preventDefault()}>
                    Forgot your password?
                  </a>
                ) : null}
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(event) => handleChange('password', event.target.value)}
                required
              />
            </div>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : mode === 'signin' ? 'Login' : 'Create account'}
            </button>

            <div className="auth-divider">
              <span>Or continue with</span>
            </div>

            <button type="button" className="auth-google">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M21.35 11.1h-9.17v2.98h5.26c-.23 1.52-1.79 4.45-5.26 4.45-3.16 0-5.73-2.62-5.73-5.85s2.57-5.85 5.73-5.85c1.8 0 3 0.77 3.69 1.42l2.52-2.45C16.77 4.32 14.69 3.5 12.18 3.5 7.17 3.5 3.1 7.59 3.1 12.68c0 5.1 4.07 9.18 9.08 9.18 5.24 0 8.72-3.7 8.72-8.9 0-.6-.06-1.05-.15-1.86Z"
                  fill="currentColor"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
                setIsSubmitting(false);
              }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </section>

      <aside className="auth-visual-pane">
        <div className="auth-visual-glow" />
        <p>insurance for the 21st century.</p>
      </aside>
    </div>
  );
};

export default Login;
