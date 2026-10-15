import React from 'react';
import { Layers, ZoomIn, Scissors, Boxes, CheckCircle2 } from 'lucide-react';
import { Badge } from '../common/index.js';

export const OPERATION_DEFINITIONS = {
  rollup: {
    key: 'rollup',
    name: 'Roll-up',
    title: 'Sales over Time',
    desc: 'Aggregates transactional sales up the temporal hierarchy by year and quarter.',
    icon: Layers,
    dimensionType: 'Time Dimension (Year, Quarter)',
    measure: 'SUM(sf.amount) as total_revenue',
    factTable: 'ecom_sales_fact JOIN ecom_dim_time',
    buildSQL: (f) =>
      `SELECT dt.year, dt.quarter,\n    SUM(sf.amount) as total_revenue\nFROM ecom_sales_fact sf\nJOIN ecom_dim_time dt ON sf.date_id = dt.date_id\n${
        f.year ? `WHERE dt.year = ${f.year}\n` : ''
      }GROUP BY dt.year, dt.quarter\nORDER BY dt.year, dt.quarter;`,
    fallbackHeaders: ['year', 'quarter', 'total_revenue'],
    fallbackData: [
      ['2015', '1', '37941.21'],
      ['2015', '2', '39504.72'],
      ['2015', '3', '54032.44'],
      ['2015', '4', '45508.21']
    ]
  },
  drilldown: {
    key: 'drilldown',
    name: 'Drill-down',
    title: 'Top Products by Country',
    desc: 'Decomposes aggregate sales down into customer geography and product details.',
    icon: ZoomIn,
    dimensionType: 'Customer (Country) × Product (Name)',
    measure: 'SUM(sf.amount) as total_sales',
    factTable: 'ecom_sales_fact JOIN ecom_dim_customer, ecom_dim_product, ecom_dim_time',
    buildSQL: (f) =>
      `SELECT dc.country, dp.name as product_name,\n    SUM(sf.amount) as total_sales\nFROM ecom_sales_fact sf\nJOIN ecom_dim_customer dc ON sf.user_id = dc.user_id\nJOIN ecom_dim_product dp ON sf.product_id = dp.product_id\nJOIN ecom_dim_time dt ON sf.date_id = dt.date_id\nWHERE 1=1${
        f.country ? `\n  AND LOWER(dc.country) = '${f.country.toLowerCase()}'` : ''
      }${f.year ? `\n  AND dt.year = ${f.year}` : ''}\nGROUP BY dc.country, dp.name\nORDER BY total_sales DESC LIMIT 20;`,
    fallbackHeaders: ['country', 'product_name', 'total_sales'],
    fallbackData: [
      ['United States', 'Canon imageCLASS 2200 Advanced Copier', '17499.95'],
      ['United States', 'Fellowes PB500 Electric Punch Plastic Comb Binding Machine', '7371.74'],
      ['United States', 'Hewlett Packard LaserJet 3310 Copier', '5639.87']
    ]
  },
  slice: {
    key: 'slice',
    name: 'Slice',
    title: 'Top Products by Month',
    desc: 'Isolates a 1-dimensional subslice along the Time Dimension for a specific month & year.',
    icon: Scissors,
    dimensionType: 'Time Dimension (Month, Year) × Product',
    measure: 'SUM(sf.quantity) as units_sold, SUM(sf.amount) as gross_revenue',
    factTable: 'ecom_sales_fact JOIN ecom_dim_time, ecom_dim_product',
    buildSQL: (f) =>
      `SELECT dp.name as product_name,\n    SUM(sf.quantity) as units_sold,\n    SUM(sf.amount) as gross_revenue\nFROM ecom_sales_fact sf\nJOIN ecom_dim_time dt ON sf.date_id = dt.date_id\nJOIN ecom_dim_product dp ON sf.product_id = dp.product_id\nWHERE dt.month = ${
        f.month || 12
      }\n  AND dt.year = ${
        f.year || 2015
      }\nGROUP BY dp.name\nORDER BY gross_revenue DESC\nLIMIT 15;`,
    fallbackHeaders: ['product_name', 'units_sold', 'gross_revenue'],
    fallbackData: [
      ['HON 5400 Series Task Chairs for Big and Tall', '1', '3785.29'],
      ['GBC DocuBind P400 Electric Binding System', '3', '2411.94'],
      ['Hewlett Packard LaserJet 3310 Copier', '2', '2399.96']
    ]
  },
  dice: {
    key: 'dice',
    name: 'Dice',
    title: 'Compare Categories',
    desc: 'Filters across multiple dimensions simultaneously (Product Categories & Calendar Years).',
    icon: Boxes,
    dimensionType: 'Category (category_name) × Time (year)',
    measure: 'SUM(sf.amount) as total_sales',
    factTable: 'ecom_sales_fact JOIN ecom_dim_product, ecom_dim_category, ecom_dim_time',
    buildSQL: (f) => {
      const cats = f.categories || 'Furniture,Technology';
      const yrs = f.years || '2015,2016';
      return `SELECT dcat.category_name, dt.year,\n    SUM(sf.amount) as total_sales\nFROM ecom_sales_fact sf\nJOIN ecom_dim_product dp ON sf.product_id = dp.product_id\nJOIN ecom_dim_category dcat ON dp.category_id = dcat.category_id\nJOIN ecom_dim_time dt ON sf.date_id = dt.date_id\nWHERE dcat.category_name IN (${cats
        .split(',')
        .map((c) => `'${c.trim()}'`)
        .join(', ')})\n  AND dt.year IN (${yrs})\nGROUP BY dcat.category_name, dt.year\nORDER BY dt.year, dcat.category_name;`;
    },
    fallbackHeaders: ['category_name', 'year', 'total_sales'],
    fallbackData: [
      ['Furniture', '2015', '63658.76'],
      ['Technology', '2015', '83677.92'],
      ['Furniture', '2016', '71008.23'],
      ['Technology', '2016', '91285.50']
    ]
  }
};

export default function OlapOperationSelector({ activeQuery, onSelectOperation }) {
  return (
    <div className="olap-operations-grid">
      {Object.values(OPERATION_DEFINITIONS).map((op) => {
        const Icon = op.icon;
        const isActive = activeQuery === op.key;

        return (
          <button
            key={op.key}
            type="button"
            className={`olap-op-card ${isActive ? 'olap-op-card--active' : ''}`}
            onClick={() => onSelectOperation(op.key)}
            aria-pressed={isActive}
          >
            <div className="olap-op-card__header">
              <div className="olap-op-card__icon-wrap">
                <Icon size={18} />
              </div>
              <Badge variant={isActive ? 'primary' : 'neutral'}>
                {op.name}
              </Badge>
            </div>

            <div className="olap-op-card__title">
              {op.title}
              {isActive && (
                <CheckCircle2 size={14} style={{ color: 'var(--accent-primary)', marginLeft: 'auto' }} />
              )}
            </div>

            <p className="olap-op-card__desc">
              {op.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}
