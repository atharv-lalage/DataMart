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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dropping, setDropping] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem('authenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

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

  if (loading) return <div className="app"></div>;

  if (!isAuthenticated) {
    return <Auth onLogin={() => {
      sessionStorage.setItem('authenticated', 'true');
      setIsAuthenticated(true);
    }} />;
  }

  return (
    <Router>
      <div className="app">
        <Sidebar />
        <div className="main-content">
          <header className="top-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div></div>
            <div className="header-user" style={{ gap: '1.5rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#ef4444', color: '#ef4444', padding: '0.4rem 0.8rem' }}
                onClick={handleDropDataset}
                disabled={dropping}
              >
                <Trash2 size={16} /> {dropping ? 'Dropping...' : 'Drop Dataset'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span>Administrator</span>
                <div className="avatar"></div>
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
