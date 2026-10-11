import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Play, Database, Table, AlertTriangle, Wifi, Filter } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September'},{ value: 10, label: 'October' },
  { value: 11, label: 'November'},{ value: 12, label: 'December' },
];

const CATEGORIES = ['General', 'Decoration', 'Bags', 'Mugs', 'Gift'];

const queries = {
  rollup: {
    title: "Sales over Time",
    key: "rollup",
    desc: "Aggregates sales by year and quarter. Optionally filter to a specific year.",
    buildSQL: (f) => `SELECT dt.year, dt.quarter,\n    SUM(sf.amount) as total_revenue\nFROM ecom_sales_fact sf\nJOIN ecom_dim_time dt ON sf.date_id = dt.date_id\n${f.year ? `WHERE dt.year = ${f.year}\n` : ''}GROUP BY dt.year, dt.quarter\nORDER BY dt.year, dt.quarter;`,
    fallbackHeaders: ["year", "quarter", "total_revenue"],
    fallbackData: [["2010","4","78640485"],["2011","1","187950000"],["2011","2","228900000"],["2011","3","245700000"]],
  },
  drilldown: {
    title: "Top Products by Country",
    key: "drilldown",
    desc: "Breaks sales down by country and product. Filter by country or year.",
    buildSQL: (f) => `SELECT dc.country, dp.name,\n    SUM(sf.amount) as total_sales\nFROM ecom_sales_fact sf\nJOIN ecom_dim_customer dc ON sf.user_id = dc.user_id\nJOIN ecom_dim_product dp ON sf.product_id = dp.product_id\nJOIN ecom_dim_time dt ON sf.date_id = dt.date_id\nWHERE 1=1${f.country ? `\n  AND LOWER(dc.country) = '${f.country.toLowerCase()}'` : ''}${f.year ? `\n  AND dt.year = ${f.year}` : ''}\nGROUP BY dc.country, dp.name\nORDER BY total_sales DESC LIMIT 20;`,
    fallbackHeaders: ["country", "product_name", "total_sales"],
    fallbackData: [["United Kingdom","WHITE HANGING HEART T-LIGHT HOLDER","15204500"],["United Kingdom","REGENCY CAKESTAND 3 TIER","8940200"],["Germany","JUMBO BAG RED RETROSPOT","6102400"]],
  },
  slice: {
    title: "Top Products by Month",
    key: "slice",
    desc: "Shows top products for a specific month and year. Change month/year to explore any period.",
    buildSQL: (f) => `SELECT dp.name as product_name,\n    SUM(sf.quantity) as units_sold,\n    SUM(sf.amount) as gross_revenue\nFROM ecom_sales_fact sf\nJOIN ecom_dim_time dt ON sf.date_id = dt.date_id\nJOIN ecom_dim_product dp ON sf.product_id = dp.product_id\nWHERE dt.month = ${f.month || 12}\n  AND dt.year = ${f.year || 2010}\nGROUP BY dp.name\nORDER BY gross_revenue DESC\nLIMIT 15;`,
    fallbackHeaders: ["product_name", "units_sold", "gross_revenue"],
    fallbackData: [["WHITE HANGING HEART T-LIGHT HOLDER","4201","1124817"],["REGENCY CAKESTAND 3 TIER","1840","981540"],["JUMBO BAG RED RETROSPOT","3119","890205"]],
  },
  dice: {
    title: "Compare Categories",
    key: "dice",
    desc: "Compares selected categories across selected years. Pick multiple categories and years.",
    buildSQL: (f) => {
      const cats = f.categories || 'Gift,Decoration';
      const yrs = f.years || '2010,2011';
      return `SELECT dcat.category_name, dt.year,\n    SUM(sf.amount) as total_sales\nFROM ecom_sales_fact sf\nJOIN ecom_dim_product dp ON sf.product_id = dp.product_id\nJOIN ecom_dim_category dcat ON dp.category_id = dcat.category_id\nJOIN ecom_dim_time dt ON sf.date_id = dt.date_id\nWHERE dcat.category_name IN (${cats.split(',').map(c=>`'${c.trim()}'`).join(', ')})\n  AND dt.year IN (${yrs})\nGROUP BY dcat.category_name, dt.year\nORDER BY dt.year, dcat.category_name;`;
    },
    fallbackHeaders: ["category_name", "year", "total_sales"],
    fallbackData: [["Decoration","2010","21400000"],["Gift","2010","18900000"],["Decoration","2011","24100000"],["Gift","2011","19500000"]],
  }
};

const inputStyle = {
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  padding: '0.4rem 0.6rem',
  borderRadius: '6px',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%',
};

const labelStyle = {
  fontSize: '0.75rem',
  color: '#94a3b8',
  marginBottom: '0.25rem',
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

export default function OLAPTerminal() {
  const [activeQuery, setActiveQuery] = useState('rollup');
  const [isRunning, setIsRunning] = useState(false);
  const [executedData, setExecutedData] = useState(null);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [activeDataset, setActiveDataset] = useState(null);

  // Filter state per query type
  const [rollupFilters, setRollupFilters] = useState({ year: '' });
  const [drilldownFilters, setDrilldownFilters] = useState({ country: 'United Kingdom', year: '' });
  const [sliceFilters, setSliceFilters] = useState({ month: 12, year: 2010 });
  const [diceFilters, setDiceFilters] = useState({ categories: ['Gift', 'Decoration'], years: '2010,2011' });

  React.useEffect(() => {
    axios.get(`${API_BASE_URL}/api/dataset/info`)
      .then(res => {
        const files = res.data?.files || [];
        if (files.length > 0) setActiveDataset(files[files.length - 1].name);
      })
      .catch(() => {});
  }, []);

  const getFilters = () => {
    if (activeQuery === 'rollup') return rollupFilters;
    if (activeQuery === 'drilldown') return drilldownFilters;
    if (activeQuery === 'slice') return sliceFilters;
    if (activeQuery === 'dice') return { ...diceFilters, categories: diceFilters.categories.join(',') };
  };

  const handleExecute = async () => {
    setIsRunning(true);
    setExecutedData(null);
    setError(null);
    setIsLive(false);
    const filters = getFilters();

    try {
      const res = await axios.post(`${API_BASE_URL}/api/olap/query`, {
        query_key: activeQuery,
        filters
      });
      setExecutedData({ headers: res.data.columns, data: res.data.rows, rowCount: res.data.row_count, live: true });
      setIsLive(true);
    } catch (err) {
      const q = queries[activeQuery];
      setExecutedData({ headers: q.fallbackHeaders, data: q.fallbackData, rowCount: q.fallbackData.length, live: false });
      setError(`DB unavailable — showing demo data. (${err.response?.data?.error || err.message})`);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleCategory = (cat) => {
    setDiceFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const highlightSQL = (sql) =>
    sql.replace(/\b(SELECT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|SUM|LIMIT|AND|IN|ON|AS|LEFT|INNER|LOWER)\b/g,
      m => `<span style="color:#c586c0;font-weight:bold">${m}</span>`);

  const currentFilters = getFilters();
  const currentSQL = queries[activeQuery].buildSQL(currentFilters);

  const renderFilters = () => {
    if (activeQuery === 'rollup') return (
      <div>
        <label style={labelStyle}>Year (optional)</label>
        <select style={inputStyle} value={rollupFilters.year} onChange={e => setRollupFilters({ year: e.target.value })}>
          <option value="">All Years</option>
          <option value="2010">2010</option>
          <option value="2011">2011</option>
        </select>
      </div>
    );

    if (activeQuery === 'drilldown') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Country</label>
          <select style={inputStyle} value={drilldownFilters.country} onChange={e => setDrilldownFilters(p => ({ ...p, country: e.target.value }))}>
            <option value="">All Countries</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Germany">Germany</option>
            <option value="France">France</option>
            <option value="Netherlands">Netherlands</option>
            <option value="EIRE">Ireland</option>
            <option value="Spain">Spain</option>
            <option value="Australia">Australia</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Year (optional)</label>
          <select style={inputStyle} value={drilldownFilters.year} onChange={e => setDrilldownFilters(p => ({ ...p, year: e.target.value }))}>
            <option value="">All Years</option>
            <option value="2010">2010</option>
            <option value="2011">2011</option>
          </select>
        </div>
      </div>
    );

    if (activeQuery === 'slice') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Month</label>
          <select style={inputStyle} value={sliceFilters.month} onChange={e => setSliceFilters(p => ({ ...p, month: parseInt(e.target.value) }))}>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Year</label>
          <select style={inputStyle} value={sliceFilters.year} onChange={e => setSliceFilters(p => ({ ...p, year: parseInt(e.target.value) }))}>
            <option value="2010">2010</option>
            <option value="2011">2011</option>
          </select>
        </div>
      </div>
    );

    if (activeQuery === 'dice') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Categories (select multiple)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', cursor: 'pointer', border: '1px solid',
                  background: diceFilters.categories.includes(cat) ? 'rgba(99,102,241,0.3)' : 'transparent',
                  borderColor: diceFilters.categories.includes(cat) ? '#6366f1' : 'rgba(255,255,255,0.1)',
                  color: diceFilters.categories.includes(cat) ? '#a5b4fc' : '#94a3b8',
                }}
              >{cat}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Years (comma separated)</label>
          <input
            type="text"
            style={inputStyle}
            value={diceFilters.years}
            onChange={e => setDiceFilters(p => ({ ...p, years: e.target.value }))}
            placeholder="e.g. 2010,2011"
          />
        </div>
      </div>
    );
  };

  return (
    <motion.div className="container" initial="initial" animate="in" exit="out" variants={pageVariants}>
      <div className="page-header">
        <h1>Advanced Data Search</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
          <p style={{ margin: 0 }}>Ask complex questions about your sales data and get instant answers.</p>
          {activeDataset && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.35)',
                color: '#a5b4fc',
                padding: '3px 10px', borderRadius: '20px',
                fontSize: '0.78rem', fontWeight: 600, fontFamily: 'monospace'
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              {activeDataset}
            </motion.span>
          )}
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'minmax(280px, 1fr) 2.5fr' }}>

        {/* Left pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Query selector */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--text-main)' }}>
              <Database size={18} /> Search Queries
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {Object.entries(queries).map(([key, query]) => (
                <button
                  key={key}
                  className={`btn ${activeQuery === key ? 'btn-primary' : 'btn-outline'}`}
                  style={{ justifyContent: 'flex-start', padding: '0.65rem 1rem', fontSize: '0.9rem' }}
                  onClick={() => { setActiveQuery(key); setExecutedData(null); setError(null); }}
                >
                  <Terminal size={15} /> {query.title}
                </button>
              ))}
            </div>
          </div>

          {/* Filter panel */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--text-main)', fontSize: '1rem' }}>
              <Filter size={16} /> Filters
            </h3>
            {renderFilters()}
          </div>

          {/* Context */}
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>What this does</h4>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
              {queries[activeQuery].desc}
            </div>
          </div>
        </div>

        {/* Right pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* SQL preview */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308', display: 'inline-block' }}></span>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
              </div>
              <button
                className="btn"
                style={{ background: '#10B981', color: 'black', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem' }}
                onClick={handleExecute}
                disabled={isRunning}
              >
                <Play size={15} fill="currentColor" /> {isRunning ? 'Executing...' : 'Execute'}
              </button>
            </div>
            <pre style={{ margin: 0, padding: '1.25rem', background: '#0d0f17', borderRadius: '8px', border: '1px solid #1f2937', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.85rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              <code dangerouslySetInnerHTML={{ __html: highlightSQL(currentSQL) }} />
            </pre>
          </div>

          {/* Results */}
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, minHeight: '280px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Table size={18} /> Results
              {executedData && (
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, color: isLive ? '#10B981' : '#eab308' }}>
                  <Wifi size={12} /> {isLive ? 'Live DB' : 'Demo Data'}
                </span>
              )}
            </h3>

            {error && (
              <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#eab308' }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
              </div>
            )}

            {isRunning ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
                <div className="skeleton" style={{ height: 38 }}></div>
                <div className="skeleton" style={{ height: 38 }}></div>
                <div className="skeleton" style={{ height: 38, width: '70%' }}></div>
              </div>
            ) : executedData ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {executedData.headers.map((h, i) => (
                        <th key={i} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {executedData.data.map((row, i) => (
                      <tr key={i}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {row.map((cell, j) => (
                          <td key={j} style={{ padding: '0.75rem 1rem', borderBottom: i === executedData.data.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', color: (cell === null || cell === 'NULL') ? '#ec4899' : 'var(--text-main)' }}>
                            {cell === null ? 'NULL' : typeof cell === 'number' && cell > 1000
                              ? `₹${Number(cell).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                              : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--accent-secondary)' }}>
                  {executedData.rowCount} rows returned. {isLive ? 'Source: NeonDB Snowflake cluster.' : 'Source: Pre-compiled demo dataset.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '180px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Set your filters and press Execute to query the Data Warehouse.
              </div>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  );
}
