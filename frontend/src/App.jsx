import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE_URL from './config';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Settings from './pages/Settings';
import OLAPTerminal from './pages/OLAPTerminal';
import ETLTracker from './pages/ETLTracker';
import AIAnalyst from './pages/AIAnalyst';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ai-analyst" element={<AIAnalyst />} />
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

  return (
    <Router>
      <AppLayout
        currentUser={currentUser}
        onLogout={handleLogout}
        onDropDataset={handleDropDataset}
        dropping={dropping}
      >
        <AnimatedRoutes />
      </AppLayout>
    </Router>
  );
}

export default App;
