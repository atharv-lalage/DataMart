# 🚀 Deployment Guide — E-Commerce Data Analytics Platform

Deploy your ADBMS project **100% free** using:

| Service | What it hosts | Free tier |
|---|---|---|
| **Render.com** | FastAPI Backend (Python API) | 750 hours/month |
| **Vercel** | React Frontend (Vite SPA) | Unlimited for hobby |
| **NeonDB** | PostgreSQL Database | Already set up ✅ |

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure your project has these files (already created):

| File | Purpose |
|---|---|
| `render.yaml` | Render.com blueprint for auto-config |
| `Procfile` | Tells Render how to start FastAPI with Uvicorn |
| `runtime.txt` | Specifies Python 3.11.9 |
| `backend/requirements.txt` | All Python dependencies (including `groq`) |
| `frontend/vercel.json` | Vercel SPA routing config |
| `frontend/src/config.js` | Centralized API URL (reads `VITE_API_URL`) |

---

## Step 1: Push Code to GitHub

If you haven't already:

```bash
cd "C:\Users\Atharv\Desktop\ADBMS Project"
git add .
git commit -m "Add deployment config for Render + Vercel"
git push origin main
```

> ⚠️ **IMPORTANT:** Make sure `.env` is in your `.gitignore` (it already is). Never push your database URL or API keys to GitHub.

---

## Step 2: Deploy the Backend on Render.com

### 2.1 Create a Render Account
1. Go to [https://render.com](https://render.com)
2. Sign up with your **GitHub account** (this links your repos automatically)

### 2.2 Create a New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your **GitHub repository** (`ADBMS Project`)
3. Configure:

| Setting | Value |
|---|---|
| **Name** | `datamart-backend` |
| **Region** | Singapore (closest to your NeonDB) |
| **Branch** | `main` |
| **Runtime** | `Python` |
| **Build Command** | `cd backend && pip install -r requirements.txt` |
| **Start Command** | `cd backend && uvicorn app:app --host 0.0.0.0 --port $PORT` |
| **Plan** | **Free** |

### 2.3 Set Environment Variables
In the Render dashboard, go to **Environment** tab and add:

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgresql://user:password@your-neondb-host.neon.tech/neondb?sslmode=require` |
| `GROQ_API_KEY` | `gsk_your_groq_api_key_here` |
| `ADMIN_USERNAME` | A unique administrator username |
| `ADMIN_PASSWORD` | A long, unique administrator password |
| `CORS_ORIGINS` | `https://your-project.vercel.app` (your actual Vercel URL) |
| `PYTHON_VERSION` | `3.11.9` |

> 🔒 These are set securely in Render's dashboard, not in your code.

### 2.4 Deploy
1. Click **"Create Web Service"**
2. Wait 3–5 minutes for the build to complete
3. You'll get a URL like: `https://datamart-backend.onrender.com`
4. Test it by visiting: `https://datamart-backend.onrender.com/api/analytics/sales`

> **Note:** Render free tier services spin down after 15 minutes of inactivity. The first request after idle will take ~30 seconds to wake up. This is normal.

---

## Step 3: Deploy the Frontend on Vercel

### 3.1 Create a Vercel Account
1. Go to [https://vercel.com](https://vercel.com)
2. Sign up with your **GitHub account**

### 3.2 Import the Project
1. Click **"Add New..."** → **"Project"**
2. Select your GitHub repository
3. **Important:** Set the **Root Directory** to `frontend`

### 3.3 Configure Build Settings

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 3.4 Set Environment Variable
In the **Environment Variables** section, add:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://datamart-backend.onrender.com` |

> Replace with your actual Render backend URL from Step 2.4.

### 3.5 Deploy
1. Click **"Deploy"**
2. Wait 1–2 minutes
3. You'll get a URL like: `https://your-project.vercel.app`

---

## Step 4: Verify the Deployment

### 4.1 Test the Backend
Open in browser:
```
https://datamart-backend.onrender.com/api/analytics/sales
```
You should see JSON data (or an empty object if no data has been loaded yet).

### 4.2 Test the Frontend
Open in browser:
```
https://your-project.vercel.app
```

1. Login with the `ADMIN_USERNAME` / `ADMIN_PASSWORD` configured on Render
2. Go to **Data Cleaner** page
3. Upload a dataset (smaller ones like `Sample_-_Superstore.csv` work best on free tier)
4. Click **Clean Data** and watch the ETL pipeline run
5. Navigate to **Dashboard** to see your analytics

---

## 🔧 Troubleshooting

### "CORS Error" in browser console
Set `CORS_ORIGINS` on Render to your exact Vercel origin. Also make sure `VITE_API_URL` doesn't have a trailing slash:
- ✅ `https://datamart-backend.onrender.com`
- ❌ `https://datamart-backend.onrender.com/`

### Backend takes 30+ seconds to respond
Render free tier spins down after 15 min of inactivity. The first request "wakes" it up. This is normal. Subsequent requests are fast.

### "Internal Server Error" on ETL pipeline
The free tier has **512 MB RAM**. Large datasets (like `Online Retail.xlsx` at 23 MB) may cause out-of-memory errors. Use the smaller `Sample_-_Superstore.csv` (2.2 MB) instead.

### Database connection fails
Verify your `DATABASE_URL` in Render's environment variables:
1. Go to [Neon Dashboard](https://console.neon.tech)
2. Copy the connection string
3. Make sure it includes `?sslmode=require`

### Frontend shows "No Products Yet"
This means the ETL pipeline hasn't been run yet. Go to the Data Cleaner page, upload a dataset, and click "Clean Data" first.

---

## 📁 Files Created / Modified for Deployment

### New Files
| File | Purpose |
|---|---|
| `render.yaml` | Render.com auto-deploy blueprint |
| `Procfile` | Production server startup command |
| `runtime.txt` | Python version specification |
| `frontend/vercel.json` | Vercel SPA routing configuration |
| `frontend/src/config.js` | Centralized API URL management |

### Modified Files
| File | Change |
|---|---|
| `backend/requirements.txt` | Added `groq` and `numpy` (were missing) |
| `backend/app.py` | Updated to bind to `$PORT` env var and `0.0.0.0` |
| `frontend/src/pages/Dashboard.jsx` | Replaced hardcoded `localhost:5000` with `API_BASE_URL` |
| `frontend/src/pages/Home.jsx` | Replaced hardcoded `localhost:5000` with `API_BASE_URL` |
| `frontend/src/pages/ETLTracker.jsx` | Replaced hardcoded `localhost:5000` with `API_BASE_URL` |
| `frontend/src/pages/OLAPTerminal.jsx` | Replaced hardcoded `localhost:5000` with `API_BASE_URL` |

---

## 🌐 Your Live URLs (After Deployment)

| Service | URL |
|---|---|
| **Frontend** | `https://your-project.vercel.app` |
| **Backend API** | `https://datamart-backend.onrender.com` |
| **Database** | NeonDB (already live) |

> Replace the placeholder URLs above with your actual deployment URLs after completing the steps.

---

## 💡 Tips for Recruiter Demos

1. **Wake the backend first**: Open your Render URL 30 seconds before showing the demo
2. **Pre-load data**: Run the ETL pipeline once so the dashboard has data ready
3. **Use the AI chat**: It's the most impressive feature — ask it about best products or revenue trends
4. **Show the OLAP terminal**: It demonstrates real SQL queries against a live data warehouse
