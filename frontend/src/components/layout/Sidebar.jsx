import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Activity,
  Terminal,
  Settings as SettingsIcon,
  LogOut,
  ShieldCheck,
  X,
  Database,
  Bot
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    heading: 'Core Platform',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/ai-analyst', label: 'AI Analyst', icon: Bot },
      { to: '/', label: 'Storefront (OLTP)', icon: Store },
    ],
  },
  {
    heading: 'Data Warehousing',
    items: [
      { to: '/etl', label: 'ETL Pipeline', icon: Activity },
      { to: '/terminal', label: 'OLAP Terminal', icon: Terminal },
    ],
  },
  {
    heading: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

/**
 * Enterprise Dark Navy Navigation Sidebar
 */
export default function Sidebar({
  currentUser,
  onLogout,
  isOpen = false,
  onClose,
}) {
  const initial = currentUser?.username
    ? currentUser.username[0].toUpperCase()
    : 'A';

  const username = currentUser?.username || 'Administrator';
  const roleText = currentUser?.role === 'admin' ? 'Administrator' : 'Tenant User';
  const email = currentUser?.email || 'admin@datamart';

  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar__brand">
          <div className="sidebar__logo-badge">
            <Database size={20} className="sidebar__logo-icon" />
          </div>
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">DataMart</span>
            <span className="sidebar__brand-badge">Enterprise BI</span>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            className="sidebar__close-btn"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="sidebar__nav" aria-label="Main Navigation">
          {NAV_SECTIONS.map((section, idx) => (
            <div key={idx} className="sidebar__group">
              <span className="sidebar__group-heading">{section.heading}</span>
              <div className="sidebar__group-items">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                      }
                    >
                      <Icon size={18} className="sidebar__link-icon" />
                      <span className="sidebar__link-label">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Card & Sign Out at Bottom */}
        <div className="sidebar__footer">
          <div className="sidebar__user-card">
            <div className="sidebar__avatar">{initial}</div>
            <div className="sidebar__user-info">
              <div className="sidebar__user-name" title={username}>
                {username}
              </div>
              <div className="sidebar__user-meta" title={email}>
                <ShieldCheck size={12} className="sidebar__meta-icon" />
                <span>{roleText}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="sidebar__logout-btn"
            onClick={onLogout}
            title="Sign out of DataMart"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
