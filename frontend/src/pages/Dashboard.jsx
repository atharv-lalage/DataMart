import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Sparkles, MessageCircle, Send, X, Trophy, Globe } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 }
};

const COLORS = ['#6366f1', '#ec4899', '#10B981', '#f59e0b', '#38bdf8', '#a78bfa'];

// ── Utility: download any array as CSV ───────────────────────────────────────
function downloadCSV(data, filename) {
  if (!data || !data.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(r => keys.map(k => `"${r[k]}"`).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  window.URL.revokeObjectURL(url);
}

// ── AI Chat Widget ───────────────────────────────────────────────────────────
function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm your AI Business Analyst. Ask me anything about your store's data!" }
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || thinking) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setThinking(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/analytics/ai-chat`, { message: msg });
      setMessages(prev => [...prev, { role: 'ai', text: res.data.response || res.data.error }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I could not reach the AI. Check your GROQ_API_KEY.' }]);
    }
    setThinking(false);
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          border: 'none', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(99,102,241,0.5)'
        }}
      >
        {open ? <X size={22} color="white" /> : <MessageCircle size={22} color="white" />}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'fixed', bottom: '6rem', right: '2rem', zIndex: 999,
              width: 360, background: 'rgba(13,15,23,0.97)',
              border: '1px solid rgba(99,102,241,0.3)', borderRadius: 16,
              overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div style={{ padding: '1rem 1.25rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(236,72,153,0.1))', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} color="#ec4899" />
              <span style={{ fontWeight: 600, color: '#a5b4fc' }}>AI Business Analyst</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#4b5563', background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '2px 8px', borderRadius: 20 }}>Online</span>
            </div>

            {/* Messages */}
            <div style={{ padding: '1rem', overflowY: 'auto', maxHeight: 300, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '0.6rem 0.9rem',
                    borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: m.role === 'user' ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'rgba(255,255,255,0.05)',
                    fontSize: '0.88rem', lineHeight: 1.5,
                    color: 'var(--text-main)',
                    border: m.role === 'ai' ? '1px solid rgba(255,255,255,0.06)' : 'none'
                  }}
                >{m.text}</motion.div>
              ))}
              {thinking && (
                <div style={{ alignSelf: 'flex-start', color: '#6366f1', fontSize: '0.85rem' }}>Thinking...</div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggested questions */}
            <div style={{ padding: '0 1rem 0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {["Best product?", "Worst week in sales?", "Who are my top customers?"].map(q => (
                <button key={q} onClick={() => { setInput(q); }}
                  style={{ fontSize: '0.72rem', padding: '3px 10px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, color: '#a5b4fc', cursor: 'pointer' }}>
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.5rem' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask about your business..."
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.88rem', outline: 'none' }}
              />
              <button onClick={send} disabled={thinking || !input.trim()}
                style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)', border: 'none', borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Send size={15} color="white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
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

  const mockClusters = [
    { Segment: 'Low Value', Avg_Recency: 153, Avg_Frequency: 1.2, Avg_Monetary: 24150, Customer_Count: 2150 },
    { Segment: 'Mid Value', Avg_Recency: 45, Avg_Frequency: 5.4, Avg_Monetary: 152250, Customer_Count: 1540 },
    { Segment: 'High Value', Avg_Recency: 12, Avg_Frequency: 24.5, Avg_Monetary: 882000, Customer_Count: 648 },
  ];

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [salesRes, predRes, clusterRes, basketRes, topRes, countryRes, datasetRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/analytics/sales`).catch(() => ({ data: {} })),
        axios.get(`${API_BASE_URL}/api/analytics/predictions`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/analytics/clusters`).catch(() => ({ data: mockClusters })),
        axios.get(`${API_BASE_URL}/api/analytics/market-basket`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/analytics/top-products`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/analytics/sales-by-country`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/dataset/info`).catch(() => ({ data: { files: [] } })),
      ]);
      setSalesData(salesRes.data);
      setPredictions(predRes.data.length ? predRes.data : []);
      setClusters(clusterRes.data.length ? clusterRes.data : mockClusters);
      setMarketBasket(basketRes.data);
      setTopProducts(topRes.data);
      setSalesByCountry(countryRes.data);
      // Pick the most recently modified file name as the active dataset
      const files = datasetRes.data?.files || [];
      if (files.length > 0) setActiveDataset(files[files.length - 1].name);
    } catch (err) {
      console.error(err);
      setClusters(mockClusters);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const generateInsights = async () => {
    setLoadingInsight(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/analytics/explain-trends`);
      setAiInsight(res.data.response || res.data.error || 'Failed to analyze data.');
    } catch {
      setAiInsight('Groq API Error: Ensure backend is running and your API key is correctly set in .env');
    }
    setLoadingInsight(false);
  };

  return (
    <>
      <motion.div className="container" initial="initial" animate="in" exit="out" variants={pageVariants}>

        {/* Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1>Business Dashboard</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
              <p style={{ margin: 0 }}>Overview of your sales and customer insights.</p>
              {activeDataset && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    background: 'rgba(99,102,241,0.15)',
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
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => {
              downloadCSV(predictions, 'sales_predictions.csv');
              setTimeout(() => downloadCSV(clusters, 'customer_segments.csv'), 300);
              setTimeout(() => downloadCSV(topProducts, 'top_products.csv'), 600);
              setTimeout(() => downloadCSV(salesByCountry, 'sales_by_country.csv'), 900);
              setTimeout(() => downloadCSV(marketBasket, 'market_basket_rules.csv'), 1200);
            }}>
            <Download size={16} /> Export All
          </button>
        </div>

        {/* AI Insights Panel */}
        <motion.div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(236,72,153,0.05))', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiInsight || loadingInsight ? '1rem' : '0' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a5b4fc', margin: 0 }}>
              <Sparkles size={20} color="#ec4899" /> AI Business Analyst
            </h3>
            <button className="btn btn-primary" onClick={generateInsights} disabled={loadingInsight} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              {loadingInsight ? 'Analyzing...' : 'Generate Insights'}
            </button>
          </div>
          {loadingInsight ? (
            <div className="skeleton" style={{ height: '60px', width: '100%', borderRadius: '8px' }}></div>
          ) : aiInsight ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: '3px solid #ec4899', fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
              {aiInsight}
            </motion.div>
          ) : null}
        </motion.div>

        {loading ? (
          <>
            <div className="dashboard-grid">
              <div className="skeleton" style={{ height: 120 }}></div>
              <div className="skeleton" style={{ height: 120 }}></div>
              <div className="skeleton" style={{ height: 120 }}></div>
            </div>
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="skeleton" style={{ height: 360 }}></div>
              <div className="skeleton" style={{ height: 360 }}></div>
              <div className="skeleton" style={{ height: 360 }}></div>
              <div className="skeleton" style={{ height: 360 }}></div>
            </div>
          </>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show">

            {/* KPI Stats */}
            <div className="dashboard-grid">
              <motion.div variants={itemVariants} className="glass-panel stat-card">
                <h3>Total Sales</h3>
                <div className="value">₹{salesData.total_sales?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <span style={{ color: 'var(--accent-secondary)', fontSize: '0.9rem' }}>All time revenue</span>
              </motion.div>
              <motion.div variants={itemVariants} className="glass-panel stat-card">
                <h3>Total Orders</h3>
                <div className="value">{salesData.total_orders?.toLocaleString()}</div>
                <span style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>Completed orders</span>
              </motion.div>
              <motion.div variants={itemVariants} className="glass-panel stat-card">
                <h3>Avg Order Value</h3>
                <div className="value">₹{salesData.average_order_value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <span style={{ color: '#10B981', fontSize: '0.9rem' }}>Per transaction</span>
              </motion.div>
            </div>

            {/* Row 1: Sales Trend + Customer Types */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>

              <motion.div variants={itemVariants} className="glass-panel chart-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0 }}>Sales Trends & Future Predictions</h2>
                  <button onClick={() => downloadCSV(predictions, 'sales_predictions.csv')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Export CSV">
                    <Download size={15} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={predictions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2c3d" />
                    <XAxis dataKey="period" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(19, 21, 31, 0.95)', border: '1px solid rgba(255,255,255,0.1)' }} formatter={v => `₹${v?.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="actual_sales" stroke="#6366f1" strokeWidth={3} name="Actual Sales" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="predicted_sales" stroke="#ec4899" strokeWidth={3} strokeDasharray="5 5" name="Predicted Sales" />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div variants={itemVariants} className="glass-panel chart-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0 }}>Customer Types</h2>
                  <button onClick={() => downloadCSV(clusters, 'customer_segments.csv')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Export CSV">
                    <Download size={15} />
                  </button>
                </div>
                <div style={{ display: 'flex', height: '85%' }}>
                  <ResponsiveContainer width="50%" height="100%">
                    <PieChart>
                      <Pie data={clusters} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="Customer_Count" nameKey="Segment">
                        {clusters.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#13151f', border: 'none' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ width: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
                    {clusters.map((c, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS[i] }}></div>
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{c.Segment}</strong>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Avg Spend: ₹{c.Avg_Monetary?.toLocaleString(undefined, { maximumFractionDigits: 0 })}<br />
                          {c.Customer_Count} customers
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Row 2: Feature 1 — Top Products + Feature 3 — Sales by Country */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>

              {/* Feature 1: Top Products Leaderboard */}
              <motion.div variants={itemVariants} className="glass-panel chart-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Trophy size={18} color="#f59e0b" /> Top Products
                  </h2>
                  <button onClick={() => downloadCSV(topProducts, 'top_products.csv')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Export CSV">
                    <Download size={15} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2c3d" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="product" stroke="#94a3b8" width={120}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickFormatter={v => v.length > 18 ? v.substring(0, 18) + '…' : v} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(19,21,31,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
                      formatter={(v, n, p) => [`₹${v?.toLocaleString()}`, p.payload.product]} labelFormatter={() => ''} />
                    <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                      {topProducts.map((_, i) => <Cell key={i} fill={i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#6366f1'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Feature 3: Sales by Country */}
              <motion.div variants={itemVariants} className="glass-panel chart-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={18} color="#38bdf8" /> Sales by Region
                  </h2>
                  <button onClick={() => downloadCSV(salesByCountry, 'sales_by_country.csv')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Export CSV">
                    <Download size={15} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={salesByCountry} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2c3d" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="country" stroke="#94a3b8" width={80} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(19,21,31,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
                      formatter={v => [`₹${v?.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                      {salesByCountry.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Market Basket */}
            <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Products Usually Bought Together</h2>
                <button onClick={() => downloadCSV(marketBasket, 'market_basket_rules.csv')}
                  className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  <Download size={13} /> Export CSV
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Items</th>
                      <th>Confidence</th>
                      <th>Support</th>
                      <th>Strength</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketBasket.length ? marketBasket.map((rule, idx) => (
                      <tr key={idx}>
                        <td style={{ color: 'var(--text-main)', fontWeight: 500 }}>{rule.rule}</td>
                        <td>{(rule.confidence * 100).toFixed(1)}%</td>
                        <td>{(rule.support * 100).toFixed(2)}%</td>
                        <td style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{rule.lift?.toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No association rules found yet — run ETL pipeline first.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

          </motion.div>
        )}
      </motion.div>

      {/* Feature 5: AI Chat Widget — always visible */}
      <AIChatWidget />
    </>
  );
}
