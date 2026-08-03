import React, { useState } from 'react';
import {
  Box, Typography, Stack, Chip, Paper, Button, Grid,
  FormControl, InputLabel, Select, MenuItem, Slider,
  CircularProgress, Alert, IconButton, Tooltip, LinearProgress,
  ToggleButtonGroup, ToggleButton, Collapse, TextField, InputAdornment
} from '@mui/material';
import {
  FilterList, Refresh, Download, ExpandMore, ExpandLess, Clear, Search
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { fetchFutureStocks, exportCSV } from '../services/api';
import { StockTable } from '../components/StockTable';
import type { StockResult } from '../utils/types';

const SECTORS = [
  'All', 'Banking & Finance', 'IT & Tech', 'Energy & Power', 'Auto & Ancillaries',
  'FMCG', 'Pharma & Healthcare', 'Metals & Mining', 'Realty & Infrastructure',
  'Cement & Construction', 'Capital Goods & Defence'
];

export default function FutureStocksPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [capCategory, setCapCategory] = useState<string>('F&O');
  const [sector, setSector] = useState('All');
  const [minScore, setMinScore] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['future-stocks', sector, minScore, tradeType, capCategory],
    queryFn: () =>
      fetchFutureStocks({
        sector: sector !== 'All' ? sector : undefined,
        min_score: minScore > 0 ? minScore : undefined,
        trade_type: tradeType,
        cap_category: capCategory !== 'ALL' ? capCategory : undefined,
        limit: 500,
      }),
    refetchInterval: 300_000,
  });

  const rawStocks: StockResult[] = (data?.stocks as any) ?? [];

  // Filter stocks by search query (symbol, name, sector)
  const stocks = rawStocks.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q)
    );
  });

  const handleReset = () => {
    setSector('All');
    setCapCategory('F&O');
    setMinScore(0);
    setSearchQuery('');
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 } }}>
      {/* Header Bar */}
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2} flexWrap="wrap">
        <Typography variant="h5" fontWeight={800}>
          📊 F&O & Equity Stock Directory
        </Typography>

        <ToggleButtonGroup
          value={tradeType}
          exclusive
          onChange={(_, val) => val && setTradeType(val)}
          size="small"
        >
          <ToggleButton value="buy" sx={{ fontWeight: 800, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.main', color: 'common.white' } }}>
            🟢 BEST BUY (LONG)
          </ToggleButton>
          <ToggleButton value="sell" sx={{ fontWeight: 800, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.main', color: 'common.white' } }}>
            🔴 BEST SELL (SHORT)
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Cap Category Toggle */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="caption" fontWeight={700} mr={0.5}>CAP:</Typography>
          <ToggleButtonGroup
            size="small"
            value={capCategory}
            exclusive
            onChange={(_, val) => val && setCapCategory(val)}
          >
            <ToggleButton value="ALL">ALL</ToggleButton>
            <ToggleButton value="F&O">F&O</ToggleButton>
            <ToggleButton value="LARGE">LARGE</ToggleButton>
            <ToggleButton value="MID">MID</ToggleButton>
            <ToggleButton value="SMALL">SMALL</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* Live Search Input Filter */}
        <TextField
          size="small"
          placeholder="Search stock symbol, name, sector..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: { xs: '100%', sm: 220, md: 240 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <Chip label={`${stocks.length} Tickers`} size="small" color="primary" sx={{ fontWeight: 800 }} />
        {(isLoading || isFetching) && <CircularProgress size={18} />}

        <Box flex={1} />

        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => refetch()}><Refresh /></IconButton>
        </Tooltip>
        <Tooltip title="Export CSV">
          <IconButton size="small" onClick={() => exportCSV(minScore)}><Download /></IconButton>
        </Tooltip>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FilterList />}
          endIcon={filtersOpen ? <ExpandLess /> : <ExpandMore />}
          onClick={() => setFiltersOpen(!filtersOpen)}
          sx={{ fontWeight: 700 }}>
          Filters
        </Button>
      </Stack>

      {/* Filters panel */}
      <Collapse in={filtersOpen}>
        <Paper sx={{ p: 2, mb: 2.5, borderRadius: 2 }} elevation={1}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Sector Filter</InputLabel>
                <Select value={sector} label="Sector Filter" onChange={e => setSector(e.target.value)}>
                  {SECTORS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Min AI Score (100 Pts): <strong>{minScore}</strong>
              </Typography>
              <Slider value={minScore} min={0} max={100} step={5}
                onChange={(_, v) => setMinScore(v as number)} size="small" />
            </Grid>
            <Grid item xs="auto">
              <Button size="small" startIcon={<Clear />} onClick={handleReset} sx={{ fontWeight: 700 }}>
                Reset
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* Error / Loading */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load stocks. {(error as Error).message}
        </Alert>
      )}

      {isLoading && <LinearProgress sx={{ mb: 1.5 }} />}

      {/* Table */}
      <StockTable data={stocks} loading={isLoading} />

      {/* Footer */}
      <Typography variant="caption" color="text.secondary" mt={1.5} display="block">
        Full NSE Stock Screener Engine. Refreshes every 5 minutes. Last update: {data?.timestamp ?? '—'}
      </Typography>
    </Box>
  );
}
