/**
 * IPO Apply Assistant – Frontend API Service
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'development' ? '/api' : 'https://brave-success-production-6aea.up.railway.app/api');

const api = axios.create({ baseURL: BASE_URL, timeout: 30000 });

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IPOMaster {
  id: string;
  company_name: string;
  symbol?: string;
  issue_type: string;
  status: string;
  issue_price_min?: number;
  issue_price_max?: number;
  issue_price?: number;
  issue_size?: number;
  lot_size?: number;
  min_investment?: number;
  open_date?: string;
  close_date?: string;
  allotment_date?: string;
  listing_date?: string;
  listing_price?: number;
  listing_gain_pct?: number;
  registrar?: string;
  lead_managers?: string[];
  sector?: string;
  exchange?: string;
  face_value?: number;
  gmp?: number;
  gmp_pct?: number;
  gmp_updated_at?: string;
  revenue_growth_pct?: number;
  profit_growth_pct?: number;
  roe?: number;
  pe_ratio?: number;
  rating?: number;
  rating_label?: string;
  updated_at?: string;
}

export interface IPOSubscriptionDay {
  day: number;
  date?: string;
  retail_times: number;
  hni_times: number;
  qib_times: number;
  employee_times: number;
  total_times: number;
  applications?: number;
}

export interface IPOSubscriptionHourly {
  timestamp: string;
  total_times: number;
  retail_times: number;
}

export interface IPOSubscription {
  ipo_id: string;
  days: IPOSubscriptionDay[];
  hourly: IPOSubscriptionHourly[];
  retail_times: number;
  hni_times: number;
  qib_times: number;
  employee_times: number;
  total_times: number;
  total_applications?: number;
  updated_at?: string;
}

export interface IPOScoreBreakdown {
  gmp_score: number;
  retail_score: number;
  hni_score: number;
  qib_score: number;
  financial_growth_score: number;
  profitability_score: number;
  roe_score: number;
  industry_trend_score: number;
  total: number;
}

export interface IPORating {
  ipo_id: string;
  score: number;
  label: string;
  breakdown: IPOScoreBreakdown;
  best_time_to_apply: string;
  apply_probability: string;
  recommendation: string;
  recommendation_reasons: string[];
  avoid_reasons: string[];
  allotment_probability_pct?: number;
  computed_at?: string;
}

export interface IPOGMPEntry {
  ipo_id: string;
  timestamp: string;
  gmp: number;
  gmp_pct: number;
}

export interface IPOListingHistory {
  ipo_id: string;
  company_name: string;
  issue_price: number;
  listing_price: number;
  listing_gain_pct: number;
  listing_date: string;
  max_gain_pct?: number;
  max_loss_pct?: number;
  sector?: string;
  issue_type: string;
}

export interface IPONotification {
  id: string;
  ipo_id: string;
  ipo_name: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ─── API Functions ───────────────────────────────────────────────────────────

export interface IPOListParams {
  status?: string;
  type?: string;
  search?: string;
  min_gmp?: number;
  min_sub?: number;
  min_rating?: number;
  page?: number;
  limit?: number;
}

export const fetchIPOList = async (params?: IPOListParams) => {
  const q = new URLSearchParams();
  if (params?.status)     q.set('status',     params.status);
  if (params?.type)       q.set('type',       params.type);
  if (params?.search)     q.set('search',     params.search);
  if (params?.min_gmp != null)    q.set('min_gmp',    String(params.min_gmp));
  if (params?.min_sub != null)    q.set('min_sub',    String(params.min_sub));
  if (params?.min_rating != null) q.set('min_rating', String(params.min_rating));
  if (params?.page)       q.set('page',       String(params.page));
  if (params?.limit)      q.set('limit',      String(params.limit));
  const qs = q.toString();
  return (await api.get(`/ipo/list${qs ? `?${qs}` : ''}`)).data;
};

export const fetchIPODetail = async (id: string) =>
  (await api.get(`/ipo/${id}`)).data;

export const fetchIPOSubscription = async (id: string): Promise<IPOSubscription> =>
  (await api.get(`/ipo/${id}/subscription`)).data;

export const fetchIPOGMPTrend = async (id: string) =>
  (await api.get(`/ipo/${id}/gmp-trend`)).data;

export const fetchIPORating = async (id: string): Promise<IPORating> =>
  (await api.get(`/ipo/${id}/rating`)).data;

export const fetchIPORecommendation = async (id: string) =>
  (await api.get(`/ipo/${id}/recommendation`)).data;

export const fetchIPOHistory = async (limit = 100) =>
  (await api.get(`/ipo/history/all?limit=${limit}`)).data;

export const fetchIPONotifications = async () =>
  (await api.get('/ipo/notifications/all')).data;

export const markIPONotificationRead = async (id: string) =>
  (await api.post(`/ipo/notifications/read/${id}`)).data;

export const refreshIPOData = async () =>
  (await api.post('/ipo/admin/refresh')).data;
