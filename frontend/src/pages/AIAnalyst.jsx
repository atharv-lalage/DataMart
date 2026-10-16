import React, { useState, useEffect, useMemo, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import {
  Bot,
  Sparkles,
  Database,
  RotateCcw,
  Zap,
  BookOpen,
  Cpu
} from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { PageHeader, Badge, Button } from '../components/common/index.js';
import { getDatasetCurrency } from '../utils/formatters.js';
import AIConversation from '../components/ai/AIConversation.jsx';
import SuggestedQuestions from '../components/ai/SuggestedQuestions.jsx';
import AIMessageComposer from '../components/ai/AIMessageComposer.jsx';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 }
};

const STARTER_MESSAGE = {
  id: 'starter',
  role: 'ai',
  text: "Hello! I am your AI Business Analyst powered by a dual-engine architecture:\n\n• Text-to-SQL: Ask me data questions (e.g., \"What is our total revenue?\" or \"Show the top 5 products by sales\") and I will formulate SQL, query the live PostgreSQL star schema, and present tabular insights.\n• Knowledge RAG: Ask me conceptual questions (e.g., \"What is OLAP?\" or \"Explain the Snowflake schema\") and I will retrieve technical documentation from the knowledge base.\n\nHow can I help you analyze your business today?",
  intent: null,
  source: null,
  sql: null,
  rows: [],
  columns: [],
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export default function AIAnalyst() {
  const [messages, setMessages] = useState([STARTER_MESSAGE]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [activeDataset, setActiveDataset] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('datamart_active_dataset') || null;
    }
    return null;
  });

  // Resolve dataset currency without hardcoding symbols
  const currencyInfo = useMemo(
    () => getDatasetCurrency(activeDataset),
    [activeDataset]
  );
  const currencySymbol = currencyInfo.symbol;

  // Sync token and active dataset on mount
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
        }
      })
      .catch((err) => {
        console.warn('Could not fetch dataset info for AI Analyst:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Send message to the backend RAG + Text-to-SQL endpoint
  const handleSend = useCallback(async (overrideText = null) => {
    const textToSend = (overrideText || input).trim();
    if (!textToSend || thinking) return;

    setInput('');
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      intent: null,
      source: null,
      sql: null,
      rows: [],
      columns: [],
      timestamp: timeNow
    };

    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    // Format conversation history for conversational memory
    const history = messages.slice(-8).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      text: m.text
    }));

    try {
      const res = await axios.post(`${API_BASE_URL}/api/chat`, {
        message: textToSend,
        history
      });

      const d = res.data;
      const aiMsg = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: d.answer || d.response || 'No answer returned.',
        intent: d.intent || null,
        source: d.source || (d.intent === 'data' ? 'sql' : 'rag'),
        sql: d.sql || null,
        rows: d.rows || [],
        columns: d.columns || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('AI chat failed:', err);
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Could not communicate with the AI engine.';

      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'ai',
        text: `Error processing request: ${detail}`,
        isError: true,
        intent: null,
        source: 'error',
        sql: null,
        rows: [],
        columns: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setThinking(false);
    }
  }, [input, messages, thinking]);

  // Clear conversation state
  const handleClearConversation = () => {
    setMessages([STARTER_MESSAGE]);
  };

  return (
    <motion.div
      className="container"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.2 }}
    >
      <div className="ai-workspace">
        {/* ── Page Header ── */}
        <PageHeader
          title="AI Analyst"
          subtitle="Ask questions about your business data and explore insights using natural language."
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
              <Badge variant="primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Zap size={12} />
                Dual Engine (Text-to-SQL + RAG)
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearConversation}
                icon={<RotateCcw size={13} />}
                title="Clear current conversation"
              >
                Clear Conversation
              </Button>
            </div>
          }
        />

        {/* ── Main Chat Workspace Card ── */}
        <div className="ai-chat-card">
          {/* Header inside card */}
          <div className="ai-chat-card__header">
            <div className="ai-chat-card__title-area">
              <div className="ai-chat-card__icon-badge">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="ai-chat-card__heading">Enterprise Analytical Assistant</h3>
                <p className="ai-chat-card__subheading">
                  Groq LLM • PostgreSQL Star Schema • FAISS Vector Search
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span
                style={{
                  fontSize: '11px',
                  background: 'var(--color-success-subtle)',
                  color: 'var(--color-success)',
                  border: '1px solid var(--color-success-border)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
                Online
              </span>
            </div>
          </div>

          {/* Conversation stream */}
          <AIConversation
            messages={messages}
            thinking={thinking}
            currencySymbol={currencySymbol}
          />

          {/* Suggested prompts tray */}
          <SuggestedQuestions
            onSelectQuestion={(q) => handleSend(q)}
            disabled={thinking}
          />

          {/* Message composer */}
          <AIMessageComposer
            input={input}
            setInput={setInput}
            onSend={() => handleSend()}
            thinking={thinking}
          />
        </div>
      </div>
    </motion.div>
  );
}
