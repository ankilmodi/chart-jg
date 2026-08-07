import React, { useState } from 'react';
import {
  Box, Typography, Stack, Chip, Alert, LinearProgress,
  IconButton, Tooltip, ToggleButtonGroup, ToggleButton, TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Checkbox, FormControlLabel
} from '@mui/material';
import { Refresh, Download, Search, FilterList } from '@mui/icons-material';
import { PageHeader } from './PageHeader';
import { useQuery } from '@tanstack/react-query';
import { StockTable, getSMCSignal, getActionVerdict } from './StockTable';
import { exportCSV } from '../services/api';
import type { StockResult, StocksResponse } from '../utils/types';
import type { ScreenerParams } from '../services/api';

const SECTORS = [
  'ALL', 'Banking & Finance', 'IT & Tech', 'Energy & Power',
  'Auto & Auto Ancil', 'Pharma & Healthcare', 'FMCG', 'Metals & Mining',
  'Real Estate', 'Infrastructure', 'Telecom', 'Services', 'Capital Goods'
];

const SMC_SIGNALS = [
  'ALL', 'Institutional Buy Flow', 'Institutional Selling', 'Bullish Breakout', 'Bearish Breakdown',
  'Smart Money Accumulation', 'Smart Money Distribution', 'Order Block Support', 'Order Block Resistance', 'Retail Consolidation'
];

const VERDICTS = [
  'ALL', 'BUY / ACCUMULATE', 'BUY', 'HOLD', 'WAIT', 'SELL', 'SELL / BOOK PROFIT', 'AVOID'
];

const RSI_RANGES = [
  'ALL', 'Overbought (70+)', 'Bullish (60-69)', 'Neutral (40-59)', 'Oversold (<30)'
];

interface Props {
  title: string;
  subtitle?: string;
  icon?: string;
  queryKey: string;
  fetcher: (tradeType: 'buy' | 'sell', params?: ScreenerParams) => Promise<StocksResponse>;
  refetchInterval?: number;
}

export const ScreenerPage: React.FC<Props> = ({
  title, subtitle, icon, queryKey, fetcher, refetchInterval = 10000,
}) => {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [capCategory, setCapCategory] = useState<string>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  const [rsiFilter, setRsiFilter] = useState<string>('ALL');
  const [smcFilter, setSmcFilter] = useState<string>('ALL');
  const [verdictFilter, setVerdictFilter] = useState<string>('ALL');
  const [nifty50Filter, setNifty50Filter] = useState<boolean>(false);
  const [highVolumeFilter, setHighVolumeFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  const { data, isLoading, error, refetch, isFetching } = useQuery<StocksResponse>({
    queryKey: [queryKey, tradeType, capCategory, sectorFilter, searchQuery, page, rowsPerPage],
    queryFn: () => fetcher(tradeType, {
      page: page + 1,
      limit: rowsPerPage,
      cap_category: capCategory !== 'ALL' ? capCategory : undefined,
      sector: sectorFilter !== 'ALL' ? sectorFilter : undefined,
      search: searchQuery.trim() || undefined,
    }),
    refetchInterval,
  });

  let stocks: StockResult[] = (data?.stocks as any) ?? [];

  // Frontend filtering for new filters
  if (highVolumeFilter) {
    stocks = stocks.filter(s => (s.volume_ratio || 0) >= 2 || (s.volume || 0) > 1000000);
  }
  if (nifty50Filter) {
    stocks = stocks.filter(s => s.index?.toUpperCase().includes('NIFTY 50'));
  }
  if (smcFilter !== 'ALL') {
    stocks = stocks.filter(s => getSMCSignal(s) === smcFilter);
  }
  if (verdictFilter !== 'ALL') {
    stocks = stocks.filter(s => getActionVerdict(s.signal).label === verdictFilter);
  }
  if (rsiFilter !== 'ALL') {
    stocks = stocks.filter(s => {
       if (s.rsi == null) return false;
       if (rsiFilter === 'Overbought (70+)') return s.rsi >= 70;
       if (rsiFilter === 'Bullish (60-69)') return s.rsi >= 60 && s.rsi < 70;
       if (rsiFilter === 'Neutral (40-59)') return s.rsi >= 40 && s.rsi < 60;
       if (rsiFilter === 'Oversold (<30)') return s.rsi < 30;
       return true;
    });
  }

  const totalCount: number = stocks.length;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 } }}>
      <PageHeader title={title} icon={icon} subtitle={subtitle} />
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2} flexWrap="wrap" useFlexGap sx={{ gap: 1.5 }}>
        <Typography variant="h5" fontWeight={800} sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
          {icon} {title}
        </Typography>

        {/* BUY / SELL Toggle Button */}
        <ToggleButtonGroup
          value={tradeType}
          exclusive
          onChange={(_, val) => { if (val) { setTradeType(val); setPage(0); } }}
          size="small"
        >
          <ToggleButton value="buy" sx={{ fontWeight: 800, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.main', color: 'common.white' } }}>
            🟢 BEST BUY (LONG)
          </ToggleButton>
          <ToggleButton value="sell" sx={{ fontWeight: 800, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.main', color: 'common.white' } }}>
            🔴 BEST SELL (SHORT)
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Cap Category Selector */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="caption" fontWeight={700} mr={0.5}>CAP:</Typography>
          <ToggleButtonGroup
            size="small"
            value={capCategory}
            exclusive
            onChange={(_, val) => { if (val) { setCapCategory(val); setPage(0); } }}
          >
            <ToggleButton value="ALL">ALL</ToggleButton>
            <ToggleButton value="LARGE">LARGE</ToggleButton>
            <ToggleButton value="MID">MID</ToggleButton>
            <ToggleButton value="SMALL">SMALL</ToggleButton>
            <ToggleButton value="F&O">F&O</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* Sector Filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="sector-select-label">Sector</InputLabel>
          <Select
            labelId="sector-select-label"
            value={sectorFilter}
            label="Sector"
            onChange={(e) => { setSectorFilter(e.target.value); setPage(0); }}
          >
            {SECTORS.map(sec => (
              <MenuItem key={sec} value={sec}>{sec}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* SMC Signal Filter */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="smc-select-label">SMC Signal</InputLabel>
          <Select
            labelId="smc-select-label"
            value={smcFilter}
            label="SMC Signal"
            onChange={(e) => { setSmcFilter(e.target.value); setPage(0); }}
          >
            {SMC_SIGNALS.map(smc => (
              <MenuItem key={smc} value={smc}>{smc}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Action Verdict Filter */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="verdict-select-label">Action Verdict</InputLabel>
          <Select
            labelId="verdict-select-label"
            value={verdictFilter}
            label="Action Verdict"
            onChange={(e) => { setVerdictFilter(e.target.value); setPage(0); }}
          >
            {VERDICTS.map(verdict => (
              <MenuItem key={verdict} value={verdict}>{verdict}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* RSI Filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="rsi-select-label">RSI</InputLabel>
          <Select
            labelId="rsi-select-label"
            value={rsiFilter}
            label="RSI"
            onChange={(e) => { setRsiFilter(e.target.value); setPage(0); }}
          >
            {RSI_RANGES.map(rsi => (
              <MenuItem key={rsi} value={rsi}>{rsi}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={<Checkbox size="small" checked={nifty50Filter} onChange={(e) => { setNifty50Filter(e.target.checked); setPage(0); }} />}
          label={<Typography variant="body2" fontWeight={700}>Nifty 50</Typography>}
        />

        <FormControlLabel
          control={<Checkbox size="small" checked={highVolumeFilter} onChange={(e) => { setHighVolumeFilter(e.target.checked); setPage(0); }} />}
          label={<Typography variant="body2" fontWeight={700}>High Vol</Typography>}
        />

        {/* Live Search Stock Filter */}
        <TextField
          size="small"
          placeholder="Search symbol, name..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
          sx={{ width: { xs: '100%', sm: 180, md: 220 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {data && <Chip label={`${totalCount} Matching`} size="small" color={tradeType === 'buy' ? 'success' : 'error'} sx={{ fontWeight: 800 }} />}
        {(isLoading || isFetching) && <LinearProgress sx={{ width: 80, ml: 1 }} />}

        <Box flex={1} />

        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => refetch()}><Refresh /></IconButton>
        </Tooltip>
        <Tooltip title="Export CSV">
          <IconButton size="small" onClick={() => exportCSV()}><Download /></IconButton>
        </Tooltip>
      </Stack>

      {subtitle && (
        <Typography variant="body2" color="text.secondary" mb={2} fontWeight={500}>{subtitle}</Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error).message}
        </Alert>
      )}

      {!isLoading && stocks.length === 0 && !error && (
        <Alert severity="info">No {tradeType.toUpperCase()} stocks match your query right now.</Alert>
      )}

      <StockTable
        data={stocks}
        loading={isLoading}
      />

      <Typography variant="caption" color="text.secondary" mt={1.5} display="block">
        Page {page + 1} of {Math.ceil(totalCount / rowsPerPage) || 1} • {totalCount} Total Stocks • Auto-refresh active • 4000+ NSE Stock Screener Engine
      </Typography>
    </Box>
  );
};
