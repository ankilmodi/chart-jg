/**
 * API service layer – all backend calls go through here.
 */
import axios, { AxiosError } from 'axios';
import type {
  MarketData, IndicatorValues, SignalResponse, HistoryResponse,
  StocksResponse, HeatmapResponse, WatchlistItem,
  NotificationResponse, MarketOverview,
} from '../utils/types';

const BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'development' ? '/api' : 'https://brave-success-production-6aea.up.railway.app/api');

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Separate instance for slow scanner endpoints (full scan can take 30–60s first time)
export const apiSlow = axios.create({
  baseURL: BASE_URL,
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.code === 'ECONNABORTED') throw new Error('Request timeout');
    if (!error.response) throw new Error('Network error – check your connection');
    const status = error.response.status;
    if (status === 503) throw new Error('Data unavailable – market may be closed');
    if (status === 429) throw new Error('Rate limit exceeded – please wait');
    throw new Error((error.response.data as any)?.detail || 'API error');
  }
);

apiSlow.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.code === 'ECONNABORTED') throw new Error('Scan timeout – try again in a moment');
    if (!error.response) throw new Error('Network error – check your connection');
    const status = error.response.status;
    if (status === 503) throw new Error('Data unavailable – market may be closed');
    throw new Error((error.response.data as any)?.detail || 'API error');
  }
);

// ── Market ─────────────────────────────────────────────────────────────────
export const fetchMarket       = async (): Promise<MarketData>     => (await api.get('/market')).data;
export const fetchMarketOverview = async (): Promise<MarketOverview> => (await api.get('/market-overview')).data;
export const fetchMarketStatus = async () => (await api.get('/market-status')).data;
export const fetchIndicators   = async (): Promise<IndicatorValues> => (await api.get('/indicators')).data;
export const fetchSignal       = async (): Promise<SignalResponse>  => (await api.get('/signal')).data;
export const fetchHistory      = async (limit = 100): Promise<HistoryResponse> =>
  (await api.get(`/history?limit=${limit}`)).data;
export const clearCache        = async (): Promise<void> => { await api.post('/cache/clear'); };

export interface ScreenerParams {
  limit?: number;
  page?: number;
  trade_type?: string;
  cap_category?: string;
  sector?: string;
  search?: string;
  force?: boolean;
  min_score?: number;
  signal?: string;
  trend?: string;
  rsi?: string;
}

const buildQuery = (params?: ScreenerParams) => {
  const q = new URLSearchParams();
  if (params?.limit)        q.set('limit',        String(params.limit));
  if (params?.page)         q.set('page',         String(params.page));
  if (params?.trade_type)   q.set('trade_type',   params.trade_type);
  if (params?.cap_category) q.set('cap_category', params.cap_category);
  if (params?.sector)       q.set('sector',       params.sector);
  if (params?.search)       q.set('search',       params.search);
  if (params?.force)        q.set('force',        String(params.force));
  if (params?.min_score)    q.set('min_score',    String(params.min_score));
  if (params?.signal)       q.set('signal',       params.signal);
  if (params?.trend)        q.set('trend',        params.trend);
  if (params?.rsi)          q.set('rsi',          params.rsi);
  const str = q.toString();
  return str ? `?${str}` : '';
};

// ── Screeners ──────────────────────────────────────────────────────────────
export const fetchFutureStocks = async (params?: ScreenerParams): Promise<StocksResponse> => {
  try {
    const res = await apiSlow.get(`/future-stocks${buildQuery(params)}`);
    if (res.data && res.data.stocks && res.data.stocks.length > 0) {
      return res.data;
    }
  } catch (e) {
    console.warn("fetchFutureStocks trying fallback endpoint /stocks", e);
  }
  const fallback = await api.get('/stocks');
  return fallback.data;
};

export const fetchHeatmap        = async (force = false, tradeType = 'buy'): Promise<HeatmapResponse> =>
  (await apiSlow.get(`/heatmap?force=${force}&trade_type=${tradeType}`)).data;

export const fetchTopBuy         = async (limit = 25, tradeType = 'buy', params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/top-buy${buildQuery({ limit, trade_type: tradeType, ...params })}`)).data;

export const fetchTopBuyers      = async (limit = 25, params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/top-buyers${buildQuery({ limit, ...params })}`)).data;

export const fetchTopSellers     = async (limit = 25, params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/top-sellers${buildQuery({ limit, ...params })}`)).data;

export const fetchVolumeBest     = async (limit = 25, params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/volume-best${buildQuery({ limit, ...params })}`)).data;

export const fetchSwingBuy       = async (limit = 25, tradeType = 'buy', params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/swing-buy${buildQuery({ limit, trade_type: tradeType, ...params })}`)).data;

export const fetchWeeklyBuy      = async (limit = 25, tradeType = 'buy', params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/weekly-buy${buildQuery({ limit, trade_type: tradeType, ...params })}`)).data;

export const fetchMonthlyBuy     = async (limit = 25, tradeType = 'buy', params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/monthly-buy${buildQuery({ limit, trade_type: tradeType, ...params })}`)).data;

export const fetchBreakout       = async (limit = 25, params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/breakout${buildQuery({ limit, ...params })}`)).data;

export const fetchMomentum       = async (limit = 25, params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/momentum${buildQuery({ limit, ...params })}`)).data;

export const fetchLongBuildup    = async (limit = 25, params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/long-build-up${buildQuery({ limit, ...params })}`)).data;

export const fetchShortCovering  = async (limit = 25, params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/short-covering${buildQuery({ limit, ...params })}`)).data;

export const fetchVolumeShockers = async (limit = 25, params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/volume-shockers${buildQuery({ limit, ...params })}`)).data;

export const fetchEmaScreener    = async (limit = 30, params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/ema-screener${buildQuery({ limit, ...params })}`)).data;

export const fetchOiAnalysis     = async (limit = 30, params?: ScreenerParams): Promise<StocksResponse> =>
  (await apiSlow.get(`/oi-analysis${buildQuery({ limit, ...params })}`)).data;

export const fetchStockDetail    = async (symbol: string, tradeType = 'buy') =>
  (await apiSlow.get(`/stock/${symbol}?trade_type=${tradeType}`)).data;

export const fetchScanner        = async (minScore = 60, force = false): Promise<StocksResponse> =>
  (await apiSlow.get(`/scanner?min_score=${minScore}&force=${force}`)).data;

// ── All Stocks (4000+ NSE/BSE universe) ───────────────────────────────────

export interface AllStocksParams {
  page?:         number;
  limit?:        number;
  search?:       string;
  sector?:       string;
  cap_category?: string;
  signal?:       string;
  min_score?:    number;
  min_price?:    number;
  max_price?:    number;
  sort_by?:      'buy_score' | 'sell_score' | 'change_pct' | 'volume' | 'market_cap' | 'rsi' | 'symbol' | 'name';
  sort_dir?:     'asc' | 'desc';
}

export const fetchAllStocks = async (params?: AllStocksParams): Promise<StocksResponse> => {
  const q = new URLSearchParams();
  if (params?.page)         q.set('page',         String(params.page));
  if (params?.limit)        q.set('limit',        String(params.limit));
  if (params?.search)       q.set('search',       params.search);
  if (params?.sector)       q.set('sector',       params.sector);
  if (params?.cap_category) q.set('cap_category', params.cap_category);
  if (params?.signal)       q.set('signal',       params.signal);
  if (params?.min_score != null) q.set('min_score', String(params.min_score));
  if (params?.min_price != null) q.set('min_price', String(params.min_price));
  if (params?.max_price != null) q.set('max_price', String(params.max_price));
  if (params?.sort_by)      q.set('sort_by',      params.sort_by);
  if (params?.sort_dir)     q.set('sort_dir',     params.sort_dir);
  const qs = q.toString();
  return (await apiSlow.get(`/all-stocks${qs ? `?${qs}` : ''}`)).data;
};

/** Lightweight master list for instant local Ctrl+K search (no price data) */
export const fetchAllStocksMaster = async (search?: string): Promise<{ stocks: any[]; total: number }> => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return (await api.get(`/all-stocks/master${qs}`)).data;
};

// ── Formula ────────────────────────────────────────────────────────────────
export const fetchFormulas = async () => (await api.get('/formula')).data;

// ── Watchlist ──────────────────────────────────────────────────────────────
export const fetchWatchlist  = async () => (await api.get('/watchlist')).data;
export const addToWatchlist  = async (item: WatchlistItem) => (await api.post('/watchlist', item)).data;
export const removeWatchlist = async (symbol: string) => (await api.delete(`/watchlist/${symbol}`)).data;

// ── Notifications ──────────────────────────────────────────────────────────
export const fetchNotifications     = async (): Promise<NotificationResponse> =>
  (await api.get('/notifications')).data;
export const markNotifRead          = async (id: string) =>
  (await api.post(`/notifications/read/${id}`)).data;
export const generateNotifications  = async () =>
  (await api.post('/notifications/generate')).data;

// ── Export ─────────────────────────────────────────────────────────────────
export const exportCSV = (minScore = 0) => {
  window.open(`${BASE_URL}/export/csv?min_score=${minScore}`, '_blank');
};

// ── Missing exports (stub – endpoints may not exist yet) ──────────────────
export const fetchGapAnalysis      = async () => (await api.get('/gap-analysis')).data;
export const fetchOrbAnalysis      = async () => (await api.get('/orb-analysis')).data;
export const fetchStocksQuotes     = async () => (await api.get('/stocks-quotes')).data;
export const fetchScannerUniverse  = async (index = 'ALL') => (await api.get(`/scanner/universe?index=${index}`)).data;
export const fetchBacktest         = async (symbol: string) => (await api.get(`/backtest/${symbol}`)).data;
