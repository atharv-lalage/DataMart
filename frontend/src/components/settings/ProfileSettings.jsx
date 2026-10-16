import React from 'react';
import { Shield, Key, Mail, User, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from '../common/index.js';

export default function ProfileSettings({ currentUser }) {
  const username = currentUser?.username || 'admin';
  const email = currentUser?.email || 'admin@datamart.enterprise';
  const role = currentUser?.role || 'admin';
  const isSuperAdmin = role === 'admin';
  const tenantId = currentUser?.sub || currentUser?.id || 'atharv';
  const initial = username.charAt(0).toUpperCase();

  return (
    <div className="settings-section-container">
      <div className="settings-section-header">
        <div>
          <h2 className="settings-section-title">General & User Profile</h2>
          <p className="settings-section-desc">
            View your enterprise profile identity, security clearance, and active authentication session.
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
                <Badge variant={isSuperAdmin ? 'primary' : 'neutral'}>
                  <ShieldCheck size={12} />
                  <span>{isSuperAdmin ? 'Super Administrator' : 'Tenant Operator'}</span>
                </Badge>
                <Badge variant="success">
                  <span className="settings-live-dot" />
                  <span>Active Session</span>
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
                <span>Tenant Namespace</span>
              </div>
              <div className="settings-detail-value">
                <span className="settings-code-tag">{tenantId}</span>
              </div>
            </div>

            <div className="settings-detail-row">
              <div className="settings-detail-label">
                <Shield size={14} />
                <span>Security Clearance</span>
              </div>
              <div className="settings-detail-value">
                <span className="settings-badge-pill settings-badge-pill--success">
                  Level 5 (Maximum Enterprise Clearance)
                </span>
              </div>
            </div>

            <div className="settings-detail-row">
              <div className="settings-detail-label">
                <Key size={14} />
                <span>Credential Storage</span>
              </div>
              <div className="settings-detail-value">
                <span className="settings-status-secure">
                  <CheckCircle2 size={13} />
                  <span>Configured securely on server via environment variables</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Access Policies Card */}
        <div className="settings-card">
          <h4 className="settings-card-subheading">Authentication & Session Architecture</h4>
          <p className="settings-card-help">
            Enterprise authentication policies enforced across the DataMart analytical gateway.
          </p>

          <div className="settings-detail-list" style={{ marginTop: 'var(--space-4)' }}>
            <div className="settings-detail-row">
              <div className="settings-detail-label">
                <Clock size={14} />
                <span>Session Expiration</span>
              </div>
              <div className="settings-detail-value">7 Days (Rolling JWT Refresh)</div>
            </div>

            <div className="settings-detail-row">
              <div className="settings-detail-label">
                <Shield size={14} />
                <span>Token Encryption</span>
              </div>
              <div className="settings-detail-value">HMAC SHA-256 (HS256)</div>
            </div>

            <div className="settings-detail-row">
              <div className="settings-detail-label">
                <User size={14} />
                <span>Data Isolation</span>
              </div>
              <div className="settings-detail-value">Multi-Tenant Isolated User Cache</div>
            </div>

            <div className="settings-detail-row">
              <div className="settings-detail-label">
                <Key size={14} />
                <span>Password Hashing</span>
              </div>
              <div className="settings-detail-value">One-Way Salted Bcrypt</div>
            </div>
          </div>

          <div className="settings-info-box" style={{ marginTop: 'var(--space-5)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              Enterprise Tenant Isolation Active
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              All analytical cache, customer RFM clusters, and transactional uploads are automatically segmented by your authenticated tenant namespace (<span className="settings-code-tag">{tenantId}</span>).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
