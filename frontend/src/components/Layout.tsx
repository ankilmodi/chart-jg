import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText,
  Divider, Badge, Chip, Tooltip, useTheme, useMediaQuery,
  TextField, Autocomplete
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard as DashboardIcon, GridView, Star,
  TrendingUp, TrendingDown, DateRange, CalendarMonth, Bookmarks, Settings, Notifications,
  WbSunny, DarkMode, Analytics, Whatshot, Equalizer, Assessment,
  History as HistoryIcon, Biotech, Science, Public, AccountTree, RocketLaunch
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketOverview, fetchFutureStocks } from '../services/api';
import { MarketStatusBadge } from './MarketStatusBadge';
import { GlobalMarketStatus } from './GlobalMarketStatus';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { markAllRead } from '../store';
import type { StockResult } from '../utils/types';

const DRAWER_W = 240;

interface LayoutProps {
  children: React.ReactNode;
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, themeMode, onToggleTheme }) => {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const unread = useAppSelector(s => s.notifications.unread);

  const { data: market } = useQuery({
    queryKey: ['market-overview'],
    queryFn: fetchMarketOverview,
    refetchInterval: 60_000,
  });

  const { data: stocksData } = useQuery({
    queryKey: ['all-stocks-search'],
    queryFn: () => fetchFutureStocks({ limit: 500 }),
    refetchInterval: 300_000,
  });

  const allStocks: StockResult[] = (stocksData?.stocks as any) || [];

  const nav = (path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const itemSx = (path: string) => ({
    borderRadius: 1.5,
    mx: 1,
    mb: 0.5,
    py: 0.8,
    bgcolor: isActive(path) ? 'primary.main' : 'transparent',
    color:   isActive(path) ? 'primary.contrastText' : 'inherit',
    fontWeight: isActive(path) ? 700 : 500,
    '&:hover': { bgcolor: isActive(path) ? 'primary.dark' : 'action.hover' },
  });

  const menuItems = [
    // ── Overview ───────────────────────────────────────────────────────────
    { label: 'Dashboard',            path: '/',              icon: <DashboardIcon fontSize="small" /> },
    { label: 'IPO Apply Assistant', path: '/ipo',           icon: <RocketLaunch fontSize="small" /> },
    { label: 'All Stocks Directory', path: '/all-stocks',    icon: <GridView fontSize="small" /> },
    { label: 'F&O Stocks',           path: '/future-stocks', icon: <Analytics fontSize="small" /> },
    { label: 'Heat Map',             path: '/heatmap',       icon: <Whatshot fontSize="small" /> },
    // ── Market Data ────────────────────────────────────────────────────────
    { label: 'Top Buyers',           path: '/top-buyers',    icon: <TrendingUp fontSize="small" /> },
    { label: 'Top Sellers',          path: '/top-sellers',   icon: <TrendingDown fontSize="small" /> },
    { label: 'Volume Best',          path: '/volume-best',   icon: <Equalizer fontSize="small" /> },
    // ── Trading Screens ────────────────────────────────────────────────────
    { label: 'Intraday Trading',     path: '/top-buy',       icon: <Star fontSize="small" /> },
    { label: 'Swing Trading',        path: '/swing-buy',     icon: <TrendingUp fontSize="small" /> },
    { label: 'Weekly Stock',         path: '/weekly-buy',    icon: <DateRange fontSize="small" /> },
    { label: 'Monthly Stock',        path: '/monthly-buy',   icon: <CalendarMonth fontSize="small" /> },
    // ── Analysis ───────────────────────────────────────────────────────────
    { label: 'Signal',               path: '/signal',        icon: <Assessment fontSize="small" /> },
    { label: 'Indicators',           path: '/indicators',    icon: <Biotech fontSize="small" /> },
    { label: 'History',              path: '/history',       icon: <HistoryIcon fontSize="small" /> },
    { label: 'Backtest',             path: '/backtest',      icon: <Science fontSize="small" /> },
    { label: 'Universe',             path: '/universe',      icon: <Public fontSize="small" /> },
    // ── Tools ──────────────────────────────────────────────────────────────
    { label: 'Scanner',              path: '/scanner',       icon: <AccountTree fontSize="small" /> },
    { label: 'Watchlist',            path: '/watchlist',     icon: <Bookmarks fontSize="small" /> },
    { label: 'Settings',             path: '/settings',      icon: <Settings fontSize="small" /> },
  ];

  const DrawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Analytics sx={{ color: 'primary.main', fontSize: 32 }} />
        <Box>
          <Typography variant="subtitle1" fontWeight={800} lineHeight={1.1} letterSpacing={0.5}>
            STOCK AI ANALYZER
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            All Stocks (Large, Mid, Small Cap)
          </Typography>
        </Box>
      </Box>

      {/* Market status bar */}
      {market && (
        <Box sx={{ px: 2, pb: 1.5, pt: 0.5 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: themeMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>NSE NIFTY 50</Typography>
              <Chip
                label={market.market_trend?.toUpperCase()}
                size="small"
                color={market.market_trend === 'bullish' ? 'success' : market.market_trend === 'bearish' ? 'error' : 'warning'}
                sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
              />
            </Box>
            <Typography variant="body2" fontWeight={800}>
              {market.nifty_price?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}
              {market.nifty_change_pct != null && (
                <Typography component="span" variant="caption"
                  color={market.nifty_change_pct >= 0 ? 'success.main' : 'error.main'} ml={0.8} fontWeight={700}>
                  ({market.nifty_change_pct >= 0 ? '+' : ''}{market.nifty_change_pct?.toFixed(2)}%)
                </Typography>
              )}
            </Typography>
            {market.vix && (
              <Typography variant="caption" display="block" color={market.vix_safe ? 'success.main' : 'error.main'} mt={0.3} fontWeight={600}>
                India VIX: {market.vix?.toFixed(1)} {market.vix_safe ? '🟢 Safe' : '🔴 High Risk'}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Global Market Session Status Panel */}
      <Box sx={{ px: 2, pb: 1.5 }}>
        <GlobalMarketStatus variant="panel" />
      </Box>

      <Divider />

      {/* Navigation List */}
      <List dense sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {menuItems.map(item => (
          <ListItemButton key={item.path}
            sx={{
              ...itemSx(item.path),
              ...(item.path === '/ipo' && !isActive('/ipo') ? {
                background: themeMode === 'dark' ? 'linear-gradient(135deg, rgba(108, 99, 255, 0.15) 0%, rgba(67, 206, 162, 0.15) 100%)' : 'linear-gradient(135deg, #eef2ff 0%, #e6fffa 100%)',
                border: '1px solid',
                borderColor: themeMode === 'dark' ? 'rgba(108, 99, 255, 0.3)' : 'rgba(108, 99, 255, 0.2)',
              } : {}),
            }}
            onClick={() => nav(item.path)}
          >
            <ListItemIcon sx={{ minWidth: 36, color: item.path === '/ipo' && !isActive('/ipo') ? '#6c63ff' : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: 13, fontWeight: isActive(item.path) || item.path === '/ipo' ? 700 : 600 }}
            />
            {item.path === '/ipo' && (
              <Chip
                label="LIVE"
                size="small"
                sx={{
                  height: 18,
                  fontSize: 9,
                  fontWeight: 900,
                  bgcolor: '#00c853',
                  color: 'white',
                  letterSpacing: 0.5,
                  px: 0.5,
                }}
              />
            )}
          </ListItemButton>
        ))}
      </List>

      <Divider />
      <Box sx={{ p: 1.5, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Institutional v3.0 • All Stocks Engine
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" elevation={0}
        sx={{ zIndex: theme.zIndex.drawer + 1, borderBottom: 1, borderColor: 'divider',
              bgcolor: 'background.paper', color: 'text.primary' }}>
        <Toolbar variant="dense">
          <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 1, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1, fontSize: 16, display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
            🏆 INSTITUTIONAL STOCK AI SCREENER <Chip label="ALL STOCKS" size="small" color="primary" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
          </Typography>

          {/* Global Search Stock Filter Box */}
          <Autocomplete
            size="small"
            options={allStocks}
            getOptionLabel={(option) => `${option.symbol} - ${option.name} (${option.sector})`}
            onChange={(_, value) => {
              if (value) navigate(`/stock/${value.symbol}`);
            }}
            sx={{ width: { xs: 180, sm: 260, md: 320 }, mr: 2 }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="🔍 Search stock..."
                variant="outlined"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  style: { fontSize: 13, height: 34 }
                }}
              />
            )}
          />

          {market && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2, mr: 2 }}>
              <Box textAlign="right">
                <Typography variant="caption" color="text.secondary" display="block" lineHeight={1}>NIFTY 50</Typography>
                <Typography variant="body2" fontWeight={800}>
                  {market.nifty_price?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}
                </Typography>
              </Box>
              {market.vix && (
                <Chip label={`VIX ${market.vix.toFixed(1)}`} size="small"
                  color={market.vix_safe ? 'success' : 'error'} sx={{ fontWeight: 700 }} />
              )}
            </Box>
          )}

          {/* Market session status badge */}
          <Box sx={{ mx: 1 }}>
            <GlobalMarketStatus variant="compact" />
          </Box>

          <Tooltip title="Notifications">
            <IconButton onClick={() => { navigate('/watchlist'); dispatch(markAllRead()); }}>
              <Badge badgeContent={unread} color="error">
                <Notifications fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton onClick={onToggleTheme}>
              {themeMode === 'dark' ? <WbSunny fontSize="small" /> : <DarkMode fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent"
        sx={{ width: DRAWER_W, flexShrink: 0, display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { width: DRAWER_W, boxSizing: 'border-box', mt: '48px' } }}>
        {DrawerContent}
      </Drawer>

      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { width: DRAWER_W } }}>
        {DrawerContent}
      </Drawer>

      <Box component="main"
        sx={{
          flexGrow: 1,
          mt: '48px',
          ml: 0,
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
          p: { xs: 1.5, sm: 2, md: 3 },
        }}>
        {children}
      </Box>
    </Box>
  );
};
