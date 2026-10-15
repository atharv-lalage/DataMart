import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Enterprise SaaS Button Component
 *
 * @param {'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'} variant
 * @param {'sm' | 'md' | 'lg'} size
 * @param {boolean} loading
 * @param {React.ReactNode} icon
 * @param {boolean} fullWidth
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  style = {},
  ...props
}) {
  const baseClass = 'ui-btn';
  const variantClass = `ui-btn--${variant}`;
  const sizeClass = `ui-btn--${size}`;
  const widthClass = fullWidth ? 'ui-btn--full' : '';
  const loadingClass = loading ? 'ui-btn--loading' : '';

  const combinedClass = [baseClass, variantClass, sizeClass, widthClass, loadingClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={combinedClass}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
      {...props}
    >
      {loading && <Loader2 className="ui-btn__spinner" size={size === 'sm' ? 14 : 16} />}
      {!loading && icon && iconPosition === 'left' && <span className="ui-btn__icon">{icon}</span>}
      <span className="ui-btn__text">{children}</span>
      {!loading && icon && iconPosition === 'right' && <span className="ui-btn__icon">{icon}</span>}
    </button>
  );
}
