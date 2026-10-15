from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Query, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import pandas as pd
import sys
import os
import shutil
import uuid
import traceback
import secrets
import json
import re
from dotenv import load_dotenv

# Pre-import heavy database libraries at startup
import sqlite3
import sqlalchemy
from sqlalchemy import text as _sa_text
try:
    from sqlalchemy.dialects import postgresql as _pg_dialect
except Exception:
    pass
try:
    import psycopg2
except ImportError:
    pass

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'), override=True)

try:
    from groq import Groq
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
except Exception as e:
    groq_client = None
    print(f"Groq API not loaded: {e}")

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from etl.etl_pipeline import load_and_clean_data, get_engine, initialize_database, clear_loaded_data, populate_oltp, populate_dw
from mining.segmentation import generate_segmentation
from mining.prediction import generate_prediction
from mining.market_basket import generate_market_basket
try:
    from chatbot import chat as chatbot_chat, warmup as chatbot_warmup
    _chatbot_available = True
except ImportError as _cb_err:
    _chatbot_available = False
    print(f"Chatbot module unavailable: {_cb_err}")

try:
    from auth_db import (
        register_user, login_user, decode_access_token, get_user_profile, get_users_collection
    )
    _auth_db_available = True
except Exception as _auth_err:
    _auth_db_available = False
    print(f"Auth DB module unavailable: {_auth_err}")

app = FastAPI(
    title="DataMart Analytics API",
    description="High-performance FastAPI backend for E-Commerce BI, ETL, and ML Analytics",
    version="2.0.0"
)

@app.on_event("startup")
def _startup():
    if _chatbot_available:
        import threading
        threading.Thread(target=chatbot_warmup, daemon=True).start()

# Enable CORS for frontend integration
cors_origins = [origin.strip() for origin in os.environ.get(
    'CORS_ORIGINS', 'http://localhost:5173'
).split(',') if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Multi-tenant state: user-isolated datasets and analytics caches
user_dfs: Dict[str, pd.DataFrame] = {}
user_cached_analytics: Dict[str, Dict[str, Any]] = {}
BASE_DATASET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dataset'))

# Backward compatibility shims
df = None
cached_analytics = {}

# ETL job state store: job_id -> { status, logs, error, user }
etl_jobs = {}


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    identifier: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    password: str


def require_admin(authorization: Optional[str] = Header(None)):
    """
    Protects endpoints using either:
      1. JWT Bearer token (from MongoDB users auth)
      2. Basic Auth (legacy admin credentials)
    """
    if not authorization:
        raise HTTPException(status_code=401, detail='Authentication required', headers={'WWW-Authenticate': 'Bearer'})

    # 1. Check Bearer token (JWT)
    if authorization.startswith('Bearer '):
        token = authorization[7:].strip()
        payload = decode_access_token(token) if _auth_db_available else None
        if not payload:
            raise HTTPException(status_code=401, detail='Invalid or expired authentication token', headers={'WWW-Authenticate': 'Bearer'})
        return payload

    # 2. Check Basic Auth (legacy admin fallback)
    if authorization.startswith('Basic '):
        username = os.environ.get('ADMIN_USERNAME')
        password = os.environ.get('ADMIN_PASSWORD')
        if not username or not password:
            raise HTTPException(status_code=503, detail='Admin credentials are not configured')
        import base64
        try:
            decoded = base64.b64decode(authorization[6:]).decode('utf-8')
            supplied_username, supplied_password = decoded.split(':', 1)
        except Exception:
            raise HTTPException(status_code=401, detail='Invalid authentication header', headers={'WWW-Authenticate': 'Basic'})
        if not (secrets.compare_digest(supplied_username, username) and secrets.compare_digest(supplied_password, password)):
            raise HTTPException(status_code=401, detail='Invalid admin credentials', headers={'WWW-Authenticate': 'Basic'})
        return {'username': username, 'role': 'admin'}

    raise HTTPException(status_code=401, detail='Unsupported authentication scheme', headers={'WWW-Authenticate': 'Bearer'})


def get_authenticated_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Extracts authenticated user from Bearer JWT or Basic Auth, defaulting to 'anonymous' if unauthenticated."""
    if not authorization:
        return {"username": "anonymous", "role": "guest"}
    if authorization.startswith('Bearer '):
        token = authorization[7:].strip()
        payload = decode_access_token(token) if _auth_db_available else None
        if payload and payload.get('username'):
            return payload
    if authorization.startswith('Basic '):
        import base64
        try:
            decoded = base64.b64decode(authorization[6:]).decode('utf-8')
            user, _ = decoded.split(':', 1)
            return {"username": user or "admin", "role": "admin"}
        except Exception:
            pass
    return {"username": "anonymous", "role": "guest"}


@app.post('/api/auth/register')
def api_register(req: RegisterRequest):
    """Register a new user in MongoDB Atlas."""
    if not _auth_db_available:
        raise HTTPException(status_code=503, detail='Authentication database not available')
    try:
        result = register_user(req.username, req.email, req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Registration failed: {str(e)}')


@app.post('/api/auth/login')
def api_login(req: LoginRequest):
    """Authenticate existing user against MongoDB Atlas credentials."""
    target = req.identifier or req.username or req.email
    if not target or not req.password:
        raise HTTPException(status_code=400, detail='Username/email and password are required')
    if not _auth_db_available:
        raise HTTPException(status_code=503, detail='Authentication database not available')
    try:
        result = login_user(target, req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Login failed: {str(e)}')


@app.get('/api/auth/me')
def api_me(user: Dict[str, Any] = Depends(require_admin)):
    """Fetch current user profile from token payload."""
    sub = user.get('sub')
    if sub and _auth_db_available:
        profile = get_user_profile(sub)
        if profile:
            return profile
    return user


@app.get('/api/auth/login')
def verify_login(_: Dict[str, Any] = Depends(require_admin)):
    """Legacy endpoint to verify credentials before granting UI access."""
    return {'authenticated': True}

def get_user_dataset_dir(username: str) -> str:
    """Returns isolated dataset folder for the user (e.g. dataset/users/atharv)."""
    safe_user = re.sub(r'[^a-zA-Z0-9_\-]', '_', username or 'anonymous')
    user_dir = os.path.join(BASE_DATASET_DIR, 'users', safe_user)
    os.makedirs(user_dir, exist_ok=True)
    return user_dir


def get_most_recent_dataset(username: str = 'admin') -> Optional[str]:
    """Finds the latest dataset file uploaded by this specific user."""
    user_dir = get_user_dataset_dir(username)
    valid_files = []
    if os.path.exists(user_dir):
        for f in os.listdir(user_dir):
            if (f.endswith(('.csv', '.xls')) or (f.endswith('.xlsx') and not f.startswith('~$'))) and not f.endswith('cached_data.pkl'):
                valid_files.append(os.path.join(user_dir, f))
    if not valid_files:
        return None
    valid_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
    return valid_files[0]


def get_data(username: str = 'admin') -> pd.DataFrame:
    """Retrieves or loads the pandas dataframe strictly for the given user."""
    global user_dfs
    if username in user_dfs and user_dfs[username] is not None and not user_dfs[username].empty:
        return user_dfs[username]

    user_dir = get_user_dataset_dir(username)
    cache_file = os.path.join(user_dir, 'cached_data.pkl')
    if os.path.exists(cache_file):
        try:
            df_u = pd.read_pickle(cache_file)
            user_dfs[username] = df_u
            return df_u
        except Exception as e:
            print(f"Error loading cache for user '{username}': {e}")

    file_path = get_most_recent_dataset(username)
    if not file_path:
        return pd.DataFrame()

    try:
        df_u = load_and_clean_data(file_path)
        df_u.to_pickle(cache_file)
        user_dfs[username] = df_u
        return df_u
    except Exception as e:
        print(f"Error loading data for user '{username}': {e}")
        return pd.DataFrame()


# ── Pydantic Request Models ───────────────────────────────────────────────────

class AIChatRequest(BaseModel):
    message: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, Any]]] = []

class OLAPQueryRequest(BaseModel):
    query_key: str
    filters: Optional[Dict[str, Any]] = {}

class TransactionRequest(BaseModel):
    product_id: str
    product_name: Optional[str] = "Unknown"
    quantity: Optional[int] = 1
    amount: Optional[float] = 0.0


class AnalyticsConfig(BaseModel):
    min_support: float = Field(default=0.03, ge=0.01, le=0.2)
    projection_window: int = Field(default=3, ge=1, le=12)
    k_clusters: int = Field(default=3, ge=2, le=6)


analytics_config_path = os.path.join(os.path.dirname(__file__), '..', 'dataset', 'analytics_config.json')


def load_analytics_config():
    try:
        with open(analytics_config_path, encoding='utf-8') as config_file:
            return AnalyticsConfig(**json.load(config_file))
    except (FileNotFoundError, json.JSONDecodeError, ValueError):
        return AnalyticsConfig()


def save_analytics_config(config: AnalyticsConfig):
    os.makedirs(os.path.dirname(analytics_config_path), exist_ok=True)
    with open(analytics_config_path, 'w', encoding='utf-8') as config_file:
        json.dump(config.model_dump(), config_file)


analytics_config = load_analytics_config()


# ── Analytics Endpoints ───────────────────────────────────────────────────────

# ── Analytics Endpoints (Multi-Tenant User Isolated) ──────────────────────────

@app.get('/api/products')
def get_products(user: Dict[str, Any] = Depends(get_authenticated_user)):
    username = user.get('username', 'anonymous')
    user_cache = user_cached_analytics.setdefault(username, {})
    if 'products' in user_cache:
        return user_cache['products']

    data = get_data(username)
    if data.empty:
        return []

    products = data[['StockCode', 'Description', 'Category', 'UnitPrice']].drop_duplicates(subset=['StockCode']).head(50)
    products.columns = ['id', 'name', 'category', 'price']
    result = products.to_dict(orient='records')
    user_cache['products'] = result
    return result


@app.get('/api/analytics/sales')
def get_sales(user: Dict[str, Any] = Depends(get_authenticated_user)):
    username = user.get('username', 'anonymous')
    user_cache = user_cached_analytics.setdefault(username, {})
    if 'sales' in user_cache:
        return user_cache['sales']

    data = get_data(username)
    if data.empty:
        return {'total_sales': 0, 'total_orders': 0, 'average_order_value': 0}

    total_sales = float(data['Amount'].sum())
    total_orders = int(data['InvoiceNo'].nunique())
    result = {
        'total_sales': round(total_sales, 2),
        'total_orders': total_orders,
        'average_order_value': round(total_sales / total_orders, 2) if total_orders > 0 else 0
    }
    user_cache['sales'] = result
    return result


@app.get('/api/analytics/clusters')
def get_clusters(user: Dict[str, Any] = Depends(get_authenticated_user)):
    username = user.get('username', 'anonymous')
    user_cache = user_cached_analytics.setdefault(username, {})
    if 'clusters' in user_cache:
        return user_cache['clusters']

    data = get_data(username)
    if data.empty:
        return []

    clusters = generate_segmentation(data, analytics_config.k_clusters)
    user_cache['clusters'] = clusters
    return clusters


@app.get('/api/analytics/predictions')
def get_predictions(user: Dict[str, Any] = Depends(get_authenticated_user)):
    username = user.get('username', 'anonymous')
    user_cache = user_cached_analytics.setdefault(username, {})
    if 'predictions' in user_cache:
        return user_cache['predictions']

    data = get_data(username)
    if data.empty:
        return []

    predictions = generate_prediction(data, analytics_config.projection_window)
    user_cache['predictions'] = predictions
    return predictions


@app.get('/api/analytics/market-basket')
def get_market_basket(user: Dict[str, Any] = Depends(get_authenticated_user)):
    username = user.get('username', 'anonymous')
    user_cache = user_cached_analytics.setdefault(username, {})
    if 'market_basket' in user_cache:
        return user_cache['market_basket']

    data = get_data(username)
    if data.empty:
        return []

    if 'InvoiceDate' in data.columns and not data['InvoiceDate'].empty:
        p99 = data['InvoiceDate'].quantile(0.99)
        clean_data = data[data['InvoiceDate'] <= (p99 + pd.Timedelta(days=365))]
    else:
        clean_data = data

    rules = generate_market_basket(clean_data, analytics_config.min_support)
    user_cache['market_basket'] = rules
    return rules


@app.get('/api/settings/analytics')
def get_analytics_config(_: Dict[str, Any] = Depends(require_admin)):
    return analytics_config.model_dump()


@app.put('/api/settings/analytics')
def update_analytics_config(config: AnalyticsConfig, user: Dict[str, Any] = Depends(require_admin)):
    global analytics_config
    analytics_config = config
    save_analytics_config(analytics_config)
    username = user.get('username', 'anonymous')
    user_cache = user_cached_analytics.setdefault(username, {})
    for key in ('clusters', 'predictions', 'market_basket'):
        user_cache.pop(key, None)
    return analytics_config.model_dump()


@app.get('/api/analytics/top-products')
def get_top_products(start: Optional[str] = Query(None), end: Optional[str] = Query(None), user: Dict[str, Any] = Depends(get_authenticated_user)):
    username = user.get('username', 'anonymous')
    data = get_data(username)
    if data.empty:
        return []
    filtered = data.copy()
    if start:
        filtered = filtered[filtered['InvoiceDate'] >= pd.to_datetime(start)]
    if end:
        filtered = filtered[filtered['InvoiceDate'] <= pd.to_datetime(end)]
    top = (
        filtered.groupby('Description')['Amount']
        .sum()
        .reset_index()
        .sort_values('Amount', ascending=False)
        .head(10)
    )
    top.columns = ['product', 'revenue']
    top['revenue'] = top['revenue'].round(2)
    return top.to_dict(orient='records')


@app.get('/api/analytics/sales-by-country')
def get_sales_by_country(start: Optional[str] = Query(None), end: Optional[str] = Query(None), user: Dict[str, Any] = Depends(get_authenticated_user)):
    username = user.get('username', 'anonymous')
    data = get_data(username)
    if data.empty:
        return []
    filtered = data.copy()
    if start:
        filtered = filtered[filtered['InvoiceDate'] >= pd.to_datetime(start)]
    if end:
        filtered = filtered[filtered['InvoiceDate'] <= pd.to_datetime(end)]
    by_country = (
        filtered.groupby('Country')['Amount']
        .sum()
        .reset_index()
        .sort_values('Amount', ascending=False)
        .head(12)
    )
    by_country.columns = ['country', 'revenue']
    by_country['revenue'] = by_country['revenue'].round(2)
    return by_country.to_dict(orient='records')


# ── Legacy simple ai-chat (kept for backward compat) ─────────────────────────
@app.post('/api/analytics/ai-chat')
def ai_chat(req: AIChatRequest, _: None = Depends(require_admin)):
    """Thin shim — delegates to the full RAG+SQL chatbot when available."""
    if not groq_client:
        raise HTTPException(status_code=503, detail='Groq not configured. Set GROQ_API_KEY in .env')
    if _chatbot_available:
        try:
            result = chatbot_chat(req.message, [], groq_client)
            return {'response': result['answer']}
        except Exception as e:
            print(f"Chatbot error: {e}")
    # Fallback: plain context injection
    try:
        sales = cached_analytics.get('sales', {})
        data  = get_data()
        ctx   = ''
        if not data.empty:
            top  = data.groupby('Description')['Amount'].sum().sort_values(ascending=False).head(5)
            ctx += f"Top 5 products by revenue: {top.to_dict()}. "
        if sales:
            ctx += (f"Total Sales: {sales.get('total_sales',0):,}, "
                    f"Total Orders: {sales.get('total_orders',0):,}, "
                    f"Avg Order Value: {sales.get('average_order_value',0):,}.")
        prompt = (f"You are a smart business analyst for an e-commerce dashboard.\n"
                  f"Context: {ctx}\nQuestion: {req.message}\n"
                  f"Answer in 2-3 sentences using real numbers. No markdown.")
        completion = groq_client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6, max_tokens=200
        )
        return {'response': completion.choices[0].message.content}
    except Exception as e:
        print(f"AI Chat error: {e}")
        raise HTTPException(status_code=500, detail='AI failed to respond.')


# ── New RAG + Text-to-SQL chatbot endpoint ────────────────────────────────────
@app.post('/api/chat')
def rag_chat(req: ChatRequest, _: None = Depends(require_admin)):
    """
    Industry-grade chatbot with:
      - Intent routing  (data question vs conceptual question)
      - Text-to-SQL     (for data questions → NeonDB → real answer)
      - RAG             (for concept questions → FAISS vector search → doc answer)
      - Conversational memory (last 4 turns injected into every prompt)

    Response schema:
      {
        answer:  str,
        intent:  'data' | 'concept',
        source:  'sql' | 'rag' | 'sql_error',
        sql:     str | null,
        rows:    list[dict],
        columns: list[str]
      }
    """
    if not groq_client:
        raise HTTPException(status_code=503, detail='Groq not configured. Set GROQ_API_KEY in .env')
    if not _chatbot_available:
        raise HTTPException(status_code=503,
            detail='Chatbot module unavailable. Install: langchain-groq faiss-cpu sentence-transformers')
    msg = req.message.strip()
    if not msg:
        raise HTTPException(status_code=400, detail='Empty message')
    try:
        result = chatbot_chat(msg, req.history or [], groq_client)
        return result
    except Exception as e:
        print(f"RAG chat error: {e}")
        raise HTTPException(status_code=500, detail=f'Chat failed: {str(e)}')


@app.get('/api/analytics/explain-trends')
def explain_trends(user: Dict[str, Any] = Depends(require_admin)):
    if not groq_client:
        raise HTTPException(status_code=503, detail='Groq client not configured. Check GROQ_API_KEY in .env')
    username = user.get('username', 'admin')
    user_cache = user_cached_analytics.setdefault(username, {})
    sales = user_cache.get('sales')
    if not sales:
        data = get_data(username)
        if data.empty:
            return {'response': 'No dataset uploaded yet. Upload a dataset in ETL Pipeline to generate business insights.'}
        total_sales = float(data['Amount'].sum())
        total_orders = int(data['InvoiceNo'].nunique())
        sales = {
            'total_sales': round(total_sales, 2),
            'total_orders': total_orders,
            'average_order_value': round(total_sales / total_orders, 2) if total_orders > 0 else 0
        }
        user_cache['sales'] = sales

    if 'insight' in user_cache:
        return {'response': user_cache['insight']}

    prompt = (f"You are an elite business analyst reviewing an e-commerce dashboard for store owner '{username}'.\n"
              f"Metrics: Total Sales: \u20b9{sales.get('total_sales', 0):,}, "
              f"Total Orders: {sales.get('total_orders', 0):,}, "
              f"Avg Order Value: \u20b9{sales.get('average_order_value', 0):,}\n"
              f"Write a short, engaging 2-3 sentence insight explaining these numbers "
              f"positively to the store owner. Do not use asterisks or markdown.")
    try:
        completion = groq_client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7, max_tokens=150
        )
        insight = completion.choices[0].message.content
        user_cache['insight'] = insight
        return {'response': insight}
    except Exception as e:
        print(f"Groq API error: {e}")
        raise HTTPException(status_code=500, detail='Failed to generate insights.')


# ── ETL Background Tasks & Endpoints ─────────────────────────────────────────

def _run_etl_job(job_id: str, username: str = 'admin'):
    """Runs ETL task for the specific user, appending logs to etl_jobs[job_id]."""
    logs = etl_jobs[job_id]['logs']

    def log(msg):
        logs.append(msg)
        print(f"[ETL:{job_id}:{username}] {msg}")

    try:
        log(f"EXTRACT: Finding most recent dataset file for user '{username}'...")
        file_path = get_most_recent_dataset(username)
        if not file_path:
            raise FileNotFoundError(f"No dataset found for user '{username}'. Please upload a file in the ETL tracker first.")

        log(f"EXTRACT: Reading {os.path.basename(file_path)} into memory...")
        cleaned_df = load_and_clean_data(file_path, log)
        log(f"EXTRACT: Loaded {len(cleaned_df)} rows after cleaning.")

        # Refresh user's in-memory cache
        global user_dfs
        user_dfs[username] = cleaned_df
        user_dir = get_user_dataset_dir(username)
        cache_file = os.path.join(user_dir, 'cached_data.pkl')
        cleaned_df.to_pickle(cache_file)
        user_cached_analytics[username] = {}
        log(f"TRANSFORM: Pickle cache refreshed for user '{username}'. Analytics cache cleared.")

        # Push to DB if connection available
        engine = get_engine()
        if engine:
            try:
                log("LOAD: Ensuring database schema exists...")
                initialize_database(engine)
                log("LOAD: Clearing previous full-load data to prevent duplicate facts...")
                clear_loaded_data(engine)
                log("LOAD (OLTP): Populating users, products, orders, order_items...")
                populate_oltp(cleaned_df, engine)
                log("LOAD (OLTP): Complete.")

                log("LOAD (OLAP): Populating dim_* tables and fact_sales...")
                populate_dw(cleaned_df, engine)
                log("LOAD (OLAP): Data Warehouse synchronization complete.")
            except Exception as db_err:
                log(f"WARNING: DB load failed — {db_err}. File-based analytics still available.")
        else:
            log("INFO: No DATABASE_URL configured. Skipping DB load. File-based analytics ready.")

        log("PIPELINE SYNCHRONIZATION COMPLETE.")
        etl_jobs[job_id]['status'] = 'complete'

    except Exception as e:
        etl_jobs[job_id]['status'] = 'error'
        etl_jobs[job_id]['error'] = str(e)
        logs.append(f"ERROR: {e}")
        traceback.print_exc()


@app.post('/api/etl/run')
def run_etl(background_tasks: BackgroundTasks, user: Dict[str, Any] = Depends(require_admin)):
    """Kick off a background ETL job for the authenticated user and return a job_id to poll."""
    job_id = str(uuid.uuid4())[:8]
    username = user.get('username', 'admin')
    etl_jobs[job_id] = {'status': 'running', 'logs': [], 'error': None, 'user': username}
    background_tasks.add_task(_run_etl_job, job_id, username)
    return {'job_id': job_id, 'status': 'running'}


@app.get('/api/etl/status/{job_id}')
def etl_status(job_id: str):
    """Poll ETL job status and streamed logs."""
    if job_id not in etl_jobs:
        raise HTTPException(status_code=404, detail='Job not found')
    return etl_jobs[job_id]


# ── OLAP Query Endpoint ───────────────────────────────────────────────────────

@app.post('/api/olap/query')
def run_olap_query(req: OLAPQueryRequest):
    """Execute a dynamic OLAP query with user-supplied filters."""
    query_key = req.query_key
    filters = req.filters or {}

    valid_keys = ['rollup', 'drilldown', 'slice', 'dice']
    if query_key not in valid_keys:
        raise HTTPException(status_code=400, detail=f'Unknown query key. Valid: {valid_keys}')

    engine = get_engine()
    if not engine:
        raise HTTPException(status_code=503, detail='No database connection. Set DATABASE_URL in .env')

    try:
        params = {}

        if query_key == 'rollup':
            where = ''
            if filters.get('year'):
                where = 'WHERE dt.year = :year'
                params['year'] = int(filters['year'])
            sql = f"""
                SELECT dt.year, dt.quarter, SUM(sf.amount) as total_revenue
                FROM ecom_sales_fact sf
                JOIN ecom_dim_time dt ON sf.date_id = dt.date_id
                {where}
                GROUP BY dt.year, dt.quarter
                ORDER BY dt.year, dt.quarter
            """

        elif query_key == 'drilldown':
            where = 'WHERE 1=1'
            if filters.get('country'):
                where += ' AND LOWER(dc.country) = LOWER(:country)'
                params['country'] = filters['country']
            if filters.get('year'):
                where += ' AND dt.year = :year'
                params['year'] = int(filters['year'])
            sql = f"""
                SELECT dc.country, dp.name as product_name, SUM(sf.amount) as total_sales
                FROM ecom_sales_fact sf
                JOIN ecom_dim_customer dc ON sf.user_id = dc.user_id
                JOIN ecom_dim_product dp ON sf.product_id = dp.product_id
                JOIN ecom_dim_time dt ON sf.date_id = dt.date_id
                {where}
                GROUP BY dc.country, dp.name
                ORDER BY total_sales DESC
                LIMIT 20
            """

        elif query_key == 'slice':
            month = int(filters.get('month', 12))
            year = int(filters.get('year', 2010))
            params = {'month': month, 'year': year}
            sql = """
                SELECT dp.name as product_name,
                       SUM(sf.quantity) as units_sold,
                       SUM(sf.amount) as gross_revenue
                FROM ecom_sales_fact sf
                JOIN ecom_dim_time dt ON sf.date_id = dt.date_id
                JOIN ecom_dim_product dp ON sf.product_id = dp.product_id
                WHERE dt.month = :month AND dt.year = :year
                GROUP BY dp.name
                ORDER BY gross_revenue DESC
                LIMIT 15
            """

        elif query_key == 'dice':
            raw_cats = filters.get('categories', 'Gift,Decoration')
            raw_years = filters.get('years', '2010,2011')
            categories = [c.strip() for c in raw_cats.split(',') if c.strip()]
            years = [int(y.strip()) for y in raw_years.split(',') if y.strip()]
            if not categories:
                categories = ['Gift', 'Decoration']
            if not years:
                years = [2010, 2011]
            cat_placeholders = ', '.join([f':cat{i}' for i in range(len(categories))])
            yr_placeholders = ', '.join([f':yr{i}' for i in range(len(years))])
            for i, c in enumerate(categories):
                params[f'cat{i}'] = c
            for i, y in enumerate(years):
                params[f'yr{i}'] = y
            sql = f"""
                SELECT dcat.category_name, dt.year, SUM(sf.amount) as total_sales
                FROM ecom_sales_fact sf
                JOIN ecom_dim_product dp ON sf.product_id = dp.product_id
                JOIN ecom_dim_category dcat ON dp.category_id = dcat.category_id
                JOIN ecom_dim_time dt ON sf.date_id = dt.date_id
                WHERE dcat.category_name IN ({cat_placeholders})
                  AND dt.year IN ({yr_placeholders})
                GROUP BY dcat.category_name, dt.year
                ORDER BY dt.year, dcat.category_name
            """

        from sqlalchemy import text
        result_df = pd.read_sql(text(sql), engine, params=params)
        rows = result_df.values.tolist()
        sanitized = []
        for row in rows:
            sanitized.append([str(v) if not isinstance(v, (int, float, str, type(None))) else v for v in row])
        return {
            'columns': list(result_df.columns),
            'rows': sanitized,
            'row_count': len(sanitized)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Transaction (OLTP Simulate) Endpoint ─────────────────────────────────────

@app.post('/api/transaction')
def simulate_transaction(req: TransactionRequest, _: None = Depends(require_admin)):
    """Insert a simulated order into the OLTP database."""
    product_id = req.product_id
    product_name = req.product_name or "Unknown"
    quantity = req.quantity or 1
    amount = req.amount or 0.0

    if not product_id:
        raise HTTPException(status_code=400, detail='product_id is required')

    engine = get_engine()
    if not engine:
        return {
            'success': True,
            'simulated': True,
            'message': f'[SIMULATED — no DB] Order recorded locally for {product_name} x{quantity}',
            'order_id': f'SIM-{uuid.uuid4().hex[:8].upper()}'
        }

    try:
        from sqlalchemy import text
        order_id = f'WEB-{uuid.uuid4().hex[:8].upper()}'
        user_id = '99999'  # Demo admin user

        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO ecom_users (user_id, name, email, country)
                VALUES (:uid, 'Admin Demo', 'admin@datamart.enterprise', 'IN')
                ON CONFLICT (user_id) DO NOTHING
            """), {'uid': user_id})

            conn.execute(text("""
                INSERT INTO ecom_orders (order_id, user_id, order_date)
                VALUES (:oid, :uid, NOW())
            """), {'oid': order_id, 'uid': user_id})

            conn.execute(text("""
                INSERT INTO ecom_order_items (order_id, product_id, quantity, amount)
                VALUES (:oid, :pid, :qty, :amt)
            """), {'oid': order_id, 'pid': product_id, 'qty': quantity, 'amt': amount})

        return {
            'success': True,
            'simulated': False,
            'message': f'Order {order_id} committed to OLTP DB for {product_name} x{quantity}',
            'order_id': order_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Dataset Upload & Management Endpoints ────────────────────────────────────

ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.post('/api/dataset/upload')
async def upload_dataset(file: UploadFile = File(...), user: Dict[str, Any] = Depends(require_admin)):
    """Upload dataset into the authenticated user's isolated storage folder."""
    username = user.get('username', 'anonymous')
    if not file.filename:
        raise HTTPException(status_code=400, detail='No file selected')

    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail='Only .xlsx, .xls, or .csv files are allowed')

    user_dir = get_user_dataset_dir(username)
    filename = os.path.basename(file.filename)
    save_path = os.path.join(user_dir, filename)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Delete user's old pickle cache
    cache_file = os.path.join(user_dir, 'cached_data.pkl')
    if os.path.exists(cache_file):
        os.remove(cache_file)

    # Clear in-memory user state
    user_dfs.pop(username, None)
    user_cached_analytics[username] = {}

    return {
        'success': True,
        'filename': filename,
        'message': f'Dataset "{filename}" uploaded for user "{username}". Click Run ETL Pipeline to process it.'
    }


@app.get('/api/dataset/info')
def dataset_info(user: Dict[str, Any] = Depends(get_authenticated_user)):
    """Returns info about the active dataset strictly for the authenticated user."""
    username = user.get('username', 'anonymous')
    user_dir = get_user_dataset_dir(username)
    files = [f for f in os.listdir(user_dir) if f.endswith(('.xlsx', '.xls', '.csv')) and not f.startswith('~$')] if os.path.exists(user_dir) else []
    cache_exists = os.path.exists(os.path.join(user_dir, 'cached_data.pkl'))

    info = []
    for f in sorted(files, key=lambda x: os.path.getmtime(os.path.join(user_dir, x))):
        path = os.path.join(user_dir, f)
        size_mb = round(os.path.getsize(path) / (1024 * 1024), 2)
        info.append({'name': f, 'size_mb': size_mb})

    return {'files': info, 'cache_ready': cache_exists, 'user': username}


@app.post('/api/dataset/drop')
def drop_dataset(user: Dict[str, Any] = Depends(require_admin)):
    """Completely wipes datasets and cache for the authenticated user only."""
    username = user.get('username', 'anonymous')
    user_dir = get_user_dataset_dir(username)

    if os.path.exists(user_dir):
        for f in os.listdir(user_dir):
            if f.endswith(('.xlsx', '.xls', '.csv', '.pkl')):
                try:
                    os.remove(os.path.join(user_dir, f))
                except Exception:
                    pass

    user_dfs.pop(username, None)
    user_cached_analytics[username] = {}

    return {'success': True, 'message': f'Dataset and cache dropped for user "{username}".'}


if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
