import React from 'react';
import { Sparkles, Database, BookOpen } from 'lucide-react';

export const SUGGESTED_QUESTIONS = [
  {
    category: 'data',
    icon: Database,
    label: 'Total Revenue?',
    query: 'What is our total revenue?'
  },
  {
    category: 'data',
    icon: Database,
    label: 'Top 5 Products?',
    query: 'Show the top 5 products by sales.'
  },
  {
    category: 'data',
    icon: Database,
    label: 'Top Countries?',
    query: 'Which countries generate the most revenue?'
  },
  {
    category: 'concept',
    icon: BookOpen,
    label: 'What is OLAP?',
    query: 'What is OLAP and how does it work?'
  },
  {
    category: 'concept',
    icon: BookOpen,
    label: 'Roll-up vs Drill-down?',
    query: 'What is the difference between Roll-up and Drill-down?'
  },
  {
    category: 'concept',
    icon: BookOpen,
    label: 'Snowflake Schema?',
    query: 'Explain the Snowflake schema architecture.'
  }
];

export default function SuggestedQuestions({ onSelectQuestion, disabled = false }) {
  return (
    <div className="ai-suggested-tray">
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, paddingRight: 4 }}>
        <Sparkles size={12} style={{ color: 'var(--accent-primary)' }} />
        <span>Suggestions:</span>
      </div>
      {SUGGESTED_QUESTIONS.map((item, idx) => {
        const Icon = item.icon;
        return (
          <button
            key={idx}
            type="button"
            className="ai-suggested-pill"
            onClick={() => onSelectQuestion(item.query)}
            disabled={disabled}
            title={item.query}
          >
            <Icon size={11} style={{ opacity: 0.7 }} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
