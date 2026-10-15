# E-Commerce Data Analytics Platform (DataMart)

![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-REST_API-009688.svg?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-NeonDB-336791.svg?logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_Auth-47A248.svg?logo=mongodb&logoColor=white)
![Groq AI](https://img.shields.io/badge/Groq-LLM_RAG_&_SQL-F55036.svg)
![LangChain](https://img.shields.io/badge/LangChain-FAISS_Vector_Search-1C3C3C.svg)
![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-ML_Mining-F7931E.svg?logo=scikit-learn&logoColor=white)

An industry-grade **Business Intelligence, Data Warehousing, and AI-Powered Decision Support System** demonstrating Advanced Database Management Systems (ADBMS) concepts, multi-tenant cloud storage, and modern machine learning analytics.

Upload any retail sales dataset (`.csv` or `.xlsx`), process it through an automated multi-stage ETL pipeline into a Snowflake Schema data warehouse, run machine learning models (K-Means RFM segmentation, predictive sales forecasting, adaptive Apriori market basket analysis), and interact with a **Dual-Engine AI Business Analyst (RAG + Text-to-SQL)** powered by Groq.

---

## 🏛️ System Architecture

```
                                  ┌───────────────────────────────┐
                                  │   React 18 + Vite Frontend   │
                                  │ (Glassmorphism, Recharts, UI) │
                                  └──────────────┬────────────────┘
                                                 │ HTTP / REST / JWT
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │     FastAPI Python Backend    │
                                  │   (Async REST API, Port 8001) │
                                  └──────┬───────┬─────────┬──────┘
                                         │       │         │
                 ┌───────────────────────┘       │         └───────────────────────┐
                 ▼                               ▼                                 ▼
   ┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
   │     MongoDB Atlas         │   │   NeonDB PostgreSQL       │   │    Groq AI Engine         │
   │  (Multi-Tenant Users)     │   │  (Snowflake Schema DW)    │   │  (openai/gpt-oss-20b)     │
   │───────────────────────────│   │───────────────────────────│   │───────────────────────────│
   │ • users collection        │   │ • ecom_sales_fact         │   │ • Text-to-SQL Generator   │
   │ • unique username & email │   │ • ecom_dim_customer       │   │ • FAISS Dense Vector RAG  │
   │ • bcrypt 12-round hash    │   │ • ecom_dim_product        │   │ • sentence-transformers   │
   │ • JWT Bearer validation   │   │ • ecom_dim_time / category│   │ • Intent Classifier       │
   └───────────────────────────┘   └───────────────────────────┘   └───────────────────────────┘
                 │                               │                                 │
                 └───────────────────────┬───────┴─────────────────────────────────┘
                                         ▼
                          ┌─────────────────────────────┐
                          │ Multi-Tenant Isolated Files │
                          │ dataset/users/{username}/   │
                          │ • Raw CSV/XLSX Datasets     │
                          │ • Cached Analytics (.pkl)   │
                          │ • User Model Hyperparameters│
                          └─────────────────────────────┘
```

---

## ✨ Core Highlights & Key Features

### 🛡️ 1. Multi-Tenant User Authentication & Isolated Datasets
- **MongoDB Atlas User Management**: User profiles are stored securely in a dedicated MongoDB Atlas cluster (`datamart_db.users`) with enforced unique indexes on `email` and `username`.
- **Bcrypt Security**: Passwords are one-way hashed using salted **bcrypt** (12 rounds) before persistence.
- **Stateless JWT Sessions**: Authenticated users receive signed 7-day JSON Web Tokens (`Authorization: Bearer <token>`) stored client-side in `localStorage` with automatic session recovery and 1-click Sign Out.
- **Strict Tenant Isolation**: Datasets, analytical cache files, and in-memory Pandas dataframes are fully isolated per tenant in `dataset/users/{username}/`. A user named `atharv` uploading `Sample_-_Superstore.csv` will never see or merge with `admin`'s `Online_Retail.xlsx`.
- **First-Time User Onboarding**: New users without an uploaded dataset are greeted with a friendly Dashboard onboarding banner guiding them to upload their data via the ETL pipeline.

### 🤖 2. Dual-Engine AI Assistant (Groq `openai/gpt-oss-20b`)
Accessible from the interactive floating AI widget on the Business Dashboard:
- **⚡ Text-to-SQL Engine**: Translates natural language questions (*"What are my top 5 products by revenue?"*, *"How much did we sell in November 2011?"*, *"Which customer spent the most?"*) into safe, read-only PostgreSQL queries executed directly against the NeonDB star schema. Returns:
  1. An executive conversational summary.
  2. A collapsible, syntax-highlighted SQL preview.
  3. An interactive data table showing live query results.
- **📚 RAG (Retrieval-Augmented Generation)**: Uses a local **FAISS vector store** and `sentence-transformers/all-MiniLM-L6-v2` embeddings indexing system architecture, database design, and ADBMS concepts. Ideal for technical interviews, vivas, and architectural questions (*"What is OLAP and how does it differ from OLTP?"*, *"Explain 3NF vs Snowflake schema"*).
- **Smart Intent Classifier**: Automatically determines whether a prompt requires live database calculation (Text-to-SQL) or conceptual explanation (RAG).

### 📊 3. Business Intelligence & Advanced Machine Learning
- **Executive KPI Cards**: Real-time Total Revenue, Order Volume, and Average Order Value (AOV).
- **Sales Forecasting**: Multi-month future sales projections utilizing polynomial trend models with upper and lower 95% confidence intervals.
- **Customer Segmentation (K-Means)**: Automated RFM (Recency, Frequency, Monetary) clustering into High-Value, Mid-Value, and Low-Value segments with interactive scatter and distribution plots.
- **Adaptive Market Basket Analysis (Apriori)**:
  - Features an intelligent dynamic support decay ladder (`0.03` down to `0.001`).
  - Automatically adapts to dense retail transaction matrices (`Online Retail`) and sparse product catalogs (`Sample Superstore`), consistently surfacing association rules with lift scores up to **33x+**.
- **Geographic & Catalog Breakdown**: Top 10 product revenue leaderboard and top 12 countries/regions bar charts.
- **One-Click CSV Export**: Download raw and processed analytical data directly from any chart card.

### 🔧 4. Automated Multi-Stage ETL Pipeline
- **Smart Schema Normalizer**: Automatically detects and standardizes arbitrary column names across varying retail datasets (`InvoiceNo`/`Order ID`, `StockCode`/`Product ID`, `Description`/`Product Name`, `Quantity`, `UnitPrice`/`Sales`, `InvoiceDate`/`Order Date`, `Country`/`Region`).
- **Live Execution Log Streamer**: Real-time terminal output tracking validation, data imputation, deduplication, and warehouse loading.
- **Dual-Schema Database Loading**: Simultaneously populates 3NF relational tables (OLTP) and denormalized dimension/fact tables (OLAP Snowflake schema).

### 🔍 5. Interactive OLAP Terminal
Visual query interface dedicated to demonstrating multi-dimensional database operations:
- **[Roll-up]**: Summarizes sales from daily/monthly granularity to quarterly and yearly totals.
- **[Drill-down]**: Decomposes aggregate revenue by specific country and individual product.
- **[Slice]**: Filters on a single dimension (e.g., all transactions in November).
- **[Dice]**: Bounded multi-dimensional filtering (e.g., specific product categories in selected countries across specific years).

---

## 🗂️ Application Pages & Navigation

| Route | Page | Purpose |
|---|---|---|
| `/` | **Simulated Store (OLTP)** | Interactive product storefront generating live transactional orders and displaying Apriori-recommended cross-sell bundles. |
| `/dashboard` | **Business Dashboard (BI/DSS)** | Executive analytical hub with KPI cards, ML forecasting, RFM clusters, top products, country breakdown, and the AI Analyst widget. |
| `/etl` | **ETL Pipeline Logs** | Drag-and-drop dataset uploader, column normalization engine, and real-time execution log terminal. |
| `/terminal` | **OLAP Query Interface** | SQL-driven multi-dimensional query terminal supporting Slice, Dice, Roll-up, and Drill-down queries. |
| `/settings` | **Platform Settings** | Hyperparameter tuner for Apriori minimum support, K-Means cluster count, projection window, and cache invalidation. |

---

## 🗄️ Database Schemas

### 1. MongoDB Atlas User Schema (`datamart_db.users`)
```json
{
  "_id": "ObjectId('...')",
  "username": "atharv",
  "email": "lalageatharv99@gmail.com",
  "password_hash": "$2b$12$eX8...salted_bcrypt_hash...",
  "created_at": "2026-10-15T10:45:00.000Z",
  "last_login": "2026-10-15T18:05:00.000Z"
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
│   ├── app.py                 # FastAPI server, REST API endpoints, multi-tenant session router
│   ├── auth_db.py             # MongoDB Atlas connection, bcrypt hashing, JWT issuance & verification
│   ├── chatbot.py             # Dual-engine AI Analyst (Groq LLM, FAISS RAG, Text-to-SQL)
│   ├── requirements.txt       # Python dependencies (FastAPI, PyMongo, Bcrypt, PyJWT, Groq, etc.)
│   └── rag_index/             # Pre-built FAISS vector store and document chunks
├── dataset/
│   └── users/                 # Multi-tenant isolated storage root
│       ├── admin/             # Admin's raw files, cached_data.pkl, analytics_config.json
│       └── <username>/        # User-specific datasets and isolated analytics cache
├── database/
│   ├── schema_init.sql        # Database initialization script
│   ├── schema_oltp.sql        # 3NF transactional table definitions
│   ├── schema_dw.sql          # Snowflake schema data warehouse definitions
│   └── olap_queries.sql       # Reference OLAP queries (Roll-up, Drill-down, Slice, Dice)
├── etl/
│   └── etl_pipeline.py        # Automated ETL pipeline, column normalization & batch loader
├── frontend/
│   ├── src/
│   │   ├── pages/             # Dashboard, ETL, Terminal, Settings, Storefront, Auth
│   │   ├── components/        # Sidebar, Header, AIChatWidget, Charts, MetricCards
│   │   ├── App.jsx            # Routing, authentication state provider
│   │   └── index.css          # Vanilla CSS design system (glassmorphism tokens)
│   ├── package.json           # Frontend dependencies (React, Lucide, Recharts, Framer Motion)
│   └── vite.config.js         # Vite bundler configuration
├── mining/
│   ├── market_basket.py       # Adaptive Apriori algorithm & association rule generator
│   ├── prediction.py          # Time-series sales trend forecasting with confidence intervals
│   └── segmentation.py        # K-Means RFM customer segmentation engine
├── .env                       # Environment variables (DB credentials, Groq key, JWT secret)
├── .env.local                 # Local admin overrides
├── TECHNICAL_CONCEPTS.md      # In-depth ADBMS & architectural viva preparation guide
└── README.md                  # Project documentation (this file)
```

---

## 🚀 Setup & Installation

### Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**
- **PostgreSQL Database** (e.g., Serverless instance on [Neon.tech](https://neon.tech))
- **MongoDB Atlas Cluster** (Free M0 tier on [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Groq API Key** (Free tier on [Groq Console](https://console.groq.com))

---

### 1. Environment Configuration

Create a `.env` file in the project root:

```env
# PostgreSQL Star Schema Data Warehouse (NeonDB)
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

Create `.env.local` for local administrative overrides:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
CORS_ORIGINS=http://localhost:5173
PORT=8001
```

---

### 2. Backend Setup & Startup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
python3 -m pip install -r requirements.txt

# Start the FastAPI server
python3 app.py
```

The FastAPI backend will start on **`http://localhost:8001`**. On launch, the server:
1. Connects to MongoDB Atlas and initializes unique indexes for `username` and `email`.
2. Connects to NeonDB PostgreSQL and verifies table schemas.
3. Initializes the FAISS vector index and embedding models for RAG.

---

### 3. Frontend Setup & Startup

Open a second terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The frontend will be live on **`http://localhost:5173`**.

---

## 🔑 User Guide & Workflows

### 1. Authentication
- Navigate to `http://localhost:5173`.
- Click **Create Account** to register a new tenant account (Username, Email, Password).
- Passwords are encrypted with bcrypt and credentials are saved in MongoDB Atlas.
- Sign in to automatically receive a 7-day JWT token.

### 2. Uploading a Dataset (ETL)
- Navigate to **ETL Pipeline Logs** (`/etl`).
- Drag and drop your dataset (`.csv` or `.xlsx`). Example compatible formats:
  - `Online_Retail.xlsx` (UCI Machine Learning Repository)
  - `Sample_-_Superstore.csv` (Kaggle / Tableau)
  - Any transactional retail CSV with date, product, quantity, and price columns.
- Click **Run Full ETL Pipeline**.
- The pipeline normalizes columns, cleans missing values, computes analytical metrics, and populates both 3NF and Snowflake database tables.

### 3. Exploring the Business Dashboard
- Head to **Business Dashboard** (`/dashboard`).
- View total sales, order counts, and AOV metrics.
- Inspect the **Sales Trend & ML Forecast** line chart.
- Analyze **Customer Segments (RFM)** via K-Means clusters.
- Review **Products Usually Bought Together** (Market Basket rules mined with adaptive Apriori).
- Check **Geographic Revenue** and **Top Products Leaderboard**.

### 4. Conversational AI Analyst
- Open the AI Analyst widget at the bottom right of the Dashboard.
- **Ask Natural Language SQL Questions**:
  - *"Show me my top 5 products by revenue"*
  - *"What was the total sales amount in November 2011?"*
  - *"Which country has the highest average order value?"*
- **Ask Conceptual / System Architecture Questions**:
  - *"Explain the difference between Snowflake schema and Star schema"*
  - *"What are the advantages of 3NF for OLTP?"*
  - *"How does Apriori market basket analysis compute lift and confidence?"*

---

## 🔌 API Reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/register` | `POST` | Public | Register a new user in MongoDB Atlas with bcrypt hashing |
| `/api/auth/login` | `POST` | Public | Authenticate user credentials and return signed 7-day JWT |
| `/api/auth/me` | `GET` | Bearer | Retrieve active user profile information |
| `/api/dataset/info` | `GET` | Bearer | Get active dataset filename, row count, and column schema |
| `/api/dataset/upload` | `POST` | Bearer | Upload a `.csv` or `.xlsx` file into the user's isolated directory |
| `/api/dataset/drop` | `DELETE` | Bearer | Reset and delete the user's uploaded dataset and analytical cache |
| `/api/etl/run` | `POST` | Bearer | Trigger the multi-stage ETL pipeline and warehouse load |
| `/api/analytics/sales` | `GET` | Bearer | Retrieve monthly sales aggregations and forecast projections |
| `/api/predictions` | `GET` | Bearer | Fetch ML polynomial sales forecasts with confidence bands |
| `/api/clusters` | `GET` | Bearer | Fetch K-Means RFM customer segments and centroids |
| `/api/top-products` | `GET` | Bearer | Retrieve the top 10 products by total revenue |
| `/api/sales-by-country` | `GET` | Bearer | Retrieve regional revenue distribution |
| `/api/chat` | `POST` | Bearer | Submit natural language query to Groq Dual-Engine (RAG or SQL) |
| `/api/olap/query` | `POST` | Bearer | Execute an OLAP multi-dimensional query (Roll-up, Drill-down, etc.) |

---

## ❓ Frequently Asked Questions & Troubleshooting

<details>
<summary><b>Why was the "Products Usually Bought Together" table empty for my CSV?</b></summary>

Retail datasets have drastically different transaction densities:
- Datasets like `Online Retail` have large baskets (10–50 items per invoice), producing frequent product pairs at high support levels (`0.02` to `0.05`).
- Datasets like `Sample Superstore` have sparse orders (average 2 items per order across 1,800+ distinct items), meaning pairs appear with support between `0.002` and `0.008`.

DataMart solves this with an **Adaptive Support Ladder** that automatically decrements from `0.03` down to `0.001` until strong association rules are discovered, ensuring high-lift cross-sell recommendations on both dense and sparse catalogs.
</details>

<details>
<summary><b>How does DataMart ensure users cannot see each other's data?</b></summary>

Every request carries a JWT token in the `Authorization: Bearer <token>` header. The backend decodes the token, extracts the authenticated `username`, and isolates all disk operations to `dataset/users/{username}/`. In addition, in-memory analytical cache objects and dataframes are partitioned by username (`user_dfs[username]`), ensuring total separation.
</details>

<details>
<summary><b>Which Groq model is being used?</b></summary>

The platform utilizes Groq's ultra-low latency **`openai/gpt-oss-20b`** model for both Text-to-SQL generation and RAG synthesis, providing sub-second inference speed without hitting rate limits.
</details>

---

## 📜 Capstone Attribution & License

Developed as an **Advanced Database Management Systems (ADBMS) Capstone Project**. Demonstrates production-ready implementation of relational normalization (3NF), multi-dimensional star and snowflake schemas, full-lifecycle automated ETL, unsupervised data mining, multi-tenant cloud storage, and generative AI decision support.
