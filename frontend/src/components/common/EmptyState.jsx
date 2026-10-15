import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * Enterprise Empty State Container
 */
export default function EmptyState({
  icon = <Inbox size={40} className="ui-empty-state__default-icon" />,
  title = 'No Data Available',
  description = 'There are no records to display at this moment.',
  action = null,
  secondaryAction = null,
  className = '',
  style = {},
}) {
  return (
    <div className={`ui-empty-state ${className}`} style={style}>
      <div className="ui-empty-state__icon-box">{icon}</div>
      <h3 className="ui-empty-state__title">{title}</h3>
      {description && <p className="ui-empty-state__desc">{description}</p>}
      {(action || secondaryAction) && (
        <div className="ui-empty-state__actions">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
