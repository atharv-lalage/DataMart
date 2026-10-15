import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from './config';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Settings from './pages/Settings';
import OLAPTerminal from './pages/OLAPTerminal';
import ETLTracker from './pages/ETLTracker';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/terminal" element={<OLAPTerminal />} />
        <Route path="/etl" element={<ETLTracker />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('datamart_token') || !!localStorage.getItem('datamart_auth');
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('datamart_user')) || null;
    } catch {
      return null;
    }
  });

  const [dropping, setDropping] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('datamart_token');
    const legacyAuth = localStorage.getItem('datamart_auth');

    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      axios.get(`${API_BASE_URL}/api/auth/me`)
        .then(res => {
          setCurrentUser(res.data);
          localStorage.setItem('datamart_user', JSON.stringify(res.data));
          setIsAuthenticated(true);
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('datamart_token');
          localStorage.removeItem('datamart_user');
          delete axios.defaults.headers.common.Authorization;
          setIsAuthenticated(false);
          setCurrentUser(null);
        });
    } else if (legacyAuth) {
      axios.defaults.headers.common.Authorization = legacyAuth;
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('datamart_token');
    localStorage.removeItem('datamart_user');
    localStorage.removeItem('datamart_auth');
    delete axios.defaults.headers.common.Authorization;
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleDropDataset = async () => {
    if (!window.confirm("Are you sure you want to completely wipe the dataset and empty the Data Warehouse? This cannot be undone.")) return;
    setDropping(true);
    try {
      await axios.post(`${API_BASE_URL}/api/dataset/drop`);
      alert("System wiped successfully. You can now upload a new dataset.");
      window.location.reload();
    } catch (err) {
      alert("Failed to drop dataset: " + (err.response?.data?.error || err.message));
    }
    setDropping(false);
  };

  if (!isAuthenticated) {
    return (
      <Auth
        onLogin={(tokenOrAuth, user) => {
          if (user) {
            setCurrentUser(user);
          }
          setIsAuthenticated(true);
        }}
      />
    );
  }

  const initialLetter = currentUser?.username
    ? currentUser.username[0].toUpperCase()
    : 'A';

  return (
    <Router>
      <div className="app">
        <Sidebar currentUser={currentUser} onLogout={handleLogout} />
        <div className="main-content">
          <header className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div></div>
            <div className="header-user" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#ef4444', color: '#ef4444', padding: '0.4rem 0.8rem' }}
                onClick={handleDropDataset}
                disabled={dropping}
              >
                <Trash2 size={16} /> {dropping ? 'Dropping...' : 'Drop Dataset'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {currentUser?.username || 'Administrator'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {currentUser?.role === 'admin' ? 'Admin Access' : 'User'}
                  </div>
                </div>
                <div
                  className="avatar"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  {initialLetter}
                </div>
              </div>
            </div>
          </header>
          <AnimatedRoutes />
        </div>
      </div>
    </Router>
  );
}

export default App;
