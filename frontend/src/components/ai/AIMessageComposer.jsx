import React, { useRef, useEffect } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';

export default function AIMessageComposer({
  input,
  setInput,
  onSend,
  thinking = false,
  placeholder = 'Ask a data or business concept question (e.g. "Total revenue" or "What is OLAP?")...'
}) {
  const textareaRef = useRef(null);

  // Auto-resize textarea height up to maximum bound
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 130);
      textareaRef.current.style.height = `${Math.max(newHeight, 44)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!thinking && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="ai-composer-card">
      <textarea
        ref={textareaRef}
        className="ai-textarea"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={thinking}
        rows={1}
      />
      <button
        type="button"
        className="ai-send-btn"
        onClick={() => onSend()}
        disabled={thinking || !input.trim()}
        title="Send Message (Enter)"
      >
        {thinking ? (
          <div
            className="ui-btn__spinner"
            style={{
              width: 16,
              height: 16,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#FFFFFF',
              borderRadius: '50%'
            }}
          />
        ) : (
          <Send size={16} />
        )}
      </button>
    </div>
  );
}
