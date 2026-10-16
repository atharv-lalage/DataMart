import React, { useState } from 'react';
import {
  Lock,
  User,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Database,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

/**
 * Enterprise Authentication Page — DataMart Hybrid Design System
 * 
 * Supports:
 *  - MongoDB Atlas JWT Authentication (Bcrypt + HS256)
 *  - Legacy Basic Auth fallback for emergency / single-admin recovery
 *  - In-line field validation and backend error handling
 *  - Password visibility toggle & accessible form controls
 */
export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  const switchMode = (newMode) => {
    if (loading) return;
    setMode(newMode);
    setError('');
    setFieldErrors({});
    setSuccessMsg('');
  };

  const validate = () => {
    const errs = {};
    const trimmedUser = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUser) {
      errs.username = mode === 'login' ? 'Username or email is required' : 'Username is required';
    } else if (mode === 'register' && trimmedUser.length < 3) {
      errs.username = 'Username must be at least 3 characters';
    }

    if (mode === 'register') {
      if (!trimmedEmail) {
        errs.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        errs.email = 'Enter a valid email address';
      }
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (mode === 'register' && password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await axios.post(`${API_BASE_URL}/api/auth/register`, {
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
        });

        const { token, user } = res.data;
        if (token) {
          localStorage.setItem('datamart_token', token);
          if (user) {
            localStorage.setItem('datamart_user', JSON.stringify(user));
          }
          axios.defaults.headers.common.Authorization = `Bearer ${token}`;
          setSuccessMsg('Account created successfully. Redirecting...');
          setTimeout(() => {
            onLogin(token, user);
          }, 350);
          return;
        }
      } else {
        // Login mode
        try {
          const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            identifier: username.trim(),
            password,
          });

          const { token, user } = res.data;
          if (token) {
            localStorage.setItem('datamart_token', token);
            if (user) {
              localStorage.setItem('datamart_user', JSON.stringify(user));
            }
            axios.defaults.headers.common.Authorization = `Bearer ${token}`;
            setSuccessMsg('Authentication successful. Redirecting...');
            setTimeout(() => {
              onLogin(token, user);
            }, 300);
            return;
          }
        } catch (loginErr) {
          // If MongoDB returns 503 (database unavailable) or dev fallback
          if (loginErr.response?.status === 503 || (username === 'admin' && password === 'admin')) {
            const basicAuth = `Basic ${window.btoa(`${username}:${password}`)}`;
            try {
              await axios.get(`${API_BASE_URL}/api/auth/login`, {
                headers: { Authorization: basicAuth },
              });
              localStorage.setItem('datamart_auth', basicAuth);
              axios.defaults.headers.common.Authorization = basicAuth;
              onLogin(basicAuth, { username, role: 'admin' });
              return;
            } catch {
              if (import.meta.env.DEV && username === 'admin' && password === 'admin') {
                onLogin(basicAuth, { username: 'admin', role: 'admin' });
                return;
              }
            }
          }
          throw loginErr;
        }
      }
    } catch (err) {
      if (!err.response) {
        setError('Unable to reach DataMart analytical backend on port 8001. Ensure the server is running.');
      } else {
        setError(err.response?.data?.detail || err.response?.data?.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-brand-badge" aria-hidden="true">
            <Database size={24} />
          </div>
          <h1 className="auth-title">DataMart</h1>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Sign in to access analytical warehouse & intelligence'
              : 'Create an authenticated enterprise analyst account'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs" role="tablist" aria-label="Authentication Options">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            aria-controls="auth-panel"
            className={`auth-tab-btn ${mode === 'login' ? 'auth-tab-btn--active' : ''}`}
            onClick={() => switchMode('login')}
            disabled={loading}
          >
            <User size={15} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            aria-controls="auth-panel"
            className={`auth-tab-btn ${mode === 'register' ? 'auth-tab-btn--active' : ''}`}
            onClick={() => switchMode('register')}
            disabled={loading}
          >
            <UserPlus size={15} />
            <span>Register</span>
          </button>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="auth-alert auth-alert--danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            <AlertCircle size={16} className="auth-alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert auth-alert--success" role="status" style={{ marginBottom: 'var(--space-4)' }}>
            <CheckCircle2 size={16} className="auth-alert-icon" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form id="auth-panel" onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Username / Identifier */}
          <div className="auth-field">
            <div className="auth-field-header">
              <label htmlFor="auth-username" className="auth-label">
                {mode === 'login' ? 'Username or Email' : 'Username'}
                <span className="auth-label-required" aria-hidden="true">*</span>
              </label>
              {mode === 'register' && (
                <span className="auth-helper-text">Min 3 characters</span>
              )}
            </div>
            <div
              className={`auth-input-group ${fieldErrors.username ? 'auth-input-group--error' : ''} ${
                loading ? 'auth-input-group--disabled' : ''
              }`}
            >
              <span className="auth-input-icon" aria-hidden="true">
                <User size={16} />
              </span>
              <input
                id="auth-username"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                disabled={loading}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) {
                    setFieldErrors((prev) => ({ ...prev, username: null }));
                  }
                }}
                placeholder={mode === 'login' ? 'Enter username or email' : 'Choose a unique username'}
                className="auth-input"
                aria-invalid={!!fieldErrors.username}
                aria-describedby={fieldErrors.username ? 'auth-username-error' : undefined}
                required
              />
            </div>
            {fieldErrors.username && (
              <span id="auth-username-error" className="auth-field-error">
                <AlertCircle size={12} /> {fieldErrors.username}
              </span>
            )}
          </div>

          {/* Email (only in register mode) */}
          {mode === 'register' && (
            <div className="auth-field">
              <div className="auth-field-header">
                <label htmlFor="auth-email" className="auth-label">
                  Email Address
                  <span className="auth-label-required" aria-hidden="true">*</span>
                </label>
              </div>
              <div
                className={`auth-input-group ${fieldErrors.email ? 'auth-input-group--error' : ''} ${
                  loading ? 'auth-input-group--disabled' : ''
                }`}
              >
                <span className="auth-input-icon" aria-hidden="true">
                  <Mail size={16} />
                </span>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  disabled={loading}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: null }));
                    }
                  }}
                  placeholder="analyst@company.com"
                  className="auth-input"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
                  required
                />
              </div>
              {fieldErrors.email && (
                <span id="auth-email-error" className="auth-field-error">
                  <AlertCircle size={12} /> {fieldErrors.email}
                </span>
              )}
            </div>
          )}

          {/* Password */}
          <div className="auth-field">
            <div className="auth-field-header">
              <label htmlFor="auth-password" className="auth-label">
                Password
                <span className="auth-label-required" aria-hidden="true">*</span>
              </label>
              {mode === 'register' && (
                <span className="auth-helper-text">Min 6 characters</span>
              )}
            </div>
            <div
              className={`auth-input-group ${fieldErrors.password ? 'auth-input-group--error' : ''} ${
                loading ? 'auth-input-group--disabled' : ''
              }`}
            >
              <span className="auth-input-icon" aria-hidden="true">
                <Lock size={16} />
              </span>
              <input
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                disabled={loading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: null }));
                  }
                }}
                placeholder={mode === 'register' ? 'Choose a secure password' : 'Enter your password'}
                className="auth-input"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
                required
              />
              <button
                type="button"
                className="auth-toggle-visibility-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span id="auth-password-error" className="auth-field-error">
                <AlertCircle size={12} /> {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="auth-submit-btn"
            id="auth-submit-button"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="auth-spinner" />
                <span>{mode === 'login' ? 'Authenticating...' : 'Creating Account...'}</span>
              </>
            ) : mode === 'login' ? (
              <>
                <span>Sign In to Platform</span>
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          <p className="auth-switch-prompt">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => switchMode('register')}
                  disabled={loading}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => switchMode('login')}
                  disabled={loading}
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <div className="auth-security-badge">
            <ShieldCheck size={13} color="var(--color-success)" />
            <span>Protected by HS256 Token Signature &amp; Bcrypt Encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
