import React, { useState } from 'react';
import {
  Box, Typography, Stack, Chip, Alert, LinearProgress,
  IconButton, Tooltip, ToggleButtonGroup, ToggleButton, TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { Refresh, Download, Search, FilterList } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { StockTable } from './StockTable';
import { exportCSV } from '../services/api';
import type { StockResult, StocksResponse } from '../utils/types';
import type { ScreenerParams } from '../services/api';

const SECTORS = [
  'ALL', 'Banking & Finance', 'IT & Tech', 'Energy & Power',
  'Auto & Auto Ancil', 'Pharma & Healthcare', 'FMCG', 'Metals & Mining',
  'Real Estate', 'Infrastructure', 'Telecom', 'Services', 'Capital Goods'
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
  title, subtitle, icon, queryKey, fetcher, refetchInterval = 300_000,
}) => {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [capCategory, setCapCategory] = useState<string>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
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

  const stocks: StockResult[] = (data?.stocks as any) ?? [];
  const totalCount: number = data?.total ?? stocks.length;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 } }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2} flexWrap="wrap">
        <Typography variant="h5" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

        {data && <Chip label={`${totalCount} Total Matching`} size="small" color={tradeType === 'buy' ? 'success' : 'error'} sx={{ fontWeight: 800 }} />}
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
        Page {page + 1} of {Math.ceil(totalCount / rowsPerPage) || 1} • {totalCount} Total Stocks • Refreshes every 5 min • 4000+ NSE Stock Screener Engine
      </Typography>
    </Box>
  );
};
