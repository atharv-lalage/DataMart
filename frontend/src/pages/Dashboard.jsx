import React, { useCallback, useEffect, useState, useRef } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Download,
  Sparkles,
  MessageCircle,
  Send,
  X,
  Trophy,
  Globe,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, Button, Badge, Skeleton, EmptyState } from '../components/common';
import MetricCard from '../components/dashboard/MetricCard';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 }
};

const CHART_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#0284C7', '#8B5CF6', '#EC4899'];
const MOCK_CLUSTERS = [
  { Segment: 'Low Value', Avg_Recency: 153, Avg_Frequency: 1.2, Avg_Monetary: 24150, Customer_Count: 2150 },
  { Segment: 'Mid Value', Avg_Recency: 45, Avg_Frequency: 5.4, Avg_Monetary: 152250, Customer_Count: 1540 },
  { Segment: 'High Value', Avg_Recency: 12, Avg_Frequency: 24.5, Avg_Monetary: 882000, Customer_Count: 648 },
];

function downloadCSV(data, filename) {
  if (!data || !data.length) return;
  const keys = Object.keys(data[0]);
  const rows = [
    keys.map(k => `"${String(k).replace(/"/g, '""')}"`).join(','),
    ...data.map(r => keys.map(k => {
      const val = r[k] ?? '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(','))
  ];
  const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ── Custom Clean White Recharts Tooltip ──────────────────────────────────────
function CustomChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="recharts-custom-tooltip">
      {label && <div className="recharts-custom-tooltip__label">{label}</div>}
      {payload.map((entry, index) => {
        const valFormatted = formatter ? formatter(entry.value, entry.name, entry) : `₹${entry.value?.toLocaleString()}`;
        return (
          <div key={`item-${index}`} className="recharts-custom-tooltip__item" style={{ color: entry.color || '#0F172A' }}>
            <span style={{ fontWeight: 500, marginRight: 6 }}>{entry.name}:</span>
            <span style={{ fontWeight: 700 }}>{valFormatted}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── AI Chat Widget (RAG + Text-to-SQL) — Fully Preserved ─────────────────────
const SUGGESTED = [
  { label: 'Top 5 products?', q: 'What are the top 5 products by revenue?' },
  { label: 'Nov 2011 sales?', q: 'What was total revenue in November 2011?' },
  { label: 'What is OLAP?',   q: 'What is OLAP and how does it work?' },
  { label: 'Best country?',   q: 'Which country has the highest total sales?' },
];

function IntentBadge({ intent }) {
  if (!intent) return null;
  const isSQL = intent === 'data';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700,
      padding: '2px 7px', borderRadius: 20,
      background: isSQL ? 'rgba(16,185,129,0.12)' : 'rgba(139,92,246,0.15)',
      color: isSQL ? '#10B981' : '#8B5CF6',
      border: `1px solid ${isSQL ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.3)'}`,
      marginBottom: 4,
    }}>
      {isSQL ? '⚡ SQL' : '📚 RAG'}
    </span>
  );
}

function SQLBlock({ sql }) {
  const [show, setShow] = useState(false);
  if (!sql) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <button onClick={() => setShow(s => !s)} style={{
        fontSize: '0.68rem', color: '#64748B', background: 'none',
        border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline'
      }}>
        {show ? 'Hide SQL ▲' : 'Show SQL ▼'}
      </button>
      {show && (
        <pre style={{
          marginTop: 4, padding: '0.5rem 0.6rem',
          background: '#0F172A', borderRadius: 6,
          fontSize: '0.68rem', color: '#38BDF8', fontFamily: 'monospace',
          overflowX: 'auto', whiteSpace: 'pre-wrap',
          border: '1px solid rgba(56,189,248,0.2)', maxHeight: 140
        }}>{sql}</pre>
      )}
    </div>
  );
}

function RowsTable({ rows, columns }) {
  if (!rows || rows.length === 0) return null;
  const cols = columns.length ? columns : Object.keys(rows[0]);
  return (
    <div style={{ overflowX: 'auto', marginTop: 6 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.68rem' }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ padding: '3px 6px', borderBottom: '1px solid #E2E8F0',
                color: '#64748B', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 6).map((row, i) => (
            <tr key={i}>
              {cols.map(c => (
                <td key={c} style={{ padding: '3px 6px', borderBottom: i < rows.length - 1
                  ? '1px solid #F1F5F9' : 'none', color: '#0F172A' }}>
                  {row[c] != null ? String(row[c]) : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 6 && (
        <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 3 }}>
          …and {rows.length - 6} more rows
        </div>
      )}
    </div>
  );
}

function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'ai',
    text: "Hi! I'm your AI analyst powered by RAG + Text-to-SQL.\n\nAsk me a data question (\"top 5 products by revenue?\") and I'll query the database. Ask a concept question (\"what is OLAP?\") and I'll search the knowledge base.",
    intent: null, sql: null, rows: [], columns: []
  }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (overrideMsg) => {
    const msg = (overrideMsg || input).trim();
    if (!msg || thinking) return;
    setInput('');
    const userMsg = { role: 'user', text: msg, intent: null, sql: null, rows: [], columns: [] };
    setMessages(prev => [...prev, userMsg]);
    setThinking(true);

    const history = messages.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }));

    try {
      const res = await axios.post(`${API_BASE_URL}/api/chat`, { message: msg, history });
      const d = res.data;
      setMessages(prev => [...prev, {
        role: 'ai',
        text: d.answer || d.response || 'No answer.',
        intent: d.intent,
        sql: d.sql,
        rows: d.rows || [],
        columns: d.columns || [],
      }]);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Could not reach the AI.';
      setMessages(prev => [...prev, { role: 'ai', text: `⚠️ ${detail}`, intent: null, sql: null, rows: [], columns: [] }]);
    }
    setThinking(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open AI Business Analyst"
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%',
          backgroundColor: '#4F46E5',
          border: 'none', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
          transition: 'transform 0.15s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open ? <X size={22} color="white" /> : <MessageCircle size={22} color="white" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'fixed', bottom: '6rem', right: '2rem', zIndex: 999,
              width: 400, backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0', borderRadius: 16,
              overflow: 'hidden', boxShadow: '0 20px 40px rgba(15,23,42,0.18)',
              display: 'flex', flexDirection: 'column', maxHeight: '80vh'
            }}
          >
            {/* Header */}
            <div style={{ padding: '0.9rem 1.25rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <Sparkles size={18} color="#4F46E5" />
              <div>
                <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.9rem' }}>DataMart AI Analyst</span>
                <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: 1 }}>RAG + Text-to-SQL · Groq LLM</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>● Online</span>
            </div>

            {/* Messages */}
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: '#FFFFFF' }}>
              {messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                  {m.role === 'ai' && m.intent && <IntentBadge intent={m.intent} />}
                  <div style={{
                    padding: '0.65rem 0.9rem',
                    borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    backgroundColor: m.role === 'user' ? '#4F46E5' : '#F1F5F9',
                    color: m.role === 'user' ? '#FFFFFF' : '#0F172A',
                    fontSize: '0.875rem', lineHeight: 1.5,
                    border: m.role === 'ai' ? '1px solid #E2E8F0' : 'none',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {m.text}
                  </div>
                  {m.role === 'ai' && <SQLBlock sql={m.sql} />}
                  {m.role === 'ai' && <RowsTable rows={m.rows} columns={m.columns} />}
                </div>
              ))}
              {thinking && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 6, alignItems: 'center', padding: '0.5rem' }}>
                  <div className="ui-btn__spinner" style={{ width: 16, height: 16, border: '2px solid #E2E8F0', borderTopColor: '#4F46E5', borderRadius: '50%' }} />
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Querying database...</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggested questions */}
            <div style={{ padding: '0 1rem 0.6rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', flexShrink: 0, backgroundColor: '#FFFFFF' }}>
              {SUGGESTED.map(s => (
                <button key={s.q} onClick={() => send(s.q)}
                  style={{ fontSize: '0.6875rem', padding: '3px 8px', background: '#F8FAFC',
                    border: '1px solid #E2E8F0', borderRadius: 20, color: '#475569', cursor: 'pointer', transition: 'background 0.15s ease' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EEF2FF'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '0.5rem', flexShrink: 0, backgroundColor: '#F8FAFC' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask about data or concepts..."
                style={{ flex: 1, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                  borderRadius: 8, padding: '0.5rem 0.75rem', color: '#0F172A', fontSize: '0.875rem', outline: 'none' }}
              />
              <button onClick={() => send()} disabled={thinking || !input.trim()}
                style={{ backgroundColor: thinking ? '#CBD5E1' : '#4F46E5',
                  border: 'none', borderRadius: 8, padding: '0.5rem 0.75rem', cursor: thinking ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', color: '#FFFFFF' }}>
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main Dashboard Page ──────────────────────────────────────────────────────
export default function Dashboard() {
  const [salesData, setSalesData] = useState({ total_sales: 0, total_orders: 0, average_order_value: 0 });
  const [predictions, setPredictions] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [marketBasket, setMarketBasket] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [salesByCountry, setSalesByCountry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [activeDataset, setActiveDataset] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, predRes, clusterRes, basketRes, topRes, countryRes, datasetRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/analytics/sales`).catch(() => ({ data: {} })),
        axios.get(`${API_BASE_URL}/api/analytics/predictions`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/analytics/clusters`).catch(() => ({ data: MOCK_CLUSTERS })),
        axios.get(`${API_BASE_URL}/api/analytics/market-basket`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/analytics/top-products`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/analytics/sales-by-country`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/dataset/info`).catch(() => ({ data: { files: [] } })),
      ]);

      setSalesData(salesRes.data || { total_sales: 0, total_orders: 0, average_order_value: 0 });
      setPredictions(predRes.data?.length ? predRes.data : []);
      setClusters(clusterRes.data?.length ? clusterRes.data : MOCK_CLUSTERS);
      setMarketBasket(basketRes.data || []);
      setTopProducts(topRes.data || []);
      setSalesByCountry(countryRes.data || []);

      const files = datasetRes.data?.files || [];
      if (files.length > 0) {
        setActiveDataset(files[files.length - 1].name);
        setClusters(clusterRes.data?.length ? clusterRes.data : []);
      } else {
        setActiveDataset(null);
        setClusters([]);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setClusters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchAll(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAll]);

  const generateInsights = async () => {
    setLoadingInsight(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/analytics/explain-trends`);
      setAiInsight(res.data.response || res.data.error || 'Failed to analyze data.');
    } catch {
      setAiInsight('Groq API Error: Ensure the backend service is active and GROQ_API_KEY is configured in your .env file.');
    }
    setLoadingInsight(false);
  };

  const handleExportAll = () => {
    downloadCSV(predictions, 'sales_predictions.csv');
    setTimeout(() => downloadCSV(clusters, 'customer_segments.csv'), 200);
    setTimeout(() => downloadCSV(topProducts, 'top_products.csv'), 400);
    setTimeout(() => downloadCSV(salesByCountry, 'sales_by_country.csv'), 600);
    setTimeout(() => downloadCSV(marketBasket, 'market_basket_rules.csv'), 800);
  };

  return (
    <>
      <motion.div className="container" initial="initial" animate="in" exit="out" variants={pageVariants}>

        {/* ── Section A: Page Header ───────────────────────────────────────── */}
        <div className="ui-page-header" style={{ marginBottom: '1.5rem' }}>
          <div className="ui-page-header__main">
            <div className="ui-page-header__title-area">
              <div className="ui-page-header__title-row">
                <h1 className="ui-page-header__title">Analytics Overview</h1>
                {activeDataset ? (
                  <Badge variant="success" withDot>
                    {activeDataset}
                  </Badge>
                ) : (
                  <Badge variant="warning" withDot>
                    No Dataset Uploaded
                  </Badge>
                )}
              </div>
              <p className="ui-page-header__subtitle">
                Executive performance metrics, predictive forecasting models, and customer intelligence.
              </p>
            </div>

            <div className="ui-page-header__actions">
              <Button
                variant="outline"
                size="md"
                icon={<RefreshCw size={15} className={loading ? 'ui-btn__spinner' : ''} />}
                onClick={fetchAll}
                disabled={loading}
              >
                Refresh Data
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={<Download size={15} />}
                onClick={handleExportAll}
                disabled={loading || !predictions.length}
              >
                Export All CSV
              </Button>
            </div>
          </div>
        </div>

        {/* ── Isolated Workspace Alert (If no dataset) ──────────────────────── */}
        {!activeDataset && !loading && (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              marginBottom: '1.5rem',
              borderRadius: 'var(--radius-card)',
              backgroundColor: '#EEF2FF',
              border: '1px solid #C7D2FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              boxShadow: 'var(--shadow-xs)',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <AlertCircle size={18} color="#4F46E5" />
                <h4 style={{ margin: 0, color: '#1E1B4B', fontSize: '0.9375rem', fontWeight: 600 }}>
                  No Sales Dataset Uploaded for Your Workspace
                </h4>
              </div>
              <p style={{ margin: 0, color: '#4338CA', fontSize: '0.85rem' }}>
                Your data is strictly sandboxed to your account. To generate live financial metrics, predictions, and customer segmentation, please upload your sales file (.xlsx or .csv).
              </p>
            </div>
            <Link to="/etl" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm" icon={<ArrowRight size={14} />} iconPosition="right">
                Go to ETL Uploader
              </Button>
            </Link>
          </div>
        )}

        {/* ── Section H: AI Executive Insights Card ────────────────────────── */}
        <div className="dashboard-ai-card">
          <div className="dashboard-ai-card__header">
            <div className="dashboard-ai-card__title-box">
              <Sparkles size={20} className="dashboard-ai-card__icon" />
              <div>
                <h3 className="dashboard-ai-card__title">AI Executive Insights</h3>
                <div className="dashboard-ai-card__subtitle">
                  High-level performance narrative generated via Groq LLM inference
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles size={14} />}
              onClick={generateInsights}
              loading={loadingInsight}
            >
              {aiInsight ? 'Regenerate Analysis' : 'Generate Analysis'}
            </Button>
          </div>

          {loadingInsight ? (
            <div style={{ marginTop: '1rem' }}>
              <Skeleton variant="text" count={3} />
            </div>
          ) : aiInsight ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="dashboard-ai-card__content"
            >
              {aiInsight}
            </motion.div>
          ) : null}
        </div>

        {/* ── Section B: KPI Summary Cards ─────────────────────────────────── */}
        {loading ? (
          <div className="dashboard-kpi-grid">
            <Skeleton variant="rectangular" height="128px" />
            <Skeleton variant="rectangular" height="128px" />
            <Skeleton variant="rectangular" height="128px" />
          </div>
        ) : (
          <div className="dashboard-kpi-grid">
            <MetricCard
              label="Total Revenue"
              value={`₹${(salesData.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle="All-time gross sales across active dataset"
              icon={<TrendingUp size={18} />}
              iconBg="#EEF2FF"
              iconColor="#4F46E5"
            />
            <MetricCard
              label="Total Orders"
              value={(salesData.total_orders || 0).toLocaleString()}
              subtitle="Completed customer transaction volume"
              icon={<ShoppingBag size={18} />}
              iconBg="#ECFDF5"
              iconColor="#10B981"
            />
            <MetricCard
              label="Average Order Value (AOV)"
              value={`₹${(salesData.average_order_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle="Mean monetary revenue per order"
              icon={<CreditCard size={18} />}
              iconBg="#EFF6FF"
              iconColor="#0284C7"
            />
          </div>
        )}

        {/* ── Section C & D: Row 1 — Sales Forecasting & Customer Segments ─── */}
        <div className="dashboard-two-col">

          {/* Section C: Sales Analytics & Forecasting Chart */}
          <Card
            title="Sales Trends & Forecasting"
            subtitle="Historical revenue vs Holt-Winters seasonal polynomial forecast"
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={<Download size={14} />}
                onClick={() => downloadCSV(predictions, 'sales_predictions.csv')}
                disabled={!predictions.length}
                title="Export forecast data to CSV"
              >
                CSV
              </Button>
            }
          >
            {loading ? (
              <Skeleton variant="rectangular" height="300px" />
            ) : predictions.length === 0 ? (
              <EmptyState
                title="No Sales Trend Data"
                description="Upload an e-commerce sales dataset and run the ETL pipeline to view predictive trend models."
              />
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={predictions} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="period" stroke="#64748B" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis stroke="#64748B" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual_sales"
                      stroke="#4F46E5"
                      strokeWidth={2.5}
                      name="Actual Sales"
                      dot={{ r: 3, fill: '#4F46E5' }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted_sales"
                      stroke="#F59E0B"
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      name="Forecast"
                      dot={{ r: 3, fill: '#F59E0B' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Section D: Customer Segmentation (RFM K-Means) */}
          <Card
            title="Customer Segments (RFM)"
            subtitle="K-Means clustering on Recency, Frequency, and Monetary spend"
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={<Download size={14} />}
                onClick={() => downloadCSV(clusters, 'customer_segments.csv')}
                disabled={!clusters.length}
                title="Export customer segments to CSV"
              >
                CSV
              </Button>
            }
          >
            {loading ? (
              <Skeleton variant="rectangular" height="300px" />
            ) : clusters.length === 0 ? (
              <EmptyState
                title="No Customer Clusters"
                description="Run the ETL pipeline to generate K-Means RFM customer segmentation tiers."
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', height: 320, gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={clusters}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="Customer_Count"
                        nameKey="Segment"
                      >
                        {clusters.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
                  {clusters.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0.6rem 0.8rem',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
                            }}
                          />
                          <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>{c.Segment}</strong>
                        </div>
                        <Badge size="sm" variant="default">
                          {c.Customer_Count?.toLocaleString()} users
                        </Badge>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Avg Spend: <strong>₹{c.Avg_Monetary?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
                        <span>Freq: <strong>{c.Avg_Frequency}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

        </div>

        {/* ── Section E & F: Row 2 — Top Products & Geographic Revenue ─────── */}
        <div className="dashboard-two-col">

          {/* Section E: Product Performance Leaderboard */}
          <Card
            title="Top Products by Revenue"
            subtitle="Catalog revenue leaders and high-volume contributors"
            icon={<Trophy size={18} color="#F59E0B" />}
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={<Download size={14} />}
                onClick={() => downloadCSV(topProducts, 'top_products.csv')}
                disabled={!topProducts.length}
                title="Export top products to CSV"
              >
                CSV
              </Button>
            }
          >
            {loading ? (
              <Skeleton variant="rectangular" height="300px" />
            ) : topProducts.length === 0 ? (
              <EmptyState
                title="No Product Data"
                description="Catalog product performance will appear after loading the dataset."
              />
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" stroke="#64748B" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis
                      type="category"
                      dataKey="product"
                      stroke="#64748B"
                      width={130}
                      tick={{ fontSize: 11, fill: '#475569' }}
                      tickFormatter={v => v.length > 20 ? v.substring(0, 20) + '…' : v}
                    />
                    <RechartsTooltip
                      content={<CustomChartTooltip formatter={(v, n, p) => [`₹${v?.toLocaleString()}`, p.payload.product]} />}
                    />
                    <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                      {topProducts.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#B45309' : '#4F46E5'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Section F: Geographic Revenue Analytics */}
          <Card
            title="Geographic Revenue Distribution"
            subtitle="Top 12 revenue-generating countries and markets"
            icon={<Globe size={18} color="#0284C7" />}
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={<Download size={14} />}
                onClick={() => downloadCSV(salesByCountry, 'sales_by_country.csv')}
                disabled={!salesByCountry.length}
                title="Export sales by country to CSV"
              >
                CSV
              </Button>
            }
          >
            {loading ? (
              <Skeleton variant="rectangular" height="300px" />
            ) : salesByCountry.length === 0 ? (
              <EmptyState
                title="No Regional Data"
                description="Geographic breakdowns will calculate once data is processed through ETL."
              />
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByCountry} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" stroke="#64748B" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis
                      type="category"
                      dataKey="country"
                      stroke="#64748B"
                      width={90}
                      tick={{ fontSize: 11, fill: '#475569' }}
                    />
                    <RechartsTooltip
                      content={<CustomChartTooltip formatter={v => [`₹${v?.toLocaleString()}`, 'Revenue']} />}
                    />
                    <Bar dataKey="revenue" name="Revenue" fill="#0284C7" radius={[0, 4, 4, 0]}>
                      {salesByCountry.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

        </div>

        {/* ── Section G: Market Basket Analysis (Apriori Rules) ─────────────── */}
        <Card
          title="Products Frequently Bought Together"
          subtitle="Association rules mined via adaptive Apriori algorithm with confidence & lift thresholds"
          actions={
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={14} />}
              onClick={() => {
                const exportData = marketBasket.map(r => ({
                  'Antecedent / Consequent': r.rule,
                  'Confidence': `${(r.confidence * 100).toFixed(1)}%`,
                  'Support': `${(r.support * 100).toFixed(2)}%`,
                  'Lift': r.lift?.toFixed(2)
                }));
                downloadCSV(exportData, 'market_basket_rules.csv');
              }}
              disabled={!marketBasket.length}
            >
              Export Rules CSV
            </Button>
          }
          noPadding
        >
          {loading ? (
            <div style={{ padding: '1.5rem' }}>
              <Skeleton variant="text" count={5} />
            </div>
          ) : marketBasket.length === 0 ? (
            <div style={{ padding: '2rem' }}>
              <EmptyState
                title="No Association Rules Discovered"
                description="Run the ETL Pipeline to discover cross-sell recommendations with the adaptive Apriori algorithm."
              />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Product Association Rule</th>
                    <th style={{ width: 140 }}>Confidence</th>
                    <th style={{ width: 140 }}>Support</th>
                    <th style={{ width: 150 }}>Association Strength</th>
                  </tr>
                </thead>
                <tbody>
                  {marketBasket.map((rule, idx) => {
                    const parts = rule.rule.split(' -> ');
                    const antecedent = parts[0] || rule.rule;
                    const consequent = parts[1] || '';

                    return (
                      <tr key={idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>{antecedent}</span>
                            {consequent && (
                              <>
                                <ArrowRight size={13} color="#94A3B8" style={{ flexShrink: 0 }} />
                                <span style={{ color: '#4F46E5', fontWeight: 600 }}>{consequent}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td style={{ color: '#0F172A', fontWeight: 500 }}>
                          {(rule.confidence * 100).toFixed(1)}%
                        </td>
                        <td style={{ color: '#64748B' }}>
                          {(rule.support * 100).toFixed(2)}%
                        </td>
                        <td>
                          <Badge variant="purple" size="sm">
                            {rule.lift?.toFixed(2)}x Lift
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </motion.div>

      {/* ── Section I: AI Chatbot Floating Widget (Fully Preserved) ────────── */}
      <AIChatWidget />
    </>
  );
}
