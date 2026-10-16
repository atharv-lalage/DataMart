import React from 'react';
import { User, Bot, AlertCircle } from 'lucide-react';
import AIEngineBadge from './AIEngineBadge.jsx';
import SQLCodeBlock from './SQLCodeBlock.jsx';
import AIResultTable from './AIResultTable.jsx';

export default function AIMessage({ message, currencySymbol = '' }) {
  const isUser = message.role === 'user';
  const timestamp = message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`ai-message-row ${isUser ? 'ai-message-row--user' : 'ai-message-row--assistant'}`}>
      {!isUser && (
        <div className="ai-message-avatar ai-message-avatar--assistant" title="DataMart AI Analyst">
          <Bot size={17} />
        </div>
      )}

      <div className={`ai-message-body ${isUser ? 'ai-message-body--user' : 'ai-message-body--assistant'}`}>
        {!isUser && (message.intent || message.source) && (
          <AIEngineBadge intent={message.intent} source={message.source} />
        )}

        <div className={isUser ? 'ai-bubble-user' : 'ai-bubble-assistant'}>
          {message.isError ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--color-danger)' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{message.text}</div>
            </div>
          ) : (
            message.text
          )}

          {/* Generated SQL query preview if present */}
          {!isUser && message.sql && (
            <SQLCodeBlock sql={message.sql} />
          )}

          {/* Tabular database query result rows if present */}
          {!isUser && message.rows && message.rows.length > 0 && (
            <AIResultTable
              rows={message.rows}
              columns={message.columns}
              currencySymbol={currencySymbol}
            />
          )}
        </div>

        <div className="ai-message-meta">
          <span>{isUser ? 'You' : 'AI Analyst'}</span>
          <span>•</span>
          <span>{timestamp}</span>
        </div>
      </div>

      {isUser && (
        <div className="ai-message-avatar ai-message-avatar--user" title="You">
          <User size={16} />
        </div>
      )}
    </div>
  );
}
