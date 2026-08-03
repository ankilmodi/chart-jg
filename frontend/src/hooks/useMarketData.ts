/**
 * src/hooks/useMarketData.ts
 *
 * React Query hooks for all API endpoints.
 * Refetch interval is driven by MarketSessionService:
 *   - Market OPEN  → 10 s (live polling)
 *   - Market CLOSED → 300 s (cache refresh)
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchMarket,
  fetchIndicators,
  fetchSignal,
  fetchHistory,
  fetchGapAnalysis,
  fetchOrbAnalysis,
  fetchStocksQuotes,
} from '../services/api';
import marketSessionService from '../services/marketSession';

/** Returns live-aware refetch interval in ms. */
function interval(overrideMs?: number): number {
  if (overrideMs !== undefined) return overrideMs;
  return marketSessionService.getRefreshInterval();
}

// ── Market snapshot ──────────────────────────────────────────────────────────
export const useMarket = (refetchIntervalMs?: number) =>
  useQuery({
    queryKey: ['market'],
    queryFn:  fetchMarket,
    refetchInterval: interval(refetchIntervalMs),
    staleTime: 8_000,
    retry: 3,
  });

// ── Indicators ───────────────────────────────────────────────────────────────
export const useIndicators = (refetchIntervalMs?: number) =>
  useQuery({
    queryKey: ['indicators'],
    queryFn:  fetchIndicators,
    refetchInterval: interval(refetchIntervalMs),
    staleTime: 8_000,
    retry: 3,
  });

// ── Signal ───────────────────────────────────────────────────────────────────
export const useSignal = (refetchIntervalMs?: number) =>
  useQuery({
    queryKey: ['signal'],
    queryFn:  fetchSignal,
    refetchInterval: interval(refetchIntervalMs),
    staleTime: 8_000,
    retry: 3,
  });

// ── History (candles) ────────────────────────────────────────────────────────
export const useHistory = (limit = 100, refetchIntervalMs?: number) =>
  useQuery({
    queryKey: ['history', limit],
    queryFn:  () => fetchHistory(limit),
    refetchInterval: interval(refetchIntervalMs),
    staleTime: 8_000,
    retry: 2,
  });

// ── Gap analysis ─────────────────────────────────────────────────────────────
export const useGapAnalysis = (refetchIntervalMs?: number) =>
  useQuery({
    queryKey: ['gap'],
    queryFn:  fetchGapAnalysis,
    refetchInterval: interval(refetchIntervalMs),
    staleTime: 8_000,
    retry: 2,
  });

// ── ORB analysis ─────────────────────────────────────────────────────────────
export const useOrbAnalysis = (refetchIntervalMs?: number) =>
  useQuery({
    queryKey: ['orb'],
    queryFn:  fetchOrbAnalysis,
    refetchInterval: interval(refetchIntervalMs),
    staleTime: 8_000,
    retry: 2,
  });

// ── NIFTY 50 live quotes ─────────────────────────────────────────────────────
export const useStocksQuotes = (refetchIntervalMs?: number) =>
  useQuery({
    queryKey: ['stocks_quotes'],
    queryFn:  fetchStocksQuotes,
    refetchInterval: interval(refetchIntervalMs),
    staleTime: 8_000,
    retry: 2,
  });
