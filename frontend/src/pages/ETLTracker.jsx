import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  UploadCloud,
  Database,
  Layers,
  FileSpreadsheet,
  Play,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  Clock,
  Terminal,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  FileText
} from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { Button, Card, Badge, PageHeader, EmptyState, Skeleton } from '../components/common/index.js';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 }
};

// ── 4 Authentic Pipeline Stages mapped to backend _run_etl_job ────────────────
const STAGES = [
  {
    id: 'extract',
    number: '01',
    keyword: 'EXTRACT',
    title: 'Data Extraction',
    description: 'Reads raw CSV or Excel dataset into memory and normalizes column headers.',
    icon: FileSpreadsheet,
    color: '#0284C7',
    badgeVariant: 'info'
  },
  {
    id: 'transform',
    number: '02',
    keyword: 'TRANSFORM',
    title: 'Cleaning & Transformation',
    description: 'Filters missing customer IDs, invalid quantities, parses ISO dates, and refreshes cache.',
    icon: Activity,
    color: '#4F46E5',
    badgeVariant: 'purple'
  },
  {
    id: 'load_oltp',
    number: '03',
    keyword: 'LOAD (OLTP)',
    title: 'Transactional Store Load',
    description: 'Upserts users, products, orders, and order items into relational tables.',
    icon: Layers,
    color: '#8B5CF6',
    badgeVariant: 'default'
  },
  {
    id: 'load_olap',
    number: '04',
    keyword: 'LOAD (OLAP)',
    title: 'Data Warehouse Load',
    description: 'Populates snowflake dimension tables and fact_sales for analytical processing.',
    icon: Database,
    color: '#10B981',
    badgeVariant: 'success'
  },
];

export default function ETLTracker() {
  const navigate = useNavigate();
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'complete' | 'error'
  const [logs, setLogs] = useState([]);
  const [activeStage, setActiveStage] = useState(-1);
  const [stats, setStats] = useState({ totalRows: '—', errorsFixed: '—', cleanRows: '—', tablesUpdated: '8' });
  const [copiedLogs, setCopiedLogs] = useState(false);

  const pollRef = useRef(null);
  const logEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Upload state
  const [uploadStatus, setUploadStatus] = useState(null); // null | 'uploading' | 'success' | 'error'
  const [uploadMsg, setUploadMsg] = useState('');
  const [datasetFiles, setDatasetFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Load dataset info
  const fetchDatasetInfo = useCallback(() => {
    setLoadingFiles(true);
    axios.get(`${API_BASE_URL}/api/dataset/info`)
      .then(res => setDatasetFiles(res.data.files || []))
      .catch(() => setDatasetFiles([]))
      .finally(() => setLoadingFiles(false));
  }, []);

  useEffect(() => {
    fetchDatasetInfo();
  }, [fetchDatasetInfo, uploadStatus]);

  // Derive active stage based on log keywords
  const deriveStage = (logLines) => {
    let stage = -1;
    logLines.forEach(line => {
      STAGES.forEach((s, i) => {
        if (line.includes(s.keyword)) stage = Math.max(stage, i);
      });
    });
    return stage;
  };

  // Upload handler
  const handleUpload = async (file) => {
    if (!file) return;
    const allowed = ['xlsx', 'xls', 'csv'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadStatus('error');
      setUploadMsg('Unsupported file format. Only .xlsx, .xls, or .csv files are allowed.');
      return;
    }

    setSelectedFile(file);
    setUploadStatus('uploading');
    setUploadMsg('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/dataset/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadStatus('success');
      setUploadMsg(res.data.message || `File "${file.name}" uploaded successfully.`);
      fetchDatasetInfo();
    } catch (err) {
      setUploadStatus('error');
      setUploadMsg(err.response?.data?.error || err.response?.data?.detail || 'Upload failed.');
    }
  };

  // Run ETL pipeline
  const startETL = async () => {
    if (status === 'running') return;

    setStatus('running');
    setLogs([]);
    setActiveStage(-1);
    setJobId(null);
    setStats({ totalRows: '—', errorsFixed: '—', cleanRows: '—', tablesUpdated: '8' });

    try {
      const res = await axios.post(`${API_BASE_URL}/api/etl/run`);
      const id = res.data.job_id;
      setJobId(id);

      // Start polling status
      pollRef.current = setInterval(async () => {
        try {
          const poll = await axios.get(`${API_BASE_URL}/api/etl/status/${id}`);
          const { status: s, logs: l } = poll.data;
          setLogs(l || []);
          setActiveStage(deriveStage(l || []));

          // Derive cleaning statistics from logs
          setStats(prev => {
            let tr = prev.totalRows;
            let ef = prev.errorsFixed;
            let cr = prev.cleanRows;

            for (let line of l || []) {
              if (line.includes('Original shape:')) {
                const match = line.match(/\((\d+)/);
                if (match) tr = parseInt(match[1]).toLocaleString();
              }
              if (line.includes('Loaded') && line.includes('rows after cleaning')) {
                const match = line.match(/Loaded (\d+) rows/);
                if (match) {
                  const cleanCount = parseInt(match[1]);
                  cr = cleanCount.toLocaleString();
                  if (tr !== '—') {
                    const originalCount = parseInt(tr.replace(/,/g, ''));
                    if (originalCount >= cleanCount) {
                      ef = (originalCount - cleanCount).toLocaleString();
                    } else {
                      ef = '0';
                    }
                  }
                }
              }
            }
            return { ...prev, totalRows: tr, errorsFixed: ef, cleanRows: cr };
          });

          if (s === 'complete' || s === 'error') {
            setStatus(s);
            clearInterval(pollRef.current);
          }
        } catch (err) {
          if (err.response && err.response.status === 404) {
            clearInterval(pollRef.current);
            setStatus('error');
            setLogs(prev => [...prev, 'ERROR: Server session lost the active job. Please click Run ETL Pipeline to restart.']);
          }
        }
      }, 2000);
    } catch (err) {
      setStatus('error');
      const errorDetail = err.response?.data?.detail || err.response?.data?.error || err.message;
      setLogs([`ERROR: Could not initiate ETL pipeline — ${errorDetail}`]);
    }
  };

  // Auto scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Clean up polling timer
  useEffect(() => () => clearInterval(pollRef.current), []);

  // Format log entry tags
  const getLogTag = (line) => {
    if (line.startsWith('ERROR')) return { text: 'ERROR', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' };
    if (line.startsWith('WARNING')) return { text: 'WARN', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
    if (line.includes('COMPLETE') || line.includes('Loaded')) return { text: 'SUCCESS', color: '#10B981', bg: 'rgba(16,185,129,0.15)' };
    if (line.startsWith('EXTRACT')) return { text: 'EXTRACT', color: '#38BDF8', bg: 'rgba(56,189,248,0.15)' };
    if (line.startsWith('TRANSFORM')) return { text: 'TRANSFORM', color: '#818CF8', bg: 'rgba(129,140,248,0.15)' };
    if (line.startsWith('LOAD')) return { text: 'LOAD', color: '#C084FC', bg: 'rgba(192,132,252,0.15)' };
    if (line.startsWith('INFO')) return { text: 'INFO', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' };
    return { text: 'SYSTEM', color: '#64748B', bg: 'rgba(100,116,139,0.15)' };
  };

  const copyLogsToClipboard = () => {
    if (!logs.length) return;
    navigator.clipboard.writeText(logs.join('\n'));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const activeDataset = datasetFiles.length > 0 ? datasetFiles[datasetFiles.length - 1] : null;

  return (
    <motion.div className="container" initial="initial" animate="in" exit="out" variants={pageVariants}>
      <div className="etl-layout">

        {/* ── Section A: Page Header ───────────────────────────────────────── */}
        <PageHeader
          title="ETL Pipeline"
          subtitle="Ingest, clean, transform, and load your data warehouse."
          badge={
            activeDataset ? (
              <Badge variant="success" withDot>
                {activeDataset.name} ({activeDataset.size_mb} MB)
              </Badge>
            ) : (
              <Badge variant="warning" withDot>
                No active dataset
              </Badge>
            )
          }
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Button
                variant="outline"
                size="sm"
                icon={<RotateCcw size={14} />}
                onClick={fetchDatasetInfo}
                disabled={status === 'running'}
                title="Refresh dataset status"
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Play size={15} fill="currentColor" />}
                onClick={startETL}
                loading={status === 'running'}
                disabled={status === 'running' || !datasetFiles.length}
              >
                {status === 'running' ? 'Processing Pipeline...' : 'Run ETL Pipeline'}
              </Button>
            </div>
          }
        />

        {/* ── Section B: Upload Dataset & Active Repository Cards ───────────── */}
        <div className="etl-two-col">

          {/* Upload Card */}
          <Card
            title="Upload Dataset"
            subtitle="Ingest sales transactions into tenant-isolated storage"
            icon={<UploadCloud size={18} color="#4F46E5" />}
          >
            <div
              className={`etl-upload-zone ${dragOver ? 'etl-upload-zone--dragover' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleUpload(e.target.files[0]);
                  }
                }}
              />

              <div className="etl-upload-zone__icon-box">
                <UploadCloud size={26} />
              </div>

              <div className="etl-upload-zone__title">
                {uploadStatus === 'uploading' ? 'Streaming dataset to storage...' : 'Drop your dataset file here'}
              </div>

              <div className="etl-upload-zone__desc">
                Drag and drop your file or click to browse from your computer
              </div>

              <div className="etl-upload-zone__formats">
                <Badge variant="default" size="sm">.CSV</Badge>
                <Badge variant="default" size="sm">.XLSX</Badge>
                <Badge variant="default" size="sm">.XLS</Badge>
              </div>
            </div>

            {/* Validation / Status alerts */}
            <AnimatePresence>
              {uploadStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ marginTop: '0.75rem' }}
                >
                  {uploadStatus === 'success' && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.65rem 0.85rem', borderRadius: '8px',
                      backgroundColor: 'var(--color-success-subtle)',
                      border: '1px solid var(--color-success-border)',
                      color: 'var(--color-success-hover)', fontSize: '0.8125rem'
                    }}>
                      <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                      <span>{uploadMsg}</span>
                    </div>
                  )}

                  {uploadStatus === 'error' && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.65rem 0.85rem', borderRadius: '8px',
                      backgroundColor: 'var(--color-danger-subtle)',
                      border: '1px solid var(--color-danger-border)',
                      color: 'var(--color-danger-hover)', fontSize: '0.8125rem'
                    }}>
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      <span>{uploadMsg}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Dataset Repository Card */}
          <Card
            title="Storage Repository"
            subtitle="Datasets stored in your tenant-isolated directory"
            icon={<FolderOpen size={18} color="#0284C7" />}
          >
            {loadingFiles ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Skeleton variant="rectangular" height="52px" />
                <Skeleton variant="rectangular" height="52px" />
              </div>
            ) : datasetFiles.length === 0 ? (
              <EmptyState
                title="No Datasets in Storage"
                description="Upload an e-commerce sales dataset (.csv or .xlsx) to initialize pipeline ingestion."
              />
            ) : (
              <div className="etl-file-list">
                {datasetFiles.map((file, idx) => {
                  const isActive = idx === datasetFiles.length - 1;
                  const isCsv = file.name.endsWith('.csv');
                  return (
                    <div
                      key={file.name}
                      className={`etl-file-item ${isActive ? 'etl-file-item--active' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '8px',
                          backgroundColor: isCsv ? '#EEF2FF' : '#ECFDF5',
                          color: isCsv ? '#4F46E5' : '#10B981',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <FileText size={18} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{
                            fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {file.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {file.size_mb} MB · Tabular Dataset
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        {isActive ? (
                          <Badge variant="success" size="sm" withDot>Active Source</Badge>
                        ) : (
                          <Badge variant="default" size="sm">Archived</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div style={{
                  marginTop: '0.75rem', padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--surface-subtle)', borderRadius: '8px',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5
                }}>
                  When a new dataset is uploaded, previous pickle caches are automatically purged. Click <strong>Run ETL Pipeline</strong> to execute full schema loads.
                </div>
              </div>
            )}
          </Card>

        </div>

        {/* ── Section C: Pipeline Progress Stepper Card ────────────────────── */}
        <Card
          title="Pipeline Execution Stages"
          subtitle="Real-time progress tracker across all extraction, transformation, and loading phases"
          icon={<Layers size={18} color="#8B5CF6" />}
          actions={
            status !== 'idle' ? (
              <Badge
                variant={status === 'complete' ? 'success' : status === 'error' ? 'danger' : 'purple'}
                withDot
              >
                {status === 'running' ? 'Pipeline in Progress' : status === 'complete' ? 'Pipeline Succeeded' : 'Pipeline Failed'}
              </Badge>
            ) : null
          }
        >
          <div className="etl-stepper">
            {STAGES.map((stage, idx) => {
              const isPast = activeStage > idx;
              const isCurrent = activeStage === idx;
              const isPending = activeStage < idx;
              const isError = status === 'error' && isCurrent;

              const StageIcon = stage.icon;

              let stepStateClass = '';
              if (isPast || (status === 'complete' && isCurrent)) {
                stepStateClass = 'etl-step--completed';
              } else if (isError) {
                stepStateClass = 'etl-step--error';
              } else if (isCurrent) {
                stepStateClass = 'etl-step--active';
              }

              return (
                <div key={stage.id} className={`etl-step ${stepStateClass}`}>
                  {idx < STAGES.length - 1 && <div className="etl-step__connector" />}

                  <div className="etl-step__indicator">
                    {isPast || (status === 'complete' && isCurrent) ? (
                      <CheckCircle2 size={20} color="#10B981" />
                    ) : isError ? (
                      <AlertCircle size={20} color="#EF4444" />
                    ) : isCurrent && status === 'running' ? (
                      <div className="ui-btn__spinner" style={{ width: 18, height: 18, border: '2px solid #CBD5E1', borderTopColor: stage.color, borderRadius: '50%' }} />
                    ) : (
                      <StageIcon size={18} color={isPending ? '#94A3B8' : stage.color} />
                    )}
                  </div>

                  <div className="etl-step__content">
                    <div className="etl-step__header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94A3B8', fontWeight: 600 }}>
                          STAGE {stage.number}
                        </span>
                        <h4 className="etl-step__title">{stage.title}</h4>
                      </div>

                      <div>
                        {isPast || (status === 'complete' && isCurrent) ? (
                          <Badge variant="success" size="sm">Completed</Badge>
                        ) : isError ? (
                          <Badge variant="danger" size="sm">Failed</Badge>
                        ) : isCurrent && status === 'running' ? (
                          <Badge variant={stage.badgeVariant} size="sm" withDot>Active</Badge>
                        ) : (
                          <Badge variant="default" size="sm">Pending</Badge>
                        )}
                      </div>
                    </div>

                    <p className="etl-step__desc">{stage.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Section D: Data Cleaning & Transformation Details ─────────────── */}
        <div className="etl-metrics-grid">
          <div className="etl-metric-box">
            <span className="etl-metric-box__label">Total Ingested Rows</span>
            <span className="etl-metric-box__value">{stats.totalRows}</span>
            <span className="etl-metric-box__sub">Raw records from dataset source</span>
          </div>

          <div className="etl-metric-box">
            <span className="etl-metric-box__label">Cleaned / Filtered Rows</span>
            <span className="etl-metric-box__value" style={{ color: '#F59E0B' }}>
              {stats.errorsFixed}
            </span>
            <span className="etl-metric-box__sub">Null IDs & negative quantities pruned</span>
          </div>

          <div className="etl-metric-box">
            <span className="etl-metric-box__label">Warehouse Fact Records</span>
            <span className="etl-metric-box__value" style={{ color: '#10B981' }}>
              {stats.cleanRows}
            </span>
            <span className="etl-metric-box__sub">Validated records loaded into DataMart</span>
          </div>

          <div className="etl-metric-box">
            <span className="etl-metric-box__label">Schema Tables Synced</span>
            <span className="etl-metric-box__value" style={{ color: '#4F46E5' }}>
              {stats.tablesUpdated}
            </span>
            <span className="etl-metric-box__sub">4 OLTP + 4 Snowflake Star Dimensions</span>
          </div>
        </div>

        {/* ── Section E: Pipeline Execution Logs Viewer ────────────────────── */}
        <div className="etl-terminal">
          <div className="etl-terminal__header">
            <div className="etl-terminal__title">
              <Terminal size={14} color="#38BDF8" />
              <span>Pipeline Process Logs</span>
              {jobId && (
                <span style={{
                  padding: '2px 8px', borderRadius: '4px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38BDF8', fontSize: '0.6875rem'
                }}>
                  Job #{jobId}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.6875rem', color: '#64748B', fontFamily: 'monospace' }}>
                {logs.length} entries
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={copiedLogs ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                onClick={copyLogsToClipboard}
                disabled={!logs.length}
                style={{ color: '#94A3B8', padding: '4px 8px', height: '28px' }}
                title="Copy all logs to clipboard"
              >
                {copiedLogs ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="etl-terminal__body">
            {status === 'idle' && !logs.length ? (
              <div className="etl-terminal__empty">
                [ Pipeline idle — upload a dataset and click "Run ETL Pipeline" to begin execution ]
              </div>
            ) : (
              logs.map((line, idx) => {
                const tag = getLogTag(line);
                return (
                  <div key={idx} className="etl-terminal__line">
                    <span
                      className="etl-terminal__tag"
                      style={{ color: tag.color, backgroundColor: tag.bg }}
                    >
                      {tag.text}
                    </span>
                    <span style={{ color: line.startsWith('ERROR') ? '#F87171' : line.startsWith('WARNING') ? '#FBBF24' : '#E2E8F0' }}>
                      {line}
                    </span>
                  </div>
                );
              })
            )}

            {status === 'running' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818CF8', marginTop: '4px' }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◓</span>
                <span style={{ fontSize: '0.75rem' }}>Processing stage tasks...</span>
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* ── Section F: Pipeline Results / Next Actions Banner ────────────── */}
        {status === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="etl-result-banner etl-result-banner--success"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                backgroundColor: 'var(--color-success-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-success)', flexShrink: 0
              }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Data Warehouse Synchronized Successfully
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  {stats.cleanRows !== '—' ? `${stats.cleanRows} transaction facts` : 'Dataset'} loaded across all operational and analytical schemas.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Button
                variant="outline"
                size="sm"
                icon={<ArrowRight size={14} />}
                iconPosition="right"
                onClick={() => navigate('/terminal')}
              >
                OLAP Terminal
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight size={14} />}
                iconPosition="right"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="etl-result-banner etl-result-banner--error"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                backgroundColor: 'var(--color-danger-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-danger)', flexShrink: 0
              }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Pipeline Execution Failed
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Review the execution logs above for diagnostic stack traces.
                </p>
              </div>
            </div>

            <Button
              variant="danger"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={startETL}
            >
              Retry Pipeline
            </Button>
          </motion.div>
        )}

      </div>
    </motion.div>
  );
}
