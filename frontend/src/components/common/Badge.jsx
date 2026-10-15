import React from 'react';

/**
 * Enterprise Semantic Status Badge
 *
 * @param {'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'} variant
 * @param {'sm' | 'md'} size
 * @param {boolean} withDot
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  withDot = false,
  icon = null,
  className = '',
  style = {},
  ...props
}) {
  const baseClass = 'ui-badge';
  const variantClass = `ui-badge--${variant}`;
  const sizeClass = `ui-badge--${size}`;

  const combinedClass = [baseClass, variantClass, sizeClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={combinedClass} style={style} {...props}>
      {withDot && <span className="ui-badge__dot" />}
      {icon && <span className="ui-badge__icon">{icon}</span>}
      <span className="ui-badge__label">{children}</span>
    </span>
  );
}
