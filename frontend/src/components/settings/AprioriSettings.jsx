import React from 'react';
import { ShoppingBag, Sparkles, CheckCircle2, AlertCircle, RotateCcw, Save, ShieldAlert } from 'lucide-react';
import { Button } from '../common/index.js';

export default function AprioriSettings({
  config,
  onChange,
  onSave,
  onReset,
  saving = false,
  saved = false,
  saveError = '',
  hasChanges = false
}) {
  const percentSupport = (config.minSupport * 100).toFixed(1);

  const getStrictnessCategory = (val) => {
    if (val < 0.02) return { label: 'High Recall (Exploratory)', color: '#3B82F6', desc: 'Discovers rare co-occurrences and long-tail product pairs. May generate numerous subtle rules.' };
    if (val <= 0.05) return { label: 'Balanced (Recommended)', color: '#10B981', desc: 'Ideal trade-off between frequently paired items and statistically robust association rules.' };
    return { label: 'High Precision (Strict)', color: '#F59E0B', desc: 'Only extracts the most overwhelmingly popular bundle pairs. Eliminates less frequent relationships.' };
  };

  const strictness = getStrictnessCategory(config.minSupport);

  return (
    <div className="settings-section-container">
      <div className="settings-section-header">
        <div>
          <h2 className="settings-section-title">Market Basket Analysis (Apriori Algorithm)</h2>
          <p className="settings-section-desc">
            Fine-tune minimum support thresholds governing cross-sell association rule generation across transaction baskets.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button
            variant="outline"
            onClick={onReset}
            disabled={saving}
            icon={<RotateCcw size={14} />}
          >
            Reset Defaults
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={saving || !hasChanges}
            icon={<Save size={14} />}
          >
            {saving ? 'Saving...' : 'Save Apriori Parameters'}
          </Button>
        </div>
      </div>

      {saved && (
        <div className="settings-alert settings-alert--success">
          <CheckCircle2 size={16} />
          <span>Apriori minimum support threshold saved and synchronized with backend recommendation engine.</span>
        </div>
      )}

      {saveError && (
        <div className="settings-alert settings-alert--danger">
          <AlertCircle size={16} />
          <span>{saveError}</span>
        </div>
      )}

      <div className="settings-card">
        <div className="settings-card-header-row">
          <div className="settings-param-icon-badge" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>
            <ShoppingBag size={18} />
          </div>
          <div>
            <h3 className="settings-card-title">Minimum Support Threshold (min_support)</h3>
            <p className="settings-card-desc">
              Fraction of total transactions that must contain an itemset for it to qualify as a frequent itemset.
            </p>
          </div>
        </div>

        <div className="settings-param-control">
          <div className="settings-slider-row">
            <input
              type="range"
              min="0.01"
              max="0.20"
              step="0.01"
              value={config.minSupport}
              onChange={(e) => onChange('minSupport', parseFloat(e.target.value))}
              className="settings-slider"
              id="minSupportSlider"
            />
            <div className="settings-number-box">
              <input
                type="number"
                min="0.01"
                max="0.20"
                step="0.01"
                value={config.minSupport}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onChange('minSupport', Math.min(0.2, Math.max(0.01, val)));
                  }
                }}
                className="settings-number-input"
                id="minSupportInput"
              />
              <span className="settings-input-unit">ratio ({percentSupport}%)</span>
            </div>
          </div>

          <div className="settings-slider-ticks">
            <span>0.01 (1%)</span>
            <span>0.03 (3% Default)</span>
            <span>0.05 (5%)</span>
            <span>0.10 (10%)</span>
            <span>0.20 (20%)</span>
          </div>

          <div className="settings-param-explainer" style={{ borderLeftColor: strictness.color }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                Strictness Profile: {strictness.label}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: strictness.color }}>
                {percentSupport}% of baskets
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {strictness.desc}
            </div>
          </div>
        </div>

        <div className="settings-info-box" style={{ marginTop: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>Storefront Recommendation Impact</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Association rules generated from this parameter directly power the "Frequently Bought Together" recommendations on the Storefront checkout and product detail drawers. Saving new thresholds triggers background rule re-generation.
          </div>
        </div>
      </div>
    </div>
  );
}
