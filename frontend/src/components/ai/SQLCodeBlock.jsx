import React, { useState } from 'react';
import { Code2, Copy, Check } from 'lucide-react';

export default function SQLCodeBlock({ sql }) {
  const [copied, setCopied] = useState(false);

  if (!sql) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe SQL syntax highlighter using tokenized placeholders and CSS classes
  const formatSQL = (rawSql) => {
    if (!rawSql) return '';
    let safe = rawSql
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 1. Extract string literals
    const strTokens = [];
    safe = safe.replace(/('([^'\\]|\\.)*')/g, (match) => {
      strTokens.push(match);
      return `___AI_SQL_STR_${strTokens.length - 1}___`;
    });

    // 2. Highlight Keywords
    safe = safe.replace(
      /\b(SELECT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|SUM|AVG|COUNT|MAX|MIN|LIMIT|AND|IN|ON|AS|LEFT|INNER|LOWER|DESC|ASC)\b/g,
      '<span class="sql-token-kw">$1</span>'
    );

    // 3. Highlight Tables
    safe = safe.replace(
      /\b(ecom_sales_fact|ecom_dim_time|ecom_dim_customer|ecom_dim_product|ecom_dim_category|ecom_orders|ecom_order_items|ecom_users)\b/g,
      '<span class="sql-token-table">$1</span>'
    );

    // 4. Highlight Numbers
    safe = safe.replace(
      /\b(\d+(\.\d+)?)\b/g,
      '<span class="sql-token-num">$1</span>'
    );

    // 5. Restore String Literals
    safe = safe.replace(/___AI_SQL_STR_(\d+)___/g, (_, idx) => {
      return `<span class="sql-token-str">${strTokens[Number(idx)]}</span>`;
    });

    return safe;
  };

  return (
    <div className="ai-sql-container">
      <div className="ai-sql-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Code2 size={13} style={{ color: 'var(--accent-primary)' }} />
          <span>Generated SQL Query</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="olap-copy-btn"
          title="Copy SQL to Clipboard"
        >
          {copied ? (
            <>
              <Check size={11} style={{ color: '#10B981' }} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy SQL</span>
            </>
          )}
        </button>
      </div>
      <pre
        className="ai-sql-pre"
        dangerouslySetInnerHTML={{ __html: formatSQL(sql) }}
      />
    </div>
  );
}
