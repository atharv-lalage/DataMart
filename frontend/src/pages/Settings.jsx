import React, { useEffect, useState } from 'react';
// JSX member expressions from Framer Motion are not recognized by the ESLint parser.
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Shield, Database, Key, CheckCircle, Save, RefreshCw } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const DEFAULTS = {
  minSupport: 0.03,
  projectionWindow: 3,
  kClusters: 3,
};

export default function Settings() {
  const [config, setConfig] = useState(() => {
    try {
      const saved = sessionStorage.getItem('mlConfig');
      return saved ? JSON.parse(saved) : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [cleared, setCleared] = useState(false);

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/settings/analytics`)
      .then(({ data }) => setConfig({
        minSupport: data.min_support,
        projectionWindow: data.projection_window,
        kClusters: data.k_clusters,
      }))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaveError('');
    try {
      const { data } = await axios.put(`${API_BASE_URL}/api/settings/analytics`, {
        min_support: config.minSupport,
        projection_window: config.projectionWindow,
        k_clusters: config.kClusters,
      });
      setConfig({
        minSupport: data.min_support,
        projectionWindow: data.projection_window,
        kClusters: data.k_clusters,
      });
    } catch (error) {
      setSaveError(error.response?.data?.detail || 'Could not save settings. Ensure the backend is running.');
      return;
    }
    sessionStorage.setItem('mlConfig', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClearCache = () => {
    ['salesCache', 'predsCache', 'clustersCache', 'basketCache', 'productsCache', 'mlConfig'].forEach(k => sessionStorage.removeItem(k));
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <motion.div className="container" initial="initial" animate="in" exit="out" variants={pageVariants}>
      <div className="page-header">
        <h1>Administrator Settings</h1>
        <p>Manage system preferences and ML pipeline configuration.</p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>

        {/* Profile panel */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Shield size={32} color="white" />
            </div>
            <h3 style={{ margin: 0 }}>Administrator</h3>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Super Admin Role</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</label>
              <div style={{ fontWeight: 500 }}>admin@datamart.enterprise</div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Security Clearance</label>
              <div style={{ display: 'inline-block', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Level 5 (Max)</div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Credentials</label>
              <div style={{ fontWeight: 500, color: 'var(--accent-primary)' }}>Configured securely on the server</div>
            </div>
          </div>

          {/* Cache clear */}
          <div style={{ marginTop: '2rem' }}>
            <button
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem', color: cleared ? '#10B981' : undefined }}
              onClick={handleClearCache}
            >
              {cleared ? <CheckCircle size={16} /> : <RefreshCw size={16} />}
              {cleared ? 'Cache Cleared!' : 'Clear Session Cache'}
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
              Forces all dashboard data to reload from the API on next visit.
            </p>
          </div>
        </div>

        {/* Config panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Database size={20} color="var(--accent-primary)" /> Database Configuration
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Connection String</label>
                <input
                  type="text"
                  value="Configured through DATABASE_URL"
                  readOnly
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Cache Strategy</label>
                <div style={{ color: 'var(--text-muted)', padding: '0.5rem 0', fontSize: '0.9rem' }}>Server-managed pickle cache</div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Key size={20} color="#ec4899" /> Machine Learning Pipeline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Apriori Minimum Support</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Controls association rule generation strictness (0.01–0.2)</div>
                </div>
                <input
                  type="number"
                  value={config.minSupport}
                  step="0.01" min="0.01" max="0.2"
                  onChange={(e) => handleChange('minSupport', parseFloat(e.target.value))}
                  style={{ width: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Linear Regression Projection Window</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Months ahead to predict sales (1–12)</div>
                </div>
                <input
                  type="number"
                  value={config.projectionWindow}
                  min="1" max="12"
                  onChange={(e) => handleChange('projectionWindow', parseInt(e.target.value))}
                  style={{ width: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>K-Means Cluster Count</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Number of customer segments (2–6)</div>
                </div>
                <input
                  type="number"
                  value={config.kClusters}
                  min="2" max="6"
                  onChange={(e) => handleChange('kClusters', parseInt(e.target.value))}
                  style={{ width: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10B981', fontSize: '0.9rem' }}
                >
                  <CheckCircle size={16} /> Configuration saved to the backend.
                </motion.span>
              )}
              {saveError && <span style={{ color: '#ec4899', fontSize: '0.85rem' }}>{saveError}</span>}
              <button
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={handleSave}
              >
                <Save size={16} /> Save Configurations
              </button>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
