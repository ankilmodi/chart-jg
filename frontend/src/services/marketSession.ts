/**
 * src/services/marketSession.ts
 * Client-side MarketSessionService.
 * Primary truth: /api/market-status (backend, holiday-aware).
 * Fallback:      local IST calculation (works offline).
 */

export type SessionState = 'LIVE' | 'CLOSED' | 'PRE_OPEN' | 'HOLIDAY';
export type DataSource   = 'live' | 'cached' | 'offline';

export interface MarketSessionStatus {
  isOpen:          boolean;
  isTradingDay:    boolean;
  status:          SessionState;
  dataSource:      DataSource;
  message:         string;
  currentTimeIst:  string;
  nextOpen:        string | null;
  holidayName:     string | null;
  refreshInterval: number;   // seconds
}

// ── IST helpers ─────────────────────────────────────────────────────────────
function nowIST(): Date {
  const utc = Date.now() + new Date().getTimezoneOffset() * 60_000;
  return new Date(utc + 5.5 * 3_600_000);
}
const toMin = (h: number, m: number) => h * 60 + m;
const OPEN_MIN  = toMin(9,  15);
const CLOSE_MIN = toMin(15, 30);

// ── Local fallback logic ─────────────────────────────────────────────────────
function localIsOpen(): boolean {
  const ist = nowIST();
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const m = toMin(ist.getHours(), ist.getMinutes());
  return m >= OPEN_MIN && m <= CLOSE_MIN;
}

function localStatus(): MarketSessionStatus {
  const ist  = nowIST();
  const day  = ist.getDay();
  const mins = toMin(ist.getHours(), ist.getMinutes());
  const open = localIsOpen();

  let status: SessionState  = 'CLOSED';
  let message               = 'Market closed';
  let dataSource: DataSource = 'offline';

  if (day === 0 || day === 6) {
    message = day === 6 ? 'Market closed — Saturday' : 'Market closed — Sunday';
  } else if (mins < OPEN_MIN) {
    status  = 'PRE_OPEN';
    message = 'Pre-open session | Market opens at 09:15 IST';
  } else if (mins > CLOSE_MIN) {
    message = 'Market closed — After 3:30 PM IST';
  } else {
    status     = 'LIVE';
    message    = 'Market open — Live data active';
    dataSource = 'live';
  }

  return {
    isOpen:          open,
    isTradingDay:    day !== 0 && day !== 6,
    status,
    dataSource,
    message,
    currentTimeIst:  ist.toLocaleTimeString('en-IN'),
    nextOpen:        null,
    holidayName:     null,
    refreshInterval: open ? 10 : 300,
  };
}

// ── Service class ────────────────────────────────────────────────────────────
class MarketSessionService {
  private _status: MarketSessionStatus | null = null;
  private _fetchedAt = 0;

  isMarketOpen():       boolean { return this._status?.isOpen    ?? localIsOpen(); }
  isTradingDay():       boolean { return this._status?.isTradingDay ?? (nowIST().getDay() !== 0 && nowIST().getDay() !== 6); }
  shouldUseLiveData():  boolean { return this.isMarketOpen(); }
  shouldUseOfflineData(): boolean { return !this.isMarketOpen(); }

  /** Refresh interval in milliseconds: 10 s live, 300 s closed. */
  getRefreshInterval(): number { return this.isMarketOpen() ? 10_000 : 300_000; }

  getMarketStatus(): MarketSessionStatus { return this._status ?? localStatus(); }

  /** Called by useMarketSession after each /api/market-status response. */
  updateFromServer(payload: Record<string, unknown>): MarketSessionStatus {
    const s: MarketSessionStatus = {
      isOpen:          Boolean(payload.is_open),
      isTradingDay:    Boolean(payload.is_trading_day),
      status:          (payload.status as SessionState)   ?? 'CLOSED',
      dataSource:      (payload.data_source as DataSource) ?? 'offline',
      message:         String(payload.message ?? ''),
      currentTimeIst:  String(payload.current_time_ist ?? ''),
      nextOpen:        (payload.next_open  as string) || null,
      holidayName:     (payload.holiday_name as string) || null,
      refreshInterval: Number(payload.refresh_interval ?? 300),
    };
    this._status    = s;
    this._fetchedAt = Date.now();
    return s;
  }
}

export const marketSessionService = new MarketSessionService();
export default marketSessionService;
