import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Paper, TextField, InputAdornment,
  Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableSortLabel, LinearProgress,
  IconButton, Tooltip, Button, ToggleButtonGroup, ToggleButton,
  TablePagination, Skeleton, Grid, Alert,
} from '@mui/material';
import { Search, FilterList, Refresh, Info, TrendingUp, TrendingDown, Download } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { fetchFutureStocks, exportCSV } from '../services/api';
import type { StockData, StocksResponse } from '../utils/types';

export default function AllStocksPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [capCategory, setCapCategory] = useState<string>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  const [signalFilter, setSignalFilter] = useState<string>('ALL');
  const [rsiFilter, setRsiFilter] = useState<string>('ALL');
  const [orderBy, setOrderBy] = useState<keyof StockData>('buy_score');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination states (Default 10 per page)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data, isLoading, isFetching, error, refetch } = useQuery<StocksResponse>({
    queryKey: ['all-stocks', capCategory, sectorFilter, signalFilter, rsiFilter, search, page, rowsPerPage],
    queryFn: () => fetchFutureStocks({
      page: page + 1,
      limit: rowsPerPage,
      cap_category: capCategory !== 'ALL' ? capCategory : undefined,
      sector: sectorFilter !== 'ALL' ? sectorFilter : undefined,
      signal: signalFilter !== 'ALL' ? signalFilter : undefined,
      rsi: rsiFilter !== 'ALL' ? rsiFilter : undefined,
      search: search.trim() || undefined,
    }),
    refetchInterval: 300_000,
  });

  const stocks: StockData[] = data?.stocks ?? [];
  const totalServerCount: number = data?.total ?? 0;

  // Sort current page stocks locally if needed
  const sorted = [...stocks].sort((a, b) => {
    const aVal = a[orderBy] ?? 0;
    const bVal = b[orderBy] ?? 0;
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return order === 'asc' ? cmp : -cmp;
  });

  const handleSort = (col: keyof StockData) => {
    if (col === orderBy) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(col);
      setOrder('desc');
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const sectors = ['ALL', 'Banking & Finance', 'IT & Tech', 'Pharma & Healthcare', 'Auto & Ancillaries', 'Energy & Power', 'FMCG', 'Metals & Mining', 'Realty & Infrastructure', 'Cement & Construction', 'Capital Goods & Defence'];

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 2.5 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <Stack direction="row" spacing={1} alignItems="center" mb={2} flexWrap="wrap">
        <Typography variant="h5" fontWeight={800}>
          🌐 All Stocks Directory & Screener
        </Typography>
        <Chip label={`${totalServerCount} Total Matching Stocks`} size="small" color="primary" sx={{ fontWeight: 800 }} />
        {(isLoading || isFetching) && <LinearProgress sx={{ width: 100, ml: 1, borderRadius: 1 }} />}
        <Box flex={1} />
        <Tooltip title="Refresh Data">
          <IconButton size="small" onClick={() => refetch()} color="primary"><Refresh /></IconButton>
        </Tooltip>
        <Tooltip title="Export CSV">
          <IconButton size="small" onClick={() => exportCSV()} color="primary"><Download /></IconButton>
        </Tooltip>
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={2.5}>
        Complete NSE Stock Directory with 10-record pagination. Filtered by Best Buy 100-Point Formula, Market Cap (Large, Mid, Small Cap), Sectors, EMAs, VWAP, RSI, Volume, and Signals.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error).message}
        </Alert>
      )}

      {/* Control Panel: Search & Filters */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search Box */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search stock symbol, name, or sector..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Market Cap Filter */}
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" fontWeight={700} mr={0.5}>CAP:</Typography>
              <ToggleButtonGroup
                size="small"
                value={capCategory}
                exclusive
                onChange={(_, val) => { if (val) { setCapCategory(val); setPage(0); } }}
              >
                <ToggleButton value="ALL">ALL</ToggleButton>
                <ToggleButton value="LARGE CAP">LARGE</ToggleButton>
                <ToggleButton value="MID CAP">MID</ToggleButton>
                <ToggleButton value="SMALL CAP">SMALL</ToggleButton>
                <ToggleButton value="F&O">F&O</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Grid>

          {/* Signal Filter */}
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent={{ md: 'flex-end' }}>
              <Typography variant="caption" fontWeight={700} mr={0.5}>SIGNAL:</Typography>
              <ToggleButtonGroup
                size="small"
                value={signalFilter}
                exclusive
                onChange={(_, val) => { if (val) { setSignalFilter(val); setPage(0); } }}
              >
                <ToggleButton value="ALL">ALL</ToggleButton>
                <ToggleButton value="BUY">BUY</ToggleButton>
                <ToggleButton value="WATCH">WATCH</ToggleButton>
                <ToggleButton value="SELL">SELL</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Grid>

          {/* Sector Chips & RSI Filter */}
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} alignItems="center" justify-content="space-between" flexWrap="wrap">
              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap flex={1}>
                <Typography variant="caption" fontWeight={700} sx={{ py: 0.5, mr: 0.5 }}>SECTORS:</Typography>
                {sectors.map((sec) => (
                  <Chip
                    key={sec}
                    label={sec}
                    size="small"
                    clickable
                    color={sectorFilter.toLowerCase() === sec.toLowerCase() ? 'primary' : 'default'}
                    onClick={() => { setSectorFilter(sec); setPage(0); }}
                  />
                ))}
              </Stack>

              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" fontWeight={700} mr={0.5}>RSI:</Typography>
                <ToggleButtonGroup
                  size="small"
                  value={rsiFilter}
                  exclusive
                  onChange={(_, val) => { if (val) { setRsiFilter(val); setPage(0); } }}
                >
                  <ToggleButton value="ALL">ALL</ToggleButton>
                  <ToggleButton value="BULLISH">RSI 50+</ToggleButton>
                  <ToggleButton value="STRONG">RSI 60+</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Table */}
      <Paper elevation={2} sx={{ overflow: 'hidden', borderRadius: 2 }}>
        <TableContainer sx={{ maxHeight: 650 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Stock & Category</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  <TableSortLabel active={orderBy === 'current_price'} direction={orderBy === 'current_price' ? order : 'asc'} onClick={() => handleSort('current_price')}>
                    LTP (₹)
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  <TableSortLabel active={orderBy === 'change_pct'} direction={orderBy === 'change_pct' ? order : 'asc'} onClick={() => handleSort('change_pct')}>
                    Change %
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>
                  <TableSortLabel active={orderBy === 'buy_score'} direction={orderBy === 'buy_score' ? order : 'asc'} onClick={() => handleSort('buy_score')}>
                    Best Buy Rating (100 Pts)
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>Signal Rating</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  <TableSortLabel active={orderBy === 'volume_ratio'} direction={orderBy === 'volume_ratio' ? order : 'asc'} onClick={() => handleSort('volume_ratio')}>
                    Vol Ratio
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>VWAP (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>EMA 20 / 50</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  <TableSortLabel active={orderBy === 'rsi'} direction={orderBy === 'rsi' ? order : 'asc'} onClick={() => handleSort('rsi')}>
                    RSI (14)
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {/* Skeleton loading state */}
              {isLoading && stocks.length === 0 && (
                Array.from({ length: 10 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton width={120} height={24} /><Skeleton width={80} height={16} /></TableCell>
                    <TableCell align="right"><Skeleton width={60} height={20} sx={{ ml: 'auto' }} /></TableCell>
                    <TableCell align="right"><Skeleton width={50} height={20} sx={{ ml: 'auto' }} /></TableCell>
                    <TableCell align="center"><Skeleton width={80} height={20} sx={{ mx: 'auto' }} /></TableCell>
                    <TableCell align="center"><Skeleton width={70} height={24} sx={{ mx: 'auto' }} /></TableCell>
                    <TableCell align="right"><Skeleton width={40} height={20} sx={{ ml: 'auto' }} /></TableCell>
                    <TableCell align="right"><Skeleton width={60} height={20} sx={{ ml: 'auto' }} /></TableCell>
                    <TableCell align="right"><Skeleton width={70} height={20} sx={{ ml: 'auto' }} /></TableCell>
                    <TableCell align="right"><Skeleton width={40} height={20} sx={{ ml: 'auto' }} /></TableCell>
                    <TableCell align="center"><Skeleton width={30} height={30} sx={{ mx: 'auto' }} /></TableCell>
                  </TableRow>
                ))
              )}

              {/* No data state */}
              {!isLoading && sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <Typography variant="subtitle1" fontWeight={700} color="text.secondary">No stocks found matching your filters.</Typography>
                    <Typography variant="caption" color="text.secondary">Try resetting your search query or category filters.</Typography>
                  </TableCell>
                </TableRow>
              )}

              {/* Data rows */}
              {sorted.map((stock) => {
                const score = stock.buy_score || 0;
                const price = stock.current_price || 0;
                const changePct = stock.change_pct || 0;
                const isPos = changePct >= 0;

                return (
                  <TableRow
                    hover
                    key={stock.symbol}
                    onClick={() => navigate(`/stock/${stock.symbol}`)}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    {/* Stock Symbol & Cap Badge */}
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight={800}>{stock.symbol}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">{stock.name}</Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.5} mt={0.3}>
                        <Chip label={stock.cap_category || 'Large Cap'} size="small" color="secondary" variant="outlined" sx={{ height: 16, fontSize: 9 }} />
                        <Chip label={stock.sector} size="small" color="primary" variant="outlined" sx={{ height: 16, fontSize: 9 }} />
                      </Stack>
                    </TableCell>

                    {/* LTP */}
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>₹{price.toFixed(2)}</Typography>
                    </TableCell>

                    {/* Change % */}
                    <TableCell align="right">
                      <Typography variant="body2" color={isPos ? 'success.main' : 'error.main'} fontWeight={700}>
                        {isPos ? '+' : ''}{changePct.toFixed(2)}%
                      </Typography>
                    </TableCell>

                    {/* 100-Point Best Buy Rating */}
                    <TableCell align="center">
                      <Box sx={{ minWidth: 90, display: 'inline-block' }}>
                        <Typography variant="body2" fontWeight={800} color={score >= 76 ? 'success.main' : score >= 61 ? 'info.main' : 'warning.main'}>
                          {score.toFixed(0)} / 100
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={score}
                          sx={{
                            height: 5, borderRadius: 2,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: score >= 76 ? 'success.main' : score >= 61 ? 'info.main' : 'warning.main',
                            }
                          }}
                        />
                      </Box>
                    </TableCell>

                    {/* Signal Chip */}
                    <TableCell align="center">
                      <Chip
                        label={stock.signal || 'WATCH'}
                        size="small"
                        color={score >= 76 ? 'success' : score >= 61 ? 'info' : score >= 41 ? 'warning' : 'error'}
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>

                    {/* Volume Ratio */}
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>{stock.volume_ratio ? `${stock.volume_ratio.toFixed(1)}x` : '1.0x'}</Typography>
                    </TableCell>

                    {/* VWAP */}
                    <TableCell align="right">
                      <Typography variant="body2">₹{stock.vwap ? stock.vwap.toFixed(0) : price.toFixed(0)}</Typography>
                    </TableCell>

                    {/* EMAs */}
                    <TableCell align="right">
                      <Typography variant="caption" display="block">₹{stock.ema20 ? stock.ema20.toFixed(0) : price.toFixed(0)}</Typography>
                      <Typography variant="caption" color="text.secondary">₹{stock.ema50 ? stock.ema50.toFixed(0) : price.toFixed(0)}</Typography>
                    </TableCell>

                    {/* RSI */}
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color={(stock.rsi || 50) >= 50 ? 'success.main' : 'error.main'}>
                        {stock.rsi ? stock.rsi.toFixed(1) : 50}
                      </Typography>
                    </TableCell>

                    {/* Action button */}
                    <TableCell align="center">
                      <IconButton size="small" color="primary">
                        <Info fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Table Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalServerCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
}
