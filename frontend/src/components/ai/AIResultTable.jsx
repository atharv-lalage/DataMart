import React from 'react';
import { Table as TableIcon, Download } from 'lucide-react';
import { Badge } from '../common/index.js';

export default function AIResultTable({ rows = [], columns = [], currencySymbol = '' }) {
  if (!rows || rows.length === 0) return null;

  const cols = columns && columns.length > 0 ? columns : Object.keys(rows[0]);

  const isFinancialColumn = (colName) => {
    const lower = (colName || '').toLowerCase();
    return (
      lower.includes('revenue') ||
      lower.includes('sales') ||
      lower.includes('amount') ||
      lower.includes('price')
    );
  };

  const isNumericColumn = (colName) => {
    const lower = (colName || '').toLowerCase();
    return (
      isFinancialColumn(colName) ||
      lower.includes('quantity') ||
      lower.includes('units') ||
      lower.includes('year') ||
      lower.includes('quarter') ||
      lower.includes('count')
    );
  };

  const formatCellValue = (val, colName) => {
    if (val === null || val === undefined || val === 'NULL') {
      return <span className="olap-null">NULL</span>;
    }

    const num = Number(val);
    if (!isNaN(num) && typeof val !== 'boolean') {
      const lower = (colName || '').toLowerCase();
      if (lower === 'year' || lower === 'quarter' || lower === 'id') {
        return Math.floor(num);
      }
      if (lower.includes('quantity') || lower.includes('units') || lower.includes('count')) {
        return num.toLocaleString('en-US');
      }
      if (isFinancialColumn(colName)) {
        const formatted = num.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        return currencySymbol ? `${currencySymbol}${formatted}` : formatted;
      }
      return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }

    return String(val);
  };

  const handleExportCSV = () => {
    if (!rows.length) return;
    const csvContent = [
      cols.join(','),
      ...rows.map((row) =>
        cols
          .map((c) => {
            const cell = row[c];
            if (cell === null || cell === undefined) return '';
            const str = String(cell);
            return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
          })
          .join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ai_query_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="ai-table-container">
      <div className="ai-table-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TableIcon size={13} style={{ color: 'var(--accent-primary)' }} />
          <span>Database Query Results</span>
          <Badge variant="neutral" style={{ fontSize: '10px', padding: '1px 6px' }}>
            {rows.length} {rows.length === 1 ? 'row' : 'rows'}
          </Badge>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          className="olap-copy-btn"
          title="Download Results as CSV"
        >
          <Download size={11} />
          <span>CSV</span>
        </button>
      </div>

      <div className="ai-table-scroll">
        <table className="ai-table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c} className={isNumericColumn(c) ? 'align-right' : ''}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {cols.map((c) => {
                  const isNum = isNumericColumn(c);
                  return (
                    <td key={c} className={isNum ? 'align-right' : ''}>
                      {formatCellValue(row[c], c)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
