import React, { useState } from 'react';
import { Database, Server, Layers, ShieldCheck, CheckCircle2, ChevronRight, Table } from 'lucide-react';
import { Badge } from '../common/index.js';

const DW_TABLES = [
  {
    name: 'ecom_sales_fact',
    type: 'Fact Table',
    description: 'Central fact table recording transactional e-commerce sales measures.',
    columns: [
      { name: 'fact_id', type: 'SERIAL', key: 'PK' },
      { name: 'order_id', type: 'VARCHAR(50)', key: '' },
      { name: 'product_id', type: 'VARCHAR(50)', key: 'FK -> ecom_dim_product' },
      { name: 'user_id', type: 'VARCHAR(50)', key: 'FK -> ecom_dim_customer' },
      { name: 'date_id', type: 'INT', key: 'FK -> ecom_dim_time' },
      { name: 'quantity', type: 'INTEGER', key: 'Measure' },
      { name: 'amount', type: 'DECIMAL(10,2)', key: 'Measure' },
    ]
  },
  {
    name: 'ecom_dim_time',
    type: 'Dimension',
    description: 'Temporal hierarchy dimension supporting Roll-up and Drill-down operations.',
    columns: [
      { name: 'date_id', type: 'INT', key: 'PK' },
      { name: 'full_date', type: 'DATE', key: '' },
      { name: 'day', type: 'INT', key: '' },
      { name: 'month', type: 'INT', key: '' },
      { name: 'year', type: 'INT', key: '' },
      { name: 'quarter', type: 'INT', key: '' },
      { name: 'day_of_week', type: 'INT', key: '' },
    ]
  },
  {
    name: 'ecom_dim_product',
    type: 'Dimension',
    description: 'Product catalog dimension with category relationship.',
    columns: [
      { name: 'product_id', type: 'VARCHAR(50)', key: 'PK' },
      { name: 'name', type: 'TEXT', key: '' },
      { name: 'category_id', type: 'INTEGER', key: 'FK -> ecom_dim_category' },
      { name: 'price', type: 'DECIMAL(10,2)', key: '' },
    ]
  },
  {
    name: 'ecom_dim_customer',
    type: 'Dimension',
    description: 'Customer profile and geography dimension.',
    columns: [
      { name: 'user_id', type: 'VARCHAR(50)', key: 'PK' },
      { name: 'name', type: 'VARCHAR(100)', key: '' },
      { name: 'country', type: 'VARCHAR(50)', key: '' },
    ]
  },
  {
    name: 'ecom_dim_category',
    type: 'Dimension',
    description: 'Product category taxonomy classification.',
    columns: [
      { name: 'category_id', type: 'SERIAL', key: 'PK' },
      { name: 'category_name', type: 'VARCHAR(100)', key: 'UNIQUE' },
    ]
  }
];

const OLTP_TABLES = [
  {
    name: 'ecom_orders',
    type: 'OLTP Entity',
    description: 'Transactional purchase orders header records.',
    columns: [
      { name: 'order_id', type: 'VARCHAR(50)', key: 'PK' },
      { name: 'user_id', type: 'VARCHAR(50)', key: 'FK -> ecom_users' },
      { name: 'order_date', type: 'TIMESTAMP', key: '' },
    ]
  },
  {
    name: 'ecom_order_items',
    type: 'OLTP Entity',
    description: 'Line item purchase details per order transaction.',
    columns: [
      { name: 'order_item_id', type: 'SERIAL', key: 'PK' },
      { name: 'order_id', type: 'VARCHAR(50)', key: 'FK -> ecom_orders' },
      { name: 'product_id', type: 'VARCHAR(50)', key: 'FK -> ecom_products' },
      { name: 'quantity', type: 'INTEGER', key: '' },
      { name: 'amount', type: 'DECIMAL(10,2)', key: '' },
    ]
  },
  {
    name: 'ecom_products',
    type: 'OLTP Entity',
    description: 'Storefront product listing and pricing inventory.',
    columns: [
      { name: 'product_id', type: 'VARCHAR(50)', key: 'PK' },
      { name: 'name', type: 'TEXT', key: '' },
      { name: 'category', type: 'VARCHAR(100)', key: '' },
      { name: 'price', type: 'DECIMAL(10,2)', key: '' },
    ]
  },
  {
    name: 'ecom_users',
    type: 'OLTP Entity',
    description: 'Customer operational account profiles.',
    columns: [
      { name: 'user_id', type: 'VARCHAR(50)', key: 'PK' },
      { name: 'name', type: 'VARCHAR(100)', key: '' },
      { name: 'email', type: 'VARCHAR(100)', key: 'UNIQUE' },
      { name: 'country', type: 'VARCHAR(50)', key: '' },
    ]
  }
];

export default function DatabaseSettings() {
  const [schemaMode, setSchemaMode] = useState('dw'); // 'dw' | 'oltp'
  const [selectedTable, setSelectedTable] = useState(DW_TABLES[0].name);

  const activeTables = schemaMode === 'dw' ? DW_TABLES : OLTP_TABLES;
  const currentTable = activeTables.find(t => t.name === selectedTable) || activeTables[0];

  return (
    <div className="settings-section-container">
      <div className="settings-section-header">
        <div>
          <h2 className="settings-section-title">Database & Schema Architecture</h2>
          <p className="settings-section-desc">
            Inspect relational database engine configurations, connection states, and physical schema definitions.
          </p>
        </div>
      </div>

      {/* Database Connection Summary Cards */}
      <div className="settings-db-grid">
        <div className="settings-card">
          <div className="settings-db-card-header">
            <div className="settings-db-icon-wrap">
              <Database size={18} />
            </div>
            <div>
              <h4 className="settings-db-card-title">NeonDB Serverless PostgreSQL</h4>
              <p className="settings-db-card-desc">Primary Analytical Data Warehouse & OLTP Storage</p>
            </div>
            <span className="settings-status-online">
              <span className="settings-live-dot" />
              <span>Connected</span>
            </span>
          </div>

          <div className="settings-detail-list" style={{ marginTop: 'var(--space-4)' }}>
            <div className="settings-detail-row">
              <span className="settings-detail-label">Connection URI</span>
              <span className="settings-code-tag">Configured securely via DATABASE_URL</span>
            </div>
            <div className="settings-detail-row">
              <span className="settings-detail-label">Engine Version</span>
              <span className="settings-detail-value">PostgreSQL 16 (Serverless Neon Cloud)</span>
            </div>
            <div className="settings-detail-row">
              <span className="settings-detail-label">Analytical Cache Strategy</span>
              <span className="settings-detail-value">Server-managed pickle cache with tenant eviction</span>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-db-card-header">
            <div className="settings-db-icon-wrap" style={{ background: '#ECFDF5', color: '#059669' }}>
              <Server size={18} />
            </div>
            <div>
              <h4 className="settings-db-card-title">MongoDB Atlas Cloud</h4>
              <p className="settings-db-card-desc">Authentication & Multi-Tenant User Store</p>
            </div>
            <span className="settings-status-online">
              <span className="settings-live-dot" />
              <span>Active</span>
            </span>
          </div>

          <div className="settings-detail-list" style={{ marginTop: 'var(--space-4)' }}>
            <div className="settings-detail-row">
              <span className="settings-detail-label">Collection</span>
              <span className="settings-code-tag">datamart_db.users</span>
            </div>
            <div className="settings-detail-row">
              <span className="settings-detail-label">Access Mode</span>
              <span className="settings-detail-value">Bcrypt Password Verification + JWT Generation</span>
            </div>
            <div className="settings-detail-row">
              <span className="settings-detail-label">Security</span>
              <span className="settings-detail-value">TLS/SSL Encrypted Connection String</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schema Inspector Card */}
      <div className="settings-card" style={{ marginTop: 'var(--space-5)' }}>
        <div className="settings-schema-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Layers size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Schema Definitions Inspector
            </h3>
          </div>

          <div className="settings-schema-tabs">
            <button
              type="button"
              className={`settings-schema-tab-btn ${schemaMode === 'dw' ? 'settings-schema-tab-btn--active' : ''}`}
              onClick={() => {
                setSchemaMode('dw');
                setSelectedTable(DW_TABLES[0].name);
              }}
            >
              OLAP Star Schema ({DW_TABLES.length} Tables)
            </button>
            <button
              type="button"
              className={`settings-schema-tab-btn ${schemaMode === 'oltp' ? 'settings-schema-tab-btn--active' : ''}`}
              onClick={() => {
                setSchemaMode('oltp');
                setSelectedTable(OLTP_TABLES[0].name);
              }}
            >
              OLTP Relational ({OLTP_TABLES.length} Tables)
            </button>
          </div>
        </div>

        <div className="settings-schema-body">
          {/* Table List Sidebar */}
          <div className="settings-schema-nav">
            {activeTables.map((tbl) => (
              <button
                key={tbl.name}
                type="button"
                className={`settings-schema-table-btn ${currentTable.name === tbl.name ? 'settings-schema-table-btn--active' : ''}`}
                onClick={() => setSelectedTable(tbl.name)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Table size={13} style={{ opacity: 0.7 }} />
                  <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '12px' }}>{tbl.name}</span>
                </div>
                <Badge variant={tbl.type.includes('Fact') ? 'primary' : 'neutral'}>
                  {tbl.type}
                </Badge>
              </button>
            ))}
          </div>

          {/* Table Details */}
          <div className="settings-schema-content">
            <div className="settings-schema-table-meta">
              <div>
                <span className="settings-code-title">{currentTable.name}</span>
                <span style={{ marginLeft: 8, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ({currentTable.type})
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {currentTable.description}
              </p>
            </div>

            <div className="settings-table-wrapper">
              <table className="settings-table">
                <thead>
                  <tr>
                    <th>Column Name</th>
                    <th>Data Type</th>
                    <th>Constraints / Keys</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTable.columns.map((col, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {col.name}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {col.type}
                      </td>
                      <td>
                        {col.key ? (
                          <span className={`settings-key-badge ${col.key.includes('PK') ? 'settings-key-badge--pk' : col.key.includes('FK') ? 'settings-key-badge--fk' : 'settings-key-badge--measure'}`}>
                            {col.key}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
