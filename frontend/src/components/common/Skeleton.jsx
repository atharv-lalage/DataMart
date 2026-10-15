import React from 'react';

/**
 * Enterprise Shimmer Skeleton Placeholder
 *
 * @param {'text' | 'circular' | 'rectangular' | 'card'} variant
 */
export default function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  style = {},
  count = 1,
}) {
  const baseClass = 'ui-skeleton';
  const variantClass = `ui-skeleton--${variant}`;
  const combinedClass = [baseClass, variantClass, className].filter(Boolean).join(' ');

  const inlineStyles = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  if (count > 1) {
    return (
      <div className="ui-skeleton-group">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={combinedClass} style={inlineStyles} />
        ))}
      </div>
    );
  }

  return <div className={combinedClass} style={inlineStyles} />;
}
