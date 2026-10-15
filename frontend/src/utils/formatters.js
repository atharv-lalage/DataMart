/**
 * Dataset-Based Currency Formatting Utility
 * ==========================================
 * Follows the original dataset's documented currency without performing currency conversion.
 *
 * - Online Retail (UCI) -> GBP (£)
 * - Sample Superstore (Tableau) -> USD ($)
 * - Ambiguous / Unknown -> Displays numeric value without assuming a currency symbol.
 */

/**
 * Identifies the dataset currency from filename, backend info, or documented dataset profiles.
 *
 * @param {string} filename - Dataset filename (e.g. 'Online_Retail.xlsx', 'Sample_-_Superstore.csv')
 * @param {Object} [datasetInfo] - Optional dataset info object
 * @returns {{ symbol: string, code: string, label: string }}
 */
export function getDatasetCurrency(filename = '', datasetInfo = null) {
  // 1. Check if backend metadata explicitly specified currency
  if (datasetInfo?.currency_symbol) {
    return {
      symbol: datasetInfo.currency_symbol,
      code: datasetInfo.currency_code || '',
      label: datasetInfo.currency_name || datasetInfo.currency_symbol,
    };
  }

  // 2. Check explicitly configured user preference or active dataset in localStorage if present
  let activeFile = filename || datasetInfo?.current_file || '';
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem('datamart_dataset_currency');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.symbol) return parsed;
      } catch {
        if (typeof stored === 'string' && stored.length <= 3) {
          return { symbol: stored, code: '', label: stored };
        }
      }
    }
    if (!activeFile) {
      activeFile = localStorage.getItem('datamart_active_dataset') || '';
    }
  }

  // 3. Match documented dataset profiles by filename
  const clean = activeFile.toLowerCase();

  // UCI Online Retail Dataset -> British Pound (£)
  if (clean.includes('online_retail') || clean.includes('online retail') || clean.includes('retail.xlsx') || clean.includes('retail.csv')) {
    return { symbol: '£', code: 'GBP', label: 'GBP (£)' };
  }

  // Tableau Sample Superstore Dataset -> US Dollar ($)
  if (clean.includes('superstore') || clean.includes('sample_-_superstore')) {
    return { symbol: '$', code: 'USD', label: 'USD ($)' };
  }

  // 4. Ambiguous or unknown -> do not guess, return empty symbol
  return { symbol: '', code: '', label: 'Numeric' };
}

/**
 * Formats a monetary number using the dataset currency without any conversion.
 *
 * @param {number} value - Raw numeric value
 * @param {string} symbol - Currency symbol ('£', '$', or '')
 * @param {Object} [options]
 * @returns {string}
 */
export function formatCurrency(value, symbol = '', options = {}) {
  if (value == null || isNaN(value)) {
    return symbol ? `${symbol}0.00` : '0.00';
  }

  let min = options.minimumFractionDigits;
  let max = options.maximumFractionDigits;

  if (max !== undefined && min === undefined) {
    min = Math.min(2, max);
  } else if (min !== undefined && max === undefined) {
    max = Math.max(2, min);
  } else if (min === undefined && max === undefined) {
    min = 2;
    max = 2;
  }

  // Ensure min <= max to avoid Intl RangeError
  if (min > max) {
    min = max;
  }

  try {
    const numFormatted = Number(value).toLocaleString(undefined, {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    });
    return symbol ? `${symbol}${numFormatted}` : numFormatted;
  } catch {
    const safeDecimals = typeof max === 'number' ? max : 2;
    return symbol ? `${symbol}${Number(value).toFixed(safeDecimals)}` : Number(value).toFixed(safeDecimals);
  }
}

/**
 * Formats a monetary number compactly for chart axes (e.g. "£150k", "$150k", or "150k").
 *
 * @param {number} value
 * @param {string} symbol
 * @returns {string}
 */
export function formatCompactCurrency(value, symbol = '') {
  if (value == null || isNaN(value)) {
    return symbol ? `${symbol}0` : '0';
  }

  const num = Number(value);
  const abs = Math.abs(num);

  let formatted = '';
  if (abs >= 1_000_000) {
    formatted = `${(num / 1_000_000).toFixed(1)}M`;
  } else if (abs >= 1_000) {
    formatted = `${(num / 1_000).toFixed(0)}k`;
  } else {
    formatted = num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  return symbol ? `${symbol}${formatted}` : formatted;
}
