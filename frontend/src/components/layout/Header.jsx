import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Trash2, Shield, ChevronRight } from 'lucide-react';

const ROUTE_TITLES = {
  '/dashboard': { title: 'Analytics Dashboard', section: 'Business Intelligence' },
  '/': { title: 'Storefront (OLTP)', section: 'Transactional Store' },
  '/etl': { title: 'ETL Pipeline Logs', section: 'Data Warehouse' },
  '/terminal': { title: 'OLAP Query Terminal', section: 'Data Warehouse' },
  '/settings': { title: 'Platform Settings', section: 'System Preferences' },
};

/**
 * Enterprise Light Workspace Top Header Bar
 */
export default function Header({
  currentUser,
  onToggleSidebar,
  onDropDataset,
  dropping = false,
}) {
  const location = useLocation();
  const currentRoute = ROUTE_TITLES[location.pathname] || {
    title: 'DataMart Platform',
    section: 'Analytics',
  };

  const username = currentUser?.username || 'Administrator';
  const roleText = currentUser?.role === 'admin' ? 'Super Admin' : 'Tenant';
  const initial = currentUser?.username ? currentUser.username[0].toUpperCase() : 'A';

  return (
    <header className="top-header">
      {/* Left: Mobile Toggle & Page Breadcrumb */}
      <div className="top-header__left">
        <button
          type="button"
          className="top-header__mobile-toggle"
          onClick={onToggleSidebar}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="top-header__breadcrumb">
          <span className="top-header__section-name">{currentRoute.section}</span>
          <ChevronRight size={14} className="top-header__breadcrumb-separator" />
          <h1 className="top-header__page-title">{currentRoute.title}</h1>
        </div>
      </div>

      {/* Right: Tenant Actions & Profile */}
      <div className="top-header__right">
        {/* Drop Dataset Action */}
        <button
          type="button"
          className="top-header__drop-btn"
          onClick={onDropDataset}
          disabled={dropping}
          title="Wipe dataset and empty warehouse for this tenant"
        >
          <Trash2 size={15} />
          <span>{dropping ? 'Dropping...' : 'Drop Dataset'}</span>
        </button>

        {/* Tenant Environment Tag */}
        <div className="top-header__tenant-pill">
          <Shield size={12} className="top-header__tenant-icon" />
          <span>Tenant: <strong>{username}</strong></span>
        </div>

        {/* User Avatar Badge */}
        <div className="top-header__user-badge">
          <div className="top-header__user-text">
            <span className="top-header__user-name">{username}</span>
            <span className="top-header__user-role">{roleText}</span>
          </div>
          <div className="top-header__avatar" aria-label={`User avatar for ${username}`}>
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
