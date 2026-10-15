"""
RAG + Text-to-SQL Chatbot Engine
=================================
Architecture:
  1. RAG Pipeline  — embeds project docs (TECHNICAL_CONCEPTS.md, schema, README)
                     into a FAISS vector store. Conceptual questions are answered
                     by retrieving relevant chunks and feeding them to Groq.

  2. Text-to-SQL   — converts natural language data questions into SQL, executes
                     on the NeonDB star schema, and feeds results back to Groq for
                     a natural language answer.

  3. Router        — classifies each user message as "data" (-> Text-to-SQL) or
                     "concept" (-> RAG) using a simple Groq call, then dispatches.

  4. Memory        — last N turns are included in every prompt for conversational
                     context (no LangChain memory objects needed at this scale).
"""

from __future__ import annotations

import os
import re
import json
import textwrap
from pathlib import Path
from typing import List, Dict, Optional

# Lazy-loaded expensive imports
_faiss_index = None
_embedder    = None
_db_engine   = None

# Paths
_ROOT   = Path(__file__).resolve().parent.parent
_DOCS   = [
    _ROOT / "TECHNICAL_CONCEPTS.md",
    _ROOT / "README.md",
    _ROOT / "database" / "schema_init.sql",
]
_INDEX_DIR = Path(__file__).resolve().parent / "rag_index"

SCHEMA_CONTEXT = """
Star-Schema tables available in NeonDB (PostgreSQL):

OLTP (raw transactions):
  ecom_users        (user_id PK, name, email, country)
  ecom_products     (product_id PK, name, category, price)
  ecom_orders       (order_id PK, user_id FK, order_date TIMESTAMP)
  ecom_order_items  (order_item_id PK, order_id FK, product_id FK,
                     quantity INT, amount DECIMAL)

Data Warehouse (star schema - use these for analytics):
  ecom_sales_fact   (fact_id PK, order_id, product_id FK, user_id FK,
                     date_id FK, quantity INT, amount DECIMAL)
  ecom_dim_product  (product_id PK, name TEXT, category_id FK, price)
  ecom_dim_category (category_id PK, category_name VARCHAR UNIQUE)
  ecom_dim_customer (user_id PK, name, country)
  ecom_dim_time     (date_id PK, full_date DATE, day, month, year,
                     quarter, day_of_week)

Key join pattern:
  ecom_sales_fact sf
    JOIN ecom_dim_product  dp  ON sf.product_id = dp.product_id
    JOIN ecom_dim_category dc  ON dp.category_id = dc.category_id
    JOIN ecom_dim_customer dcu ON sf.user_id = dcu.user_id
    JOIN ecom_dim_time     dt  ON sf.date_id = dt.date_id
""".strip()


# ── 1. Document loading & chunking ────────────────────────────────────────────

def _load_documents() -> List[Dict[str, str]]:
    chunks: List[Dict[str, str]] = []
    for path in _DOCS:
        if not path.exists():
            continue
        text   = path.read_text(encoding="utf-8")
        source = path.name
        paragraphs = re.split(r"\n{2,}", text)
        buf = ""
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            if len(buf) + len(para) < 600:
                buf += "\n\n" + para
            else:
                if buf:
                    chunks.append({"text": buf.strip(), "source": source})
                buf = para
        if buf:
            chunks.append({"text": buf.strip(), "source": source})
    chunks.append({"text": SCHEMA_CONTEXT, "source": "schema_init.sql"})
    return chunks


# ── 2. Embedding & FAISS index ────────────────────────────────────────────────

def _get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder


def _build_or_load_index():
    global _faiss_index
    if _faiss_index is not None:
        return _faiss_index

    import numpy as np
    import faiss
    import pickle

    _INDEX_DIR.mkdir(parents=True, exist_ok=True)
    index_file  = _INDEX_DIR / "index.faiss"
    chunks_file = _INDEX_DIR / "chunks.pkl"

    embedder = _get_embedder()
    docs = _load_documents()

    if index_file.exists() and chunks_file.exists():
        index = faiss.read_index(str(index_file))
        with open(chunks_file, "rb") as f:
            chunks = pickle.load(f)
    else:
        print("[RAG] Building FAISS index from documents...")
        texts      = [d["text"] for d in docs]
        embeddings = embedder.encode(texts, show_progress_bar=False).astype("float32")
        faiss.normalize_L2(embeddings)
        dim   = embeddings.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(embeddings)
        faiss.write_index(index, str(index_file))
        with open(chunks_file, "wb") as f:
            pickle.dump(docs, f)
        print(f"[RAG] Index built: {len(docs)} chunks, dim={dim}")

    _faiss_index = {"index": index, "chunks": docs}
    return _faiss_index


def _retrieve(query: str, top_k: int = 4) -> List[str]:
    import faiss
    store    = _build_or_load_index()
    embedder = _get_embedder()
    q_vec    = embedder.encode([query]).astype("float32")
    faiss.normalize_L2(q_vec)
    _, indices = store["index"].search(q_vec, top_k)
    return [store["chunks"][i]["text"] for i in indices[0] if i >= 0]


# ── 3. Groq LLM helper ────────────────────────────────────────────────────────

def _groq_call(groq_client, prompt: str, system: str = "",
               max_tokens: int = 400, temperature: float = 0.3,
               model: str = "openai/gpt-oss-20b") -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    resp = groq_client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content.strip()


# ── 4. Intent Router ──────────────────────────────────────────────────────────

_DATA_KEYWORDS = {
    "revenue", "sales", "total", "top", "best", "worst", "how many",
    "how much", "customers", "orders", "products", "country", "month",
    "year", "quarter", "sum", "average", "avg", "count", "list",
    "show", "which", "compare", "between", "last", "recent",
}

def _classify_intent(query: str, groq_client) -> str:
    q_lower = query.lower()
    hits = sum(1 for kw in _DATA_KEYWORDS if kw in q_lower)
    if hits >= 2:
        return "data"
    prompt = (
        f'Classify this e-commerce chatbot question as either "data" '
        f'(requires querying the database for numbers/records) or '
        f'"concept" (asks about definitions, how things work, or explanations).\n'
        f'Question: "{query}"\n'
        f'Reply with exactly one word: data or concept.'
    )
    result = _groq_call(groq_client, prompt, max_tokens=5, temperature=0.0)
    return "data" if "data" in result.lower() else "concept"


# ── 5. Text-to-SQL pipeline ───────────────────────────────────────────────────

def _get_db_engine():
    global _db_engine
    if _db_engine is None:
        from sqlalchemy import create_engine
        db_url = os.environ.get("DATABASE_URL", "")
        if not db_url:
            return None
        _db_engine = create_engine(db_url, pool_pre_ping=True,
                                   connect_args={"sslmode": "require"})
    return _db_engine


def _run_text_to_sql(query: str, history: List[Dict], groq_client) -> Dict:
    history_text = _format_history(history)

    sql_system = textwrap.dedent(f"""
        You are a PostgreSQL expert. Given the database schema below, write a
        single valid SQL SELECT query that answers the user's question.
        Return ONLY the SQL - no explanation, no markdown fences, no semicolons.

        {SCHEMA_CONTEXT}
    """).strip()

    sql_prompt = f"{history_text}\nQuestion: {query}" if history_text else f"Question: {query}"
    raw_sql = _groq_call(groq_client, sql_prompt, system=sql_system,
                         max_tokens=300, temperature=0.0)

    sql = re.sub(r"```(?:sql)?|```", "", raw_sql, flags=re.IGNORECASE).strip().rstrip(";").strip()

    engine    = _get_db_engine()
    raw_rows  = []
    columns   = []
    db_error  = None

    if engine:
        try:
            from sqlalchemy import text as sa_text
            exec_sql = sql
            if not re.search(r'\blimit\s+\d+', exec_sql, flags=re.IGNORECASE):
                exec_sql = exec_sql + " LIMIT 20"
            with engine.connect() as conn:
                result   = conn.execute(sa_text(exec_sql))
                columns  = list(result.keys())
                raw_rows = [dict(zip(columns, row)) for row in result.fetchall()]
        except Exception as e:
            db_error = str(e)

    if db_error:
        answer = _groq_call(groq_client,
            f"The SQL query failed with error: {db_error}\n"
            f"SQL attempted: {sql}\n"
            f"Explain what went wrong in one sentence and suggest rephrasing.",
            max_tokens=150)
        return {"answer": answer, "sql": sql, "rows": [], "columns": [], "source": "sql_error"}

    if not raw_rows:
        return {"answer": "The query ran successfully but returned no results for the current data.",
                "sql": sql, "rows": [], "columns": columns, "source": "sql"}

    rows_text = json.dumps(raw_rows[:10], default=str)
    answer = _groq_call(groq_client,
        f"Question: {query}\nSQL Result (up to 10 rows): {rows_text}\n"
        f"Give a clear 2-3 sentence answer with specific numbers.",
        system="You are a concise business analyst. Use only the provided data. No markdown.",
        max_tokens=280)

    return {"answer": answer, "sql": sql, "rows": raw_rows[:15],
            "columns": columns, "source": "sql"}


# ── 6. RAG pipeline ───────────────────────────────────────────────────────────

def _run_rag(query: str, history: List[Dict], groq_client) -> Dict:
    chunks   = _retrieve(query, top_k=4)
    context  = "\n\n---\n\n".join(chunks)
    history_text = _format_history(history)

    system = (
        "You are a knowledgeable data-warehouse and e-commerce analytics assistant. "
        "Answer questions using the provided context. Be specific and educational. "
        "If the context does not contain enough information, say so honestly. "
        "Do not use markdown bullet points - write in clear prose."
    )
    prompt = (
        f"Context from knowledge base:\n{context}\n\n"
        f"{history_text + chr(10) if history_text else ''}"
        f"Question: {query}"
    )
    answer = _groq_call(groq_client, prompt, system=system,
                        max_tokens=400, temperature=0.4)
    return {"answer": answer, "source": "rag", "sql": None, "rows": [], "columns": []}


# ── 7. Conversation memory helper ─────────────────────────────────────────────

def _format_history(history: List[Dict], max_turns: int = 4) -> str:
    if not history:
        return ""
    recent = history[-(max_turns * 2):]
    lines  = []
    for msg in recent:
        role = "User" if msg.get("role") == "user" else "Assistant"
        lines.append(f"{role}: {msg.get('text', '')}")
    return "\n".join(lines)


# ── 8. Public entry point ─────────────────────────────────────────────────────

def chat(query: str, history: List[Dict], groq_client) -> Dict:
    """
    Main entry point called by the FastAPI endpoint.
    Returns: { answer, source, sql, rows, columns, intent }
    """
    query  = query.strip()
    intent = _classify_intent(query, groq_client)
    result = _run_text_to_sql(query, history, groq_client) if intent == "data" \
             else _run_rag(query, history, groq_client)
    result["intent"] = intent
    return result


def warmup():
    """Pre-build the FAISS index at server startup (called once)."""
    try:
        _build_or_load_index()
        print("[RAG] Vector index ready.")
    except Exception as e:
        print(f"[RAG] Warmup failed (non-fatal): {e}")
