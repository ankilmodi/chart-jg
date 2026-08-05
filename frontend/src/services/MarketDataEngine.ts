/**
 * src/services/MarketDataEngine.ts
 * ════════════════════════════════════════════════════════════════════════════
 * Client-side Market Data Engine
 *
 * Architecture mirrors the backend MarketDataEngine:
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │                   MarketDataEngine (Client)                    │
 *   │  ┌────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
 *   │  │ Session    │  │  Cache Layer    │  │  API Fetcher     │   │
 *   │  │ Detector   │  │  (TTL-aware)    │  │  (retry + batch) │   │
 *   │  └────────────┘  └─────────────────┘  └──────────────────┘   │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * Session Types (IST):
 *   LIVE        → 09:15 – 15:30, Mon-Fri, non-holiday
 *   PRE_OPEN    → 09:00 – 09:15
 *   AFTER_HOURS → > 15:30
 *   WEEKEND     → Sat / Sun
 *   HOLIDAY     → NSE holiday
 *
 * Auto-switching:
 *   • isMarketOpen()     → bool
 *   • getDataMode()      → "live" | "eod" | "prev_close"
 *   • getRefreshMs()     → number (ms between polls)
 *   • getSessionLabel()  → UI-ready label string
 *
 * Timezone: Always Asia/Kolkata. Never browser timezone.
 */

import axios from 'axios';

// ── Types ──────────────────────────────────────────────────────────────────

export type SessionType = 'LIVE' | 'PRE_OPEN' | 'AFTER_HOURS' | 'HOLIDAY' | 'WEEKEND';
export type DataMode    = 'live' | 'eod' | 'prev_close';

export interface EngineMarketStatus {
  session_type:        SessionType;
  is_market_open:      boolean;
  is_trading_day:      boolean;
  is_holiday:          boolean;
  holiday_name:        string | null;
  data_mode:           DataMode;
  message:             string;
  current_time_ist:    string;
  open_time:           string;
  close_time:          string;
  pre_open_start:      string;
  next_open:           string | null;
  next_open_readable:  string | null;
  cache_ttl_seconds:   number;
  client_refresh_sec:  number;
  last_eod_stored_at:  string | null;
  server_time_ist:     string;
}

export interface StockSnapshot {
  symbol:       string;
  name:         string;
  ltp:          number;
  open:         number;
  high:         number;
  low:          number;
  close:        number;
  prev_close:   number;
  change:       number;
  change_pct:   number;
  volume:       number;
  avg_volume:   number;
  vwap:         number;
  bid:          number;
  ask:          number;
  oi:           number;
  market_cap:   number | null;
  data_source:  string;
  session_type: string;
  as_of:        string;
  fetched_at:   string;
  data_mode?:   DataMode;
}

export interface IndexSnapshot {
  symbol:       string;
  name:         string;
  price:        number;
  open:         number;
  high:         number;
  low:          number;
  prev_close:   number;
  change:       number;
  change_pct:   number;
  volume:       number;
  data_source:  string;
  session_type: string;
  as_of:        string;
}

export interface EngineMarketOverview {
  nifty_price:          number | null;
  nifty_change:         number | null;
  nifty_change_pct:     number | null;
  banknifty_price:      number | null;
  banknifty_change:     number | null;
  banknifty_change_pct: number | null;
  vix:                  number | null;
  vix_safe:             boolean;
  data_mode:            DataMode;
  session_type:         SessionType;
  is_market_open:       boolean;
  market_status:        string;
  message:              string;
  next_open:            string | null;
  next_open_readable:   string | null;
  client_refresh_sec:   number;
  current_time_ist:     string;
  last_eod_stored_at:   string | null;
  market_trend:         'bullish' | 'bearish' | 'neutral';
  timestamp:            string;
}

// ── IST helpers ────────────────────────────────────────────────────────────

function nowIST(): Date {
  const utc = Date.now() + new Date().getTimezoneOffset() * 60_000;
  return new Date(utc + 5.5 * 3_600_000);
}

function toMin(h: number, m: number): number { return h * 60 + m; }

const PRE_OPEN_MIN = toMin(9,  0);
const OPEN_MIN     = toMin(9,  15);
const CLOSE_MIN    = toMin(15, 30);

// ── TTL & refresh intervals (ms) ──────────────────────────────────────────

const SESSION_TTL_MS: Record<SessionType, number> = {
  LIVE:        8_000,
  PRE_OPEN:    30_000,
  AFTER_HOURS: 300_000,
  HOLIDAY:     3_600_000,
  WEEKEND:     3_600_000,
};

const SESSION_REFRESH_MS: Record<SessionType, number> = {
  LIVE:        8_000,
  PRE_OPEN:    30_000,
  AFTER_HOURS: 300_000,
  HOLIDAY:     3_600_000,
  WEEKEND:     3_600_000,
};

// ── Session-label maps ─────────────────────────────────────────────────────

const SESSION_LABELS: Record<SessionType, string> = {
  LIVE:        '🟢 LIVE MARKET',
  PRE_OPEN:    '🟡 PRE OPEN',
  AFTER_HOURS: '🔴 MARKET CLOSED',
  HOLIDAY:     '🏖️ MARKET HOLIDAY',
  WEEKEND:     '🔴 MARKET CLOSED',
};

const DATA_MODE_LABEL: Record<DataMode, string> = {
  live:       'Live Data',
  eod:        "Today's EOD Data",
  prev_close: 'Previous Close',
};

// ── Simple TTL cache ────────────────────────────────────────────────────────

class _ClientCache {
  private _store = new Map<string, { at: number; value: unknown }>();

  get<T>(key: string, ttlMs: number): T | null {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.at > ttlMs) { this._store.delete(key); return null; }
    return entry.value as T;
  }

  set(key: string, value: unknown): void {
    this._store.set(key, { at: Date.now(), value });
  }

  clear(): void { this._store.clear(); }
}

// ── Engine class ────────────────────────────────────────────────────────────

class MarketDataEngineClient {
  private _cache    = new _ClientCache();
  private _baseUrl  = '';
  private _lastSession: SessionType | null = null;

  /** Set API base URL from environment or default. */
  init(baseUrl: string): void {
    this._baseUrl = baseUrl;
  }

  // ── Session detection (client-side, IST) ─────────────────────────────────

  getSessionType(): SessionType {
    const ist  = nowIST();
    const day  = ist.getDay();                              // 0=Sun, 6=Sat
    const mins = toMin(ist.getHours(), ist.getMinutes());

    if (day === 0 || day === 6) return 'WEEKEND';
    if (mins < PRE_OPEN_MIN)   return 'WEEKEND';            // very early AM
    if (mins < OPEN_MIN)       return 'PRE_OPEN';
    if (mins <= CLOSE_MIN)     return 'LIVE';
    return 'AFTER_HOURS';
  }

  isMarketOpen(): boolean { return this.getSessionType() === 'LIVE'; }

  getDataMode(): DataMode {
    const st = this.getSessionType();
    if (st === 'LIVE')        return 'live';
    if (st === 'AFTER_HOURS') return 'eod';
    return 'prev_close';
  }

  getRefreshMs(): number {
    return SESSION_REFRESH_MS[this.getSessionType()];
  }

  getSessionLabel(): string {
    return SESSION_LABELS[this.getSessionType()];
  }

  getDataModeLabel(): string {
    return DATA_MODE_LABEL[this.getDataMode()];
  }

  getSessionColor(): string {
    const st = this.getSessionType();
    if (st === 'LIVE')     return '#22c55e';   // green
    if (st === 'PRE_OPEN') return '#f59e0b';   // amber
    return '#ef4444';                          // red
  }

  // Detect session change (used by hooks to flush queries)
  hasSessionChanged(): boolean {
    const current = this.getSessionType();
    if (this._lastSession !== null && this._lastSession !== current) {
      this._lastSession = current;
      this._cache.clear();
      return true;
    }
    this._lastSession = current;
    return false;
  }

  // ── API calls ─────────────────────────────────────────────────────────────

  /** Full engine status from backend (session-authoritative). */
  async getMarketStatus(): Promise<EngineMarketStatus> {
    const key = 'engine_status';
    const st  = this.getSessionType();
    const ttl = SESSION_TTL_MS[st];
    const cached = this._cache.get<EngineMarketStatus>(key, ttl);
    if (cached) return cached;

    const { data } = await axios.get(`${this._baseUrl}/api/engine/status`);
    this._cache.set(key, data);
    return data as EngineMarketStatus;
  }

  /** Fetch live (or EOD if after hours) snapshot for one symbol. */
  async getLiveData(symbol: string): Promise<StockSnapshot> {
    const key = `live_${symbol}`;
    const ttl = SESSION_TTL_MS[this.getSessionType()];
    const cached = this._cache.get<StockSnapshot>(key, ttl);
    if (cached) return cached;

    const { data } = await axios.get(`${this._baseUrl}/api/engine/live`, {
      params: { symbol },
    });
    this._cache.set(key, data);
    return data as StockSnapshot;
  }

  /** Today's EOD data for one symbol. */
  async getClosingData(symbol: string): Promise<StockSnapshot> {
    const key = `eod_${symbol}`;
    const cached = this._cache.get<StockSnapshot>(key, 300_000);  // 5 min
    if (cached) return cached;

    const { data } = await axios.get(`${this._baseUrl}/api/engine/eod`, {
      params: { symbol },
    });
    this._cache.set(key, data);
    return data as StockSnapshot;
  }

  /** Previous trading day's data for one symbol. */
  async getPreviousDayData(symbol: string): Promise<StockSnapshot> {
    const { data } = await axios.get(`${this._baseUrl}/api/engine/previous-day`, {
      params: { symbol },
    });
    return data as StockSnapshot;
  }

  /** Batch fetch for multiple symbols (LIVE or EOD depending on session). */
  async getBatchData(symbols: string[]): Promise<Record<string, StockSnapshot | null>> {
    const { data } = await axios.post(`${this._baseUrl}/api/engine/batch`, symbols);
    return data.results as Record<string, StockSnapshot | null>;
  }

  /** Fetch index data (NIFTY, BANK NIFTY, VIX). */
  async getIndexData(ticker: string): Promise<IndexSnapshot> {
    const key = `index_${ticker}`;
    const ttl = SESSION_TTL_MS[this.getSessionType()];
    const cached = this._cache.get<IndexSnapshot>(key, ttl);
    if (cached) return cached;

    const { data } = await axios.get(
      `${this._baseUrl}/api/engine/index/${encodeURIComponent(ticker)}`
    );
    this._cache.set(key, data);
    return data as IndexSnapshot;
  }

  /** Full market overview (NIFTY + BANK NIFTY + VIX + session). */
  async getMarketOverview(): Promise<EngineMarketOverview> {
    const key = 'engine_overview';
    const ttl = SESSION_TTL_MS[this.getSessionType()];
    const cached = this._cache.get<EngineMarketOverview>(key, ttl);
    if (cached) return cached;

    const { data } = await axios.get(`${this._baseUrl}/api/engine/market-overview`);
    this._cache.set(key, data);
    return data as EngineMarketOverview;
  }

  /** Smart fetch: LIVE during market hours, CLOSING after, PREV_CLOSE on weekends. */
  async getAutoData(symbol: string): Promise<StockSnapshot> {
    const mode = this.getDataMode();
    if (mode === 'live')       return this.getLiveData(symbol);
    if (mode === 'eod')        return this.getClosingData(symbol);
    return this.getPreviousDayData(symbol);
  }

  /** Countdown string until next session change (hh:mm:ss). */
  getCountdown(): string {
    const st  = this.getSessionType();
    const ist = nowIST();
    let targetH: number, targetM: number;

    if (st === 'PRE_OPEN')  { targetH = 9;  targetM = 15; }
    else if (st === 'LIVE') { targetH = 15; targetM = 30; }
    else                    { return ''; }

    const target = new Date(ist);
    target.setHours(targetH, targetM, 0, 0);
    let diff = target.getTime() - ist.getTime();
    if (diff < 0) return '';

    const h = Math.floor(diff / 3_600_000); diff -= h * 3_600_000;
    const m = Math.floor(diff / 60_000);    diff -= m * 60_000;
    const s = Math.floor(diff / 1_000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  /** Current IST time string. */
  getISTNow(): string {
    return nowIST().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  }
}

// ── Module singleton ───────────────────────────────────────────────────────

export const marketDataEngine = new MarketDataEngineClient();

// Initialise with environment base URL
const BASE = (import.meta as any).env?.VITE_API_URL ||
  ((import.meta as any).env?.MODE === 'development'
    ? '/api'
    : 'https://brave-success-production-6aea.up.railway.app');

// Strip trailing /api if present so we can control the path ourselves
marketDataEngine.init(BASE.replace(/\/api$/, ''));

export default marketDataEngine;
