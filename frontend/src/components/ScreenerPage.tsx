import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Stack, Chip, Alert, LinearProgress,
  IconButton, Tooltip, ToggleButtonGroup, ToggleButton,
  TextField, InputAdornment, MenuItem, Select, FormControl,
  InputLabel, Checkbox, FormControlLabel, Paper, Divider,
  Button, Collapse,
} from '@mui/material';
import {
  Refresh, Download, Search, FilterList, ExpandMore, ExpandLess, Clear,
} from '@mui/icons-material';
import { PageHeader } from './PageHeader';
import { useQuery } from '@tanstack/react-query';
import { StockTable, getSMCSignal, getActionVerdict } from './StockTable';
import { exportCSV } from '../services/api';
import type { StockResult, StocksResponse } from '../utils/types';
import type { ScreenerParams } from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTORS = [
  'ALL', 'Banking & Finance', 'IT & Tech', 'Energy & Power',
  'Auto & Auto Ancil', 'Pharma & Healthcare', 'FMCG', 'Metals & Mining',
  'Real Estate', 'Infrastructure', 'Telecom', 'Services', 'Capital Goods',
];

const SMC_SIGNALS = [
  'ALL', 'Institutional Buy Flow', 'Institutional Selling', 'Bullish Breakout',
  'Bearish Breakdown', 'Smart Money Accumulation', 'Smart Money Distribution',
  'Liquidity Grab', 'Order Block Support', 'Order Block Resistance', 'Retail Consolidation',
];

const VERDICTS = [
  'ALL', 'BUY / ACCUMULATE', 'BUY', 'HOLD', 'WAIT', 'SELL', 'SELL / BOOK PROFIT', 'AVOID',
];

const RSI_RANGES = [
  'ALL', 'Overbought (70+)', 'Bullish (60-69)', 'Neutral (40-59)',
  'Bearish (30-39)', 'Oversold (<30)',
];

const CAP_OPTIONS = [
  { value: 'ALL',       label: 'ALL'   },
  { value: 'LARGE CAP', label: 'LARGE' },
  { value: 'MID CAP',   label: 'MID'   },
  { value: 'SMALL CAP', label: 'SMALL' },
  { value: 'F&O',       label: 'F&O'   },
];

// ─── Market hours helper (IST 09:15 – 15:30 Mon-Fri) ─────────────────────────
const isMarketOpen = (): boolean => {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();          // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const h = ist.getHours();
  const m = ist.getMinutes();
  const mins = h * 60 + m;
  return mins >= 9 * 60 + 15 && mins < 15 * 60 + 30;
};

const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  title: string;
  subtitle?: string;
  icon?: string;
  queryKey: string;
  fetcher: (tradeType: 'buy' | 'sell', params?: ScreenerParams) => Promise<StocksResponse>;
  refetchInterval?: number;
}

// ─── ScreenerPage ─────────────────────────────────────────────────────────────
export const ScreenerPage: React.FC<Props> = ({
  title, subtitle, icon, queryKey, fetcher,
}) => {
  // ── Market status ──
  const [marketOpen,    setMarketOpen]    = useState<boolean>(isMarketOpen());
  const [lastUpdated,   setLastUpdated]   = useState<string>('');
  const [filtersOpen,   setFiltersOpen]   = useState<boolean>(false);

  // ── Filter state ──
  const [tradeType,     setTradeType]     = useState<'buy' | 'sell'>('buy');
  const [capCategory,   setCapCategory]   = useState<string>('ALL');
  const [sectorFilter,  setSectorFilter]  = useState<string>('ALL');
  const [rsiFilter,     setRsiFilter]     = useState<string>('ALL');
  const [smcFilter,     setSmcFilter]     = useState<string>('ALL');
  const [verdictFilter, setVerdictFilter] = useState<string>('ALL');
  const [nifty50Filter, setNifty50Filter] = useState<boolean>(false);
  const [highVolFilter, setHighVolFilter] = useState<boolean>(false);
  const [foFilter,      setFoFilter]      = useState<boolean>(false);
  const [searchQuery,   setSearchQuery]   = useState<string>('');
  const [page,          setPage]          = useState<number>(0);
  const [rowsPerPage,   setRowsPerPage]   = useState<number>(25);

  // Re-check market status every minute
  useEffect(() => {
    const t = setInterval(() => setMarketOpen(isMarketOpen()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Dynamic refetch interval: 10s when open, 5min when closed
  const dynamicInterval = marketOpen ? 10_000 : 300_000;

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery<StocksResponse>({
    queryKey: [queryKey, tradeType, capCategory, sectorFilter, searchQuery, page, rowsPerPage],
    queryFn: () => {
      // Pass params to fetcher — individual fetchers may or may not use them.
      // Frontend filters (RSI, SMC, Verdict, Nifty50, F&O, HighVol) always apply on the returned data.
      const params: ScreenerParams = {
        page: page + 1,
        limit: rowsPerPage,
        cap_category: capCategory !== 'ALL' ? capCategory : undefined,
        sector:       sectorFilter !== 'ALL' ? sectorFilter : undefined,
        search:       searchQuery.trim() || undefined,
      };
      return fetcher(tradeType, params);
    },
    refetchInterval: dynamicInterval,
    staleTime: marketOpen ? 8_000 : 60_000,
  });

  // Track last updated time
  useEffect(() => {
    if (dataUpdatedAt) setLastUpdated(fmtTime(new Date(dataUpdatedAt)));
  }, [dataUpdatedAt]);

  // ── Base stock list ──
  let stocks: StockResult[] = (data?.stocks as any) ?? [];
  const totalFromServer: number = data?.total ?? stocks.length;

  // ── Frontend filters ──
  if (foFilter)        stocks = stocks.filter(s => s.fo_eligible);
  if (highVolFilter)   stocks = stocks.filter(s => (s.volume_ratio || 0) >= 2 || (s.volume || 0) > 1_000_000);
  if (nifty50Filter)   stocks = stocks.filter(s => s.index?.toUpperCase().includes('NIFTY 50'));
  if (smcFilter    !== 'ALL') stocks = stocks.filter(s => getSMCSignal(s) === smcFilter);
  if (verdictFilter !== 'ALL') stocks = stocks.filter(s => getActionVerdict(s.signal).label === verdictFilter);
  if (rsiFilter    !== 'ALL') {
    stocks = stocks.filter(s => {
      if (s.rsi == null) return false;
      if (rsiFilter === 'Overbought (70+)')  return s.rsi >= 70;
      if (rsiFilter === 'Bullish (60-69)')   return s.rsi >= 60 && s.rsi < 70;
      if (rsiFilter === 'Neutral (40-59)')   return s.rsi >= 40 && s.rsi < 60;
      if (rsiFilter === 'Bearish (30-39)')   return s.rsi >= 30 && s.rsi < 40;
      if (rsiFilter === 'Oversold (<30)')    return s.rsi < 30;
      return true;
    });
  }

  const totalCount = stocks.length;

  const resetFilters = useCallback(() => {
    setSectorFilter('ALL'); setRsiFilter('ALL'); setSmcFilter('ALL');
    setVerdictFilter('ALL'); setNifty50Filter(false); setHighVolFilter(false);
    setFoFilter(false); setCapCategory('ALL'); setSearchQuery(''); setPage(0);
  }, []);

  const hasActiveFilters = sectorFilter !== 'ALL' || rsiFilter !== 'ALL' || smcFilter !== 'ALL' ||
    verdictFilter !== 'ALL' || nifty50Filter || highVolFilter || foFilter || capCategory !== 'ALL' || searchQuery.trim();

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 } }}>
      <PageHeader title={title} icon={icon} subtitle={subtitle} />

      {/* ── Top control bar ── */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2, overflow: 'hidden' }}>
        {/* Row 1: Primary controls */}
        <Stack
          direction="row" spacing={1} alignItems="center" flexWrap="wrap"
          sx={{ p: 1.5, gap: 1 }}
        >
          {/* BUY / SELL */}
          <ToggleButtonGroup
            value={tradeType} exclusive size="small"
            onChange={(_, val) => { if (val) { setTradeType(val); setPage(0); } }}
          >
            <ToggleButton value="buy"
              sx={{ fontWeight: 800, fontSize: 11, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.main', color: '#fff' } }}>
              🟢 BUY (LONG)
            </ToggleButton>
            <ToggleButton value="sell"
              sx={{ fontWeight: 800, fontSize: 11, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.main', color: '#fff' } }}>
              🔴 SELL (SHORT)
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Market Cap */}
          <ToggleButtonGroup size="small" value={capCategory} exclusive
            onChange={(_, val) => { if (val) { setCapCategory(val); setPage(0); } }}>
            {CAP_OPTIONS.map(o => (
              <ToggleButton key={o.value} value={o.value}
                sx={{ py: 0.3, px: 0.9, fontSize: 10, fontWeight: 700 }}>
                {o.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {/* Search */}
          <TextField
            size="small"
            placeholder="Search symbol or name…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
            sx={{ width: { xs: '100%', sm: 200 }, flexShrink: 0 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              endAdornment: searchQuery
                ? <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setSearchQuery(''); setPage(0); }}>
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                : null,
            }}
          />

          {/* Count + Status chips */}
          {data && (
            <Chip
              label={`${totalCount} stocks`}
              size="small"
              color={tradeType === 'buy' ? 'success' : 'error'}
              sx={{ fontWeight: 800 }}
            />
          )}
          {(isLoading || isFetching) && <LinearProgress sx={{ width: 60, borderRadius: 1 }} />}

          <Box flex={1} />

          {hasActiveFilters && (
            <Tooltip title="Clear all filters">
              <Button size="small" variant="outlined" color="warning" startIcon={<Clear />}
                onClick={resetFilters} sx={{ fontWeight: 700, fontSize: 11 }}>
                Reset
              </Button>
            </Tooltip>
          )}

          <Tooltip title="Toggle filters">
            <Button
              size="small" variant={filtersOpen ? 'contained' : 'outlined'}
              startIcon={<FilterList />}
              endIcon={filtersOpen ? <ExpandLess /> : <ExpandMore />}
              onClick={() => setFiltersOpen(o => !o)}
              sx={{ fontWeight: 700, fontSize: 11 }}
            >
              Filters {hasActiveFilters ? `(${[sectorFilter !== 'ALL', rsiFilter !== 'ALL', smcFilter !== 'ALL', verdictFilter !== 'ALL', nifty50Filter, highVolFilter, foFilter].filter(Boolean).length})` : ''}
            </Button>
          </Tooltip>

          <Tooltip title="Refresh data">
            <IconButton size="small" onClick={() => refetch()}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export CSV">
            <IconButton size="small" onClick={() => exportCSV()}>
              <Download fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Row 2: Expanded filters */}
        <Collapse in={filtersOpen}>
          <Divider />
          <Stack
            direction="row" spacing={1.5} alignItems="center" flexWrap="wrap"
            sx={{ p: 1.5, gap: 1.5 }}
          >
            {/* Sector */}
            <FormControl size="small" sx={{ minWidth: 155 }}>
              <InputLabel>Sector</InputLabel>
              <Select value={sectorFilter} label="Sector"
                onChange={e => { setSectorFilter(e.target.value); setPage(0); }}>
                {SECTORS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>

            {/* SMC Signal */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>SMC Signal</InputLabel>
              <Select value={smcFilter} label="SMC Signal"
                onChange={e => { setSmcFilter(e.target.value); setPage(0); }}>
                {SMC_SIGNALS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Action Verdict */}
            <FormControl size="small" sx={{ minWidth: 185 }}>
              <InputLabel>Action Verdict</InputLabel>
              <Select value={verdictFilter} label="Action Verdict"
                onChange={e => { setVerdictFilter(e.target.value); setPage(0); }}>
                {VERDICTS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </FormControl>

            {/* RSI */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>RSI Range</InputLabel>
              <Select value={rsiFilter} label="RSI Range"
                onChange={e => { setRsiFilter(e.target.value); setPage(0); }}>
                {RSI_RANGES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>

            <Divider orientation="vertical" flexItem />

            {/* Checkboxes */}
            <FormControlLabel
              control={<Checkbox size="small" checked={nifty50Filter} onChange={e => { setNifty50Filter(e.target.checked); setPage(0); }} />}
              label={<Typography variant="body2" fontWeight={700} fontSize={12}>Nifty 50</Typography>}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={foFilter} onChange={e => { setFoFilter(e.target.checked); setPage(0); }} />}
              label={<Typography variant="body2" fontWeight={700} fontSize={12}>F&amp;O</Typography>}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={highVolFilter} onChange={e => { setHighVolFilter(e.target.checked); setPage(0); }} />}
              label={<Typography variant="body2" fontWeight={700} fontSize={12}>High Volume</Typography>}
            />
          </Stack>
        </Collapse>
      </Paper>

      {/* ── Error alert ── */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error).message || 'Failed to load data. Please retry.'}
        </Alert>
      )}

      {/* ── Empty state alert ── */}
      {!isLoading && stocks.length === 0 && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No {tradeType.toUpperCase()} stocks match your current filters. Try relaxing some filters.
        </Alert>
      )}

      {/* ── Table ── */}
      <StockTable
        data={stocks}
        loading={isLoading}
        lastUpdated={lastUpdated}
        marketOpen={marketOpen}
      />

      {/* ── Footer ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1.5} flexWrap="wrap">
        <Typography variant="caption" color="text.secondary">
          Showing {totalCount} of {totalFromServer.toLocaleString()} stocks •
          {marketOpen ? ` Live data · refreshes every 10s` : ` Showing latest closing data`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {lastUpdated ? `Updated: ${lastUpdated}` : '—'} • NSE Stock Screener Engine
        </Typography>
      </Stack>
    </Box>
  );
};
