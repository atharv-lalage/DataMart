import pandas as pd
import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sklearn.linear_model import LinearRegression


def generate_prediction(df, months_ahead=3):
    """
    Sales Prediction using Holt-Winters with Ratio-to-Trend Seasonal Decomposition.

    Industry-standard approach for business time-series forecasting:

    Strategy (adapts to data length):
    ─────────────────────────────────────────────────────────────────────
    ≥ 24 months → Full Holt-Winters (automatic trend + seasonality)
    < 24 months → Holt trend + manual seasonal indices via ratio-to-trend
                   decomposition, which extracts a multiplicative seasonal
                   factor for each calendar month (e.g., Nov/Dec spike for
                   holiday sales) and applies it to the trend forecast.

    This means future predictions will show per-month variation (dips in
    slow months, spikes in holiday months) rather than a flat trend line.

    Pre-processing:
      - Removes outlier months far outside the main date range
      - Removes months with near-zero revenue
    """
    months_ahead = max(1, int(months_ahead))

    # ── 1. Aggregate sales by month ───────────────────────────────────────
    df = df.copy()
    df['Month_Year'] = df['InvoiceDate'].dt.to_period('M')
    monthly_sales = (
        df.groupby('Month_Year')['Amount']
        .sum()
        .reset_index()
        .sort_values('Month_Year')
        .reset_index(drop=True)
    )

    n_months = len(monthly_sales)
    if n_months < 2:
        return []

    # ── 2. Remove outlier months ──────────────────────────────────────────
    if n_months >= 3:
        ordinals = monthly_sales['Month_Year'].apply(lambda p: p.ordinal).values
        gaps = np.diff(ordinals)
        median_gap = np.median(gaps)
        large_gap_idx = np.where(gaps > max(6 * median_gap, 6))[0]
        if len(large_gap_idx) > 0:
            cutoff = large_gap_idx[0] + 1
            monthly_sales = monthly_sales.iloc[:cutoff].reset_index(drop=True)

    median_revenue = monthly_sales['Amount'].median()
    monthly_sales = monthly_sales[
        monthly_sales['Amount'] > median_revenue * 0.01
    ].reset_index(drop=True)

    n_months = len(monthly_sales)
    if n_months < 2:
        return []

    sales_series = monthly_sales['Amount'].values.astype(float)

    # ── 3. Fit the model ──────────────────────────────────────────────────
    seasonal_period = 12
    trend_forecast = None
    trend_fitted = None
    seasonal_indices = None  # multiplicative factor per calendar month

    # --- Strategy A: Full Holt-Winters (≥ 24 months) ---
    if n_months >= 2 * seasonal_period:
        try:
            model = ExponentialSmoothing(
                sales_series,
                trend='add',
                seasonal='mul',
                seasonal_periods=seasonal_period,
                initialization_method='estimated',
            )
            fit = model.fit(optimized=True)
            trend_fitted = fit.fittedvalues
            trend_forecast = fit.forecast(months_ahead)
            # Holt-Winters already includes seasonality, no manual adjustment
            seasonal_indices = None
        except Exception:
            pass

    # --- Strategy B: Holt trend + manual seasonal indices (< 24 months) ---
    if trend_forecast is None and n_months >= 4:
        try:
            model = ExponentialSmoothing(
                sales_series,
                trend='add',
                seasonal=None,
                initialization_method='estimated',
            )
            fit = model.fit(optimized=True)
            trend_fitted = fit.fittedvalues
            trend_forecast = fit.forecast(months_ahead)

            # Compute seasonal indices: ratio of actual to trend per month
            seasonal_indices = _compute_seasonal_indices(
                monthly_sales, trend_fitted
            )
        except Exception:
            pass

    # --- Fallback: Linear Regression + manual seasonal indices ---
    if trend_forecast is None:
        X = np.arange(n_months).reshape(-1, 1)
        lr = LinearRegression().fit(X, sales_series)
        trend_fitted = lr.predict(X)
        future_X = np.arange(n_months, n_months + months_ahead).reshape(-1, 1)
        trend_forecast = lr.predict(future_X)

        seasonal_indices = _compute_seasonal_indices(
            monthly_sales, trend_fitted
        )

    # ── 4. Build response ─────────────────────────────────────────────────
    results = []

    # Historical: actual + seasonally-adjusted fitted values
    for i, row in enumerate(monthly_sales.itertuples()):
        fitted_val = float(trend_fitted[i])
        if seasonal_indices is not None:
            cal_month = row.Month_Year.month
            fitted_val *= seasonal_indices.get(cal_month, 1.0)

        results.append({
            'period': str(row.Month_Year),
            'actual_sales': round(float(row.Amount), 2),
            'predicted_sales': round(fitted_val, 2),
        })

    # Future: trend × seasonal factor for the target calendar month
    last_period = monthly_sales['Month_Year'].iloc[-1]
    for i in range(months_ahead):
        next_month = last_period + (i + 1)
        pred = float(trend_forecast[i])
        if seasonal_indices is not None:
            cal_month = next_month.month
            pred *= seasonal_indices.get(cal_month, 1.0)

        results.append({
            'period': str(next_month),
            'actual_sales': None,
            'predicted_sales': max(0, round(pred, 2)),
        })

    return results


def _compute_seasonal_indices(monthly_sales, trend_fitted):
    """
    Compute multiplicative seasonal indices using the Ratio-to-Trend method.

    For each calendar month (1=Jan … 12=Dec), the index is the average ratio
    of actual sales to the trend value.  An index of 1.3 means that month is
    typically 30 % above trend; 0.7 means 30 % below.

    When multiple years of data are available for the same calendar month,
    the ratios are averaged for stability.
    """
    ratios_by_month = {}

    for i, row in enumerate(monthly_sales.itertuples()):
        cal_month = row.Month_Year.month
        trend_val = float(trend_fitted[i])
        if trend_val > 0:
            ratio = float(row.Amount) / trend_val
            ratios_by_month.setdefault(cal_month, []).append(ratio)

    # Average ratio per calendar month
    seasonal_indices = {}
    for month, ratios in ratios_by_month.items():
        seasonal_indices[month] = np.mean(ratios)

    # Normalize so indices average to 1.0 (pure seasonal effect)
    if seasonal_indices:
        mean_index = np.mean(list(seasonal_indices.values()))
        if mean_index > 0:
            seasonal_indices = {m: v / mean_index for m, v in seasonal_indices.items()}

    return seasonal_indices
