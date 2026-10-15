import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Store, LogOut, Settings as SettingsIcon, Terminal, Activity, ShieldCheck } from 'lucide-react';

export default function Sidebar({ currentUser, onLogout }) {
  const initial = currentUser?.username ? currentUser.username[0].toUpperCase() : 'A';

  return (
    <aside className="sidebar">
      <div className="logo brand-font">
        <Store size={28} color="var(--accent-primary)" />
        DataMart 
      </div>
      
      <div className="nav-links" style={{ flex: 1 }}>
        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', marginTop: '1rem', paddingLeft: '1rem' }}>
          Database Architecture
        </p>
        <NavLink to="/etl" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Activity size={18} /> ETL Pipeline Logs
        </NavLink>
        <NavLink to="/terminal" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Terminal size={18} /> OLAP Query Interface
        </NavLink>

        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', marginTop: '1.5rem', paddingLeft: '1rem' }}>
          Business Intelligence
        </p>
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
          <LayoutDashboard size={18} /> Machine Learning/ DSS
        </NavLink>
        <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Store size={18} /> Simulated Store (OLTP)
        </NavLink>
      </div>

      {/* User profile card */}
      <div
        style={{
          margin: '0.5rem 0.75rem 0.75rem',
          padding: '0.65rem 0.75rem',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {currentUser?.username || 'Administrator'}
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ShieldCheck size={11} color="#10b981" />
            {currentUser?.email || 'admin@datamart'}
          </div>
        </div>
      </div>

      <div className="nav-links">
        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '1rem' }}>
          Preferences
        </p>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          <SettingsIcon size={18} /> Settings
        </NavLink>
        <button
          onClick={onLogout}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            font: 'inherit',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            width: '100%',
            borderRadius: '8px',
            textAlign: 'left',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <LogOut size={18} color="#ef4444" />
          <span style={{ color: '#ef4444', fontWeight: 500 }}>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
