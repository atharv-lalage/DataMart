import React from 'react';

/**
 * Enterprise KPI Metric Card
 */
export default function MetricCard({
  label,
  value,
  subtitle,
  icon,
  iconBg = '#EEF2FF',
  iconColor = '#4F46E5',
  badge = null,
  className = '',
}) {
  return (
    <div className={`ui-card dashboard-kpi-card ${className}`}>
      <div className="dashboard-kpi-card__top">
        <span className="dashboard-kpi-card__label">{label}</span>
        {icon && (
          <div
            className="dashboard-kpi-card__icon-box"
            style={{ backgroundColor: iconBg, color: iconColor }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="dashboard-kpi-card__value">{value}</div>

      <div className="dashboard-kpi-card__bottom">
        {subtitle && <span className="dashboard-kpi-card__subtitle">{subtitle}</span>}
        {badge && <div className="dashboard-kpi-card__badge">{badge}</div>}
      </div>
    </div>
  );
}
