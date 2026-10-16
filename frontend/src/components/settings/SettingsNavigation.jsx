import React from 'react';
import { User, Database, Cpu, ShoppingBag, RefreshCw } from 'lucide-react';

export const SETTINGS_TABS = [
  { id: 'profile', label: 'General & Profile', icon: User, description: 'User identity, tenant role, and session credentials' },
  { id: 'database', label: 'Database & Schema', icon: Database, description: 'PostgreSQL connection, OLAP star schema, and OLTP tables' },
  { id: 'ml', label: 'Machine Learning', icon: Cpu, description: 'K-Means clustering and linear regression sales projection' },
  { id: 'apriori', label: 'Market Basket (Apriori)', icon: ShoppingBag, description: 'Association rule generation and support threshold' },
  { id: 'cache', label: 'Cache & System', icon: RefreshCw, description: 'Session storage cache eviction and reload triggers' },
];

export default function SettingsNavigation({ activeTab, onSelectTab, unsavedTabs = [] }) {
  return (
    <div className="settings-nav-tray" role="tablist" aria-label="Settings navigation">
      {SETTINGS_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const hasUnsaved = unsavedTabs.includes(tab.id);

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`settings-nav-btn ${isActive ? 'settings-nav-btn--active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
            type="button"
          >
            <Icon size={16} className="settings-nav-icon" />
            <span className="settings-nav-label">{tab.label}</span>
            {hasUnsaved && (
              <span className="settings-nav-dot" title="Unsaved changes in this section" />
            )}
          </button>
        );
      })}
    </div>
  );
}
