import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Enterprise Form Select Component
 */
export default function Select({
  label,
  error,
  helperText,
  id,
  options = [],
  fullWidth = true,
  className = '',
  disabled = false,
  required = false,
  children,
  ...props
}) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`ui-form-group ${fullWidth ? 'ui-form-group--full' : ''} ${className}`}>
      {label && (
        <label htmlFor={selectId} className="ui-label">
          {label}
          {required && <span className="ui-label__required">*</span>}
        </label>
      )}

      <div className={`ui-select-wrapper ${error ? 'ui-select-wrapper--error' : ''} ${disabled ? 'ui-select-wrapper--disabled' : ''}`}>
        <select id={selectId} disabled={disabled} className="ui-select" {...props}>
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value ?? opt} value={opt.value ?? opt}>
                  {opt.label ?? opt}
                </option>
              ))
            : children}
        </select>
        <ChevronDown size={16} className="ui-select__chevron" />
      </div>

      {error ? (
        <span className="ui-form-feedback ui-form-feedback--error">{error}</span>
      ) : helperText ? (
        <span className="ui-form-feedback">{helperText}</span>
      ) : null}
    </div>
  );
}
