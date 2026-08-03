/**
 * React Query hooks for all API endpoints.
 * Auto-refresh every 60 seconds.
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

const DEFAULT_REFETCH = 60_000; // 60 s

// ---------------------------------------------------------------------------
// Market snapshot
// ---------------------------------------------------------------------------
export const useMarket = (refetchInterval = DEFAULT_REFETCH) =>
  useQuery({
    queryKey: ['market'],
    queryFn: fetchMarket,
    refetchInterval,
    staleTime: 30_000,
    retry: 3,
  });

// ---------------------------------------------------------------------------
// Indicators
// ---------------------------------------------------------------------------
export const useIndicators = (refetchInterval = DEFAULT_REFETCH) =>
  useQuery({
    queryKey: ['indicators'],
    queryFn: fetchIndicators,
    refetchInterval,
    staleTime: 30_000,
    retry: 3,
  });

// ---------------------------------------------------------------------------
// Signal
// ---------------------------------------------------------------------------
export const useSignal = (refetchInterval = DEFAULT_REFETCH) =>
  useQuery({
    queryKey: ['signal'],
    queryFn: fetchSignal,
    refetchInterval,
    staleTime: 30_000,
    retry: 3,
  });

// ---------------------------------------------------------------------------
// History (candles)
// ---------------------------------------------------------------------------
export const useHistory = (limit = 100, refetchInterval = DEFAULT_REFETCH) =>
  useQuery({
    queryKey: ['history', limit],
    queryFn: () => fetchHistory(limit),
    refetchInterval,
    staleTime: 30_000,
    retry: 2,
  });

// ---------------------------------------------------------------------------
// Gap analysis
// ---------------------------------------------------------------------------
export const useGapAnalysis = (refetchInterval = DEFAULT_REFETCH) =>
  useQuery({
    queryKey: ['gap'],
    queryFn: fetchGapAnalysis,
    refetchInterval,
    staleTime: 30_000,
    retry: 2,
  });

// ---------------------------------------------------------------------------
// ORB analysis
// ---------------------------------------------------------------------------
export const useOrbAnalysis = (refetchInterval = DEFAULT_REFETCH) =>
  useQuery({
    queryKey: ['orb'],
    queryFn: fetchOrbAnalysis,
    refetchInterval,
    staleTime: 30_000,
    retry: 2,
  });

// ---------------------------------------------------------------------------
// NIFTY 50 stocks live quotes
// ---------------------------------------------------------------------------
export const useStocksQuotes = (refetchInterval = DEFAULT_REFETCH) =>
  useQuery({
    queryKey: ['stocks_quotes'],
    queryFn: fetchStocksQuotes,
    refetchInterval,
    staleTime: 30_000,
    retry: 2,
  });
