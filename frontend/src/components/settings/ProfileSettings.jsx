import React from 'react';
import { Shield, Key, Mail, User, ShieldCheck, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { Badge } from '../common/index.js';

export default function ProfileSettings({ currentUser }) {
  const username = currentUser?.username || '—';
  const email = currentUser?.email || '—';
  const role = currentUser?.role || 'user';
  const isAdmin = role === 'admin';
  const userId = currentUser?.id || currentUser?.sub || '—';
  const initial = (username && username !== '—') ? username.charAt(0).toUpperCase() : 'U';

  const formatTimestamp = (ts) => {
    if (!ts) return null;
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts);
    }
  };

  const createdAt = formatTimestamp(currentUser?.created_at);
  const lastLogin = formatTimestamp(currentUser?.last_login);

  return (
    <div className="settings-section-container">
      <div className="settings-section-header">
        <div>
          <h2 className="settings-section-title">General & User Profile</h2>
          <p className="settings-section-desc">
            Profile identity and authentication session verified by backend endpoint <code>GET /api/auth/me</code>.
          </p>
        </div>
      </div>

      <div className="settings-profile-grid">
        {/* User Identity Card */}
        <div className="settings-card">
          <div className="settings-profile-header">
            <div className="settings-avatar">
              {initial}
            </div>
            <div className="settings-profile-identity">
              <h3 className="settings-profile-name">{username}</h3>
              <div className="settings-profile-badges">
                <Badge variant={isAdmin ? 'primary' : 'neutral'}>
                  <ShieldCheck size={12} />
                  <span>Role: {role}</span>
                </Badge>
                <Badge variant="success">
                  <span className="settings-live-dot" />
                  <span>Authenticated</span>
                </Badge>
              </div>
            </div>
          </div>

          <div className="settings-divider" />

          <div className="settings-detail-list">
            <div className="settings-detail-row">
              <div className="settings-detail-label">
                <Mail size={14} />
                <span>Email Address</span>
              </div>
              <div className="settings-detail-value">{email}</div>
            </div>

            <div className="settings-detail-row">
              <div className="settings-detail-label">
                <User size={14} />
                <span>User / Tenant ID</span>
              </div>
              <div className="settings-detail-value">
                <span className="settings-code-tag">{userId}</span>
              </div>
            </div>

            <div className="settings-detail-row">
              <div className="settings-detail-label">
                <Shield size={14} />
                <span>Assigned Role</span>
              </div>
              <div className="settings-detail-value">
                <span className={`settings-badge-pill ${isAdmin ? 'settings-badge-pill--success' : 'settings-badge-pill--neutral'}`}>
                  {role}
                </span>
              </div>
            </div>

            {createdAt && (
              <div className="settings-detail-row">
                <div className="settings-detail-label">
                  <Calendar size={14} />
                  <span>Account Created</span>
                </div>
                <div className="settings-detail-value">{createdAt}</div>
              </div>
            )}

            {lastLogin && (
              <div className="settings-detail-row">
                <div className="settings-detail-label">
                  <Clock size={14} />
                  <span>Last Login</span>
                </div>
                <div className="settings-detail-value">{lastLogin}</div>
              </div>
            )}
          </div>
        </div>

        {/* Security & Access Policies Card */}
        <div className="settings-card">
          <h4 className="settings-card-subheading">Authentication & Session Architecture</h4>
          <p className="settings-card-help">
            Implementation-backed security parameters configured in <code>backend/auth_db.py</code>.
          </p>

          <div className="settings-detail-list" style={{ marginTop: 'var(--space-4)' }}>
            <div className="settings-detail-row">
              <div className="settings-detail-label">
                <Clock size={14} />
                <span>Session Expiration</span>
              </div>
              <div className="settings-detail-value">7 Days (JWT Lifespan)</div>
            </div>

            <div className="settings-detail-row">
              <div className="settings-detail-label">
                <Shield size={14} />
                <span>Token Algorithm</span>
              </div>
              <div className="settings-detail-value">HS256 (HMAC SHA-256)</div>
            </div>

            <div className="settings-detail-row">
              <div className="settings-detail-label">
                <User size={14} />
                <span>User Cache Scoping</span>
              </div>
              <div className="settings-detail-value">Tenant-Isolated Dictionary Keyed by Username</div>
            </div>

            <div className="settings-detail-row">
              <div className="settings-detail-label">
                <Key size={14} />
                <span>Password Hashing</span>
              </div>
              <div className="settings-detail-value">Bcrypt with Salt</div>
            </div>
          </div>

          <div className="settings-info-box" style={{ marginTop: 'var(--space-5)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              Verified Authentication Implementation
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Endpoints verify identity using the <code>require_admin</code> and <code>get_authenticated_user</code> FastAPI dependencies. Tokens are passed via the standard <code>Authorization: Bearer &lt;token&gt;</code> HTTP header.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
