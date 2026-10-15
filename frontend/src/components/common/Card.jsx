import React from 'react';

/**
 * Enterprise SaaS Card Component
 *
 * @param {'default' | 'elevated' | 'flat' | 'interactive'} variant
 * @param {boolean} noPadding
 */
export default function Card({
  children,
  title,
  subtitle,
  icon,
  badge,
  actions,
  footer,
  variant = 'default',
  noPadding = false,
  className = '',
  style = {},
  onClick,
  ...props
}) {
  const baseClass = 'ui-card';
  const variantClass = `ui-card--${variant}`;
  const paddingClass = noPadding ? 'ui-card--no-padding' : '';

  const combinedClass = [baseClass, variantClass, paddingClass, className]
    .filter(Boolean)
    .join(' ');

  const hasHeader = title || subtitle || icon || badge || actions;

  return (
    <div className={combinedClass} style={style} onClick={onClick} {...props}>
      {hasHeader && (
        <div className="ui-card__header">
          <div className="ui-card__header-left">
            {icon && <span className="ui-card__icon">{icon}</span>}
            <div>
              {title && <h3 className="ui-card__title">{title}</h3>}
              {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
            </div>
            {badge && <span className="ui-card__badge">{badge}</span>}
          </div>
          {actions && <div className="ui-card__actions">{actions}</div>}
        </div>
      )}

      <div className="ui-card__body">{children}</div>

      {footer && <div className="ui-card__footer">{footer}</div>}
    </div>
  );
}
