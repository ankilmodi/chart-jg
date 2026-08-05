/**
 * src/hooks/useLiveMarketData.ts
 * ════════════════════════════════════════════════════════════════════════════
 * Session-aware React Query hooks that automatically switch between
 * LIVE polling and EOD/prev-close fetching based on IST market hours.
 *
 * Key hooks:
 *   useEngineStatus()        — market session + data mode
 *   useEngineOverview()      — NIFTY + BANK NIFTY + VIX + session
 *   useLiveStock(symbol)     — auto LIVE / EOD / PREV_CLOSE for one stock
 *   useSessionClock()        — live IST clock + countdown + session type
 *
 * All hooks:
 *   • Auto-adjust refetchInterval when session changes (no page reload)
 *   • Show stale data while re-fetching (never blank screen)
 *   • Retry 3x on failure with exponential backoff
 *   • Cancel polling when market is closed (saves bandwidth)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import marketDataEngine, {
  type SessionType,
  type DataMode,
  type EngineMarketStatus,
  type EngineMarketOverview,
  type StockSnapshot,
} from '../services/MarketDataEngine';


// ── Helpers ──────────────────────────────────────────────────────────────────

function nowIST(): Date {
  const utc = Date.now() + new Date().getTimezoneOffset() * 60_000;
  return new Date(utc + 5.5 * 3_600_000);
}

function msUntilIST(h: number, m: number): number {
  const now    = nowIST();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  let diff = target.getTime() - now.getTime();
  if (diff <= 0) diff += 24 * 3_600_000;
  return diff;
}

// ── Session clock state ───────────────────────────────────────────────────────

export interface SessionClock {
  sessionType:    SessionType;
  dataMode:       DataMode;
  sessionLabel:   string;
  dataModeLabel:  string;
  sessionColor:   string;
  countdown:      string;       // "hh:mm:ss" or ""
  istTime:        string;       // "HH:MM:SS"
  isMarketOpen:   boolean;
  refreshMs:      number;
}

/** Live 1-second IST clock + session state. Updates every second. */
export function useSessionClock(): SessionClock {
  const [clock, setClock] = useState<SessionClock>(() => ({
    sessionType:   marketDataEngine.getSessionType(),
    dataMode:      marketDataEngine.getDataMode(),
    sessionLabel:  marketDataEngine.getSessionLabel(),
    dataModeLabel: marketDataEngine.getDataModeLabel(),
    sessionColor:  marketDataEngine.getSessionColor(),
    countdown:     marketDataEngine.getCountdown(),
    istTime:       marketDataEngine.getISTNow(),
    isMarketOpen:  marketDataEngine.isMarketOpen(),
    refreshMs:     marketDataEngine.getRefreshMs(),
  }));

  useEffect(() => {
    const tick = () => {
      setClock({
        sessionType:   marketDataEngine.getSessionType(),
        dataMode:      marketDataEngine.getDataMode(),
        sessionLabel:  marketDataEngine.getSessionLabel(),
        dataModeLabel: marketDataEngine.getDataModeLabel(),
        sessionColor:  marketDataEngine.getSessionColor(),
        countdown:     marketDataEngine.getCountdown(),
        istTime:       marketDataEngine.getISTNow(),
        isMarketOpen:  marketDataEngine.isMarketOpen(),
        refreshMs:     marketDataEngine.getRefreshMs(),
      });
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  return clock;
}

// ── Engine status (from backend, authoritative) ───────────────────────────────

export function useEngineStatus() {
  const { refreshMs } = useSessionClock();
  const queryClient   = useQueryClient();

  // Schedule exact timers for 09:15 and 15:30 IST to invalidate queries
  const openTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleTimers = useCallback(() => {
    if (openTimerRef.current)  clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    openTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['engine-status'] });
      queryClient.invalidateQueries({ queryKey: ['engine-overview'] });
      scheduleTimers();
    }, msUntilIST(9, 15));

    closeTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['engine-status'] });
      queryClient.invalidateQueries({ queryKey: ['engine-overview'] });
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

  return useQuery<EngineMarketStatus>({
    queryKey:        ['engine-status'],
    queryFn:         () => marketDataEngine.getMarketStatus(),
    refetchInterval: refreshMs,
    staleTime:       Math.max(refreshMs - 2_000, 5_000),
    retry:           3,
    placeholderData: (prev) => prev,
  });
}

// ── Engine market overview ────────────────────────────────────────────────────

export function useEngineOverview() {
  const { refreshMs } = useSessionClock();

  return useQuery<EngineMarketOverview>({
    queryKey:        ['engine-overview'],
    queryFn:         () => marketDataEngine.getMarketOverview(),
    refetchInterval: refreshMs,
    staleTime:       Math.max(refreshMs - 2_000, 5_000),
    retry:           3,
    placeholderData: (prev) => prev,
  });
}

// ── Single stock auto-data ────────────────────────────────────────────────────

export function useLiveStock(symbol: string) {
  const { refreshMs, dataMode } = useSessionClock();

  return useQuery<StockSnapshot>({
    queryKey:        ['live-stock', symbol, dataMode],
    queryFn:         () => marketDataEngine.getAutoData(symbol),
    refetchInterval: refreshMs,
    staleTime:       Math.max(refreshMs - 2_000, 5_000),
    retry:           3,
    enabled:         Boolean(symbol),
    placeholderData: (prev) => prev,
  });
}

// ── Backwards-compat wrapper (existing useMarketSession callers) ──────────────

export function useMarketEngine() {
  const { data: status } = useEngineStatus();
  const clock = useSessionClock();
  const queryClient = useQueryClient();

  const manualRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['engine-status'] });
    queryClient.invalidateQueries({ queryKey: ['engine-overview'] });
    queryClient.invalidateQueries({ queryKey: ['live-stock'] });
    queryClient.invalidateQueries({ queryKey: ['market-overview'] });
  }, [queryClient]);

  return {
    // From backend (authoritative)
    status,
    // From client engine (instant, always fresh)
    sessionType:   clock.sessionType,
    dataMode:      clock.dataMode,
    sessionLabel:  clock.sessionLabel,
    dataModeLabel: clock.dataModeLabel,
    sessionColor:  clock.sessionColor,
    countdown:     clock.countdown,
    istTime:       clock.istTime,
    isMarketOpen:  clock.isMarketOpen,
    refreshMs:     clock.refreshMs,
    manualRefresh,
  };
}
