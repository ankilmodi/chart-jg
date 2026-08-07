import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Chip, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  TablePagination, Skeleton, Alert, LinearProgress, Divider,
  Card, CardContent, ToggleButtonGroup, ToggleButton, TextField,
  InputAdornment, IconButton, Tooltip, useTheme, Button,
} from '@mui/material';
import {
  TrendingUp, TrendingDown, CheckCircle, Cancel, RemoveCircle,
  Refresh, Search, EmojiEvents, MonetizationOn, Shield, Circle,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { fetchTopBuy } from '../services/api';
import type { StockResult, StocksResponse } from '../utils/types';

// ─── Inlined helpers (self-contained, no cross-page imports) ──────────────────
const getSMCSignal = (stock: StockResult): string => {
  const volRatio    = stock.volume_ratio  || 1;
  const deliveryPct = stock.delivery_pct  || 0;
  const price       = stock.current_price || 0;
  const changePct   = stock.change_pct    || 0;
  const isUp        = changePct > 0;
  const isDown      = changePct < 0;
  const vwap        = stock.vwap  || price;
  const ema20       = stock.ema20 || price;

  if (volRatio > 2.0 && deliveryPct > 60 && isUp)  return 'Institutional Buy Flow';
  if (volRatio > 2.0 && deliveryPct > 60 && isDown) return 'Institutional Selling';
  if (volRatio > 2.5 && Math.abs(changePct) < 0.5)  return 'Liquidity Grab';
  if (volRatio > 1.5 && isUp   && price > vwap && price > ema20) return 'Smart Money Accumulation';
  if (volRatio > 1.5 && isDown && price < vwap && price < ema20) return 'Smart Money Distribution';
  if (stock.support    && price <= stock.support    * 1.012) return 'Order Block Support';
  if (stock.resistance && price >= stock.resistance * 0.988) return 'Order Block Resistance';
  if (price > (stock.resistance || Infinity) * 0.998 && volRatio > 1.3) return 'Bullish Breakout';
  if (price < (stock.support    || 0)        * 1.002 && volRatio > 1.3) return 'Bearish Breakdown';
  return 'Retail Consolidation';
};

const getActionVerdict = (signal: string | undefined): { label: string; color: 'success' | 'primary' | 'warning' | 'info' | 'error' | 'default' } => {
  const s = (signal || '').toUpperCase();
  if (s.includes('STRONG BUY') || s === 'ACCUMULATE') return { label: 'BUY / ACCUMULATE', color: 'success' };
  if (s === 'BUY')              return { label: 'BUY',              color: 'primary' };
  if (s === 'HOLD')             return { label: 'HOLD',             color: 'warning' };
  if (s === 'WATCH')            return { label: 'WAIT',             color: 'info'    };
  if (s.includes('STRONG SELL'))return { label: 'SELL / BOOK PROFIT', color: 'error' };
  if (s === 'SELL')             return { label: 'SELL',             color: 'error'   };
  return { label: 'AVOID', color: 'default' };
};

// ─── Types ────────────────────────────────────────────────────────────────────
type ResultStatus = 'TARGET_3' | 'TARGET_2' | 'TARGET_1' | 'RUNNING' | 'STOP_LOSS' | 'ALL';

interface EnrichedStock extends StockResult {
  _stopLoss: number;
  _t1: number;
  _t2: number;
  _t3: number;
  _risk: number;
  _pnlPct: number;
  _status: 'TARGET_3' | 'TARGET_2' | 'TARGET_1' | 'RUNNING' | 'STOP_LOSS';
  _verdict: string;
  _smcSignal: string;
}

// ─── Market hours ─────────────────────────────────────────────────────────────
const isMarketOpen = (): boolean => {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 9 * 60 + 15 && mins < 15 * 60 + 30;
};

const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const todayLabel = () =>
  new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ─── Stop Loss / Target Calculators ──────────────────────────────────────────
const calcSL = (s: StockResult): number => {
  if (s.stop_loss && s.stop_loss > 0) return s.stop_loss;
  const p = s.current_price || 0;
  const atr = s.atr || p * 0.02;
  const isBuy = !s.signal?.toUpperCase().includes('SELL') && s.trade_type !== 'sell';
  if (isBuy) {
    const c = [s.support, s.ema20, s.vwap, p - atr * 1.5].filter(Boolean) as number[];
    const below = c.filter(x => x < p);
    return below.length ? Math.max(...below) : p - atr * 1.5;
  }
  const c = [s.resistance, s.ema20, s.vwap, p + atr * 1.5].filter(Boolean) as number[];
  const above = c.filter(x => x > p);
  return above.length ? Math.min(...above) : p + atr * 1.5;
};

const calcTargets = (s: StockResult) => {
  const p = s.current_price || 0;
  const sl = calcSL(s);
  const risk = Math.max(Math.abs(p - sl), p * 0.005);
  const isBuy = !s.signal?.toUpperCase().includes('SELL') && s.trade_type !== 'sell';
  const dir = isBuy ? 1 : -1;
  return {
    t1: s.target1 || p + dir * risk,
    t2: s.target2 || p + dir * risk * 2,
    t3: s.target3 || p + dir * risk * 3,
    risk,
  };
};

// ─── Derive result status based on current price vs levels ───────────────────
const deriveStatus = (s: StockResult): EnrichedStock['_status'] => {
  const p = s.current_price || 0;
  const sl = calcSL(s);
  const { t1, t2, t3 } = calcTargets(s);
  const isBuy = !s.signal?.toUpperCase().includes('SELL') && s.trade_type !== 'sell';

  if (isBuy) {
    if (p <= sl) return 'STOP_LOSS';
    if (p >= t3)  return 'TARGET_3';
    if (p >= t2)  return 'TARGET_2';
    if (p >= t1)  return 'TARGET_1';
    return 'RUNNING';
  } else {
    if (p >= sl)  return 'STOP_LOSS';
    if (p <= t3)  return 'TARGET_3';
    if (p <= t2)  return 'TARGET_2';
    if (p <= t1)  return 'TARGET_1';
    return 'RUNNING';
  }
};

const enrich = (s: StockResult): EnrichedStock => {
  const sl = calcSL(s);
  const { t1, t2, t3, risk } = calcTargets(s);
  const p = s.current_price || 0;
  const pnlPct = risk > 0 ? ((p - (p - risk)) / (p - risk)) * 100 : 0;
  const status = deriveStatus(s);
  const chg = s.change_pct || 0;

  return {
    ...s,
    _stopLoss: sl,
    _t1: t1,
    _t2: t2,
    _t3: t3,
    _risk: risk,
    _pnlPct: chg,
    _status: status,
    _verdict: getActionVerdict(s.signal).label,
    _smcSignal: getSMCSignal(s),
  };
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  TARGET_3: { label: '🎯 T3 Hit', color: '#1565c0', bg: '#e3f2fd', chipColor: 'primary'  as const },
  TARGET_2: { label: '✅ T2 Hit', color: '#2e7d32', bg: '#e8f5e9', chipColor: 'success'  as const },
  TARGET_1: { label: '✔ T1 Hit',  color: '#00897b', bg: '#e0f2f1', chipColor: 'success'  as const },
  RUNNING:  { label: '🔄 Running', color: '#f57f17', bg: '#fff8e1', chipColor: 'warning'  as const },
  STOP_LOSS:{ label: '🛑 SL Hit', color: '#c62828', bg: '#ffebee', chipColor: 'error'    as const },
};

// ─── RSI color ────────────────────────────────────────────────────────────────
const rsiColor = (v: number) => v >= 70 ? '#f44336' : v >= 60 ? '#ff9800' : v >= 40 ? '#2196f3' : v >= 30 ? '#8bc34a' : '#4caf50';

// ─── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard: React.FC<{
  icon: React.ReactNode; label: string; value: number | string;
  color: string; bg: string; subLabel?: string;
}> = ({ icon, label, value, color, bg, subLabel }) => (
  <Card elevation={0} sx={{ flex: '1 1 150px', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
    <CardContent sx={{ p: '12px !important' }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
        <Box sx={{ color, fontSize: 18, display: 'flex' }}>{icon}</Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>{label}</Typography>
      </Stack>
      <Typography sx={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{value}</Typography>
      {subLabel && <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.3 }}>{subLabel}</Typography>}
    </CardContent>
  </Card>
);

// ─── Skeleton Rows ────────────────────────────────────────────────────────────
const SkeletonRows = ({ count = 8 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <TableRow key={i}>
        {[140, 100, 80, 160, 130, 80, 85, 85, 85, 90].map((w, j) => (
          <TableCell key={j} sx={{ py: 1.5 }}>
            <Skeleton variant="text" width={w} height={16} />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

// ─── Column definitions ────────────────────────────────────────────────────────
const COLS = [
  { id: 'symbol',     label: 'Stock Ticker',       minWidth: 150 },
  { id: 'cur_price',  label: 'Current Price (₹)',   minWidth: 110, align: 'right' as const },
  { id: 'rsi',        label: 'RSI',                 minWidth: 70,  align: 'center' as const },
  { id: 'smc',        label: 'SMC Signal',          minWidth: 170 },
  { id: 'verdict',    label: 'Action Verdict',      minWidth: 145, align: 'center' as const },
  { id: 'sl',         label: 'Stop Loss',           minWidth: 90,  align: 'right' as const },
  { id: 't1',         label: 'Target 1 (1M)',       minWidth: 90,  align: 'right' as const },
  { id: 't2',         label: 'Target 2 (1M)',       minWidth: 90,  align: 'right' as const },
  { id: 't3',         label: 'Target 3 (1M)',       minWidth: 90,  align: 'right' as const },
  { id: 'status',     label: 'Today\'s Result',     minWidth: 110, align: 'center' as const },
];

// ─── SMC Signal pill ──────────────────────────────────────────────────────────
const SMC_COLORS: Record<string, string> = {
  'Institutional Buy Flow': '#1565c0', 'Institutional Selling': '#b71c1c',
  'Smart Money Accumulation': '#2e7d32', 'Smart Money Distribution': '#e65100',
  'Bullish Breakout': '#00695c', 'Bearish Breakdown': '#880e4f',
  'Liquidity Grab': '#4527a0', 'Order Block Support': '#1b5e20',
  'Order Block Resistance': '#bf360c', 'Retail Consolidation': '#546e7a',
};
const SmcPill: React.FC<{ value: string }> = ({ value }) => {
  const c = SMC_COLORS[value] || '#546e7a';
  return (
    <Box sx={{ display: 'inline-block', px: 0.8, py: 0.2, borderRadius: 1, bgcolor: c + '22', border: `1px solid ${c}55` }}>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: c }}>{value}</Typography>
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TodayResult() {
  const theme   = useTheme();
  const isDark  = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const [marketOpen,   setMarketOpen]   = useState(isMarketOpen());
  const [lastUpdated,  setLastUpdated]  = useState('');
  const [statusFilter, setStatusFilter] = useState<ResultStatus>('ALL');
  const [search,       setSearch]       = useState('');
  const [orderBy,      setOrderBy]      = useState('_pnlPct');
  const [order,        setOrder]        = useState<'asc' | 'desc'>('desc');
  const [page,         setPage]         = useState(0);
  const [rowsPerPage,  setRowsPerPage]  = useState(25);

  // Re-check market every minute
  useEffect(() => {
    const t = setInterval(() => setMarketOpen(isMarketOpen()), 60_000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery<StocksResponse>({
    queryKey: ['today-result'],
    queryFn:  () => fetchTopBuy(100, 'buy'),
    refetchInterval: marketOpen ? 10_000 : 300_000,
    staleTime: marketOpen ? 8_000 : 60_000,
  });

  useEffect(() => {
    if (dataUpdatedAt) setLastUpdated(fmtTime(new Date(dataUpdatedAt)));
  }, [dataUpdatedAt]);

  // Robust data extraction — handles {stocks: []}, plain array, or {data: []}
  const raw: StockResult[] = Array.isArray(data)
    ? (data as any)
    : (data as any)?.stocks ?? (data as any)?.data ?? [];
  const enriched: EnrichedStock[] = raw.map(enrich);

  // ── Filters ──
  let filtered = enriched;
  if (search.trim()) {
    const q = search.trim().toUpperCase();
    filtered = filtered.filter(s => s.symbol.includes(q) || (s.name || '').toUpperCase().includes(q));
  }
  if (statusFilter !== 'ALL') {
    filtered = filtered.filter(s => s._status === statusFilter);
  }

  // ── Sort ──
  const sorted = [...filtered].sort((a, b) => {
    const av = (a as any)[orderBy] ?? 0;
    const bv = (b as any)[orderBy] ?? 0;
    return order === 'asc'
      ? (av < bv ? -1 : av > bv ? 1 : 0)
      : (av > bv ? -1 : av < bv ? 1 : 0);
  });

  const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSort = (col: string) => {
    setOrder(col === orderBy && order === 'desc' ? 'asc' : 'desc');
    setOrderBy(col);
    setPage(0);
  };

  // ── Summary stats ──
  const t3Count = enriched.filter(s => s._status === 'TARGET_3').length;
  const t2Count = enriched.filter(s => s._status === 'TARGET_2').length;
  const t1Count = enriched.filter(s => s._status === 'TARGET_1').length;
  const runningCount = enriched.filter(s => s._status === 'RUNNING').length;
  const slCount = enriched.filter(s => s._status === 'STOP_LOSS').length;
  const hitCount = t1Count + t2Count + t3Count;
  const successRate = enriched.length > 0
    ? Math.round((hitCount / enriched.length) * 100)
    : 0;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 } }}>

      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2} flexWrap="wrap">
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontSize: 22, fontWeight: 900 }}>📊 Today's Result</Typography>
            <Chip label="LIVE" size="small" color="success"
              sx={{ fontWeight: 900, fontSize: 10, height: 20, animation: 'pulse 1.5s ease-in-out infinite',
                '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } } }} />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            {todayLabel()} • Profit &amp; Loss Tracker
          </Typography>
        </Box>
        <Box flex={1} />

        {/* Market status */}
        <Stack direction="row" spacing={0.8} alignItems="center">
          <Circle sx={{
            fontSize: 9, color: marketOpen ? '#2e7d32' : '#ef5350',
            animation: marketOpen ? 'pulse2 1.5s ease-in-out infinite' : 'none',
            '@keyframes pulse2': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } }
          }} />
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: marketOpen ? '#2e7d32' : '#ef5350' }}>
            {marketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
          </Typography>
          {lastUpdated && (
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              • Updated: <strong>{lastUpdated}</strong>
            </Typography>
          )}
        </Stack>

        <Tooltip title="Refresh now">
          <IconButton size="small" onClick={() => refetch()}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* ── Summary Cards ── */}
      <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" sx={{ gap: 1.5 }}>
        <SummaryCard
          icon={<EmojiEvents />} label="Success Rate" value={`${successRate}%`}
          color="#f57f17" bg="#fff8e1" subLabel={`${hitCount} of ${enriched.length} hits`}
        />
        <SummaryCard
          icon={<MonetizationOn />} label="T3 Hit (Best)" value={t3Count}
          color="#1565c0" bg="#e3f2fd" subLabel="3× Reward"
        />
        <SummaryCard
          icon={<CheckCircle />} label="T2 Hit" value={t2Count}
          color="#2e7d32" bg="#e8f5e9" subLabel="2× Reward"
        />
        <SummaryCard
          icon={<CheckCircle />} label="T1 Hit" value={t1Count}
          color="#00897b" bg="#e0f2f1" subLabel="1× Reward"
        />
        <SummaryCard
          icon={<RemoveCircle />} label="Running" value={runningCount}
          color="#f57f17" bg="#fff8e1" subLabel="In progress"
        />
        <SummaryCard
          icon={<Cancel />} label="Stop Loss Hit" value={slCount}
          color="#c62828" bg="#ffebee" subLabel="Loss"
        />
      </Stack>

      {/* ── Controls ── */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2, p: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>

          {/* Status filter */}
          <ToggleButtonGroup size="small" value={statusFilter} exclusive
            onChange={(_, v) => { if (v !== null) { setStatusFilter(v); setPage(0); } }}>
            <ToggleButton value="ALL" sx={{ fontSize: 10, fontWeight: 800, px: 1 }}>All</ToggleButton>
            <ToggleButton value="TARGET_3" sx={{ fontSize: 10, fontWeight: 800, px: 1, color: '#1565c0', '&.Mui-selected': { bgcolor: '#e3f2fd', color: '#1565c0' } }}>
              🎯 T3
            </ToggleButton>
            <ToggleButton value="TARGET_2" sx={{ fontSize: 10, fontWeight: 800, px: 1, color: '#2e7d32', '&.Mui-selected': { bgcolor: '#e8f5e9', color: '#2e7d32' } }}>
              ✅ T2
            </ToggleButton>
            <ToggleButton value="TARGET_1" sx={{ fontSize: 10, fontWeight: 800, px: 1, color: '#00897b', '&.Mui-selected': { bgcolor: '#e0f2f1', color: '#00897b' } }}>
              ✔ T1
            </ToggleButton>
            <ToggleButton value="RUNNING" sx={{ fontSize: 10, fontWeight: 800, px: 1, color: '#f57f17', '&.Mui-selected': { bgcolor: '#fff8e1', color: '#f57f17' } }}>
              🔄 Running
            </ToggleButton>
            <ToggleButton value="STOP_LOSS" sx={{ fontSize: 10, fontWeight: 800, px: 1, color: '#c62828', '&.Mui-selected': { bgcolor: '#ffebee', color: '#c62828' } }}>
              🛑 SL Hit
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Search */}
          <TextField
            size="small"
            placeholder="Search symbol or name…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            sx={{ width: 200 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            }}
          />

          <Chip
            label={`${sorted.length} stocks`}
            size="small"
            color="primary"
            sx={{ fontWeight: 800 }}
          />
          {(isLoading || isFetching) && <LinearProgress sx={{ width: 60, borderRadius: 1 }} />}
        </Stack>
      </Paper>

      {/* ── Error ── */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error).message || 'Failed to load data. Please retry.'}
        </Alert>
      )}

      {/* ── Table ── */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden',
        background: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}>

        {/* Market status bar */}
        <Stack direction="row" spacing={1.5} alignItems="center"
          sx={{ px: 2, py: 0.75, bgcolor: isDark ? 'rgba(0,0,0,0.4)' : '#f4f7ff',
            borderBottom: '1px solid', borderColor: 'divider' }}>
          <Circle sx={{ fontSize: 9, color: marketOpen ? '#2e7d32' : '#ef5350' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: marketOpen ? '#2e7d32' : '#ef5350' }}>
            {marketOpen ? 'MARKET OPEN • Auto-refreshing every 10s' : 'MARKET CLOSED • Showing latest data'}
          </Typography>
          <Box flex={1} />
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            Today: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Typography>
        </Stack>

        <TableContainer sx={{ maxHeight: 580, overflowX: 'auto' }}>
          <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                {COLS.map(col => (
                  <TableCell key={col.id} align={col.align || 'left'}
                    sx={{ minWidth: col.minWidth, fontWeight: 900, fontSize: '0.68rem',
                      letterSpacing: 0.6, textTransform: 'uppercase',
                      bgcolor: isDark ? '#0b1120' : '#f4f7ff', whiteSpace: 'nowrap',
                      borderBottom: '2px solid', borderColor: isDark ? 'rgba(0,176,255,0.25)' : 'rgba(21,101,192,0.18)',
                      py: 1.5 }}>
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading && <SkeletonRows count={10} />}

              {!isLoading && paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLS.length} align="center" sx={{ py: 10, border: 'none' }}>
                    <Typography sx={{ fontSize: 36, mb: 1 }}>📊</Typography>
                    <Typography sx={{ fontWeight: 800, color: 'text.secondary' }}>No results found</Typography>
                    <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>Try changing the status filter above.</Typography>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && paginated.map((row, idx) => {
                const up    = (row.change_pct || 0) >= 0;
                const cfg   = STATUS_CONFIG[row._status];
                const vData = getActionVerdict(row.signal);

                return (
                  <TableRow hover key={row.symbol}
                    onClick={() => navigate(`/stock/${row.symbol}`)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                      bgcolor: idx % 2 === 0
                        ? 'transparent'
                        : isDark ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.013)',
                      borderLeft: '3px solid',
                      borderLeftColor: row._status === 'STOP_LOSS' ? '#c62828'
                        : row._status === 'RUNNING' ? '#f57f17'
                        : '#2e7d32',
                      '&:hover': { bgcolor: isDark ? 'rgba(0,176,255,0.06)!important' : 'rgba(21,101,192,0.05)!important' },
                    }}>

                    {/* Symbol */}
                    <TableCell sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 900, color: 'primary.main' }}>{row.symbol}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary' }} noWrap>{row.name}</Typography>
                      <Stack direction="row" spacing={0.4} mt={0.3}>
                        {row.cap_category && (
                          <Chip label={row.cap_category} size="small" variant="outlined"
                            sx={{ height: 14, fontSize: 9, fontWeight: 700, '.MuiChip-label': { px: 0.5 } }} />
                        )}
                        {row.fo_eligible && (
                          <Chip label="F&O" size="small" color="primary" variant="outlined"
                            sx={{ height: 14, fontSize: 9, fontWeight: 700, '.MuiChip-label': { px: 0.5 } }} />
                        )}
                      </Stack>
                    </TableCell>

                    {/* Current Price */}
                    <TableCell align="right" sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 900, color: up ? '#2e7d32' : '#c62828', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{(row.current_price ?? 0).toFixed(2)}
                      </Typography>
                      <Stack direction="row" spacing={0.3} alignItems="center" justifyContent="flex-end">
                        {up ? <TrendingUp sx={{ fontSize: 11, color: '#2e7d32' }} /> : <TrendingDown sx={{ fontSize: 11, color: '#c62828' }} />}
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: up ? '#2e7d32' : '#c62828', fontVariantNumeric: 'tabular-nums' }}>
                          {up ? '+' : ''}{(row.change_pct || 0).toFixed(2)}%
                        </Typography>
                      </Stack>
                    </TableCell>

                    {/* RSI */}
                    <TableCell align="center" sx={{ py: 1.25 }}>
                      {row.rsi != null
                        ? <Typography sx={{ fontSize: 13, fontWeight: 900, color: rsiColor(row.rsi), fontVariantNumeric: 'tabular-nums' }}>
                            {row.rsi.toFixed(2)}
                          </Typography>
                        : <Typography sx={{ color: 'text.disabled' }}>—</Typography>}
                    </TableCell>

                    {/* SMC Signal */}
                    <TableCell sx={{ py: 1.25 }}><SmcPill value={row._smcSignal} /></TableCell>

                    {/* Action Verdict */}
                    <TableCell align="center" sx={{ py: 1.25 }}>
                      <Chip label={vData.label} size="small" color={vData.color}
                        sx={{ fontWeight: 900, fontSize: '0.62rem', height: 22, minWidth: 120 }} />
                    </TableCell>

                    {/* Stop Loss */}
                    <TableCell align="right" sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#ef5350', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{row._stopLoss.toFixed(2)}
                      </Typography>
                    </TableCell>

                    {/* T1 */}
                    <TableCell align="right" sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#43a047', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{row._t1.toFixed(2)}
                      </Typography>
                    </TableCell>

                    {/* T2 */}
                    <TableCell align="right" sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#00897b', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{row._t2.toFixed(2)}
                      </Typography>
                    </TableCell>

                    {/* T3 */}
                    <TableCell align="right" sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#1565c0', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{row._t3.toFixed(2)}
                      </Typography>
                    </TableCell>

                    {/* Today's Result status */}
                    <TableCell align="center" sx={{ py: 1.25 }}>
                      <Chip
                        label={cfg.label}
                        size="small"
                        color={cfg.chipColor}
                        sx={{ fontWeight: 900, fontSize: '0.65rem', height: 22, minWidth: 90 }}
                      />
                    </TableCell>

                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={sorted.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }}
        />
      </Paper>

      {/* Footer */}
      <Typography variant="caption" color="text.secondary" mt={1.5} display="block">
        {sorted.length} stocks displayed • {marketOpen ? 'Live data · auto-refresh 10s' : 'Market closed · showing latest data'} •{' '}
        {lastUpdated ? `Last updated: ${lastUpdated}` : '—'}
      </Typography>
    </Box>
  );
}
