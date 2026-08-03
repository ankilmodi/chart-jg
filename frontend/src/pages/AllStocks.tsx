/**
 * AllStocks.tsx — Full NSE/BSE Stock Directory (4000+ stocks)
 * Features: server-side pagination, debounced search, Ctrl+K, filters,
 * all columns, watchlist, CSV export, sort, skeletons, error handling.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Paper, TextField, InputAdornment,
  Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableSortLabel, LinearProgress,
  IconButton, Tooltip, Button, ToggleButtonGroup, ToggleButton,
  TablePagination, Skeleton, Alert, Grid, Collapse,
  FormControl, InputLabel, Select, MenuItem, Slider, Divider,
} from '@mui/material';
import {
  Search, Refresh, Download, FilterList, ExpandMore, ExpandLess,
  Clear, Bookmark, BookmarkBorder, TrendingUp, TrendingDown,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllStocks, addToWatchlist, removeWatchlist, fetchWatchlist,
} from '../services/api';
import type { AllStocksParams } from '../services/api';
import type { StockData, WatchlistItem } from '../utils/types';

// ── Constants ──────────────────────────────────────────────────────────────
const SECTORS = [
  'ALL','Banking & Finance','IT & Tech','Pharma & Healthcare',
  'Auto & Ancillaries','Energy & Power','FMCG','Metals & Mining',
  'Realty & Infrastructure','Cement & Construction','Capital Goods & Defence','Diversified',
];
const CAP_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'LARGE CAP', label: 'Large' },
  { value: 'MID CAP', label: 'Mid' },
  { value: 'SMALL CAP', label: 'Small' },
  { value: 'F&O', label: 'F&O' },
];
const SORT_OPTIONS: { value: NonNullable<AllStocksParams['sort_by']>; label: string }[] = [
  { value: 'buy_score',  label: 'Rating' },
  { value: 'change_pct', label: 'Change%' },
  { value: 'volume',     label: 'Volume' },
  { value: 'market_cap', label: 'Mkt Cap' },
  { value: 'rsi',        label: 'RSI' },
  { value: 'symbol',     label: 'A–Z' },
];

// ── Hooks & Helpers ────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

const fmtPrice = (v?: number | null) =>
  v ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

const fmtCap = (v?: number | null) => {
  if (!v) return '—';
  if (v >= 1e12) return `₹${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9)  return `₹${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e7)  return `₹${(v / 1e7).toFixed(1)}Cr`;
  return `₹${v.toLocaleString('en-IN')}`;
};

const fmtVol = (v?: number | null) => {
  if (!v) return '—';
  if (v >= 1e7) return `${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
};

const signalColor = (s?: string): 'success' | 'info' | 'warning' | 'error' | 'default' => {
  const u = (s || '').toUpperCase();
  if (u.includes('BUY'))  return 'success';
  if (u === 'WATCH')      return 'info';
  if (u === 'HOLD')       return 'warning';
  if (u.includes('SELL')) return 'error';
  return 'default';
};

const scoreColor = (n: number) =>
  n >= 75 ? 'success.main' : n >= 55 ? 'info.main' : n >= 35 ? 'warning.main' : 'error.main';

function exportCSV(stocks: StockData[]) {
  const h = ['Symbol','Name','Sector','Industry','Cap','Price','Change%','Volume','MarketCap','52WHigh','52WLow','Rating','Signal'];
  const rows = stocks.map(s => [
    s.symbol, `"${s.name}"`, s.sector, s.industry || '', s.cap_category || '',
    s.current_price || 0, (s.change_pct || 0).toFixed(2),
    s.volume || 0, s.market_cap || 0,
    s.week52_high || 0, s.week52_low || 0, s.buy_score || 0, s.signal || '',
  ]);
  const csv = [h, ...rows].map(r => r.join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: 'all-stocks.csv',
  });
  a.click();
}


// ── Skeleton Rows ──────────────────────────────────────────────────────────
const SkeletonRow: React.FC<{ cols: number }> = ({ cols }) => (
  <TableRow>
    {Array.from({ length: cols }).map((_, i) => (
      <TableCell key={i}>
        <Skeleton variant="text" width={i === 0 ? 140 : 70} height={20} />
        {i === 0 && <Skeleton variant="text" width={100} height={14} />}
      </TableCell>
    ))}
  </TableRow>
);

// ── Stock Table Row ────────────────────────────────────────────────────────
interface RowProps {
  stock: StockData;
  inWatchlist: boolean;
  onNavigate: (sym: string) => void;
  onWatchlist: (stock: StockData, inList: boolean) => void;
}

const StockRow: React.FC<RowProps> = ({ stock, inWatchlist, onNavigate, onWatchlist }) => {
  const chg     = stock.change_pct || 0;
  const price   = stock.current_price || 0;
  const score   = stock.buy_score || 0;
  const isPos   = chg >= 0;

  return (
    <TableRow
      hover
      onClick={() => onNavigate(stock.symbol)}
      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
    >
      {/* Company + Symbol */}
      <TableCell sx={{ minWidth: 160 }}>
        <Typography variant="body2" fontWeight={800} noWrap>{stock.symbol}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ maxWidth: 180 }}>
          {stock.name}
        </Typography>
        <Stack direction="row" spacing={0.4} mt={0.3} flexWrap="wrap">
          <Chip label={stock.cap_category || 'NSE'} size="small" color="secondary" variant="outlined"
            sx={{ height: 15, fontSize: 9, fontWeight: 700 }} />
          {stock.fo_eligible && (
            <Chip label="F&O" size="small" color="primary" variant="outlined"
              sx={{ height: 15, fontSize: 9, fontWeight: 700 }} />
          )}
        </Stack>
      </TableCell>

      {/* Exchange */}
      <TableCell sx={{ minWidth: 55 }}>
        <Chip label="NSE" size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
      </TableCell>

      {/* Sector */}
      <TableCell sx={{ minWidth: 120 }}>
        <Typography variant="caption" noWrap display="block">{stock.sector}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block" fontSize={10}>
          {stock.industry || stock.sector}
        </Typography>
      </TableCell>

      {/* Price */}
      <TableCell align="right" sx={{ minWidth: 90 }}>
        <Typography variant="body2" fontWeight={700}>{fmtPrice(price)}</Typography>
      </TableCell>

      {/* Change % */}
      <TableCell align="right" sx={{ minWidth: 80 }}>
        <Typography variant="body2" fontWeight={700} color={isPos ? 'success.main' : 'error.main'}>
          {isPos ? '+' : ''}{chg.toFixed(2)}%
        </Typography>
      </TableCell>

      {/* Volume */}
      <TableCell align="right" sx={{ minWidth: 75 }}>
        <Typography variant="body2">{fmtVol(stock.volume)}</Typography>
      </TableCell>

      {/* Market Cap */}
      <TableCell align="right" sx={{ minWidth: 90 }}>
        <Typography variant="body2">{fmtCap(stock.market_cap)}</Typography>
      </TableCell>

      {/* 52W High / Low */}
      <TableCell align="right" sx={{ minWidth: 110 }}>
        <Typography variant="caption" color="success.main" display="block" fontWeight={700}>
          H: {fmtPrice(stock.week52_high)}
        </Typography>
        <Typography variant="caption" color="error.main" display="block" fontWeight={700}>
          L: {fmtPrice(stock.week52_low)}
        </Typography>
      </TableCell>

      {/* Rating */}
      <TableCell align="center" sx={{ minWidth: 110 }}>
        <Typography variant="body2" fontWeight={800} color={scoreColor(score)}>
          {score > 0 ? `${score.toFixed(0)} / 100` : '—'}
        </Typography>
        {score > 0 && (
          <LinearProgress
            variant="determinate"
            value={Math.min(score, 100)}
            sx={{
              height: 4, borderRadius: 2, mt: 0.3,
              '& .MuiLinearProgress-bar': { bgcolor: scoreColor(score) },
            }}
          />
        )}
      </TableCell>

      {/* Signal */}
      <TableCell align="center" sx={{ minWidth: 100 }}>
        {stock.signal && stock.signal !== '—' ? (
          <Chip
            label={stock.signal}
            size="small"
            color={signalColor(stock.signal)}
            sx={{ fontWeight: 800, fontSize: 10 }}
          />
        ) : (
          <Typography variant="caption" color="text.secondary">—</Typography>
        )}
      </TableCell>

      {/* Watchlist */}
      <TableCell align="center" sx={{ minWidth: 50 }}>
        <Tooltip title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}>
          <IconButton
            size="small"
            color={inWatchlist ? 'warning' : 'default'}
            onClick={e => { e.stopPropagation(); onWatchlist(stock, inWatchlist); }}
          >
            {inWatchlist ? <Bookmark fontSize="small" /> : <BookmarkBorder fontSize="small" />}
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};


// ── Main Page Component ────────────────────────────────────────────────────
export default function AllStocksPage() {
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const searchRef     = useRef<HTMLInputElement>(null);

  // ── Filter state ──────────────────────────────────────────────────────
  const [search,      setSearch]      = useState('');
  const [capCategory, setCapCategory] = useState('ALL');
  const [sector,      setSector]      = useState('ALL');
  const [signal,      setSignal]      = useState('ALL');
  const [minScore,    setMinScore]    = useState(0);
  const [priceRange,  setPriceRange]  = useState<[number, number]>([0, 50000]);
  const [sortBy,      setSortBy]      = useState<NonNullable<AllStocksParams['sort_by']>>('buy_score');
  const [sortDir,     setSortDir]     = useState<'asc' | 'desc'>('desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page,        setPage]        = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const debouncedSearch = useDebounce(search, 300);

  // ── Ctrl+K shortcut ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Reset page to 0 when any filter changes
  useEffect(() => { setPage(0); }, [debouncedSearch, capCategory, sector, signal, minScore, sortBy, sortDir]);

  const resetFilters = useCallback(() => {
    setSearch(''); setCapCategory('ALL'); setSector('ALL');
    setSignal('ALL'); setMinScore(0); setPriceRange([0, 50000]);
    setSortBy('buy_score'); setSortDir('desc'); setPage(0);
  }, []);

  // ── Query params ──────────────────────────────────────────────────────
  const queryParams: AllStocksParams = useMemo(() => ({
    page:         page + 1,
    limit:        rowsPerPage,
    search:       debouncedSearch.trim() || undefined,
    sector:       sector !== 'ALL' ? sector : undefined,
    cap_category: capCategory !== 'ALL' ? capCategory : undefined,
    signal:       signal !== 'ALL' ? signal : undefined,
    min_score:    minScore > 0 ? minScore : undefined,
    min_price:    priceRange[0] > 0 ? priceRange[0] : undefined,
    max_price:    priceRange[1] < 50000 ? priceRange[1] : undefined,
    sort_by:      sortBy,
    sort_dir:     sortDir,
  }), [page, rowsPerPage, debouncedSearch, sector, capCategory, signal, minScore, priceRange, sortBy, sortDir]);

  // ── Data fetch ────────────────────────────────────────────────────────
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['all-stocks', queryParams],
    queryFn:  () => fetchAllStocks(queryParams),
    refetchInterval: 300_000,
    staleTime: 60_000,
    keepPreviousData: true,
  } as any);

  const stocks: StockData[]  = (data as any)?.stocks ?? [];
  const totalCount: number   = (data as any)?.total  ?? 0;

  // ── Watchlist ─────────────────────────────────────────────────────────
  const { data: wlData } = useQuery({ queryKey: ['watchlist'], queryFn: fetchWatchlist });
  const watchlistSymbols = useMemo<Set<string>>(() => {
    const items: WatchlistItem[] = (wlData as any)?.watchlist ?? [];
    return new Set(items.map((i: WatchlistItem) => i.symbol));
  }, [wlData]);

  const addMutation = useMutation({
    mutationFn: (item: WatchlistItem) => addToWatchlist(item),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  });
  const removeMutation = useMutation({
    mutationFn: (sym: string) => removeWatchlist(sym),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  const handleWatchlist = useCallback((stock: StockData, inList: boolean) => {
    if (inList) {
      removeMutation.mutate(stock.symbol);
    } else {
      addMutation.mutate({
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        added_at: new Date().toISOString(),
        current_price: stock.current_price,
        change_pct: stock.change_pct,
        buy_score: stock.buy_score,
        signal: stock.signal,
      } as WatchlistItem);
    }
  }, [addMutation, removeMutation]);


  // ── Render ────────────────────────────────────────────────────────────
  const COL_COUNT = 11;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 2.5 }, width: '100%', boxSizing: 'border-box' }}>

      {/* ── Header ── */}
      <Stack direction="row" spacing={1} alignItems="center" mb={1.5} flexWrap="wrap">
        <Typography variant="h5" fontWeight={800}>🌐 All Stocks Directory</Typography>
        <Chip label="NSE / BSE" size="small" color="primary" sx={{ fontWeight: 800 }} />
        <Chip label="4000+ Stocks" size="small" color="secondary" sx={{ fontWeight: 700 }} />
        <Chip label="Live Data" size="small" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Complete NSE/BSE stock universe. Search by name, symbol or sector. Use <strong>Ctrl+K</strong> to focus search instantly.
      </Typography>

      {/* ── Filter Paper ── */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        {/* Row 1 – search + quick actions */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={1.5}>
          <TextField
            inputRef={searchRef}
            size="small"
            placeholder="Search symbol, name, sector… (Ctrl+K)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ flex: '1 1 260px', minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}><Clear fontSize="small" /></IconButton>
                </InputAdornment>
              ) : (
                <InputAdornment position="end">
                  <Chip label="Ctrl+K" size="small" variant="outlined"
                    sx={{ height: 18, fontSize: 10, cursor: 'default' }} />
                </InputAdornment>
              ),
            }}
          />
          <Chip
            label={`${totalCount.toLocaleString()} stocks`}
            size="small" color="primary" sx={{ fontWeight: 800 }}
          />
          {(isLoading || isFetching) && <LinearProgress sx={{ width: 80, borderRadius: 1 }} />}
          <Box flex={1} />
          <Tooltip title="Refresh data">
            <IconButton size="small" onClick={() => refetch()}><Refresh /></IconButton>
          </Tooltip>
          <Tooltip title="Export this page to CSV">
            <IconButton size="small" onClick={() => exportCSV(stocks)}><Download /></IconButton>
          </Tooltip>
          <Button size="small" variant="outlined" startIcon={<FilterList />}
            endIcon={filtersOpen ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setFiltersOpen(o => !o)} sx={{ fontWeight: 700 }}>
            Filters
          </Button>
        </Stack>

        {/* Row 2 – cap + signal + sort toggles */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="caption" fontWeight={700}>CAP:</Typography>
          <ToggleButtonGroup size="small" value={capCategory} exclusive
            onChange={(_, v) => { if (v) { setCapCategory(v); setPage(0); } }}>
            {CAP_OPTIONS.map(o => (
              <ToggleButton key={o.value} value={o.value}
                sx={{ py: 0.3, px: 1, fontSize: 11, fontWeight: 700 }}>
                {o.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Divider orientation="vertical" flexItem />

          <Typography variant="caption" fontWeight={700}>SIGNAL:</Typography>
          <ToggleButtonGroup size="small" value={signal} exclusive
            onChange={(_, v) => { if (v) { setSignal(v); setPage(0); } }}>
            {['ALL','BUY','WATCH','SELL'].map(v => (
              <ToggleButton key={v} value={v} sx={{ py: 0.3, px: 1, fontSize: 11, fontWeight: 700 }}>
                {v}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Box flex={1} />

          <Typography variant="caption" fontWeight={700}>SORT:</Typography>
          <ToggleButtonGroup size="small" value={sortBy} exclusive
            onChange={(_, v) => { if (v) setSortBy(v); }}>
            {SORT_OPTIONS.map(o => (
              <ToggleButton key={o.value} value={o.value}
                sx={{ py: 0.3, px: 0.8, fontSize: 11, fontWeight: 700 }}>
                {o.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <ToggleButtonGroup size="small" value={sortDir} exclusive
            onChange={(_, v) => { if (v) setSortDir(v); }}>
            <ToggleButton value="desc" sx={{ py: 0.3, px: 0.8 }}>
              <TrendingDown fontSize="small" />
            </ToggleButton>
            <ToggleButton value="asc" sx={{ py: 0.3, px: 0.8 }}>
              <TrendingUp fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* Advanced filters */}
        <Collapse in={filtersOpen}>
          <Divider sx={{ my: 1.5 }} />
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>Sector</InputLabel>
                <Select value={sector} label="Sector"
                  onChange={e => { setSector(e.target.value); setPage(0); }}>
                  {SECTORS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" fontWeight={700} display="block" gutterBottom>
                Min Rating: <strong>{minScore}</strong> / 100
              </Typography>
              <Slider value={minScore} min={0} max={95} step={5} size="small"
                onChange={(_, v) => { setMinScore(v as number); setPage(0); }}
                marks={[{ value: 0, label: '0' }, { value: 50, label: '50' }, { value: 95, label: '95' }]}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" fontWeight={700} display="block" gutterBottom>
                Price: ₹{priceRange[0]} – {priceRange[1] >= 50000 ? '50000+' : `₹${priceRange[1]}`}
              </Typography>
              <Slider value={priceRange} min={0} max={50000} step={100} size="small"
                onChange={(_, v) => { setPriceRange(v as [number, number]); setPage(0); }}
                marks={[{ value: 0, label: '₹0' }, { value: 25000, label: '₹25K' }, { value: 50000, label: '₹50K+' }]}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button fullWidth size="small" startIcon={<Clear />}
                onClick={resetFilters} variant="outlined">
                Reset All
              </Button>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* ── Error ── */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error).message ?? 'Failed to load stocks. Please retry.'}
        </Alert>
      )}

      {/* ── Table ── */}
      <Paper elevation={2} sx={{ overflow: 'hidden', borderRadius: 2 }}>
        <TableContainer sx={{ maxHeight: 620 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {[
                  { id: 'symbol',      label: 'Company / Symbol',   sortKey: 'symbol' },
                  { id: 'exchange',    label: 'Exchange',            sortKey: null },
                  { id: 'sector',      label: 'Sector / Industry',   sortKey: null },
                  { id: 'price',       label: 'Price (₹)',           sortKey: null },
                  { id: 'change_pct',  label: 'Change %',            sortKey: 'change_pct' },
                  { id: 'volume',      label: 'Volume',              sortKey: 'volume' },
                  { id: 'market_cap',  label: 'Mkt Cap',             sortKey: 'market_cap' },
                  { id: '52w',         label: '52W H / L',           sortKey: null },
                  { id: 'buy_score',   label: 'Rating (100)',        sortKey: 'buy_score' },
                  { id: 'signal',      label: 'Signal',              sortKey: null },
                  { id: 'wl',          label: '★',                  sortKey: null },
                ].map(col => (
                  <TableCell key={col.id} sx={{ fontWeight: 800, bgcolor: 'background.default' }}>
                    {col.sortKey ? (
                      <TableSortLabel
                        active={sortBy === col.sortKey}
                        direction={sortBy === col.sortKey ? sortDir : 'asc'}
                        onClick={() => {
                          if (sortBy === col.sortKey) {
                            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy(col.sortKey as NonNullable<AllStocksParams['sort_by']>);
                            setSortDir('desc');
                          }
                        }}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading && stocks.length === 0 &&
                Array.from({ length: rowsPerPage > 10 ? 10 : rowsPerPage }).map((_, i) => (
                  <SkeletonRow key={i} cols={COL_COUNT} />
                ))
              }

              {!isLoading && stocks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COL_COUNT} align="center" sx={{ py: 6 }}>
                    <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
                      No stocks match your filters.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Try clearing the search or resetting filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {stocks.map(stock => (
                <StockRow
                  key={stock.symbol}
                  stock={stock}
                  inWatchlist={watchlistSymbols.has(stock.symbol)}
                  onNavigate={sym => navigate(`/stock/${sym}`)}
                  onWatchlist={handleWatchlist}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          rowsPerPageOptions={[25, 50, 100]}
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }}
        />
      </Paper>

      <Typography variant="caption" color="text.secondary" mt={1} display="block">
        Page {page + 1} • {totalCount.toLocaleString()} total stocks • Refreshes every 5 min •{' '}
        Last updated: {(data as any)?.timestamp ?? '—'}
      </Typography>
    </Box>
  );
}
