# DataMart — Technical Summary & Architectural Specification

> **Document Classification:** Engineering Specification & Capstone Defense Summary  
> **Platform Version:** 2.0 (Hybrid SaaS Architecture)  
> **Course/Domain:** Advanced Database Management Systems (ADBMS), Business Intelligence & Decision Support Systems (DSS)  
> **Target Audience:** Technical Examiners, System Architects, Full-Stack Engineers  

---

## 1. Executive Summary

**DataMart** is an end-to-end, multi-tenant enterprise data analytics platform designed to bridge the gap between operational transaction processing (**OLTP**), analytical data warehousing (**OLAP**), unsupervised machine learning mining, and natural language decision support.

The system ingests raw, heterogeneous transactional retail datasets (`.csv` or `.xlsx`), standardizes diverse schemas via an automated ETL pipeline, populates a dual-database storage layer (MongoDB Atlas for tenant identity + NeonDB PostgreSQL for relational 3NF and snowflake dimensional models), and exposes multi-dimensional query capabilities, ML clustering, predictive forecasting, and a dual-engine AI assistant powered by Groq.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DATAMART PLATFORM                                    │
│                                                                                        │
│  ┌───────────────────────────┐  ┌───────────────────────────┐  ┌────────────────────┐  │
│  │     OLTP Storefront       │  │     ETL Pipeline Engine   │  │   OLAP Data Cube   │  │
│  │  Live Orders & Cart Sim   │  │  Multi-Stage Clean & Map  │  │ Roll-up/Drill-down │  │
│  └─────────────┬─────────────┘  └─────────────┬─────────────┘  └─────────┬──────────┘  │
│                │                              │                          │             │
│                ▼                              ▼                          ▼             │
│  ┌───────────────────────────┐  ┌───────────────────────────┐  ┌────────────────────┐  │
│  │   3NF Relational Tables   │  │  Snowflake Fact & Dims    │  │  Dual-Engine AI    │  │
│  │ Normalized OLTP Integrity │  │ Multi-Dimensional Schema  │  │ Text-to-SQL + RAG  │  │
│  └─────────────┬─────────────┘  └─────────────┬─────────────┘  └─────────┬──────────┘  │
│                │                              │                          │             │
│                ▼                              ▼                          ▼             │
│  ┌───────────────────────────┐  ┌───────────────────────────┐  ┌────────────────────┐  │
│  │     Machine Learning      │  │   Multi-Tenant Identity   │  │ Hybrid Design UI   │  │
│  │ RFM, Forecast, Apriori    │  │   MongoDB Atlas + JWT     │  │ Light + Navy SaaS  │  │
│  └───────────────────────────┘  └───────────────────────────┘  └────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Tenant Cloud Architecture & Data Isolation

### 2.1 Multi-Tenant Identity Model
* **Database Engine:** MongoDB Atlas (Cloud Database-as-a-Service)
* **Collection:** `datamart_db.users`
* **Indexing:** Enforced unique ascending B-Tree indexes on `email` and `username`.
* **Password Encryption:** 12-round salted **bcrypt** one-way hashing (`$2b$12$...`). Plaintext passwords never touch persistence.
* **Token Standard:** JSON Web Tokens (JWT) signed via HMAC SHA-256 (`HS256`) with a 7-day sliding expiration window.
* **Security Scoping:**
  * `require_authenticated_user`: Validates token signature and expiration, extracts tenant claims (`sub`, `username`, `email`, `role`). Used for user profile lookups and analytical views.
  * `require_admin`: Strictly validates that `user.get('role') == 'admin'`. Non-admin accounts receive **HTTP 403 Forbidden** if attempting to access administrative settings or update system configurations.

### 2.2 Filesystem & Cache Tenant Partitioning
DataMart enforces strict boundary isolation between tenant namespaces:
1. **Physical Storage:** Uploaded files are partitioned under `dataset/users/{username}/`. A tenant named `user_a` cannot inspect, overwrite, or access files belonging to `user_b` or `admin`.
2. **In-Memory Analytical State:** Pandas DataFrames and precomputed metrics are isolated in memory using a dictionary keyed by authenticated username (`user_dfs[username]` and `user_cached_analytics[username]`).
3. **Cache Purge:** Session caches and client-side analytical snapshots (`sessionStorage`) can be purged without terminating active tenant sessions.

---

## 3. Automated Multi-Stage ETL Pipeline

The ETL pipeline (`etl/etl_pipeline.py`) transforms unstructured and heterogeneous retail spreadsheets into normalized relational records and dimensional data warehouse tables.

```
 Raw File (.csv / .xlsx)
          │
          ▼
 [Stage 1: Extract & Ingest] ────── Read bytes, detect encoding, parse tabular stream
          │
          ▼
 [Stage 2: Schema Normalizer] ───── Map alias dictionary to canonical attribute schema
          │
          ▼
 [Stage 3: Validation & Clean] ─── Coerce types, impute missing descriptions, drop negative prices
          │
          ▼
 [Stage 4: Feature Enrichment] ──── Compute Line Total (Qty × UnitPrice), decompose timestamps
          │
          ▼
 [Stage 5: Dual Warehouse Load] ── Ingest into 3NF OLTP tables & Snowflake Schema OLAP tables
```

### 3.1 Smart Schema Normalizer (Header Aliasing)
Retail datasets across repositories (e.g., UCI Machine Learning Repository vs. Kaggle Superstore) utilize disparate column nomenclature. DataMart implements an alias-mapping matrix:

| Canonical Field | Recognized Dataset Aliases | Target Data Type |
|---|---|---|
| `InvoiceNo` | `Order ID`, `Invoice Number`, `Transaction ID`, `Order_No` | `VARCHAR(64)` |
| `StockCode` | `Product ID`, `SKU`, `Item Code`, `Product_No` | `VARCHAR(64)` |
| `Description` | `Product Name`, `Item Description`, `Title` | `VARCHAR(255)` |
| `Quantity` | `Qty`, `Items Ordered`, `Amount Purchased` | `INTEGER` |
| `InvoiceDate` | `Order Date`, `Transaction Date`, `Timestamp` | `TIMESTAMP` |
| `UnitPrice` | `Sales`, `Price`, `Item Price`, `Revenue per Unit` | `NUMERIC(10,2)` |
| `CustomerID` | `Customer ID`, `User ID`, `Client ID` | `VARCHAR(64)` |
| `Country` | `Region`, `State`, `Territory`, `Country/Region` | `VARCHAR(64)` |

### 3.2 Data Cleaning & Transformation Rules
* **Negative Quantities & Prices:** Filtered out or segregated as cancellations/returns (`Quantity > 0` and `UnitPrice > 0`).
* **Missing Value Imputation:** Missing `CustomerID` records are flagged as `"GUEST_CHECKOUT"`; missing descriptions are imputed with `"UNKNOWN_PRODUCT"`.
* **Outlier Capping:** Quantities exceeding the 99.9th percentile are flagged to prevent skew in linear sales models.

---

## 4. Database Modeling: OLTP vs. OLAP

The platform demonstrates the architectural differences between Transaction Processing (OLTP) and Analytical Processing (OLAP).

### 4.1 OLTP Schema: Third Normal Form (3NF)
Normalized to eliminate insertion, update, and deletion anomalies. Redundancy is minimized to support high-concurrency writes:
* `customers(customer_id, customer_code, country, email)`
* `categories(category_id, category_name)`
* `products(product_id, sku, description, unit_price, category_id)`
* `orders(order_id, invoice_no, customer_id, order_date, status)`
* `order_items(order_item_id, order_id, product_id, quantity, unit_price, line_total)`

### 4.2 OLAP Schema: Snowflake Schema Data Warehouse
Optimized for read-heavy multi-dimensional aggregations, slicing, and drill-downs:
* **Central Fact Table (`ecom_sales_fact`):**
  * Measures: `quantity`, `unit_price`, `total_amount`
  * Foreign Keys: `date_id`, `customer_id`, `product_id`
* **Dimension Tables:**
  * `ecom_dim_customer`: `customer_id`, `customer_code`, `country`
  * `ecom_dim_product`: `product_id`, `product_name`, `price`, `category_id` (FK to sub-dimension)
  * `ecom_dim_category`: `category_id`, `category_name` (De-normalized child of product dimension)
  * `ecom_dim_time`: `date_id`, `full_date`, `day`, `month`, `quarter`, `year`, `day_of_week`

```
                               ┌─────────────────────────┐
                               │      ecom_dim_time      │
                               │─────────────────────────│
                               │ date_id (PK)            │
                               │ full_date               │
                               │ day, month, quarter, yr │
                               └────────────┬────────────┘
                                            │
   ┌──────────────────────┐                 │                 ┌──────────────────────┐
   │  ecom_dim_customer   │                 │                 │   ecom_dim_product   │
   │──────────────────────│                 │                 │──────────────────────│
   │ customer_id (PK)     ├─────────┐       │       ┌─────────┤ product_id (PK)      │
   │ customer_code        │         │       │       │         │ product_name, price  │
   │ country              │         │       │       │         │ category_id (FK) ────┼──┐
   └──────────────────────┘         ▼       ▼       ▼         └──────────────────────┘  │
                            ┌─────────────────────────┐                                 │
                            │     ecom_sales_fact     │                                 ▼
                            │─────────────────────────│                      ┌──────────────────────┐
                            │ fact_id (PK)            │                      │  ecom_dim_category   │
                            │ customer_id (FK)        │                      │──────────────────────│
                            │ product_id (FK)         │                      │ category_id (PK)     │
                            │ date_id (FK)            │                      │ category_name        │
                            │ quantity, unit_price    │                      └──────────────────────┘
                            │ total_amount            │
                            └─────────────────────────┘
```

---

## 5. Multi-Dimensional OLAP Operations

The interactive OLAP Terminal (`/terminal`) translates interactive UI actions into analytical SQL queries:

### 5.1 Roll-up (Higher Level of Aggregation)
Rolls up transactional sales from monthly granularity into yearly totals:
```sql
SELECT 
    t.year,
    SUM(f.total_amount) AS total_revenue,
    SUM(f.quantity) AS total_quantity
FROM ecom_sales_fact f
JOIN ecom_dim_time t ON f.date_id = t.date_id
GROUP BY t.year
ORDER BY t.year ASC;
```

### 5.2 Drill-down (Granular Decomposition)
Decomposes macro annual sales into country-specific performance by month:
```sql
SELECT 
    c.country,
    t.year,
    t.month,
    SUM(f.total_amount) AS regional_sales
FROM ecom_sales_fact f
JOIN ecom_dim_customer c ON f.customer_id = c.customer_id
JOIN ecom_dim_time t ON f.date_id = t.date_id
GROUP BY c.country, t.year, t.month
ORDER BY c.country, t.year, t.month;
```

### 5.3 Slice (Single-Dimension Filtering)
Extracts a 2D slice of data restricted to a single country (e.g., `'United Kingdom'`):
```sql
SELECT 
    p.product_name,
    SUM(f.total_amount) AS product_revenue
FROM ecom_sales_fact f
JOIN ecom_dim_customer c ON f.customer_id = c.customer_id
JOIN ecom_dim_product p ON f.product_id = p.product_id
WHERE c.country = 'United Kingdom'
GROUP BY p.product_name
ORDER BY product_revenue DESC
LIMIT 10;
```

### 5.4 Dice (Multi-Dimensional Sub-Cube Filtering)
Filters across multiple dimensions simultaneously (Specific Countries × Specific Categories × Specific Fiscal Quarter):
```sql
SELECT 
    c.country,
    cat.category_name,
    t.quarter,
    SUM(f.total_amount) AS revenue
FROM ecom_sales_fact f
JOIN ecom_dim_customer c ON f.customer_id = c.customer_id
JOIN ecom_dim_product p ON f.product_id = p.product_id
JOIN ecom_dim_category cat ON p.category_id = cat.category_id
JOIN ecom_dim_time t ON f.date_id = t.date_id
WHERE c.country IN ('Germany', 'France')
  AND t.year = 2011 
  AND t.quarter = 4
GROUP BY c.country, cat.category_name, t.quarter;
```

---

## 6. Advanced Machine Learning & Data Mining Suite

### 6.1 Customer Segmentation: K-Means RFM Clustering
* **Feature Extraction:**
  * **Recency ($R$):** Days since customer's last purchase date relative to dataset reference date.
  * **Frequency ($F$):** Total count of unique order invoices generated by customer.
  * **Monetary ($M$):** Cumulative spending across all transactions ($\sum \text{Amount}$).
* **Normalization:** Standardized using `StandardScaler` to zero mean and unit variance ($\mu=0, \sigma=1$) to prevent monetary magnitude from dominating Euclidean distance metrics.
* **Clustering Algorithm:** Unsupervised K-Means clustering (default $k=4$, configurable via Admin Settings). Clusters are mapped to business personas:
  * **Champions:** Low Recency, High Frequency, High Monetary value.
  * **Loyal Customers:** Moderate Recency, High Frequency, Consistent Spend.
  * **At Risk:** High Recency (dormant), High Past Frequency.
  * **Hibernating:** High Recency, Single Order, Low Monetary value.

### 6.2 Time-Series Predictive Sales Forecasting
* **Algorithm:** Polynomial Regression with Trend Decomposition.
* **Modeling Logic:** Historical revenue is aggregated by calendar month. A second-degree polynomial model ($y = \beta_0 + \beta_1 t + \beta_2 t^2$) captures non-linear seasonal acceleration and growth curves.
* **Confidence Bands:** 95% confidence intervals are computed using the standard error of regression ($SE$) across the forecast projection window (configurable between 1 and 12 months).

### 6.3 Adaptive Apriori Market Basket Analysis
* **Core Metrics:**
  $$\text{Support}(A \rightarrow B) = P(A \cap B) = \frac{\text{Baskets containing } A \text{ and } B}{\text{Total Baskets}}$$
  $$\text{Confidence}(A \rightarrow B) = P(B \mid A) = \frac{\text{Support}(A \cup B)}{\text{Support}(A)}$$
  $$\text{Lift}(A \rightarrow B) = \frac{\text{Confidence}(A \rightarrow B)}{\text{Support}(B)}$$
* **The Dynamic Support Decay Ladder:**
  * Dense retail datasets (`Online Retail`) have high transaction overlap, discovering rules at high support levels (`0.02` to `0.05`).
  * Sparse catalogs (`Sample Superstore`) average 2 items per order across 1,800+ SKUs, meaning valid pairs only exist at support between `0.002` and `0.008`.
  * DataMart solves empty-state failures by dynamically decaying the minimum support threshold through a graduated ladder (`0.03` $\rightarrow$ `0.02` $\rightarrow$ `0.01` $\rightarrow$ `0.005` $\rightarrow$ `0.001`) until meaningful association rules are unearthed. Lift scores routinely exceed **10x to 33x+**.

---

## 7. Dual-Engine AI Analyst (Groq LLM)

The AI Analyst (`backend/chatbot.py`) provides an intelligent natural language bridge to the database and platform knowledge base.

```
                           User Natural Language Query
                                       │
                                       ▼
                           ┌───────────────────────┐
                           │   Intent Classifier   │
                           │  (Semantic & Regex)   │
                           └───────────┬───────────┘
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 │                                           │
         Requires Live Data                         Conceptual / Architecture
                 ▼                                           ▼
   ┌───────────────────────────┐               ┌───────────────────────────┐
   │    Text-to-SQL Engine     │               │   FAISS Vector RAG Engine │
   │───────────────────────────│               │───────────────────────────│
   │ • Schema-grounded prompt  │               │ • sentence-transformers   │
   │ • PostgreSQL generator    │               │ • Top-K cosine similarity │
   │ • Read-only validator     │               │ • ADBMS knowledge chunks  │
   │ • Live NeonDB execution   │               │ • Grounded synthesis      │
   │ • Markdown table render   │               │ • Architecture citations  │
   └─────────────┬─────────────┘               └─────────────┬─────────────┘
                 │                                           │
                 └─────────────────────┬─────────────────────┘
                                       ▼
                          Structured Analyst Response
```

### 7.1 Text-to-SQL Engine
* **Safety Sandbox:** Queries generated by the model are parsed and validated. Any query containing mutating statements (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`) is blocked immediately.
* **Execution & Rendering:** Safe `SELECT` queries execute against the read replica, returning:
  1. Plain-English executive insight.
  2. Syntax-highlighted SQL preview with copy button.
  3. Interactive tabular data results.

### 7.2 Retrieval-Augmented Generation (RAG) Engine
* **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors).
* **Vector Store:** Local **FAISS** (Facebook AI Similarity Search) index over curated documentation covering ADBMS topics, relational normalization, data warehousing, OLAP primitives, and machine learning mathematics.
* **Context Augmentation:** Relevant chunks are retrieved via inner product / cosine similarity and injected into the Groq prompt context, preventing model hallucinations during academic defense or technical review.

---

## 8. Frontend Engineering & Quality Verification

### 8.1 Technology Stack
* **Framework:** React 19 + Vite 8.0.9
* **Styling:** DataMart Hybrid Design System (Vanilla CSS with CSS custom properties)
* **Visualization:** Recharts 3.8.1 (Sales trends, confidence ribbons, RFM scatter plots, country bars)
* **Icons:** Lucide React (Clean, tree-shaken SVG icon set)
* **Routing:** React Router DOM v7

### 8.2 Production Build Benchmark
```text
vite v8.0.9 building client environment for production...
✓ 2775 modules transformed.
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-CXxO_SWe.css   70.49 kB │ gzip:  10.71 kB
dist/assets/index-DXUQTDpP.js   942.80 kB │ gzip: 280.80 kB
✓ built in 402ms with 0 errors
```

### 8.3 Verification & Quality Assurance Matrix

| Phase | Target Area | Key Checks Verified | Status |
| :---: | :--- | :--- | :---: |
| **Ph. 1-3** | Core Shell & Nav | Hybrid sidebar, responsive drawer, theme tokens | **PASS** |
| **Ph. 4** | Dashboard (BI/DSS) | 22 KPI cards, Recharts trends, RFM scatter, CSV export | **PASS** |
| **Ph. 5** | ETL Pipeline Tracker | File upload dropzone, smart header aliasing, log terminal | **PASS** |
| **Ph. 6** | Storefront (OLTP) | Product catalog, cart simulation, Apriori cross-sell bundles | **PASS** |
| **Ph. 7** | OLAP Query Terminal | Roll-up, Drill-down, Slice, Dice, SQL preview | **PASS** |
| **Ph. 8** | AI Analyst Workspace | Dual-engine tab toggle, Text-to-SQL, FAISS RAG assistant | **PASS** |
| **Ph. 9** | Settings & RBAC | Real role claims, 403 authorization enforcement, cache purge | **PASS** |
| **Ph. 10** | Auth & Regression | Redesigned Auth card, password toggle, full platform regression | **PASS** |

---

## 9. Academic Defense & Viva Q&A Guide

<details>
<summary><b>Q1: Why use a Snowflake schema instead of a Star schema or single flat table?</b></summary>

* **Answer:** A Star schema denormalizes all dimension attributes into single tables. While fast to query, it introduces redundancy (e.g., repeating category descriptions across thousands of products). The **Snowflake schema** partially normalizes dimensions (splitting `ecom_dim_product` and `ecom_dim_category`), reducing disk storage, improving maintainability, and providing clean dimensional hierarchies for hierarchical roll-up and drill-down operations.
</details>

<details>
<summary><b>Q2: How does DataMart prevent SQL Injection in the Text-to-SQL AI Engine?</b></summary>

* **Answer:** DataMart employs a defense-in-depth approach:
  1. System prompts strictly mandate read-only `SELECT` queries without DDL/DML.
  2. The generated query string passes through an AST / keyword blacklist validator rejecting `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `EXEC`, and semicolon-chained queries.
  3. Queries execute under a restricted database role with read-only access to analytical tables.
</details>

<details>
<summary><b>Q3: How does the Adaptive Apriori algorithm prevent empty recommendations?</b></summary>

* **Answer:** Traditional market basket implementations fail when applied to sparse product catalogs because fixed support thresholds (e.g., `5%`) require items to co-occur dozens of times. DataMart uses an **Adaptive Support Decay Ladder** that iteratively lowers minimum support from `0.03` down to `0.001` until valid itemsets emerge, while maintaining a minimum lift filter ($\text{Lift} > 1.0$) to guarantee statistical significance.
</details>

<details>
<summary><b>Q4: What ensures true tenant isolation across users?</b></summary>

* **Answer:** Isolation is enforced at both filesystem and application layers:
  1. Requests must carry a valid JWT token verified by FastAPI dependencies.
  2. File I/O is restricted to `dataset/users/{username}/`.
  3. In-memory data structures (Pandas DataFrames and analytics cache) are stored in thread-safe dictionaries keyed by username. User A cannot read or mutate User B's analytical state.
</details>

---

## 10. Conclusion

DataMart exemplifies a modern, production-grade integration of Advanced Database Management Systems principles. By uniting transactional 3NF databases, dimensional snowflake data warehouses, unsupervised machine learning algorithms, and conversational generative AI under an enterprise SaaS interface, the platform provides a complete decision support ecosystem for retail business intelligence.
