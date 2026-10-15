import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Search,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Store,
  Sparkles,
  ArrowRight,
  X,
  SlidersHorizontal,
  RotateCcw,
  Tag,
  Check
} from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { Button, Card, Badge, PageHeader, EmptyState, Skeleton, Select } from '../components/common/index.js';
import { getDatasetCurrency, formatCurrency } from '../utils/formatters.js';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [marketBasket, setMarketBasket] = useState([]);
  const [activeDataset, setActiveDataset] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('datamart_active_dataset') || null;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [sortBy, setSortBy] = useState('default');
  const [txState, setTxState] = useState({}); // productId -> { status: 'loading' | 'success' | 'error', message, order_id }
  const [recentOrders, setRecentOrders] = useState([]);
  const [quantities, setQuantities] = useState({}); // productId -> quantity

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem('datamart_token');
      if (token && !axios.defaults.headers.common.Authorization) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      }

      try {
        const [prodRes, basketRes, datasetRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/products`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/api/analytics/market-basket`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/api/dataset/info`).catch(() => ({ data: { files: [] } })),
        ]);

        if (!isMounted) return;

        const prodData = prodRes.data || [];
        setProducts(prodData);

        // Build unique categories dynamically from real dataset
        const cats = ['All', ...new Set(prodData.map(p => p.category).filter(Boolean))];
        setCategories(cats);

        setMarketBasket(basketRes.data || []);

        const files = datasetRes.data?.files || [];
        if (files.length > 0) {
          const currentFile = files[files.length - 1].name;
          setActiveDataset(currentFile);
          localStorage.setItem('datamart_active_dataset', currentFile);
        } else {
          const saved = localStorage.getItem('datamart_active_dataset');
          setActiveDataset(saved || null);
        }
      } catch (err) {
        console.error('Failed to load storefront data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, []);

  // Currency resolution based on dataset
  const currencyInfo = useMemo(() => getDatasetCurrency(activeDataset), [activeDataset]);
  const currencySymbol = currencyInfo.symbol;

  // Apriori Recommendation Lookup
  const getRecommendation = (productName) => {
    if (!marketBasket.length || !productName) return null;
    const lower = productName.toLowerCase();
    const rule = marketBasket.find(r => r.rule && r.rule.toLowerCase().includes(lower));
    if (rule && rule.rule.includes(' -> ')) {
      const parts = rule.rule.split(' -> ');
      return {
        item: parts[1] || parts[0],
        lift: rule.lift ? `${rule.lift.toFixed(1)}x` : null,
        confidence: rule.confidence ? `${(rule.confidence * 100).toFixed(0)}%` : null
      };
    }
    return null;
  };

  // Quantity handling
  const getQuantity = (id) => quantities[id] || 1;
  const setQuantity = (id, delta) => {
    setQuantities(prev => {
      const current = prev[id] || 1;
      const next = Math.max(1, Math.min(99, current + delta));
      return { ...prev, [id]: next };
    });
  };

  // 1-Click Purchase & OLTP Database Write
  const simulateTransaction = async (product) => {
    const qty = getQuantity(product.id);
    const totalAmount = (Number(product.price) || 0) * qty;

    setTxState(prev => ({ ...prev, [product.id]: { status: 'loading' } }));

    try {
      const res = await axios.post(`${API_BASE_URL}/api/transaction`, {
        product_id: String(product.id),
        product_name: product.name,
        quantity: qty,
        amount: totalAmount
      });

      const { order_id, message, simulated } = res.data;

      setTxState(prev => ({
        ...prev,
        [product.id]: {
          status: 'success',
          order_id,
          message: simulated ? `Simulated order ${order_id}` : `Order ${order_id} committed to OLTP DB`
        }
      }));

      // Add to recent orders tray
      setRecentOrders(prev => [
        {
          id: order_id,
          productName: product.name,
          quantity: qty,
          amount: totalAmount,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          simulated: !!simulated
        },
        ...prev.slice(0, 4)
      ]);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      setTxState(prev => ({
        ...prev,
        [product.id]: { status: 'error', message: errMsg }
      }));
    }

    // Auto dismiss status after 5 seconds
    setTimeout(() => {
      setTxState(prev => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    }, 5000);
  };

  // Search, Filter & Sort Logic
  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || String(p.id).toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
      case 'price-desc':
        result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        // 'default' - preserve original dataset catalog order
        break;
    }

    return result;
  }, [products, search, activeCategory, sortBy]);

  const resetFilters = () => {
    setSearch('');
    setActiveCategory('All');
    setSortBy('default');
  };

  return (
    <motion.div className="container" initial="initial" animate="in" exit="out" variants={pageVariants}>
      <div className="storefront-layout">

        {/* ── Section A: Storefront Page Header ────────────────────────────── */}
        <PageHeader
          title="Storefront"
          subtitle="Enterprise transactional e-commerce catalog connected to active warehouse analytics."
          badge={
            activeDataset ? (
              <Badge variant="success" withDot>
                {activeDataset} {currencyInfo.code ? `(${currencyInfo.code})` : ''}
              </Badge>
            ) : (
              <Badge variant="warning" withDot>
                No active dataset loaded
              </Badge>
            )
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRight size={14} />}
              iconPosition="right"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </Button>
          }
        />

        {/* ── Section B: Hero Banner ───────────────────────────────────────── */}
        <div className="storefront-hero">
          <div className="storefront-hero__content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Badge variant="purple" size="sm" icon={<Store size={12} />}>
                OLTP Transactional Store
              </Badge>
              {currencyInfo.code && (
                <Badge variant="default" size="sm">
                  Currency: {currencyInfo.code}
                </Badge>
              )}
            </div>

            <h2 className="storefront-hero__title">
              Enterprise Product Catalog & OLTP Showcase
            </h2>

            <p className="storefront-hero__desc">
              Browse products dynamically loaded from your active data warehouse dataset. Every order simulates real-time OLTP database transactions that synchronize through the data cleaner and reflect in analytics.
            </p>

            <div className="storefront-hero__stats">
              <div className="storefront-stat-pill">
                <Package size={14} color="#4F46E5" />
                <span>Catalog Size: <strong>{products.length} Items</strong></span>
              </div>
              <div className="storefront-stat-pill">
                <Tag size={14} color="#0284C7" />
                <span>Categories: <strong>{Math.max(0, categories.length - 1)} Active</strong></span>
              </div>
              <div className="storefront-stat-pill">
                <TrendingUp size={14} color="#10B981" />
                <span>Cross-Sell Intelligence: <strong>{marketBasket.length} Rules</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section G (Auxiliary): Recent Transactions Tray ──────────────── */}
        {recentOrders.length > 0 && (
          <div className="recent-orders-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <CheckCircle2 size={16} color="#10B981" />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Recent OLTP Transactions:
              </span>
            </div>

            <div className="recent-orders-list">
              {recentOrders.map((ord) => (
                <div key={ord.id} className="recent-order-chip">
                  <span style={{ fontWeight: 600, color: '#4F46E5', fontFamily: 'monospace' }}>
                    {ord.id}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {ord.productName.length > 20 ? ord.productName.substring(0, 20) + '…' : ord.productName}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatCurrency(ord.amount, currencySymbol)}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.6875rem' }}>
                    {ord.time}
                  </span>
                </div>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw size={12} />}
              onClick={() => setRecentOrders([])}
              title="Clear recent orders tray"
              style={{ padding: '4px 8px', height: '28px', color: 'var(--text-tertiary)' }}
            >
              Clear
            </Button>
          </div>
        )}

        {/* ── Section D: Search, Category Filter & Sorting Controls ────────── */}
        <div className="storefront-controls">
          <div className="storefront-controls__left">
            {/* Search Box */}
            <div className="storefront-search-box">
              <Search size={16} className="storefront-search-box__icon" />
              <input
                type="text"
                placeholder="Search products or SKU ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="storefront-search-box__input"
              />
              {search && (
                <button
                  type="button"
                  className="storefront-search-box__clear"
                  onClick={() => setSearch('')}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Select */}
            <div style={{ minWidth: 160 }}>
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                style={{
                  height: 40, width: '100%',
                  padding: '0 0.75rem',
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'All' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="storefront-controls__right">
            {/* Sort Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SlidersHorizontal size={14} color="#64748B" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  height: 40,
                  padding: '0 0.75rem',
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="default">Featured Catalog</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Alphabetical: A to Z</option>
                <option value="name-desc">Alphabetical: Z to A</option>
              </select>
            </div>

            {/* Results Counter / Reset */}
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'item' : 'items'}
            </div>

            {(search || activeCategory !== 'All' || sortBy !== 'default') && (
              <Button
                variant="ghost"
                size="sm"
                icon={<X size={13} />}
                onClick={resetFilters}
                style={{ height: 32 }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ── Section C & F: Product Catalog Grid & Cross-Sell Recommendations */}
        {loading ? (
          <div className="storefront-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="product-card" style={{ gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton variant="text" width="80px" />
                  <Skeleton variant="text" width="60px" />
                </div>
                <Skeleton variant="text" count={2} />
                <Skeleton variant="rectangular" height="40px" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem' }}>
                  <Skeleton variant="text" width="70px" />
                  <Skeleton variant="rectangular" width="90px" height="32px" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          /* Empty Catalog: No dataset processed yet */
          <Card>
            <EmptyState
              title="No Products in Catalog"
              description="Your store will dynamically reflect products from your dataset once you execute the ETL Pipeline."
              action={
                <Button
                  variant="primary"
                  icon={<ArrowRight size={14} />}
                  iconPosition="right"
                  onClick={() => navigate('/etl')}
                >
                  Go to ETL Pipeline
                </Button>
              }
            />
          </Card>
        ) : filteredAndSortedProducts.length === 0 ? (
          /* Empty Search / Filter Results */
          <Card>
            <EmptyState
              title="No Matching Products Found"
              description={`We couldn't find any products matching "${search}" in ${activeCategory}. Try adjusting your filters.`}
              action={
                <Button variant="outline" onClick={resetFilters}>
                  Clear All Filters
                </Button>
              }
            />
          </Card>
        ) : (
          /* Product Catalog Grid */
          <motion.div
            className="storefront-grid"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {filteredAndSortedProducts.map((product) => {
              const recommendation = getRecommendation(product.name);
              const tx = txState[product.id];
              const qty = getQuantity(product.id);

              return (
                <motion.div
                  key={product.id}
                  className="product-card"
                  variants={itemVariants}
                >
                  <div>
                    {/* Header: Category Badge and SKU */}
                    <div className="product-card__header">
                      <Badge variant="purple" size="sm">
                        {product.category || 'General'}
                      </Badge>
                      <span className="product-card__sku" title="Product SKU Identifier">
                        SKU: {product.id}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h3 className="product-card__title" title={product.name}>
                      {product.name}
                    </h3>

                    {/* Apriori Cross-Sell Recommendation Section */}
                    {recommendation && (
                      <div className="product-card__cross-sell">
                        <div className="product-card__cross-sell-label">
                          <TrendingUp size={12} color="#10B981" />
                          <span>Frequently Bought Together</span>
                          {recommendation.lift && (
                            <span style={{ marginLeft: 'auto', color: '#10B981', fontSize: '0.65rem' }}>
                              {recommendation.lift} Lift
                            </span>
                          )}
                        </div>
                        <div className="product-card__cross-sell-item" title={recommendation.item}>
                          {recommendation.item}
                        </div>
                      </div>
                    )}

                    {/* Transaction Feedback Notification */}
                    <AnimatePresence>
                      {tx && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className={`product-card__tx-result ${
                            tx.status === 'success'
                              ? 'product-card__tx-result--success'
                              : tx.status === 'error'
                                ? 'product-card__tx-result--error'
                                : 'product-card__tx-result--loading'
                          }`}>
                            {tx.status === 'success' && <CheckCircle2 size={14} style={{ flexShrink: 0 }} />}
                            {tx.status === 'error' && <AlertCircle size={14} style={{ flexShrink: 0 }} />}
                            {tx.status === 'loading' && (
                              <div className="ui-btn__spinner" style={{ width: 12, height: 12, border: '2px solid rgba(79, 70, 229, 0.3)', borderTopColor: '#4F46E5', borderRadius: '50%' }} />
                            )}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tx.status === 'loading' ? 'Committing order to OLTP DB...' : tx.message}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Card Footer: Price, Quantity & Purchase Action */}
                  <div className="product-card__footer">
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Unit Price
                      </div>
                      <div className="product-card__price">
                        {formatCurrency(product.price, currencySymbol)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* Quantity Stepper */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--surface-subtle)',
                        overflow: 'hidden', height: 36
                      }}>
                        <button
                          type="button"
                          onClick={() => setQuantity(product.id, -1)}
                          disabled={qty <= 1 || tx?.status === 'loading'}
                          style={{
                            width: 26, height: '100%', border: 'none', background: 'none',
                            cursor: qty <= 1 ? 'not-allowed' : 'pointer',
                            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', fontWeight: 600
                          }}
                        >
                          –
                        </button>
                        <span style={{
                          padding: '0 6px', fontSize: '0.8125rem', fontWeight: 600,
                          color: 'var(--text-primary)', minWidth: 20, textAlign: 'center'
                        }}>
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(product.id, 1)}
                          disabled={qty >= 99 || tx?.status === 'loading'}
                          style={{
                            width: 26, height: '100%', border: 'none', background: 'none',
                            cursor: qty >= 99 ? 'not-allowed' : 'pointer',
                            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', fontWeight: 600
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Buy Button */}
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<ShoppingCart size={14} />}
                        onClick={() => simulateTransaction(product)}
                        loading={tx?.status === 'loading'}
                        disabled={tx?.status === 'loading'}
                        title={`Place order for ${qty} x ${product.name}`}
                        style={{ height: 36 }}
                      >
                        Order Item
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

      </div>
    </motion.div>
  );
}
