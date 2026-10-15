import React from 'react';

/**
 * Enterprise Form Input Component
 */
export default function Input({
  label,
  error,
  helperText,
  id,
  leadingIcon,
  trailingIcon,
  fullWidth = true,
  className = '',
  disabled = false,
  required = false,
  ...props
}) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`ui-form-group ${fullWidth ? 'ui-form-group--full' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="ui-label">
          {label}
          {required && <span className="ui-label__required">*</span>}
        </label>
      )}

      <div className={`ui-input-wrapper ${error ? 'ui-input-wrapper--error' : ''} ${disabled ? 'ui-input-wrapper--disabled' : ''}`}>
        {leadingIcon && <span className="ui-input__icon ui-input__icon--leading">{leadingIcon}</span>}
        
        <input
          id={inputId}
          disabled={disabled}
          className={`ui-input ${leadingIcon ? 'ui-input--with-leading' : ''} ${trailingIcon ? 'ui-input--with-trailing' : ''}`}
          {...props}
        />

        {trailingIcon && <span className="ui-input__icon ui-input__icon--trailing">{trailingIcon}</span>}
      </div>

      {error ? (
        <span className="ui-form-feedback ui-form-feedback--error">{error}</span>
      ) : helperText ? (
        <span className="ui-form-feedback">{helperText}</span>
      ) : null}
    </div>
  );
}
