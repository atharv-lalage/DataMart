import React from 'react';
import { Table, Wifi, AlertTriangle, Download, Database, CheckCircle2 } from 'lucide-react';
import { Badge, Button, EmptyState, Skeleton } from '../common/index.js';

export default function QueryResultsTable({
  isRunning,
  executedData,
  error,
  currencySymbol = '',
  onExecute
}) {
  // Financial column detection for dataset currency formatting
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
      // Year or quarter or date
      if (lower === 'year' || lower === 'quarter' || lower === 'date_id') {
        return Math.floor(num);
      }
      // Units sold / count
      if (lower.includes('units') || lower.includes('quantity') || lower.includes('count')) {
        return num.toLocaleString('en-US');
      }
      // Financial amounts
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

  // CSV Export utility
  const handleExportCSV = () => {
    if (!executedData || !executedData.headers || !executedData.data) return;

    const csvContent = [
      executedData.headers.join(','),
      ...executedData.data.map((row) =>
        row
          .map((cell) => {
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
    link.setAttribute('download', `olap_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="olap-results-card">
      <div className="olap-results-header">
        <div className="olap-results-title-wrap">
          <h3 className="olap-results-title">
            <Table size={18} style={{ color: 'var(--accent-primary)' }} />
            Query Results
          </h3>
          {executedData && (
            <Badge variant="neutral">
              {executedData.rowCount} {executedData.rowCount === 1 ? 'row' : 'rows'}
            </Badge>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {executedData && (
            <>
              {executedData.live ? (
                <Badge variant="success" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Wifi size={12} />
                  Live Database
                </Badge>
              ) : (
                <Badge variant="warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <AlertTriangle size={12} />
                  Demo Fallback
                </Badge>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                icon={<Download size={13} />}
                style={{ height: 28, fontSize: '11px', padding: '0 10px' }}
              >
                Export CSV
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error notification banner if fallback or query failure */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-2)',
            background: 'var(--color-warning-subtle)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--font-size-xs)',
            color: '#B45309'
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1, color: '#D97706' }} />
          <div>
            <strong>Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isRunning ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4) 0' }}>
          <Skeleton height="36px" />
          <Skeleton height="36px" />
          <Skeleton height="36px" />
          <Skeleton height="36px" />
          <Skeleton height="36px" width="75%" />
        </div>
      ) : executedData && executedData.data ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div className="olap-table-wrap">
            <table className="olap-table">
              <thead>
                <tr>
                  {executedData.headers.map((h, i) => (
                    <th key={i} className={isNumericColumn(h) ? 'align-right' : ''}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {executedData.data.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => {
                      const colHeader = executedData.headers[j];
                      const isNumeric = isNumericColumn(colHeader);
                      return (
                        <td key={j} className={isNumeric ? 'align-right' : ''}>
                          {formatCellValue(cell, colHeader)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="olap-results-footer">
            <span>
              {executedData.live
                ? 'Source: PostgreSQL / NeonDB Snowflake Star Schema cluster.'
                : 'Source: Pre-compiled offline demo analytical dataset.'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-success)' }}>
              <CheckCircle2 size={12} /> Query executed successfully
            </span>
          </div>
        </div>
      ) : (
        <div style={{ padding: 'var(--space-12) 0', display: 'flex', justifyContent: 'center' }}>
          <EmptyState
            title="No analytical query executed yet"
            description="Choose an OLAP operation (Roll-up, Drill-down, Slice, or Dice), inspect the generated SQL preview, and click 'Execute Query' to evaluate against the multidimensional data warehouse."
            icon={<Database size={36} style={{ color: 'var(--text-tertiary)' }} />}
            action={
              <Button variant="primary" size="sm" onClick={onExecute}>
                Execute Current Query
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
