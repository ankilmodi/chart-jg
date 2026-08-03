/**
 * src/hooks/useMarketSession.ts
 *
 * React hook that:
 *  - Polls /api/market-status every 30 s (or immediately on mount)
 *  - Updates marketSessionService singleton with server response
 *  - Schedules exact timers to fire at 09:15 and 15:30 IST for
 *    seamless automatic switching — no page refresh needed
 *  - Exposes: status, isOpen, dataSource, refetchInterval
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import marketSessionService from '../services/marketSession';
import type { MarketSessionStatus } from '../services/marketSession';

// ── Helpers ──────────────────────────────────────────────────────────────────
function nowIST(): Date {
  const utc = Date.now() + new Date().getTimezoneOffset() * 60_000;
  return new Date(utc + 5.5 * 3_600_000);
}

/** ms until next IST HH:MM today (or tomorrow if already past) */
function msUntilIST(h: number, m: number): number {
  const now     = nowIST();
  const target  = new Date(now);
  target.setHours(h, m, 0, 0);
  let diff = target.getTime() - now.getTime();
  if (diff <= 0) diff += 24 * 3_600_000;   // already past → next day
  return diff;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useMarketSession() {
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<MarketSessionStatus>(
    () => marketSessionService.getMarketStatus()
  );

  // ── Server poll (every 30 s) ────────────────────────────────────────────
  const { data: raw, error } = useQuery({
    queryKey: ['market-status'],
    queryFn:  () => api.get('/market-status').then(r => r.data),
    refetchInterval: 30_000,
    staleTime:       25_000,
    retry: 2,
  });

  // Update singleton + local state whenever server responds
  useEffect(() => {
    if (!raw) return;
    const updated = marketSessionService.updateFromServer(raw as Record<string, unknown>);
    setStatus(updated);
  }, [raw]);

  // ── Exact session-change timers ─────────────────────────────────────────
  const openTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleTimers = useCallback(() => {
    // Clear previous
    if (openTimerRef.current)  clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    // At 09:15 IST → invalidate market-status so queries re-fetch
    openTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['market-status'] });
      queryClient.invalidateQueries({ queryKey: ['market-overview'] });
      scheduleTimers();   // reschedule for next day
    }, msUntilIST(9, 15));

    // At 15:30 IST → same
    closeTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['market-status'] });
      queryClient.invalidateQueries({ queryKey: ['market-overview'] });
      scheduleTimers();
    }, msUntilIST(15, 30));
  }, [queryClient]);

  useEffect(() => {
    scheduleTimers();
    return () => {
      if (openTimerRef.current)  clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [scheduleTimers]);

  // ── Derived helpers ────────────────────────────────────────────────────
  const isOpen          = status.isOpen;
  const dataSource      = status.dataSource;
  const refetchInterval = status.refreshInterval * 1000; // ms

  const manualRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['market-status'] });
    queryClient.invalidateQueries({ queryKey: ['market-overview'] });
    queryClient.invalidateQueries({ queryKey: ['all-stocks'] });
  }, [queryClient]);

  return { status, isOpen, dataSource, refetchInterval, error, manualRefresh };
}

export default useMarketSession;
