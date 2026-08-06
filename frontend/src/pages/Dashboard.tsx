import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Chip,
  LinearProgress, Stack, Button, CircularProgress,
  Alert, Paper, ToggleButtonGroup, ToggleButton,
  TextField, InputAdornment, IconButton, useTheme,
  useMediaQuery, Divider,
} from '@mui/material';
import {
  TrendingUp, TrendingDown, ShowChart, ArrowForward,
  Equalizer, Search, Download, Refresh, Bolt,
  BarChart, Star, CalendarToday, DateRange,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  fetchMarketOverview, fetchTopBuy, fetchFutureStocks,
  exportCSV, fetchEngineOverview,
} from '../services/api';
import { StockTable } from '../components/StockTable';
import { LiveBadge } from '../components/LiveBadge';
import { useSessionClock } from '../hooks/useLiveMarketData';
import type { StockResult } from '../utils/types';

// ─── Metric Card ─────────────────────────────────────────────────────────────
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}> = ({ title, value, sub, color, icon, loading }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        p: 0,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        background: isDark
          ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
        transition: 'all 0.22s',
        '&:hover': { transform: 'translateY(-2px)', borderColor: color || 'primary.main', boxShadow: `0 6px 20px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'}` },
      }}
    >
      {/* top accent bar */}
      <Box sx={{ height: 3, background: color || 'linear-gradient(90deg, #00b0ff, #d500f9)' }} />
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={0.75}>
          {icon && (
            <Box sx={{ color: color || 'primary.main', display: 'flex', opacity: 0.85 }}>
              {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 16 } })}
            </Box>
          )}
          <Typography sx={{ fontSize: { xs: 9.5, sm: 10 }, fontWeight: 800, color: 'text.secondary', letterSpacing: 1, textTransform: 'uppercase' }}>
            {title}
          </Typography>
        </Stack>
        {loading ? (
          <LinearProgress sx={{ my: 1, borderRadius: 2 }} />
        ) : (
          <>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: 16, sm: 20 }, color: color || 'text.primary', lineHeight: 1.2 }}>
              {value}
            </Typography>
            {sub && (
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: 'text.secondary', fontWeight: 600, mt: 0.4 }}>
                {sub}
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Screener Shortcut Card ───────────────────────────────────────────────────
const ScreenerCard: React.FC<{
  title: string; desc: string; path: string; color: string; icon: React.ReactNode;
}> = ({ title, desc, path, color, icon }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Card
      elevation={0}
      onClick={() => navigate(path)}
      sx={{
        borderRadius: 3, cursor: 'pointer',
        border: '1px solid', borderColor: 'divider',
        background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        transition: 'all 0.22s',
        '&:active': { transform: 'scale(0.97)' },
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: color,
          boxShadow: `0 8px 24px ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'}`,
          background: isDark ? `rgba(0,0,0,0.3)` : '#fafbff',
        },
      }}
    >
      <Box sx={{ height: 3, bgcolor: color, borderRadius: '3px 3px 0 0' }} />
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ color, mt: 0.2, flexShrink: 0 }}>
            {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 20 } })}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: 12, sm: 13 }, lineHeight: 1.3, mb: 0.4 }}>
              {title}
            </Typography>
            <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: 'text.secondary', lineHeight: 1.4 }}>
              {desc}
            </Typography>
          </Box>
          <ArrowForward sx={{ fontSize: 15, color: 'text.disabled', flexShrink: 0, mt: 0.2 }} />
        </Box>
      </CardContent>
    </Card>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{
  title: string; action?: string; onAction?: () => void; chip?: string;
}> = ({ title, action, onAction, chip }) => (
  <Stack direction="row" alignItems="center" spacing={1} mb={1.5} flexWrap="wrap">
    <Typography sx={{ fontWeight: 800, fontSize: { xs: 13, sm: 15 }, letterSpacing: 0.2 }}>
      {title}
    </Typography>
    {chip && (
      <Chip label={chip} size="small" color="primary" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }} />
    )}
    <Box sx={{ flex: 1 }} />
    {action && onAction && (
      <Button size="small" endIcon={<ArrowForward sx={{ fontSize: 13 }} />} onClick={onAction}
        sx={{ fontWeight: 700, fontSize: 11, py: 0.4, px: 1 }}>
        {action}
      </Button>
    )}
  </Stack>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [capCategory, setCapCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { refreshMs, isMarketOpen, dataMode } = useSessionClock();

  const { data: engineOverview } = useQuery({
    queryKey: ['engine-overview'],
    queryFn: fetchEngineOverview,
    refetchInterval: refreshMs,
    staleTime: Math.max(refreshMs - 2_000, 5_000),
    retry: 2,
  });

  const { data: legacyMarket, isLoading: mktLoading } = useQuery({
    queryKey: ['market-overview'],
    queryFn: fetchMarketOverview,
    refetchInterval: refreshMs,
    staleTime: Math.max(refreshMs - 2_000, 5_000),
    retry: 2,
  });

  const market = engineOverview ?? legacyMarket;

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
  const rawAll: StockResult[] = (allStocksData?.stocks as any) || [];

  const filteredAll = rawAll.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector?.toLowerCase().includes(q);
  });

  const screeners = [
    { title: '⚡ Intraday',   desc: 'Best intraday buy/sell picks',     path: '/top-buy',     color: '#00e676', icon: <Bolt /> },
    { title: '📈 Swing',      desc: '2–5 day swing opportunities',       path: '/swing-buy',   color: '#00b0ff', icon: <TrendingUp /> },
    { title: '📅 Weekly',     desc: '1–2 week hold signals',             path: '/weekly-buy',  color: '#d500f9', icon: <DateRange /> },
    { title: '🗓️ Monthly',   desc: '1–4 week long-term holds',          path: '/monthly-buy', color: '#ffab00', icon: <CalendarToday /> },
    { title: '🌐 All Stocks', desc: '500+ NSE stocks with full data',    path: '/all-stocks',  color: '#00e5ff', icon: <BarChart /> },
  ];

  return (
    <Box>
      {/* ── Page Header ── */}
      <Stack direction="row" spacing={1} alignItems="center" mb={2} flexWrap="wrap" gap={0.75}>
        <Typography sx={{ fontWeight: 900, fontSize: { xs: 16, sm: 20 } }}>
          🏆 Stock AI Dashboard
        </Typography>
        <Chip label="NSE • 500+ Shares" size="small" color="primary" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />
        <LiveBadge variant="chip" />
        {!isMarketOpen && (
          <Chip
            label={dataMode === 'eod' ? "Today's EOD" : 'Prev Close'}
            size="small"
            sx={{ fontWeight: 700, height: 20, fontSize: '0.65rem', bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          />
        )}
        {mktLoading && <CircularProgress size={14} />}
      </Stack>

      {/* ── Market Overview Cards ── */}
      <Grid container spacing={{ xs: 1, sm: 1.5 }} mb={2.5}>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="Nifty 50"
            value={market ? `₹${market.nifty_price?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}` : '—'}
            sub={market?.nifty_change_pct != null ? `${market.nifty_change_pct >= 0 ? '+' : ''}${market.nifty_change_pct.toFixed(2)}%` : undefined}
            color={market?.nifty_change_pct != null ? (market.nifty_change_pct >= 0 ? '#00e676' : '#ff1744') : undefined}
            icon={<TrendingUp />}
            loading={mktLoading && !market}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="Bank Nifty"
            value={market ? `₹${market.banknifty_price?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}` : '—'}
            sub={market?.banknifty_change_pct != null ? `${market.banknifty_change_pct >= 0 ? '+' : ''}${market.banknifty_change_pct.toFixed(2)}%` : undefined}
            color={market?.banknifty_change_pct != null ? (market.banknifty_change_pct >= 0 ? '#00e676' : '#ff1744') : undefined}
            icon={<ShowChart />}
            loading={mktLoading && !market}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="India VIX"
            value={market?.vix?.toFixed(2) ?? '—'}
            sub={market?.vix_safe ? '🟢 Safe Volatility' : '🔴 High Risk'}
            color={market?.vix_safe ? '#00e676' : '#ff1744'}
            icon={<Equalizer />}
            loading={mktLoading && !market}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="Market Trend"
            value={market?.market_trend?.toUpperCase() ?? '—'}
            color={market?.market_trend === 'bullish' ? '#00e676' : market?.market_trend === 'bearish' ? '#ff1744' : '#ffab00'}
            icon={market?.market_trend === 'bullish' ? <TrendingUp /> : <TrendingDown />}
            loading={mktLoading && !market}
          />
        </Grid>
      </Grid>

      {/* ── Screener Shortcuts ── */}
      <SectionHeader title="📊 Screener Horizons" />
      <Grid container spacing={{ xs: 1, sm: 1.5 }} mb={3}>
        {screeners.map(s => (
          <Grid item xs={12} sm={6} md={2.4} key={s.path}>
            <ScreenerCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* ── Top Buy / Sell ── */}
      <Grid container spacing={{ xs: 1.5, sm: 2.5 }} mb={3}>
        <Grid item xs={12} md={6}>
          <SectionHeader
            title="🟢 Top Buy Picks"
            action="View All"
            onAction={() => navigate('/top-buy')}
          />
          {tbLoading ? (
            <LinearProgress sx={{ borderRadius: 2 }} />
          ) : buyStocks.length > 0 ? (
            <StockTable data={buyStocks} compact />
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>No strong buy signals right now.</Alert>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionHeader
            title="🔴 Top Sell Picks"
            action="View All"
            onAction={() => navigate('/top-buy')}
          />
          {tsLoading ? (
            <LinearProgress sx={{ borderRadius: 2 }} />
          ) : sellStocks.length > 0 ? (
            <StockTable data={sellStocks} compact />
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>No strong sell signals right now.</Alert>
          )}
        </Grid>
      </Grid>

      {/* ── Full Directory ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2.5 }, mb: 3, borderRadius: 3,
          border: '1px solid', borderColor: 'divider',
          background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
        }}
      >
        {/* Toolbar row 1 */}
        <Stack direction="row" spacing={1} alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 13, sm: 15 } }}>
            📋 NSE Shares Directory
          </Typography>
          <Chip label={`${filteredAll.length} stocks`} size="small" color="primary" sx={{ fontWeight: 800, height: 18, fontSize: '0.62rem' }} />
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" onClick={() => refetchAll()} title="Refresh">
            <Refresh sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton size="small" onClick={() => exportCSV()} title="Export CSV">
            <Download sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>

        {/* Toolbar row 2: filters */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <ToggleButtonGroup
            size="small"
            value={capCategory}
            exclusive
            onChange={(_, v) => v && setCapCategory(v)}
            sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { py: 0.5, px: { xs: 1, sm: 1.5 }, fontSize: 11 } }}
          >
            {['ALL','LARGE','MID','SMALL','F&O'].map(v => (
              <ToggleButton key={v} value={v}>{v}</ToggleButton>
            ))}
          </ToggleButtonGroup>

          <TextField
            size="small"
            placeholder="Search symbol, sector…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            sx={{ flex: 1, minWidth: 160 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment>,
              sx: { borderRadius: 2, fontSize: 13 },
            }}
          />
        </Stack>

        <StockTable data={filteredAll} loading={allLoading} />
      </Paper>

      {/* ── AI Rating Breakdown ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 }, borderRadius: 3,
          border: '1px solid', borderColor: 'divider',
          background: isDark ? 'rgba(255,255,255,0.02)' : '#fafbff',
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: { xs: 12, sm: 14 }, mb: 1.5 }}>
          🏆 200-Point Institutional AI Rating Breakdown
        </Typography>
        <Grid container spacing={1}>
          {[
            { name: 'Fundamentals', pts: '40 pts' },
            { name: 'Technicals', pts: '50 pts' },
            { name: 'Volume', pts: '20 pts' },
            { name: 'Derivatives (OI)', pts: '35 pts' },
            { name: 'Anti-Spoofing', pts: '15 pts' },
            { name: 'Relative Strength', pts: '15 pts' },
            { name: 'Institutional Flow', pts: '15 pts' },
            { name: 'Sector Analysis', pts: '10 pts' },
            { name: 'Liquidity', pts: '10 pts' },
            { name: 'News & Sentiment', pts: '15 pts' },
            { name: 'Risk Mgmt', pts: '15 pts' },
            { name: 'AI Prediction', pts: '10 pts' },
          ].map(item => (
            <Grid item xs={6} sm={4} md={2} key={item.name}>
              <Box
                sx={{
                  p: 1, borderRadius: 2, textAlign: 'center',
                  border: '1px solid', borderColor: 'divider',
                  background: isDark ? 'rgba(0,176,255,0.04)' : 'rgba(21,101,192,0.04)',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' },
                }}
              >
                <Typography sx={{ fontSize: { xs: 9, sm: 10 }, color: 'text.secondary', fontWeight: 600, lineHeight: 1.3 }}>
                  {item.name}
                </Typography>
                <Typography sx={{ fontSize: { xs: 10.5, sm: 12 }, color: 'primary.main', fontWeight: 900, mt: 0.3 }}>
                  {item.pts}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}
