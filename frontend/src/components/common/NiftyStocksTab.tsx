/**
 * NiftyStocksTab – NIFTY 50 constituent stocks live data table.
 * Shows price, change%, volume, sector and a quick BUY/SELL/NEUTRAL signal
 * based on daily price movement.
 */
import React, { useState, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody,
  TableCell, TableHead, TableRow, Chip, TableContainer,
  TextField, InputAdornment, ToggleButtonGroup, ToggleButton,
  Skeleton, Tooltip, TableSortLabel, LinearProgress,
} from '@mui/material';
import SearchIcon       from '@mui/icons-material/Search';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon       from '@mui/icons-material/Remove';
import RefreshIcon      from '@mui/icons-material/Refresh';
import { useStocksQuotes } from '../../hooks/useMarketData';
import type { StockQuote } from '../../utils/types';

// ── helpers ────────────────────────────────────────────────────────────────

const fmt = (v: number | null, dp = 2) =>
  v != null
    ? v.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })
    : '—';

const signalMeta = (signal: string) => {
  if (signal === 'BUY')     return { label: 'BUY',     color: '#00e676', bg: '#00e67622', icon: <TrendingUpIcon fontSize="inherit" /> };
  if (signal === 'SELL')    return { label: 'SELL',    color: '#ff1744', bg: '#ff174422', icon: <TrendingDownIcon fontSize="inherit" /> };
  if (signal === 'NEUTRAL') return { label: 'NEUTRAL', color: '#ffc107', bg: '#ffc10722', icon: <RemoveIcon fontSize="inherit" /> };
  return { label: 'N/A', color: '#9e9e9e', bg: '#9e9e9e22', icon: null };
};

const SECTORS = ['All', 'Banking', 'IT', 'FMCG', 'Auto', 'Pharma', 'Finance',
                 'Energy', 'Metal', 'Infrastructure', 'Power', 'Telecom',
                 'Insurance', 'Healthcare', 'Consumer', 'Cement', 'Defence',
                 'Mining', 'Retail', 'Diversified', 'Paints'];

type SortField = 'symbol' | 'price' | 'change_pct' | 'volume';
type SortDir   = 'asc' | 'desc';

// ── component ──────────────────────────────────────────────────────────────

const NiftyStocksTab: React.FC = () => {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useStocksQuotes();

  const [search,    setSearch]    = useState('');
  const [sector,    setSector]    = useState('All');
  const [filter,    setFilter]    = useState<'all' | 'BUY' | 'SELL' | 'NEUTRAL'>('all');
  const [sortField, setSortField] = useState<SortField>('change_pct');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-IN')
    : '—';

  // Summary counts
  const summary = useMemo(() => {
    if (!data) return { buy: 0, sell: 0, neutral: 0, advances: 0, declines: 0 };
    const q = data.quotes;
    return {
      buy:      q.filter(s => s.signal === 'BUY').length,
      sell:     q.filter(s => s.signal === 'SELL').length,
      neutral:  q.filter(s => s.signal === 'NEUTRAL').length,
      advances: q.filter(s => (s.change_pct ?? 0) > 0).length,
      declines: q.filter(s => (s.change_pct ?? 0) < 0).length,
    };
  }, [data]);

  // Filtered + sorted list
  const rows = useMemo((): StockQuote[] => {
    if (!data) return [];
    let list = data.quotes;

    if (search.trim())
      list = list.filter(s =>
        s.symbol.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase())
      );

    if (sector !== 'All')
      list = list.filter(s => s.sector === sector);

    if (filter !== 'all')
      list = list.filter(s => s.signal === filter);

    return [...list].sort((a, b) => {
      let av: number, bv: number;
      if (sortField === 'symbol') {
        return sortDir === 'asc'
          ? a.symbol.localeCompare(b.symbol)
          : b.symbol.localeCompare(a.symbol);
      }
      av = a[sortField] ?? -Infinity;
      bv = b[sortField] ?? -Infinity;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [data, search, sector, filter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortCell: React.FC<{ field: SortField; label: string; align?: 'left' | 'right' }> = ({ field, label, align = 'right' }) => (
    <TableCell align={align} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
      <TableSortLabel
        active={sortField === field}
        direction={sortField === field ? sortDir : 'desc'}
        onClick={() => handleSort(field)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={800}>📋 NIFTY 50 Stocks</Typography>
          <Typography variant="caption" color="text.secondary">
            Live data · Last updated: {lastUpdated}
            {isFetching && ' · Refreshing…'}
          </Typography>
        </Box>
        <Chip
          icon={<RefreshIcon fontSize="small" />}
          label="Refresh"
          onClick={() => refetch()}
          variant="outlined"
          size="small"
          disabled={isFetching}
        />
      </Box>

      {/* Market breadth summary */}
      {data && (
        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
          {[
            { label: 'Advances',  value: summary.advances, color: '#00e676' },
            { label: 'Declines',  value: summary.declines, color: '#ff1744' },
            { label: '▲ BUY',    value: summary.buy,      color: '#00e676' },
            { label: '▼ SELL',   value: summary.sell,     color: '#ff1744' },
            { label: '◆ NEUTRAL',value: summary.neutral,  color: '#ffc107' },
          ].map(({ label, value, color }) => (
            <Box key={label} sx={{ textAlign: 'center', minWidth: 70 }}>
              <Typography variant="h6" fontWeight={800} sx={{ color }}>{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Box>
          ))}

          {/* Advance/Decline bar */}
          <Box sx={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%' }}>
              <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                Market Breadth
              </Typography>
              <Box display="flex" borderRadius={1} overflow="hidden" height={10}>
                <Box sx={{ width: `${(summary.advances / 50) * 100}%`, bgcolor: '#00e676' }} />
                <Box sx={{ width: `${(summary.neutral  / 50) * 100}%`, bgcolor: '#ffc107' }} />
                <Box sx={{ width: `${(summary.declines / 50) * 100}%`, bgcolor: '#ff1744' }} />
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Filters */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
        <TextField
          size="small"
          placeholder="Search symbol or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 220 }}
        />

        <ToggleButtonGroup
          size="small"
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
        >
          {(['all', 'BUY', 'SELL', 'NEUTRAL'] as const).map(v => (
            <ToggleButton key={v} value={v} sx={{ fontWeight: 700, fontSize: 11, px: 1.5 }}>
              {v === 'all' ? 'All' : v}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* Sector filter chips */}
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {SECTORS.slice(0, 10).map(s => (
            <Chip
              key={s}
              label={s}
              size="small"
              onClick={() => setSector(s)}
              variant={sector === s ? 'filled' : 'outlined'}
              color={sector === s ? 'primary' : 'default'}
              sx={{ fontSize: 11 }}
            />
          ))}
        </Box>
      </Box>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {isFetching && !data && <LinearProgress />}
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, minWidth: 100 }}>
                    <TableSortLabel
                      active={sortField === 'symbol'}
                      direction={sortField === 'symbol' ? sortDir : 'asc'}
                      onClick={() => handleSort('symbol')}
                    >
                      Symbol
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>Company</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sector</TableCell>
                  <SortCell field="price"      label="Price (₹)" />
                  <SortCell field="change_pct" label="Change %" />
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Change ₹</TableCell>
                  <SortCell field="volume" label="Volume" />
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Signal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && !data
                  ? [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((_, j) => (
                        <TableCell key={j}><Skeleton height={24} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                  : rows.map((stock) => {
                    const isUp    = (stock.change_pct ?? 0) > 0;
                    const isDown  = (stock.change_pct ?? 0) < 0;
                    const priceColor = isUp ? '#00e676' : isDown ? '#ff1744' : 'text.primary';
                    const sig = signalMeta(stock.signal);

                    return (
                      <TableRow
                        key={stock.symbol}
                        hover
                        sx={{ bgcolor: isUp ? '#00e67605' : isDown ? '#ff174405' : undefined }}
                      >
                        {/* Symbol */}
                        <TableCell>
                          <Typography variant="caption" fontWeight={800} fontFamily="monospace">
                            {stock.symbol}
                          </Typography>
                        </TableCell>

                        {/* Name */}
                        <TableCell>
                          <Tooltip title={stock.ticker} placement="top">
                            <Typography variant="caption" noWrap sx={{ maxWidth: 160, display: 'block' }}>
                              {stock.name}
                            </Typography>
                          </Tooltip>
                        </TableCell>

                        {/* Sector */}
                        <TableCell>
                          <Chip label={stock.sector} size="small" variant="outlined"
                            sx={{ fontSize: 10, height: 20, borderRadius: 1 }} />
                        </TableCell>

                        {/* Price */}
                        <TableCell align="right">
                          <Typography variant="caption" fontWeight={700} fontFamily="monospace"
                            sx={{ color: priceColor }}>
                            {fmt(stock.price)}
                          </Typography>
                        </TableCell>

                        {/* Change % */}
                        <TableCell align="right">
                          <Chip
                            label={`${(stock.change_pct ?? 0) >= 0 ? '+' : ''}${fmt(stock.change_pct)}%`}
                            size="small"
                            sx={{
                              bgcolor: `${priceColor}22`,
                              color: priceColor,
                              fontWeight: 700,
                              fontSize: 11,
                              fontFamily: 'monospace',
                            }}
                          />
                        </TableCell>

                        {/* Change ₹ */}
                        <TableCell align="right">
                          <Typography variant="caption" fontFamily="monospace" sx={{ color: priceColor }}>
                            {(stock.change ?? 0) >= 0 ? '+' : ''}{fmt(stock.change)}
                          </Typography>
                        </TableCell>

                        {/* Volume */}
                        <TableCell align="right">
                          <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                            {stock.volume != null
                              ? stock.volume >= 1_000_000
                                ? `${(stock.volume / 1_000_000).toFixed(2)}M`
                                : stock.volume >= 1_000
                                ? `${(stock.volume / 1_000).toFixed(1)}K`
                                : stock.volume.toString()
                              : '—'}
                          </Typography>
                        </TableCell>

                        {/* Signal */}
                        <TableCell align="center">
                          <Chip
                            icon={sig.icon ?? undefined}
                            label={sig.label}
                            size="small"
                            sx={{
                              bgcolor: sig.bg,
                              color: sig.color,
                              fontWeight: 700,
                              fontSize: 10,
                              '& .MuiChip-icon': { color: sig.color, fontSize: 14 },
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                }
              </TableBody>
            </Table>
          </TableContainer>

          {/* Footer */}
          {data && (
            <Box px={2} py={1} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Showing {rows.length} of {data.total} stocks
                {sector !== 'All' && ` · Sector: ${sector}`}
                {filter !== 'all' && ` · Filter: ${filter}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Signal based on daily price movement (±0.5% threshold)
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default NiftyStocksTab;
