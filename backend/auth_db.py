"""
MongoDB Authentication & User Management Module
================================================
Handles:
  1. Connection to MongoDB Atlas (`users` collection)
  2. One-way password hashing using bcrypt
  3. JWT access token generation and verification
  4. User registration and login operations
"""

import os
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import bcrypt
import jwt
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError, ConnectionFailure
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'), override=True)

# ── Configuration ─────────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "datamart-super-secret-jwt-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

_mongo_client: Optional[MongoClient] = None
_db = None
_users_col = None


def get_mongo_uri() -> str:
    """Retrieves MongoDB URI from environment or provides configured cluster template."""
    return os.environ.get(
        "MONGODB_URI",
        "mongodb+srv://lalageatharv99_db_user:<db_password>@cluster0.kmp4stt.mongodb.net/datamart_db?retryWrites=true&w=majority"
    )


def get_users_collection():
    """Lazily initializes MongoDB connection and ensures indexes."""
    global _mongo_client, _db, _users_col
    if _users_col is not None:
        return _users_col

    uri = get_mongo_uri()
    if "<db_password>" in uri:
        print("[MongoDB Auth] Warning: <db_password> placeholder still in MONGODB_URI. Update .env with real password.")
        return None

    try:
        _mongo_client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        # Verify connection
        _mongo_client.admin.command('ping')
        _db = _mongo_client.get_database("datamart_db")
        _users_col = _db["users"]
        
        # Ensure unique indexes on email and username
        _users_col.create_index([("email", ASCENDING)], unique=True)
        _users_col.create_index([("username", ASCENDING)], unique=True)
        print("[MongoDB Auth] Successfully connected to MongoDB Atlas. Indexes ready.")
        return _users_col
    except Exception as e:
        print(f"[MongoDB Auth] Connection failed: {e}")
        return None


# ── Password Hashing Helpers ──────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt with automatic salt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# ── JWT Helpers ───────────────────────────────────────────────────────────────

def create_access_token(user_data: Dict[str, Any]) -> str:
    """Creates a signed JWT access token valid for 7 days."""
    payload = {
        "sub": str(user_data.get("_id") or user_data.get("id")),
        "username": user_data.get("username"),
        "email": user_data.get("email"),
        "role": user_data.get("role", "admin"),
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRATION_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token. Returns payload or None if invalid/expired."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        return None


# ── Authentication Service Operations ─────────────────────────────────────────

def register_user(username: str, email: str, password: str, role: str = "admin") -> Dict[str, Any]:
    """
    Registers a new user in MongoDB:
      - Validates format
      - Checks uniqueness
      - Hashes password
      - Inserts into MongoDB
      - Returns JWT token and sanitized user profile
    """
    username = username.strip()
    email = email.strip().lower()

    if not username or len(username) < 3:
        raise ValueError("Username must be at least 3 characters long")
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        raise ValueError("Invalid email address format")
    if not password or len(password) < 6:
        raise ValueError("Password must be at least 6 characters long")

    users_col = get_users_collection()
    if users_col is None:
        raise RuntimeError("Database connection not configured. Please set a valid MONGODB_URI in .env.")

    # Check for existing user
    if users_col.find_one({"email": email}):
        raise ValueError("An account with this email already exists")
    if users_col.find_one({"username": {"$regex": f"^{re.escape(username)}$", "$options": "i"}}):
        raise ValueError("This username is already taken")

    now = datetime.utcnow()
    user_doc = {
        "username": username,
        "email": email,
        "password_hash": hash_password(password),
        "role": role,
        "created_at": now,
        "last_login": now,
    }

    try:
        result = users_col.insert_one(user_doc)
        user_doc["_id"] = str(result.inserted_id)
        user_doc.pop("password_hash", None)
        token = create_access_token(user_doc)
        return {
            "token": token,
            "user": {
                "id": str(result.inserted_id),
                "username": username,
                "email": email,
                "role": role,
            }
        }
    except DuplicateKeyError as e:
        if "email" in str(e):
            raise ValueError("An account with this email already exists")
        raise ValueError("This username is already taken")


def login_user(identifier: str, password: str) -> Dict[str, Any]:
    """
    Authenticates a user by email or username:
      - Verifies bcrypt password
      - Updates last_login
      - Returns JWT token and sanitized user profile
    """
    identifier = identifier.strip()
    if not identifier or not password:
        raise ValueError("Username/email and password are required")

    users_col = get_users_collection()
    if users_col is None:
        raise RuntimeError("Database connection not configured. Please set a valid MONGODB_URI in .env.")

    # Search by email or username (case-insensitive)
    user = users_col.find_one({
        "$or": [
            {"email": identifier.lower()},
            {"username": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}}
        ]
    })

    if not user:
        raise ValueError("Invalid username/email or password")

    if not verify_password(password, user.get("password_hash", "")):
        raise ValueError("Invalid username/email or password")

    # Update last login timestamp
    now = datetime.utcnow()
    users_col.update_one({"_id": user["_id"]}, {"$set": {"last_login": now}})

    user_id = str(user["_id"])
    sanitized_user = {
        "id": user_id,
        "username": user.get("username"),
        "email": user.get("email"),
        "role": user.get("role", "admin"),
    }
    token = create_access_token(sanitized_user)

    return {
        "token": token,
        "user": sanitized_user
    }


def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves public user profile by MongoDB ObjectId."""
    users_col = get_users_collection()
    if users_col is None:
        return None

    from bson import ObjectId
    try:
        user = users_col.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None
        return {
            "id": str(user["_id"]),
            "username": user.get("username"),
            "email": user.get("email"),
            "role": user.get("role", "admin"),
            "created_at": user.get("created_at"),
            "last_login": user.get("last_login"),
        }
    except Exception:
        return None
