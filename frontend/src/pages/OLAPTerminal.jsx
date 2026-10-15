import React, { useState, useEffect, useMemo, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import {
  Play,
  Database,
  Terminal,
  RotateCcw,
  Sparkles,
  Wifi,
  Layers,
  Cpu
} from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { PageHeader, Badge, Button } from '../components/common/index.js';
import { getDatasetCurrency } from '../utils/formatters.js';
import OlapOperationSelector, {
  OPERATION_DEFINITIONS
} from '../components/olap/OlapOperationSelector.jsx';
import OlapConfiguration from '../components/olap/OlapConfiguration.jsx';
import SQLPreview from '../components/olap/SQLPreview.jsx';
import QueryResultsTable from '../components/olap/QueryResultsTable.jsx';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 }
};

export default function OLAPTerminal() {
  const [activeQuery, setActiveQuery] = useState('rollup');
  const [isRunning, setIsRunning] = useState(false);
  const [executedData, setExecutedData] = useState(null);
  const [error, setError] = useState(null);
  const [activeDataset, setActiveDataset] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('datamart_active_dataset') || null;
    }
    return null;
  });

  // Filter state for each analytical operation
  const [rollupFilters, setRollupFilters] = useState({ year: '' });
  const [drilldownFilters, setDrilldownFilters] = useState({
    country: 'United States',
    year: ''
  });
  const [sliceFilters, setSliceFilters] = useState({
    month: 12,
    year: 2015
  });
  const [diceFilters, setDiceFilters] = useState({
    categories: ['Furniture', 'Technology'],
    years: '2015,2016'
  });

  // Dataset currency resolver
  const currencyInfo = useMemo(
    () => getDatasetCurrency(activeDataset),
    [activeDataset]
  );
  const currencySymbol = currencyInfo.symbol;

  // Sync active dataset from backend info
  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('datamart_token');
    if (token && !axios.defaults.headers.common.Authorization) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    }

    axios
      .get(`${API_BASE_URL}/api/dataset/info`)
      .then((res) => {
        if (!isMounted) return;
        const files = res.data?.files || [];
        if (files.length > 0) {
          const currentFile = files[files.length - 1].name;
          setActiveDataset(currentFile);
          localStorage.setItem('datamart_active_dataset', currentFile);

          // If Online Retail dataset is active, adapt filter defaults
          const clean = currentFile.toLowerCase();
          if (clean.includes('retail') || clean.includes('online')) {
            setDrilldownFilters({ country: 'United Kingdom', year: '' });
            setSliceFilters({ month: 12, year: 2010 });
            setDiceFilters({
              categories: ['Gift', 'Decoration'],
              years: '2010,2011'
            });
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch dataset info for OLAP terminal:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Assemble filter payload for backend
  const getFilters = useCallback((queryKey = activeQuery) => {
    if (queryKey === 'rollup') return rollupFilters;
    if (queryKey === 'drilldown') return drilldownFilters;
    if (queryKey === 'slice') return sliceFilters;
    if (queryKey === 'dice') {
      return {
        ...diceFilters,
        categories: Array.isArray(diceFilters.categories)
          ? diceFilters.categories.join(',')
          : diceFilters.categories
      };
    }
    return {};
  }, [activeQuery, rollupFilters, drilldownFilters, sliceFilters, diceFilters]);

  // Execute analytical query against backend
  const handleExecute = useCallback(async (targetKey = null) => {
    const queryKey = targetKey || activeQuery;
    setIsRunning(true);
    setError(null);
    const filters = getFilters(queryKey);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/olap/query`, {
        query_key: queryKey,
        filters
      });

      setExecutedData({
        headers: res.data.columns,
        data: res.data.rows,
        rowCount: res.data.row_count,
        live: true
      });
    } catch (err) {
      const q = OPERATION_DEFINITIONS[queryKey];
      setExecutedData({
        headers: q.fallbackHeaders,
        data: q.fallbackData,
        rowCount: q.fallbackData.length,
        live: false
      });
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Connection to data warehouse failed';
      setError(`Data Warehouse unavailable — showing demo fallback data. (${errorMsg})`);
    } finally {
      setIsRunning(false);
    }
  }, [activeQuery, getFilters]);

  // Execute initial query on mount once
  useEffect(() => {
    handleExecute('rollup');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch operation: immediately synchronize SQL and run query for instant interaction
  const handleSelectOperation = (key) => {
    setActiveQuery(key);
    handleExecute(key);
  };

  // Reset current operation filters to defaults
  const handleResetDefaults = () => {
    const isOnlineRetail = (activeDataset || '').toLowerCase().includes('retail');
    if (activeQuery === 'rollup') {
      setRollupFilters({ year: '' });
    } else if (activeQuery === 'drilldown') {
      setDrilldownFilters({
        country: isOnlineRetail ? 'United Kingdom' : 'United States',
        year: ''
      });
    } else if (activeQuery === 'slice') {
      setSliceFilters({
        month: 12,
        year: isOnlineRetail ? 2010 : 2015
      });
    } else if (activeQuery === 'dice') {
      setDiceFilters({
        categories: isOnlineRetail ? ['Gift', 'Decoration'] : ['Furniture', 'Technology'],
        years: isOnlineRetail ? '2010,2011' : '2015,2016'
      });
    }
  };

  // Build current dynamic SQL based on current operation and filters
  const currentOp = OPERATION_DEFINITIONS[activeQuery] || OPERATION_DEFINITIONS.rollup;
  const currentFilters = getFilters();
  const currentSQL = useMemo(
    () => currentOp.buildSQL(currentFilters),
    [currentOp, currentFilters]
  );

  return (
    <motion.div
      className="container"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.2 }}
    >
      <div className="olap-workspace">
        {/* ── Page Header ── */}
        <PageHeader
          title="OLAP Terminal"
          subtitle="Explore multidimensional data using analytical operations across Star & Snowflake schemas."
          badge={
            activeDataset ? (
              <Badge variant="neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--color-success)',
                    display: 'inline-block'
                  }}
                />
                <Database size={13} />
                <span>{activeDataset}</span>
              </Badge>
            ) : null
          }
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Button
                variant="primary"
                onClick={() => handleExecute(activeQuery)}
                disabled={isRunning}
                icon={<Play size={14} fill="currentColor" />}
              >
                {isRunning ? 'Executing Query...' : 'Execute Query'}
              </Button>
            </div>
          }
        />

        {/* ── Operation Selector (Roll-up, Drill-down, Slice, Dice) ── */}
        <OlapOperationSelector
          activeQuery={activeQuery}
          onSelectOperation={handleSelectOperation}
        />

        {/* ── Two-Column Analytical Workspace ── */}
        <div className="olap-main-grid">
          {/* Left Column: Configuration & SQL Preview */}
          <div className="olap-left-pane">
            <OlapConfiguration
              activeQuery={activeQuery}
              rollupFilters={rollupFilters}
              setRollupFilters={setRollupFilters}
              drilldownFilters={drilldownFilters}
              setDrilldownFilters={setDrilldownFilters}
              sliceFilters={sliceFilters}
              setSliceFilters={setSliceFilters}
              diceFilters={diceFilters}
              setDiceFilters={setDiceFilters}
              onResetDefaults={handleResetDefaults}
              onExecute={() => handleExecute(activeQuery)}
              isRunning={isRunning}
            />

            <SQLPreview sql={currentSQL} activeQuery={activeQuery} />

            {/* Quick Execution Bar below SQL Preview */}
            <div className="olap-exec-bar">
              <div className="olap-exec-meta">
                <Cpu size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>Target Fact: <code>ecom_sales_fact</code></span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleExecute(activeQuery)}
                disabled={isRunning}
                icon={<Play size={13} fill="currentColor" />}
              >
                {isRunning ? 'Running...' : 'Run Query'}
              </Button>
            </div>
          </div>

          {/* Right Column: Query Results Workspace */}
          <div className="olap-right-pane">
            <QueryResultsTable
              isRunning={isRunning}
              executedData={executedData}
              error={error}
              currencySymbol={currencySymbol}
              onExecute={() => handleExecute(activeQuery)}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
