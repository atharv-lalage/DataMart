import React from 'react';
import { Cpu, TrendingUp, Users, CheckCircle2, AlertCircle, RotateCcw, Save, ShieldAlert } from 'lucide-react';
import { Button } from '../common/index.js';

export default function MLSettings({
  config,
  onChange,
  onSave,
  onReset,
  saving = false,
  saved = false,
  saveError = '',
  hasChanges = false,
  isAdmin = true,
  userRole = 'admin'
}) {
  return (
    <div className="settings-section-container">
      <div className="settings-section-header">
        <div>
          <h2 className="settings-section-title">Machine Learning Pipeline Configuration</h2>
          <p className="settings-section-desc">
            Configure hyperparameters for unsupervised customer RFM segmentation and linear regression sales projection.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button
            variant="outline"
            onClick={onReset}
            disabled={saving || !isAdmin}
            icon={<RotateCcw size={14} />}
          >
            Reset Defaults
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={saving || !hasChanges || !isAdmin}
            icon={<Save size={14} />}
          >
            {saving ? 'Saving...' : 'Save ML Parameters'}
          </Button>
        </div>
      </div>

      {!isAdmin && (
        <div className="settings-alert settings-alert--warning" style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
          <ShieldAlert size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Administrator Access Required:</strong> Your current role is <code>{userRole}</code>. Modifying analytical hyperparameters is restricted to administrators.
          </span>
        </div>
      )}

      {saved && (
        <div className="settings-alert settings-alert--success">
          <CheckCircle2 size={16} />
          <span>Machine learning parameters successfully synchronized to backend server.</span>
        </div>
      )}

      {saveError && (
        <div className="settings-alert settings-alert--danger">
          <AlertCircle size={16} />
          <span>{saveError}</span>
        </div>
      )}

      <div className="settings-form-grid">
        {/* K-Means Customer Clustering */}
        <div className="settings-card">
          <div className="settings-card-header-row">
            <div className="settings-param-icon-badge">
              <Users size={18} />
            </div>
            <div>
              <h3 className="settings-card-title">K-Means Customer Clusters (k)</h3>
              <p className="settings-card-desc">
                Defines the number of discrete customer cohorts synthesized by the unsupervised RFM clustering model.
              </p>
            </div>
          </div>

          <div className="settings-param-control">
            <div className="settings-slider-row">
              <input
                type="range"
                min="2"
                max="6"
                step="1"
                value={config.kClusters}
                onChange={(e) => onChange('kClusters', parseInt(e.target.value, 10))}
                disabled={saving || !isAdmin}
                className="settings-slider"
                id="kClustersSlider"
              />
              <div className="settings-number-box">
                <input
                  type="number"
                  min="2"
                  max="6"
                  step="1"
                  value={config.kClusters}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      onChange('kClusters', Math.min(6, Math.max(2, val)));
                    }
                  }}
                  disabled={saving || !isAdmin}
                  className="settings-number-input"
                  id="kClustersInput"
                />
                <span className="settings-input-unit">clusters</span>
              </div>
            </div>

            <div className="settings-slider-ticks">
              <span>2 (Broad)</span>
              <span>3 (Default)</span>
              <span>4</span>
              <span>5</span>
              <span>6 (Granular)</span>
            </div>

            <div className="settings-param-explainer">
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                Current Cohort Partitioning: {config.kClusters} Segments
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {config.kClusters === 2 && 'Clusters customers into 2 macro categories: High-Value Core vs Occasional Shoppers.'}
                {config.kClusters === 3 && 'Standard 3-tier partitioning: Champions, Potential Loyalists, and At-Risk/Dormant.'}
                {config.kClusters === 4 && '4-tier partitioning: Champions, Loyal Shoppers, Need Attention, and Inactive.'}
                {config.kClusters >= 5 && 'High-granularity multi-tier customer lifetime value and recency segmentation.'}
              </div>
            </div>
          </div>
        </div>

        {/* Linear Regression Projection Window */}
        <div className="settings-card">
          <div className="settings-card-header-row">
            <div className="settings-param-icon-badge" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="settings-card-title">Sales Projection Window</h3>
              <p className="settings-card-desc">
                Defines the forecast horizon in months for projecting linear revenue trends from historical transactions.
              </p>
            </div>
          </div>

          <div className="settings-param-control">
            <div className="settings-slider-row">
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={config.projectionWindow}
                onChange={(e) => onChange('projectionWindow', parseInt(e.target.value, 10))}
                disabled={saving || !isAdmin}
                className="settings-slider"
                id="projectionWindowSlider"
              />
              <div className="settings-number-box">
                <input
                  type="number"
                  min="1"
                  max="12"
                  step="1"
                  value={config.projectionWindow}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      onChange('projectionWindow', Math.min(12, Math.max(1, val)));
                    }
                  }}
                  disabled={saving || !isAdmin}
                  className="settings-number-input"
                  id="projectionWindowInput"
                />
                <span className="settings-input-unit">months</span>
              </div>
            </div>

            <div className="settings-slider-ticks">
              <span>1 mo</span>
              <span>3 mo (Default)</span>
              <span>6 mo</span>
              <span>9 mo</span>
              <span>12 mo</span>
            </div>

            <div className="settings-param-explainer">
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                Forecast Horizon: Next {config.projectionWindow} {config.projectionWindow === 1 ? 'Month' : 'Months'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Computes least-squares linear trend coefficients on historical monthly sales facts and projects confidence bounds over the next {config.projectionWindow} calendar months.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
