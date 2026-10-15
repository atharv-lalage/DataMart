import React from 'react';

/**
 * Enterprise Page Header Component
 */
export default function PageHeader({
  title,
  subtitle,
  badge = null,
  actions = null,
  breadcrumbs = null,
  className = '',
}) {
  return (
    <div className={`ui-page-header ${className}`}>
      {breadcrumbs && <div className="ui-page-header__breadcrumbs">{breadcrumbs}</div>}
      
      <div className="ui-page-header__main">
        <div className="ui-page-header__title-area">
          <div className="ui-page-header__title-row">
            <h1 className="ui-page-header__title">{title}</h1>
            {badge && <div className="ui-page-header__badge">{badge}</div>}
          </div>
          {subtitle && <p className="ui-page-header__subtitle">{subtitle}</p>}
        </div>

        {actions && <div className="ui-page-header__actions">{actions}</div>}
      </div>
    </div>
  );
}
