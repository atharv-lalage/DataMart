import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Layers, Trash2, Database, ShieldAlert } from 'lucide-react';
import { Button, Badge } from '../common/index.js';

const CACHE_KEYS = [
  { key: 'salesCache', label: 'Sales Metrics & Time Series', description: 'Aggregated total revenue, monthly sales trends, and order counts' },
  { key: 'predsCache', label: 'Linear Regression Projections', description: 'Monthly projected gross revenue points and forecast trendlines' },
  { key: 'clustersCache', label: 'RFM Customer Segments', description: 'K-Means recency, frequency, and monetary cluster assignments' },
  { key: 'basketCache', label: 'Apriori Association Rules', description: 'Cross-sell item pairs, support, confidence, and lift metrics' },
  { key: 'productsCache', label: 'Storefront Catalog & Pricing', description: 'Cached operational inventory items and pricing lists' },
  { key: 'mlConfig', label: 'Client Model Hyperparameters', description: 'Local cached copy of active pipeline parameters' },
];

export default function CacheSettings({ onClearCache, cleared = false }) {
  const [activeKeys, setActiveKeys] = useState([]);

  const checkCacheState = () => {
    const present = CACHE_KEYS.filter(item => sessionStorage.getItem(item.key) !== null);
    setActiveKeys(present);
  };

  useEffect(() => {
    checkCacheState();
  }, [cleared]);

  const handleClear = () => {
    onClearCache();
    checkCacheState();
  };

  return (
    <div className="settings-section-container">
      <div className="settings-section-header">
        <div>
          <h2 className="settings-section-title">Cache & System Management</h2>
          <p className="settings-section-desc">
            Manage local analytical session caches, view cached payload structures, and force fresh API reloads.
          </p>
        </div>

        <div>
          <Button
            variant={cleared ? 'secondary' : 'danger'}
            onClick={handleClear}
            icon={cleared ? <CheckCircle2 size={14} color="#10B981" /> : <Trash2 size={14} />}
          >
            {cleared ? 'Cache Cleared!' : 'Purge Session Cache'}
          </Button>
        </div>
      </div>

      {cleared && (
        <div className="settings-alert settings-alert--success">
          <CheckCircle2 size={16} />
          <span>Session cache successfully purged. All dashboards and analytical queries will query live server APIs on next view.</span>
        </div>
      )}

      {/* Cache Status Grid */}
      <div className="settings-db-grid">
        <div className="settings-card">
          <div className="settings-db-card-header">
            <div className="settings-db-icon-wrap" style={{ background: '#EEF2FF', color: 'var(--accent-primary)' }}>
              <RefreshCw size={18} />
            </div>
            <div>
              <h4 className="settings-db-card-title">Client Session Storage</h4>
              <p className="settings-db-card-desc">In-Memory Browser Persistence</p>
            </div>
            <Badge variant={activeKeys.length > 0 ? 'primary' : 'neutral'}>
              {activeKeys.length} / {CACHE_KEYS.length} Cached
            </Badge>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 'var(--space-3)', lineHeight: 1.5 }}>
            DataMart caches large analytical payloads in browser session storage to minimize duplicate server calls during rapid page navigation.
          </p>
        </div>

        <div className="settings-card">
          <div className="settings-db-card-header">
            <div className="settings-db-icon-wrap" style={{ background: '#ECFDF5', color: '#059669' }}>
              <Database size={18} />
            </div>
            <div>
              <h4 className="settings-db-card-title">Server Analytical Cache</h4>
              <p className="settings-db-card-desc">Backend Python Pickle Store</p>
            </div>
            <span className="settings-status-online">
              <span className="settings-live-dot" />
              <span>Multi-Tenant Eviction</span>
            </span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 'var(--space-3)', lineHeight: 1.5 }}>
            Whenever you save updated ML or Apriori settings, the backend automatically clears your tenant’s cached analytical models.
          </p>
        </div>
      </div>

      {/* Cached Items Table */}
      <div className="settings-card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
          Session Cache Inspection
        </h3>

        <div className="settings-table-wrapper">
          <table className="settings-table">
            <thead>
              <tr>
                <th>Cache Key</th>
                <th>Analytical Domain</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {CACHE_KEYS.map((item) => {
                const isPresent = sessionStorage.getItem(item.key) !== null;

                return (
                  <tr key={item.key}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.key}
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {item.label}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {item.description}
                    </td>
                    <td>
                      {isPresent ? (
                        <span className="settings-badge-pill settings-badge-pill--success">
                          Active in Memory
                        </span>
                      ) : (
                        <span className="settings-badge-pill settings-badge-pill--neutral">
                          Not Cached
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
