/**
 * src/hooks/useMarketData.ts
 *
 * React Query hooks for all API endpoints.
 * Refetch interval is driven by MarketSessionService:
 *   - Market OPEN  → 10 s (live polling)
 *   - Market CLOSED → 300 s (background cache refresh only)
 *
 * Uses useMarketSession so interval updates automatically when market
 * opens/closes without a page reload.
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchMarket,
  fetchMarketOverview,
  fetchIndicators,
  fetchSignal,
  fetchHistory,
  fetchGapAnalysis,
  fetchOrbAnalysis,
  fetchStocksQuotes,
} from '../services/api';
import { useMarketSession } from './useMarketSession';

// ── Market snapshot ──────────────────────────────────────────────────────────
export const useMarket = (overrideIntervalMs?: number) => {
  const { refetchInterval } = useMarketSession();
  return useQuery({
    queryKey: ['market'],
    queryFn:  fetchMarket,
    refetchInterval: overrideIntervalMs ?? refetchInterval,
    staleTime: 8_000,
    retry: 3,
  });
};

// ── Market overview (Nifty / VIX) ────────────────────────────────────────────
export const useMarketOverview = (overrideIntervalMs?: number) => {
  const { refetchInterval } = useMarketSession();
  return useQuery({
    queryKey: ['market-overview'],
    queryFn:  fetchMarketOverview,
    refetchInterval: overrideIntervalMs ?? refetchInterval,
    staleTime: 30_000,
    retry: 3,
  });
};

// ── Indicators ───────────────────────────────────────────────────────────────
export const useIndicators = (overrideIntervalMs?: number) => {
  const { refetchInterval } = useMarketSession();
  return useQuery({
    queryKey: ['indicators'],
    queryFn:  fetchIndicators,
    refetchInterval: overrideIntervalMs ?? refetchInterval,
    staleTime: 8_000,
    retry: 3,
  });
};

// ── Signal ───────────────────────────────────────────────────────────────────
export const useSignal = (overrideIntervalMs?: number) => {
  const { refetchInterval } = useMarketSession();
  return useQuery({
    queryKey: ['signal'],
    queryFn:  fetchSignal,
    refetchInterval: overrideIntervalMs ?? refetchInterval,
    staleTime: 8_000,
    retry: 3,
  });
};

// ── History (candles) ────────────────────────────────────────────────────────
export const useHistory = (limit = 100, overrideIntervalMs?: number) => {
  const { refetchInterval } = useMarketSession();
  return useQuery({
    queryKey: ['history', limit],
    queryFn:  () => fetchHistory(limit),
    refetchInterval: overrideIntervalMs ?? refetchInterval,
    staleTime: 8_000,
    retry: 2,
  });
};

// ── Gap analysis ─────────────────────────────────────────────────────────────
export const useGapAnalysis = (overrideIntervalMs?: number) => {
  const { refetchInterval } = useMarketSession();
  return useQuery({
    queryKey: ['gap'],
    queryFn:  fetchGapAnalysis,
    refetchInterval: overrideIntervalMs ?? refetchInterval,
    staleTime: 8_000,
    retry: 2,
  });
};

// ── ORB analysis ─────────────────────────────────────────────────────────────
export const useOrbAnalysis = (overrideIntervalMs?: number) => {
  const { refetchInterval } = useMarketSession();
  return useQuery({
    queryKey: ['orb'],
    queryFn:  fetchOrbAnalysis,
    refetchInterval: overrideIntervalMs ?? refetchInterval,
    staleTime: 8_000,
    retry: 2,
  });
};

// ── NIFTY 50 live quotes ─────────────────────────────────────────────────────
export const useStocksQuotes = (overrideIntervalMs?: number) => {
  const { refetchInterval } = useMarketSession();
  return useQuery({
    queryKey: ['stocks_quotes'],
    queryFn:  fetchStocksQuotes,
    refetchInterval: overrideIntervalMs ?? refetchInterval,
    staleTime: 8_000,
    retry: 2,
  });
};
