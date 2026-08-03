# Stock AI Analyzer – chart-jg

**Merged project** combining `stock-gemini` and `stock-gemini-all` into a single full-featured Indian Stock Market AI Screener.

Built with **Python FastAPI + yfinance** (backend) and **React 18 + Vite + MUI** (frontend).

---

## ⚡ Quick Start (Windows)

Double-click **`run.cmd`** or run from Command Prompt:

```cmd
run.cmd
```

This opens two terminal windows:
1. **Backend FastAPI** on `http://localhost:8000`
2. **Frontend React** on `http://localhost:3000`

---

## 💻 Manual Setup

### Backend (Python FastAPI)

```cmd
cd backend

:: Create virtual environment (first time only)
python -m venv venv

:: Activate
venv\Scripts\activate.bat

:: Install dependencies (first time only)
pip install -r requirements.txt

:: Copy env file (first time only)
copy .env.example .env

:: Start server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (React + Vite)

```cmd
cd frontend

:: Install dependencies (first time only)
npm install

:: Copy env file (first time only)
copy .env.example .env

:: Start dev server
npm run dev
```

---

## 📋 Features

### Overview
- **Dashboard** – Market overview, Nifty50, VIX, top performers
- **All Stocks Directory** – Full NSE stock universe (Large, Mid, Small Cap)
- **F&O Stocks** – ~209 Nifty F&O stocks with 100-pt buy/sell scoring
- **Heat Map** – TradingView-style sector heat map

### Market Data
- **Top Buyers** – Highest positive change % + buy pressure
- **Top Sellers** – Highest negative change % + sell pressure
- **Volume Best** – Strongest institutional volume expansion

### Trading Screens
- **Intraday Trading** – Best intraday buy/sell picks
- **Swing Trading** – 2–5 day hold positions
- **Weekly Stock** – 1–2 week hold positions
- **Monthly Stock** – 1–4 week hold positions

### Analysis
- **Signal** – AI-powered buy/sell signals with confidence scores
- **Indicators** – Technical indicator dashboard (EMA, RSI, MACD, ADX, etc.)
- **History** – Historical signal performance tracking
- **Backtest** – Strategy backtesting engine
- **Universe** – Stock universe management (indices, categories)

### Tools
- **Scanner** – Custom multi-factor stock screener
- **Watchlist** – Personal watchlist with live prices
- **Settings** – App configuration and preferences

---

## 📡 API Endpoints

```
GET  /api/future-stocks          – F&O stock directory (paginated, filterable)
GET  /api/all-stocks             – Full stock universe
GET  /api/top-buyers             – Top buying pressure stocks
GET  /api/top-sellers            – Top selling pressure stocks
GET  /api/volume-best            – Best volume expansion stocks
GET  /api/heatmap                – Sector heat map data
GET  /api/top-buy                – Intraday picks
GET  /api/swing-buy              – Swing trading picks
GET  /api/weekly-buy             – Weekly picks
GET  /api/monthly-buy            – Monthly picks
GET  /api/breakout               – Breakout stocks
GET  /api/momentum               – Momentum stocks
GET  /api/long-build-up          – Long buildup (Price↑ OI↑)
GET  /api/short-covering         – Short covering (Price↑ OI↓)
GET  /api/volume-shockers        – Above-average volume
GET  /api/ema-screener           – EMA bullish alignment
GET  /api/oi-analysis            – Open interest analysis
GET  /api/stock/{symbol}         – Single stock detail
GET  /api/market-overview        – Nifty / BankNifty / VIX
GET  /api/scanner                – Run full scanner
GET  /api/watchlist              – Watchlist CRUD
GET  /api/formula                – Formula education
GET  /api/notifications          – Notifications
GET  /api/export/csv             – Export to CSV
```

Full docs: `http://localhost:8000/docs`

---

## 🛠 Tech Stack

| Layer    | Technology                                         |
|----------|----------------------------------------------------|
| Backend  | Python 3.12, FastAPI, yfinance, pandas, numpy      |
| Frontend | React 19, TypeScript, Vite, MUI v6, React Query v5 |
| State    | Redux Toolkit                                      |
| Charts   | Recharts                                           |

---

## 📁 Project Structure

```
chart-jg/
├── backend/
│   ├── app/
│   │   ├── api/routes.py         – Core API routes (signals, indicators, history)
│   │   ├── scanner/
│   │   │   ├── routes.py         – Scanner API routes (all screeners)
│   │   │   ├── scanner.py        – Main scan engine
│   │   │   ├── indicators.py     – Technical indicators (EMA, RSI, MACD, etc.)
│   │   │   ├── scoring.py        – 100-pt institutional buy/sell scoring
│   │   │   ├── universe.py       – Stock universe definitions
│   │   │   └── schemas.py        – Pydantic data models
│   │   ├── services/             – Signal engine, market data services
│   │   └── main.py               – FastAPI app entry point
│   ├── symbols.py                – NSE symbol list (all stocks)
│   ├── main.py                   – Uvicorn entry point
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/                – All page components
│       ├── components/           – Shared UI components
│       ├── services/api.ts       – API service layer
│       ├── store/                – Redux store
│       ├── App.tsx               – Routes
│       └── main.tsx              – Entry point
├── run.cmd                       – One-click launcher (Windows)
└── README.md
```
# chart-jg
