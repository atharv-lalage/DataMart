# DataMart — Enterprise E-Commerce Analytics, Data Warehousing & AI Decision Support System

[![Python](https://img.shields.io/badge/Python-3.9%20%7C%203.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-NeonDB%20Serverless-336791.svg?logo=postgresql&logoColor=white)](https://neon.tech/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20Auth-47A248.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Groq AI](https://img.shields.io/badge/Groq%20AI-openai%2Fgpt--oss--20b-F55036.svg)](https://groq.com/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-ML%20Mining-F7931E.svg?logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)

An enterprise-grade **Business Intelligence (BI), Data Warehousing, and AI-Powered Decision Support Platform** demonstrating Advanced Database Management Systems (ADBMS) concepts, multi-tenant cloud architectures, unsupervised machine learning, and generative AI query assistance.

Upload any transactional retail dataset (`.csv` or `.xlsx`), process it through an automated multi-stage ETL pipeline into a Snowflake Schema data warehouse on NeonDB PostgreSQL, execute multi-dimensional analytical queries via an interactive OLAP Terminal, mine customer patterns using machine learning (K-Means RFM clustering, polynomial sales forecasting, adaptive Apriori association rules), and interact with a **Dual-Engine AI Business Analyst (Text-to-SQL + FAISS RAG)** powered by Groq.

---

## 🏛️ System Architecture

```
                                  ┌────────────────────────────────────────┐
                                  │      React 19 + Vite Frontend          │
                                  │   (DataMart Hybrid Design System)      │
                                  └───────────────────┬────────────────────┘
                                                      │ HTTP / REST / Bearer JWT
                                                      ▼
                                  ┌────────────────────────────────────────┐
                                  │         FastAPI Python Backend         │
                                  │    (Async REST Gateway, Port 8001)     │
                                  └───────┬───────────┬────────────┬───────┘
                                          │           │            │
                  ┌───────────────────────┘           │            └───────────────────────┐
                  ▼                                   ▼                                    ▼
    ┌───────────────────────────┐       ┌───────────────────────────┐        ┌───────────────────────────┐
    │       MongoDB Atlas       │       │    NeonDB PostgreSQL      │        │       Groq AI Engine      │
    │   (Multi-Tenant Users)    │       │  (Star / Snowflake DW)    │        │   (openai/gpt-oss-20b)    │
    │───────────────────────────│       │───────────────────────────│        │───────────────────────────│
    │ • users collection        │       │ • ecom_sales_fact (Fact)  │        │ • Text-to-SQL Generator   │
    │ • Unique username & email │       │ • ecom_dim_customer (Dim) │        │ • FAISS Dense Vector RAG  │
    │ • Salted bcrypt hashing   │       │ • ecom_dim_product (Dim)  │        │ • all-MiniLM-L6-v2 Embed  │
    │ • HS256 JWT Token Issuance│       │ • ecom_dim_time / category│        │ • Smart Intent Classifier │
    │ • Role-Based Access (RBAC)│       │ • 3NF OLTP Mirror Tables  │        │ • Read-Only Safe Execution│
    └───────────────────────────┘       └───────────────────────────┘        └───────────────────────────┘
                  │                                   │                                    │
                  └───────────────────────────┬───────┴────────────────────────────────────┘
                                              ▼
                               ┌─────────────────────────────┐
                               │ Multi-Tenant Isolated Files │
                               │  dataset/users/{username}/  │
                               │ • Raw CSV/XLSX Uploads      │
                               │ • Cached Analytics (.pkl)   │
                               │ • User Model Configs (.json)│
                               └─────────────────────────────┘
```

---

## ✨ Core Platform Capabilities

### 1. 🛡️ Multi-Tenant Authentication & Role-Based Access Control (RBAC)
* **MongoDB Atlas User Persistence:** User accounts are stored in MongoDB Atlas with unique indexes on `username` and `email`.
* **Salted Bcrypt Password Security:** Passwords are encrypted with 12-round salted bcrypt hashes prior to storage.
* **Stateless JWT Authorization:** Client sessions authenticate via standard `Authorization: Bearer <token>` headers with 7-day token lifespans.
* **Server-Side RBAC Enforcement:** Endpoints distinguish between `admin` and `user` roles using FastAPI dependencies (`require_admin` and `require_authenticated_user`). Non-admin users attempting to modify system hyperparameters receive HTTP 403 Forbidden.
* **Tenant-Isolated Filesystem:** Datasets, analytical cache files, and in-memory Pandas dataframes are partitioned into `dataset/users/{username}/`, guaranteeing tenant privacy and zero data leakage.

### 2. 🤖 Dual-Engine AI Analyst (Groq LLM)
* **⚡ Text-to-SQL Engine:** Translates natural language questions (*"What are my top 5 products by revenue?"*, *"How much did we sell in November 2011?"*, *"Which customer spent the most?"*) into safe, read-only SQL queries executed live against the PostgreSQL data warehouse. Returns an executive summary, interactive data table, and collapsible syntax-highlighted SQL preview.
* **📚 RAG (Retrieval-Augmented Generation) Engine:** Uses a dense FAISS vector store embedded with `sentence-transformers/all-MiniLM-L6-v2` indexing database schemas, architecture documents, and ADBMS concepts.
* **Dynamic Intent Routing:** Automatically detects whether an inquiry requires live database computation (Text-to-SQL) or architectural explanation (RAG).

### 3. 📊 Business Intelligence & Advanced Machine Learning
* **Executive KPI Cards:** Real-time metrics for Total Revenue, Total Orders, Average Order Value (AOV), and Active Customers with dataset-specific currency formatting.
* **Predictive Sales Forecasting:** Multi-month future revenue forecasting using polynomial trend regressions complete with upper and lower 95% confidence bands.
* **K-Means RFM Customer Segmentation:** Unsupervised machine learning clustering based on Recency, Frequency, and Monetary scores, categorizing customers into actionable segments (Champions, Loyal Customers, At Risk, Hibernating).
* **Adaptive Market Basket Analysis (Apriori):** Features a dynamic support decay ladder (`0.03` down to `0.001`) that automatically adapts to both dense transaction matrices and sparse product catalogs, discovering high-lift product bundles.
* **One-Click CSV Export:** Direct client-side CSV downloads for all analytical tables and reports.

### 4. ⚙️ Automated Multi-Stage ETL Pipeline
* **Smart Schema Normalization:** Automatically recognizes and unifies heterogeneous retail column names (`InvoiceNo` / `Order ID`, `StockCode` / `Product ID`, `Description` / `Product Name`, `Quantity`, `UnitPrice` / `Sales`, `InvoiceDate` / `Order Date`, `Country` / `Region`).
* **Multi-Stage Processing:** Real-time log streamer tracking extraction, type coercion, missing value imputation, outlier handling, and database loading.
* **Dual-Schema Warehouse Ingestion:** Simultaneously loads transactional records into normalized 3NF relational tables (OLTP) and denormalized snowflake dimension/fact tables (OLAP).

### 5. 🔍 Interactive OLAP Analytical Query Terminal
Visual interface dedicated to multi-dimensional database operations:
* **Roll-up:** Aggregates granular daily/monthly transactions into quarterly and yearly summaries.
* **Drill-down:** Decomposes macro-level sales into country-specific, category-specific, and SKU-level metrics.
* **Slice:** Filters the data cube along a single dimension (e.g., specific calendar month or isolated customer country).
* **Dice:** Bounded multi-dimensional intersection (e.g., specific product categories in select countries across designated fiscal periods).

### 6. 🛍️ Modern E-Commerce Storefront (OLTP Simulation)
* **Real-Time Transaction Generator:** Product catalog supporting search, category filtering, cart management, and checkout simulation.
* **Live Cross-Sell Integration:** Automatically surfaces "Frequently Bought Together" bundle recommendations derived from the Apriori association engine.

---

## 🎨 DataMart Hybrid Design System

The frontend is built on the **DataMart Hybrid SaaS Design System**, balancing clarity, information density, and aesthetics:
* **Sidebar Palette:** Dark Navy (`#111827`) with slate indicators (`#374151`) and indigo active states (`#4F46E5`).
* **Workspace Palette:** Clean Light Workspace (`#F8FAFC`) with elevated pure white cards (`#FFFFFF`).
* **Typography:** Pure Inter typography hierarchy (`400`, `500`, `600`, `700`) with consistent tabular numerals.
* **Elevation & Borders:** Crisp `1px solid #E2E8F0` borders with soft ambient drop-shadows.
* **Responsive Breakpoints:** Fully validated across Desktop (1440px), Tablet (768px), and Mobile (390px) viewports with zero horizontal overflow.

---

## 🗺️ Application Routes

| Route | Workspace | Description |
|---|---|---|
| `/` | **Storefront (OLTP)** | Simulated customer-facing retail portal with live ordering and cross-sell recommendations. |
| `/dashboard` | **Executive Dashboard (BI/DSS)** | Core business intelligence hub with KPI metrics, ML sales forecasts, RFM clusters, and AI widget. |
| `/ai-analyst` | **AI Analyst Workspace** | Dedicated split-engine workspace for natural language Text-to-SQL and RAG retrieval. |
| `/etl` | **ETL Pipeline Tracker** | Dataset upload portal, column normalization visualizer, and live execution terminal. |
| `/terminal` | **OLAP Query Terminal** | Multi-dimensional analytical query workspace supporting Slice, Dice, Roll-up, and Drill-down. |
| `/settings` | **System Settings** | Configuration workspace for database inspection, ML hyperparameter tuning, and cache management. |
| `/auth` | **Authentication Gateway** | Enterprise login and registration with bcrypt hashing, JWT validation, and password visibility toggles. |

---

## 🗄️ Database Schemas

### 1. MongoDB Atlas User Schema (`datamart_db.users`)
```json
{
  "_id": "ObjectId('67... ')",
  "username": "atharv",
  "email": "atharv@datamart.io",
  "password_hash": "$2b$12$eX8...salted_bcrypt_hash...",
  "role": "admin",
  "created_at": "2026-10-15T10:45:00.000Z",
  "last_login": "2026-10-16T12:00:00.000Z"
}
```

### 2. PostgreSQL Snowflake Schema (Data Warehouse)
```
                    ┌─────────────────────────┐
                    │      ecom_dim_time      │
                    │─────────────────────────│
                    │ date_id (PK)            │
                    │ date, day, month,       │
                    │ quarter, year, weekday  │
                    └────────────┬────────────┘
                                 │
 ┌──────────────────────┐        │          ┌──────────────────────┐
 │  ecom_dim_customer   │        │          │   ecom_dim_product   │
 │──────────────────────│        │          │──────────────────────│
 │ customer_id (PK)     ├────────┼──────────┤ product_id (PK)      │
 │ customer_code        │        │          │ product_name, price  │
 │ country              │        │          │ category_id (FK) ────┼──┐
 └──────────────────────┘        ▼          └──────────────────────┘  │
                         ┌───────────────┐                            │
                         │ecom_sales_fact│                            ▼
                         │───────────────│                 ┌──────────────────────┐
                         │ fact_id (PK)  │                 │  ecom_dim_category   │
                         │ quantity      │                 │──────────────────────│
                         │ unit_price    │                 │ category_id (PK)     │
                         │ total_amount  │                 │ category_name        │
                         └───────────────┘                 └──────────────────────┘
```

---

## 📁 Repository Structure

```
DataMart/
├── backend/
│   ├── app.py                 # FastAPI application, REST endpoints, RBAC dependencies, session routing
│   ├── auth_db.py             # MongoDB Atlas connection, certifi TLS, bcrypt hashing, JWT generation
│   ├── chatbot.py             # Dual-engine AI Analyst (Groq LLM, FAISS RAG, Text-to-SQL)
│   ├── requirements.txt       # Python dependencies (FastAPI, PyMongo, PyJWT, Bcrypt, Groq, etc.)
│   └── rag_index/             # Pre-computed FAISS vector index and chunk metadata
├── dataset/
│   └── users/                 # Multi-tenant isolated filesystem storage
│       ├── admin/             # Administrator dataset files and analytical caches
│       └── <username>/        # User-specific datasets and session caches
├── database/
│   ├── schema_init.sql        # Database initialization script
│   ├── schema_oltp.sql        # 3NF transactional table definitions (OLTP)
│   ├── schema_dw.sql          # Snowflake schema data warehouse definitions (OLAP)
│   └── olap_queries.sql       # Reference analytical SQL queries
├── etl/
│   └── etl_pipeline.py        # Automated ETL pipeline, smart schema mapper, and batch loader
├── frontend/
│   ├── src/
│   │   ├── pages/             # Dashboard, ETL, Terminal, Settings, Storefront, AIAnalyst, Auth
│   │   ├── components/        # AppLayout, Sidebar, Header, AIChatWidget, MetricCards, Settings
│   │   ├── utils/             # Formatters, currency detection, export utilities
│   │   ├── App.jsx            # App shell, JWT state management, route declarations
│   │   └── index.css          # DataMart Hybrid Design System tokens and component styles
│   ├── package.json           # Frontend dependencies (React 19, Lucide, Recharts, Framer Motion)
│   └── vite.config.js         # Vite build configuration
├── mining/
│   ├── market_basket.py       # Adaptive Apriori algorithm with dynamic support decay
│   ├── prediction.py          # Polynomial sales trend regression with 95% confidence bands
│   └── segmentation.py        # K-Means RFM customer segmentation engine
├── .env                       # Environment variables (Database credentials, Groq API key, JWT secret)
├── .env.local                 # Local admin overrides and CORS origins
├── TECHNICAL_CONCEPTS.md      # Comprehensive ADBMS viva preparation guide
├── TECHNICAL_SUMMARY.md       # Technical summary & implementation specification
└── README.md                  # Project overview and reference (this file)
```

---

## 🚀 Setup & Installation

### Prerequisites
* **Python 3.9+ or 3.11+**
* **Node.js 18+ & npm**
* **PostgreSQL Database** (e.g., Serverless instance on [Neon.tech](https://neon.tech))
* **MongoDB Atlas Cluster** (Free tier on [MongoDB Atlas](https://www.mongodb.com/atlas))
* **Groq API Key** (Free tier on [Groq Console](https://console.groq.com))

---

### 1. Environment Configuration

Create a `.env` file in the project root:

```env
# PostgreSQL Star / Snowflake Schema Warehouse (NeonDB)
DATABASE_URL=postgresql://user:password@ep-sample-pool.region.aws.neon.tech/neondb?sslmode=require

# Groq High-Speed LLM Inference Key
GROQ_API_KEY=gsk_your_groq_api_key_here

# MongoDB Atlas Multi-Tenant User Authentication
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.kmp4stt.mongodb.net/datamart_db?retryWrites=true&w=majority

# JWT Authentication Secret Key
JWT_SECRET=your-secure-jwt-secret-key-2026

# Backend Server Port
PORT=8001
```

Create a `.env.local` file for local development overrides:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
CORS_ORIGINS=http://localhost:5173
PORT=8001
```

> [!TIP]
> **MongoDB Atlas Network Access:** Ensure your machine's current public IP address is whitelisted in your MongoDB Atlas Dashboard under **Security** > **Network Access** (or add `0.0.0.0/0` for local development).

---

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
python3 -m pip install -r requirements.txt

# Start the FastAPI server
python3 app.py
```

The backend starts on **`http://localhost:8001`**. On startup, the server:
1. Connects to MongoDB Atlas, verifies indexes, and initializes auth services.
2. Verifies connectivity to NeonDB PostgreSQL and checks database schemas.
3. Loads the FAISS vector index and embedding models for RAG queries.

---

### 3. Frontend Setup

In a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The frontend will be live on **`http://localhost:5173`**.

---

## 🔌 API Reference

| Endpoint | Method | Authorization | Description |
|---|---|---|---|
| `/api/auth/register` | `POST` | Public | Register new user in MongoDB Atlas with bcrypt password hashing |
| `/api/auth/login` | `POST` | Public | Authenticate user credentials and return signed 7-day JWT token |
| `/api/auth/me` | `GET` | Authenticated | Retrieve profile and assigned role (`admin` / `user`) for current user |
| `/api/dataset/info` | `GET` | Authenticated | Get active dataset filename, row count, and normalized schema |
| `/api/dataset/upload` | `POST` | Admin | Upload a `.csv` or `.xlsx` file into user's isolated directory |
| `/api/dataset/drop` | `POST` | Admin | Reset and delete the user's uploaded dataset and analytical cache |
| `/api/etl/run` | `POST` | Admin | Execute multi-stage ETL pipeline and load data warehouse |
| `/api/analytics/sales` | `GET` | Authenticated | Retrieve monthly sales aggregations and forecast projections |
| `/api/predictions` | `GET` | Authenticated | Fetch polynomial sales forecasts with 95% confidence intervals |
| `/api/clusters` | `GET` | Authenticated | Fetch K-Means RFM customer segments and cluster centroids |
| `/api/top-products` | `GET` | Authenticated | Retrieve top 10 products by revenue |
| `/api/sales-by-country` | `GET` | Authenticated | Retrieve regional revenue distribution |
| `/api/settings/analytics` | `GET` | Admin Only | Retrieve analytical hyperparameters (min support, k-clusters, window) |
| `/api/settings/analytics` | `PUT` | Admin Only | Update analytical hyperparameters (enforces 403 for non-admins) |
| `/api/ai/chat` | `POST` | Authenticated | Submit natural language query to Groq Text-to-SQL engine |
| `/api/rag/chat` | `POST` | Authenticated | Submit conceptual query to Groq FAISS RAG assistant |
| `/api/olap/query` | `POST` | Authenticated | Execute multi-dimensional OLAP query (Roll-up, Drill-down, Slice, Dice) |

---

## 📜 Capstone Attribution & License

Developed as an **Advanced Database Management Systems (ADBMS) Capstone Project**. Demonstrates production-ready implementation of 3NF relational modeling, Snowflake data warehouse design, automated multi-stage ETL pipelines, unsupervised data mining, multi-tenant cloud storage, and generative AI decision support.
