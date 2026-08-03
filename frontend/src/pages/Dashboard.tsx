import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Chip,
  LinearProgress, Stack, Button, CircularProgress,
  Alert, Paper, ToggleButtonGroup, ToggleButton, TextField, InputAdornment
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Star, ShowChart,
  ArrowForward, Equalizer, GridView, Search, Download, Refresh
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketOverview, fetchTopBuy, fetchFutureStocks, exportCSV } from '../services/api';
import { StockTable } from '../components/StockTable';
import type { StockResult } from '../utils/types';

const MetricCard: React.FC<{
  title: string; value: string | number; sub?: string;
  color?: string; icon?: React.ReactNode;
}> = ({ title, value, sub, color, icon }) => (
  <Card elevation={2} sx={{ borderRadius: 2 }}>
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
        {icon && <Box sx={{ color: color || 'primary.main' }}>{icon}</Box>}
        <Typography variant="caption" color="text.secondary" fontWeight={700}>{title}</Typography>
      </Stack>
      <Typography variant="h6" fontWeight={800} color={color}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary" fontWeight={600}>{sub}</Typography>}
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const navigate = useNavigate();
  const [capCategory, setCapCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: market, isLoading: mktLoading } = useQuery({
    queryKey: ['market-overview'],
    queryFn: fetchMarketOverview,
    refetchInterval: 60_000,
  });

  const { data: topBuyData, isLoading: tbLoading } = useQuery({
    queryKey: ['top-buy', 'buy'],
    queryFn: () => fetchTopBuy(5, 'buy'),
    refetchInterval: 300_000,
  });

  const { data: topSellData, isLoading: tsLoading } = useQuery({
    queryKey: ['top-buy', 'sell'],
    queryFn: () => fetchTopBuy(5, 'sell'),
    refetchInterval: 300_000,
  });

  const { data: allStocksData, isLoading: allLoading, refetch: refetchAll } = useQuery({
    queryKey: ['all-stocks-dash', capCategory],
    queryFn: () => fetchFutureStocks({ limit: 500, cap_category: capCategory !== 'ALL' ? capCategory : undefined }),
    refetchInterval: 300_000,
  });

  const buyStocks: StockResult[] = (topBuyData?.stocks as any) || [];
  const sellStocks: StockResult[] = (topSellData?.stocks as any) || [];
  const rawAllStocks: StockResult[] = (allStocksData?.stocks as any) || [];

  const filteredAllStocks = rawAllStocks.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q);
  });

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 } }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3} flexWrap="wrap">
        <Typography variant="h5" fontWeight={800}>🏆 Institutional Stock AI Dashboard</Typography>
        <Chip label="500+ All NSE Shares (Large, Mid, Small Cap)" size="small" color="primary" sx={{ fontWeight: 800 }} />
        {mktLoading && <CircularProgress size={18} />}
      </Stack>

      {/* Market Overview Grid */}
      {market && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={3}>
            <MetricCard
              title="NSE NIFTY 50"
              value={`₹${market.nifty_price?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}`}
              sub={market.nifty_change_pct != null ? `${market.nifty_change_pct >= 0 ? '+' : ''}${market.nifty_change_pct?.toFixed(2)}%` : ''}
              color={market.nifty_change_pct != null && market.nifty_change_pct >= 0 ? '#10b981' : '#ef4444'}
              icon={<TrendingUp />}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <MetricCard
              title="BANK NIFTY"
              value={`₹${market.banknifty_price?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}`}
              sub={market.banknifty_change_pct != null ? `${market.banknifty_change_pct >= 0 ? '+' : ''}${market.banknifty_change_pct?.toFixed(2)}%` : ''}
              icon={<ShowChart />}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <MetricCard
              title="India VIX"
              value={market.vix?.toFixed(2) ?? '—'}
              sub={market.vix_safe ? '🟢 Safe Volatility' : '🔴 High Risk'}
              color={market.vix_safe ? '#10b981' : '#ef4444'}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <MetricCard
              title="Market Trend"
              value={market.market_trend?.toUpperCase() ?? '—'}
              color={market.market_trend === 'bullish' ? '#10b981' : market.market_trend === 'bearish' ? '#ef4444' : '#f59e0b'}
              icon={market.market_trend === 'bullish' ? <TrendingUp /> : <TrendingDown />}
            />
          </Grid>
        </Grid>
      )}

      {/* Primary Screener Horizons Cards */}
      <Typography variant="subtitle2" fontWeight={800} mb={1.5} letterSpacing={0.5}>
        INSTITUTIONAL STOCK SCREENER HORIZONS (ALL SHARES & F&O)
      </Typography>

      <Grid container spacing={2} mb={3}>
        {[
          { title: '⚡ Intraday Trading', desc: 'Best Buy & Sell Intraday Picks', path: '/top-buy', color: '#10b981' },
          { title: '📈 Swing Trading', desc: '2–5 Day Hold Best Opportunities', path: '/swing-buy', color: '#3b82f6' },
          { title: '📅 Weekly Stock', desc: '1–2 Week Hold Stock Signals', path: '/weekly-buy', color: '#8b5cf6' },
          { title: '🗓️ Monthly Stock', desc: '1–4 Week Long-Term Holds', path: '/monthly-buy', color: '#f59e0b' },
          { title: '🌐 All Stocks Directory', desc: 'Complete 500+ Stock Directory with Pagination', path: '/all-stocks', color: '#06b6d4' },
        ].map(item => (
          <Grid item xs={12} sm={6} md={2.4} key={item.title}>
            <Card elevation={2} sx={{ borderRadius: 2, cursor: 'pointer', borderTop: `4px solid ${item.color}`, '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => navigate(item.path)}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight={800} color="text.primary">{item.title}</Typography>
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>{item.desc}</Typography>
                <Button size="small" endIcon={<ArrowForward />} sx={{ mt: 1, p: 0, fontWeight: 700, minWidth: 0, textTransform: 'none' }}>
                  Open Screener
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Top Buy vs Top Sell Stocks */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Box mb={1.5} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" fontWeight={800} color="success.main">
              🟢 Top Buy Shares (Long Picks)
            </Typography>
            <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/top-buy')} sx={{ fontWeight: 700 }}>
              View All
            </Button>
          </Box>
          {tbLoading ? <LinearProgress /> :
            buyStocks.length > 0 ? (
              <StockTable data={buyStocks} compact />
            ) : (
              <Alert severity="info">No strong buy signals right now.</Alert>
            )
          }
        </Grid>

        <Grid item xs={12} md={6}>
          <Box mb={1.5} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" fontWeight={800} color="error.main">
              🔴 Top Sell Shares (Short Picks)
            </Typography>
            <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/top-buy')} sx={{ fontWeight: 700 }}>
              View All
            </Button>
          </Box>
          {tsLoading ? <LinearProgress /> :
            sellStocks.length > 0 ? (
              <StockTable data={sellStocks} compact />
            ) : (
              <Alert severity="info">No short sell signals right now.</Alert>
            )
          }
        </Grid>
      </Grid>

      {/* All Share Directory with Pagination */}
      <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={2} flexWrap="wrap">
          <Typography variant="h6" fontWeight={800}>
            📊 All NSE Shares Directory (Large, Mid & Small Cap)
          </Typography>
          <Chip label={`${filteredAllStocks.length} Shares`} size="small" color="primary" sx={{ fontWeight: 800 }} />
          <Box flex={1} />

          {/* Cap Category Selector */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" fontWeight={700} mr={0.5}>CAP:</Typography>
            <ToggleButtonGroup
              size="small"
              value={capCategory}
              exclusive
              onChange={(_, val) => val && setCapCategory(val)}
            >
              <ToggleButton value="ALL">ALL</ToggleButton>
              <ToggleButton value="LARGE">LARGE</ToggleButton>
              <ToggleButton value="MID">MID</ToggleButton>
              <ToggleButton value="SMALL">SMALL</ToggleButton>
              <ToggleButton value="F&O">F&O</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* Live Search Input Filter */}
          <TextField
            size="small"
            placeholder="Search symbol, name, sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 200, md: 240 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Button size="small" variant="outlined" startIcon={<Refresh />} onClick={() => refetchAll()}>
            Refresh
          </Button>
          <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportCSV()}>
            Export
          </Button>
        </Stack>

        <StockTable data={filteredAllStocks} loading={allLoading} />
      </Paper>

      {/* Institutional Rating System Guide */}
      <Paper sx={{ p: 2.5, borderRadius: 2 }} elevation={1}>
        <Typography variant="subtitle2" fontWeight={800} mb={1.5}>
          🏆 200-Point Institutional AI Rating Engine Structure
        </Typography>
        <Grid container spacing={1.5}>
          {[
            { name: 'Fundamentals', pts: '40 Pts' },
            { name: 'Technicals (EMAs/RSI/ADX)', pts: '50 Pts' },
            { name: 'Volume Analysis', pts: '20 Pts' },
            { name: 'Derivatives (F&O / OI)', pts: '35 Pts' },
            { name: 'Order Book Anti-Spoofing', pts: '15 Pts' },
            { name: 'Relative Strength', pts: '15 Pts' },
            { name: 'Institutional Activity', pts: '15 Pts' },
            { name: 'Sector Analysis', pts: '10 Pts' },
            { name: 'Liquidity Score', pts: '10 Pts' },
            { name: 'News & Sentiment', pts: '15 Pts' },
            { name: 'Risk Management', pts: '15 Pts' },
            { name: 'AI Prediction Engine', pts: '10 Pts' },
          ].map(item => (
            <Grid item xs={6} sm={4} md={2} key={item.name}>
              <Paper sx={{ p: 1, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>{item.name}</Typography>
                <Typography variant="caption" color="primary.main" fontWeight={800}>{item.pts}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}
