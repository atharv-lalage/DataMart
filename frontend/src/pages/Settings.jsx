import React, { useEffect, useState, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Database, ShieldCheck, CheckCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { PageHeader, Badge } from '../components/common/index.js';
import SettingsNavigation from '../components/settings/SettingsNavigation.jsx';
import ProfileSettings from '../components/settings/ProfileSettings.jsx';
import DatabaseSettings from '../components/settings/DatabaseSettings.jsx';
import MLSettings from '../components/settings/MLSettings.jsx';
import AprioriSettings from '../components/settings/AprioriSettings.jsx';
import CacheSettings from '../components/settings/CacheSettings.jsx';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};

const DEFAULTS = {
  minSupport: 0.03,
  projectionWindow: 3,
  kClusters: 3,
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('datamart_user')) || null;
    } catch {
      return null;
    }
  });

  const [activeDataset, setActiveDataset] = useState(() => {
    return localStorage.getItem('datamart_active_dataset') || '';
  });

  const [config, setConfig] = useState(() => {
    try {
      const saved = sessionStorage.getItem('mlConfig');
      return saved ? JSON.parse(saved) : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  const [serverConfig, setServerConfig] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [cleared, setCleared] = useState(false);

  // Compute if there are unsaved changes
  const hasChanges = useMemo(() => {
    return (
      config.minSupport !== serverConfig.minSupport ||
      config.projectionWindow !== serverConfig.projectionWindow ||
      config.kClusters !== serverConfig.kClusters
    );
  }, [config, serverConfig]);

  // Determine which tabs have unsaved changes
  const unsavedTabs = useMemo(() => {
    const tabs = [];
    if (config.kClusters !== serverConfig.kClusters || config.projectionWindow !== serverConfig.projectionWindow) {
      tabs.push('ml');
    }
    if (config.minSupport !== serverConfig.minSupport) {
      tabs.push('apriori');
    }
    return tabs;
  }, [config, serverConfig]);

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    setSaveError('');
  };

  // Sync dataset info
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/dataset/info`)
      .then(res => {
        const files = res.data?.files || [];
        if (files.length > 0) {
          const current = files[files.length - 1].name;
          setActiveDataset(current);
          localStorage.setItem('datamart_active_dataset', current);
        }
      })
      .catch(() => {});
  }, []);

  // Sync auth profile
  useEffect(() => {
    const token = localStorage.getItem('datamart_token');
    if (token) {
      if (!axios.defaults.headers.common.Authorization) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      }
      axios.get(`${API_BASE_URL}/api/auth/me`)
        .then(res => {
          setCurrentUser(res.data);
          localStorage.setItem('datamart_user', JSON.stringify(res.data));
        })
        .catch(() => {});
    }
  }, []);

  // Fetch initial analytics settings from backend
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/settings/analytics`)
      .then(({ data }) => {
        const backendConfig = {
          minSupport: data.min_support,
          projectionWindow: data.projection_window,
          kClusters: data.k_clusters,
        };
        setConfig(backendConfig);
        setServerConfig(backendConfig);
        sessionStorage.setItem('mlConfig', JSON.stringify(backendConfig));
      })
      .catch((err) => {
        console.warn('Could not fetch analytics settings from backend:', err);
      });
  }, []);

  const handleSave = async () => {
    setSaveError('');
    setSaving(true);
    try {
      const { data } = await axios.put(`${API_BASE_URL}/api/settings/analytics`, {
        min_support: config.minSupport,
        projection_window: config.projectionWindow,
        k_clusters: config.kClusters,
      });

      const updated = {
        minSupport: data.min_support,
        projectionWindow: data.projection_window,
        kClusters: data.k_clusters,
      };

      setConfig(updated);
      setServerConfig(updated);
      sessionStorage.setItem('mlConfig', JSON.stringify(updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (error) {
      setSaveError(error.response?.data?.detail || 'Could not save settings. Ensure the backend is running.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULTS);
    setSaved(false);
    setSaveError('');
  };

  const handleClearCache = () => {
    ['salesCache', 'predsCache', 'clustersCache', 'basketCache', 'productsCache', 'mlConfig'].forEach(k => {
      sessionStorage.removeItem(k);
    });
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <motion.div
      className="container settings-workspace"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
    >
      <PageHeader
        title="Settings"
        subtitle="Manage your DataMart workspace, analytics configuration, and system preferences."
        badge={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {activeDataset && (
              <Badge variant="neutral">
                <Database size={13} />
                <span>{activeDataset}</span>
              </Badge>
            )}
            <Badge variant="primary">
              <ShieldCheck size={13} />
              <span>{currentUser?.role === 'admin' ? 'Super Admin' : 'Tenant Operator'}</span>
            </Badge>
          </div>
        }
      />

      {/* Navigation Tabs Bar */}
      <SettingsNavigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unsavedTabs={unsavedTabs}
      />

      {/* Tab Panels */}
      <div className="settings-tab-content">
        {activeTab === 'profile' && (
          <ProfileSettings
            currentUser={currentUser}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseSettings />
        )}

        {activeTab === 'ml' && (
          <MLSettings
            config={config}
            onChange={handleChange}
            onSave={handleSave}
            onReset={handleReset}
            saving={saving}
            saved={saved}
            saveError={saveError}
            hasChanges={hasChanges}
          />
        )}

        {activeTab === 'apriori' && (
          <AprioriSettings
            config={config}
            onChange={handleChange}
            onSave={handleSave}
            onReset={handleReset}
            saving={saving}
            saved={saved}
            saveError={saveError}
            hasChanges={hasChanges}
          />
        )}

        {activeTab === 'cache' && (
          <CacheSettings
            onClearCache={handleClearCache}
            cleared={cleared}
          />
        )}
      </div>
    </motion.div>
  );
}
