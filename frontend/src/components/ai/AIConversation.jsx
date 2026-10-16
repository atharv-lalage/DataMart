import React, { useRef, useEffect } from 'react';
import { Bot, Sparkles, Database } from 'lucide-react';
import AIMessage from './AIMessage.jsx';

export default function AIConversation({
  messages = [],
  thinking = false,
  currencySymbol = '',
  onSelectSuggestion
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  return (
    <div className="ai-message-stream">
      {messages.map((m, idx) => (
        <AIMessage
          key={m.id || idx}
          message={m}
          currencySymbol={currencySymbol}
        />
      ))}

      {thinking && (
        <div className="ai-message-row ai-message-row--assistant">
          <div className="ai-message-avatar ai-message-avatar--assistant">
            <Bot size={17} />
          </div>
          <div className="ai-message-body ai-message-body--assistant">
            <div
              className="ai-bubble-assistant"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 18px',
                width: 'auto'
              }}
            >
              <div
                className="ui-btn__spinner"
                style={{
                  width: 16,
                  height: 16,
                  border: '2px solid #E2E8F0',
                  borderTopColor: 'var(--accent-primary)',
                  borderRadius: '50%'
                }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Analyzing analytical context and querying warehouse...
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
