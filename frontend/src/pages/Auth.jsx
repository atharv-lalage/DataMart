import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Lock, User, Mail, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!username.trim() || !email.trim() || !password) {
          setError('Please fill in all fields.');
          setLoading(false);
          return;
        }

        const res = await axios.post(`${API_BASE_URL}/api/auth/register`, {
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
        });

        const { token, user } = res.data;
        if (token) {
          localStorage.setItem('datamart_token', token);
          localStorage.setItem('datamart_user', JSON.stringify(user));
          axios.defaults.headers.common.Authorization = `Bearer ${token}`;
          onLogin(token, user);
          return;
        }
      } else {
        // Login mode
        if (!username.trim() || !password) {
          setError('Please enter your username/email and password.');
          setLoading(false);
          return;
        }

        // Try MongoDB JWT login first
        try {
          const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            identifier: username.trim(),
            password,
          });

          const { token, user } = res.data;
          if (token) {
            localStorage.setItem('datamart_token', token);
            localStorage.setItem('datamart_user', JSON.stringify(user));
            axios.defaults.headers.common.Authorization = `Bearer ${token}`;
            onLogin(token, user);
            return;
          }
        } catch (loginErr) {
          // If MongoDB is not yet configured or returned 503, attempt legacy Basic Auth fallback
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
              // Dev bypass if completely offline
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
        setError('Cannot reach backend on port 8001. Check server status.');
      } else {
        setError(err.response?.data?.detail || err.response?.data?.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="app"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, var(--bg-main) 70%)',
        padding: '1.5rem',
      }}
    >
      <motion.div
        className="glass-panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          padding: '2.5rem',
          width: '100%',
          maxWidth: '440px',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '0.9rem',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(236, 72, 153, 0.2))',
              borderRadius: '50%',
              marginBottom: '0.75rem',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            <Store size={36} color="var(--accent-primary)" />
          </div>
          <h2 style={{ fontFamily: 'Outfit', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.3rem 0' }}>
            DataMart Platform
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            {mode === 'login'
              ? 'Sign in to access analytics & warehouse intelligence'
              : 'Create a MongoDB-authenticated profile'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 12,
            padding: 4,
            marginBottom: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            style={{
              flex: 1,
              padding: '0.55rem',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all 0.2s',
              background: mode === 'login' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: mode === 'login' ? '#fff' : 'var(--text-muted)',
              boxShadow: mode === 'login' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            style={{
              flex: 1,
              padding: '0.55rem',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all 0.2s',
              background: mode === 'register' ? 'linear-gradient(135deg, #ec4899, #be185d)' : 'transparent',
              color: mode === 'register' ? '#fff' : 'var(--text-muted)',
              boxShadow: mode === 'register' ? '0 4px 12px rgba(236, 72, 153, 0.3)' : 'none',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Username / Identifier */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {mode === 'login' ? 'Username or Email' : 'Username'}
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '0.55rem 0.85rem',
              }}
            >
              <User size={17} color="var(--text-muted)" style={{ marginRight: '0.6rem', flexShrink: 0 }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={mode === 'login' ? 'e.g. admin or atharv' : 'Choose a unique username'}
                required
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          </div>

          {/* Email (only in register mode) */}
          {mode === 'register' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Email Address
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '0.55rem 0.85rem',
                }}
              >
                <Mail size={17} color="var(--text-muted)" style={{ marginRight: '0.6rem', flexShrink: 0 }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* Password */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '0.55rem 0.85rem',
              }}
            >
              <Lock size={17} color="var(--text-muted)" style={{ marginRight: '0.6rem', flexShrink: 0 }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Minimum 6 characters' : 'Enter password'}
                required
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          </div>

          {/* Error / Success Messages */}
          {error && (
            <div
              style={{
                background: 'rgba(236, 72, 153, 0.1)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                borderRadius: 8,
                padding: '0.55rem 0.75rem',
                color: '#f472b6',
                fontSize: '0.82rem',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 8,
                padding: '0.55rem 0.75rem',
                color: '#34d399',
                fontSize: '0.82rem',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginTop: '0.4rem',
              borderRadius: 10,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.92rem',
              color: '#fff',
              background:
                mode === 'login'
                  ? 'linear-gradient(135deg, #6366f1, #ec4899)'
                  : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              'Authenticating...'
            ) : mode === 'login' ? (
              <>
                Sign In to Platform <ArrowRight size={16} />
              </>
            ) : (
              <>
                Create Account <Sparkles size={16} />
              </>
            )}
          </button>
        </form>

        {/* Database indicator */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            textAlign: 'center',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          <span>MongoDB Atlas Authentication Protected</span>
        </div>
      </motion.div>
    </div>
  );
}
