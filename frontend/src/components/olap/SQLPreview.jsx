import React, { useState } from 'react';
import { Copy, Check, Terminal, Code2 } from 'lucide-react';
import { Badge } from '../common/index.js';

export default function SQLPreview({ sql, activeQuery }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!sql) return;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe SQL Syntax Highlighter
  const formatSQL = (rawSql) => {
    if (!rawSql) return '';
    return rawSql
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(
        /\b(SELECT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|SUM|LIMIT|AND|IN|ON|AS|LEFT|INNER|LOWER|DESC|ASC)\b/g,
        (match) => `<span style="color: #818CF8; font-weight: 600;">${match}</span>`
      )
      .replace(
        /\b(ecom_sales_fact|ecom_dim_time|ecom_dim_customer|ecom_dim_product|ecom_dim_category)\b/g,
        (match) => `<span style="color: #38BDF8; font-weight: 500;">${match}</span>`
      )
      .replace(
        /(\b\d+(\.\d+)?\b)/g,
        (match) => `<span style="color: #F472B6;">${match}</span>`
      )
      .replace(
        /('([^'\\]|\\.)*')/g,
        (match) => `<span style="color: #34D399;">${match}</span>`
      );
  };

  // Compute line count
  const lines = (sql || '').split('\n');

  return (
    <div className="olap-sql-card">
      <div className="olap-sql-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="olap-window-dots">
            <span className="olap-dot olap-dot--red" />
            <span className="olap-dot olap-dot--yellow" />
            <span className="olap-dot olap-dot--green" />
          </div>
          <span className="olap-sql-title">
            <Code2 size={13} style={{ color: '#818CF8' }} />
            olap_{activeQuery}.sql
          </span>
        </div>

        <div className="olap-sql-actions">
          <Badge variant="neutral" style={{ background: 'rgba(255,255,255,0.08)', color: '#CBD5E1', fontSize: '10px' }}>
            Snowflake Schema
          </Badge>
          <button
            type="button"
            className="olap-copy-btn"
            onClick={handleCopy}
            title="Copy SQL to Clipboard"
          >
            {copied ? (
              <>
                <Check size={12} style={{ color: '#10B981' }} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy SQL</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="olap-sql-body">
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {/* Line Numbers */}
          <div
            style={{
              userSelect: 'none',
              textAlign: 'right',
              color: '#475569',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: 1.65,
              paddingRight: 'var(--space-2)',
              borderRight: '1px solid #1E293B'
            }}
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Formatted Code */}
          <pre
            className="olap-sql-pre"
            style={{ flex: 1 }}
            dangerouslySetInnerHTML={{ __html: formatSQL(sql) }}
          />
        </div>
      </div>

      <div className="olap-sql-footer">
        <span>Dialect: PostgreSQL 15+ / NeonDB</span>
        <span>{lines.length} lines • {sql.length} bytes</span>
      </div>
    </div>
  );
}
