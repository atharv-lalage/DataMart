import React from 'react';
import { Database, BookOpen, AlertTriangle } from 'lucide-react';

/**
 * AIEngineBadge — Visually identifies whether the response was produced by
 * Text-to-SQL (database query) or RAG (knowledge base retrieval).
 */
export default function AIEngineBadge({ intent, source }) {
  const isSQL = intent === 'data' || source === 'sql';
  const isError = source === 'sql_error';

  if (isError) {
    return (
      <span className="ai-engine-badge ai-engine-badge--error">
        <AlertTriangle size={11} />
        SQL Error Fallback
      </span>
    );
  }

  if (isSQL) {
    return (
      <span className="ai-engine-badge ai-engine-badge--sql">
        <Database size={11} />
        Text-to-SQL Engine
      </span>
    );
  }

  return (
    <span className="ai-engine-badge ai-engine-badge--rag">
      <BookOpen size={11} />
      Knowledge RAG Engine
    </span>
  );
}
