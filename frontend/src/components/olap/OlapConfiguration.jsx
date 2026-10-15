import React from 'react';
import { SlidersHorizontal, RotateCcw, Database, Layers, Play } from 'lucide-react';
import { Button } from '../common/index.js';
import { OPERATION_DEFINITIONS } from './OlapOperationSelector.jsx';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

const AVAILABLE_YEARS = ['2015', '2016', '2017', '2018', '2010', '2011'];

const AVAILABLE_COUNTRIES = [
  { value: '', label: 'All Countries' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Germany', label: 'Germany' },
  { value: 'France', label: 'France' },
  { value: 'Netherlands', label: 'Netherlands' },
  { value: 'EIRE', label: 'Ireland (EIRE)' },
  { value: 'Spain', label: 'Spain' },
  { value: 'Australia', label: 'Australia' }
];

const AVAILABLE_CATEGORIES = [
  // Superstore categories
  'Furniture',
  'Office Supplies',
  'Technology',
  // Online Retail categories
  'Gift',
  'Decoration',
  'Bags',
  'Mugs',
  'General'
];

export default function OlapConfiguration({
  activeQuery,
  rollupFilters,
  setRollupFilters,
  drilldownFilters,
  setDrilldownFilters,
  sliceFilters,
  setSliceFilters,
  diceFilters,
  setDiceFilters,
  onResetDefaults,
  onExecute,
  isRunning
}) {
  const currentOp = OPERATION_DEFINITIONS[activeQuery] || OPERATION_DEFINITIONS.rollup;

  const toggleCategory = (cat) => {
    setDiceFilters((prev) => {
      const exists = prev.categories.includes(cat);
      const next = exists ? prev.categories.filter((c) => c !== cat) : [...prev.categories, cat];
      return {
        ...prev,
        categories: next.length > 0 ? next : [cat] // Keep at least one category
      };
    });
  };

  return (
    <div className="olap-config-card">
      <div className="olap-config-header">
        <h3 className="olap-config-header__title">
          <SlidersHorizontal size={16} style={{ color: 'var(--accent-primary)' }} />
          Query Configuration
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetDefaults}
          icon={<RotateCcw size={12} />}
          style={{ height: 26, fontSize: '11px', padding: '0 8px' }}
        >
          Reset
        </Button>
      </div>

      {/* Analytical Metadata Chips */}
      <div className="olap-meta-chips">
        <div className="olap-meta-row">
          <span className="olap-meta-label">Grain:</span>
          <span className="olap-meta-value">{currentOp.dimensionType}</span>
        </div>
        <div className="olap-meta-row">
          <span className="olap-meta-label">Measure:</span>
          <span className="olap-meta-value">{currentOp.measure}</span>
        </div>
        <div className="olap-meta-row">
          <span className="olap-meta-label">Fact Join:</span>
          <span className="olap-meta-value">{currentOp.factTable}</span>
        </div>
      </div>

      {/* Operation-Specific Form Controls */}
      {activeQuery === 'rollup' && (
        <div className="olap-form-group">
          <label className="olap-form-label">
            Temporal Hierarchy Filter
            <span className="olap-form-hint">Optional Year</span>
          </label>
          <select
            className="olap-select"
            value={rollupFilters.year || ''}
            onChange={(e) => setRollupFilters({ year: e.target.value })}
          >
            <option value="">All Years (Complete Fact Table)</option>
            {AVAILABLE_YEARS.map((y) => (
              <option key={y} value={y}>
                Calendar Year {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {activeQuery === 'drilldown' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="olap-form-group">
            <label className="olap-form-label">
              Customer Geography
              <span className="olap-form-hint">Country Dimension</span>
            </label>
            <select
              className="olap-select"
              value={drilldownFilters.country || ''}
              onChange={(e) => setDrilldownFilters((p) => ({ ...p, country: e.target.value }))}
            >
              {AVAILABLE_COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="olap-form-group">
            <label className="olap-form-label">
              Temporal Dimension
              <span className="olap-form-hint">Year (Optional)</span>
            </label>
            <select
              className="olap-select"
              value={drilldownFilters.year || ''}
              onChange={(e) => setDrilldownFilters((p) => ({ ...p, year: e.target.value }))}
            >
              <option value="">All Years</option>
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {activeQuery === 'slice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="olap-form-group">
            <label className="olap-form-label">
              Calendar Month
              <span className="olap-form-hint">1D Slice Target</span>
            </label>
            <select
              className="olap-select"
              value={sliceFilters.month || 12}
              onChange={(e) => setSliceFilters((p) => ({ ...p, month: parseInt(e.target.value, 10) }))}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.value})
                </option>
              ))}
            </select>
          </div>

          <div className="olap-form-group">
            <label className="olap-form-label">
              Calendar Year
              <span className="olap-form-hint">Time Dimension</span>
            </label>
            <select
              className="olap-select"
              value={sliceFilters.year || 2015}
              onChange={(e) => setSliceFilters((p) => ({ ...p, year: parseInt(e.target.value, 10) }))}
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {activeQuery === 'dice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="olap-form-group">
            <label className="olap-form-label">
              Select Categories (Subcube Axis 1)
              <span className="olap-form-hint">{diceFilters.categories?.length || 0} selected</span>
            </label>
            <div className="olap-chips-container">
              {AVAILABLE_CATEGORIES.map((cat) => {
                const isSelected = diceFilters.categories?.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`olap-chip-btn ${isSelected ? 'olap-chip-btn--active' : ''}`}
                    onClick={() => toggleCategory(cat)}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="olap-form-group">
            <label className="olap-form-label">
              Calendar Years (Subcube Axis 2)
              <span className="olap-form-hint">Comma separated</span>
            </label>
            <input
              type="text"
              className="olap-input"
              value={diceFilters.years || ''}
              onChange={(e) => setDiceFilters((p) => ({ ...p, years: e.target.value }))}
              placeholder="e.g. 2015,2016"
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
              {['2015,2016', '2017,2018', '2010,2011'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  style={{
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 6px',
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setDiceFilters((p) => ({ ...p, years: preset }))}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Direct Apply & Run Query Action Button */}
      <div style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-default)' }}>
        <Button
          variant="primary"
          size="sm"
          onClick={onExecute}
          disabled={isRunning}
          icon={<Play size={13} fill="currentColor" />}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {isRunning ? 'Executing Analytical Query...' : 'Apply Filters & Run Query'}
        </Button>
      </div>
    </div>
  );
}
