import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText,
  Divider, Badge, Chip, Tooltip, useTheme, useMediaQuery,
  TextField, Autocomplete, BottomNavigation, BottomNavigationAction,
  Collapse, Paper, SwipeableDrawer,
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard as DashboardIcon, GridView, Star,
  TrendingUp, TrendingDown, DateRange, CalendarMonth, Bookmarks, Settings, Notifications,
  WbSunny, DarkMode, Analytics, Whatshot, Equalizer, Assessment,
  History as HistoryIcon, Biotech, Science, Public, AccountTree, RocketLaunch,
  ExpandLess, ExpandMore, Search, Home, BarChart, Explore, Person,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketOverview, fetchFutureStocks } from '../services/api';
import { GlobalMarketStatus } from './GlobalMarketStatus';
import { MarketStatusBar } from './MarketStatusBar';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { markAllRead } from '../store';
import type { StockResult } from '../utils/types';

const DRAWER_W = 260;
const BOTTOM_NAV_HEIGHT = 64;

interface LayoutProps {
  children: React.ReactNode;
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, themeMode, onToggleTheme }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    trading: true,
    analysis: false,
    tools: false,
  });
  const [bottomNavValue, setBottomNavValue] = useState(0);
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const itemSx = (path: string) => ({
    borderRadius: 2,
    mx: 1.5,
    my: 0.4,
    py: isMobile ? 1.2 : 1,
    pl: 2,
    pr: 1.5,
    bgcolor: isActive(path) ? 'primary.main' : 'transparent',
    color: isActive(path) ? 'primary.contrastText' : 'inherit',
    fontWeight: isActive(path) ? 700 : 500,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      bgcolor: isActive(path) ? 'primary.dark' : 'action.hover',
      transform: 'translateX(4px)',
    },
    '&:active': {
      transform: 'translateX(2px) scale(0.98)',
    },
  });

  const sectionHeaderSx = {
    px: 2.5,
    py: 1,
    cursor: 'pointer',
    userSelect: 'none',
    '&:hover': { bgcolor: 'action.hover' },
    transition: 'all 0.2s',
  };

  const menuSections = {
    overview: [
      { label: 'Dashboard', path: '/', icon: <DashboardIcon fontSize="small" /> },
      { label: 'IPO Assistant', path: '/ipo', icon: <RocketLaunch fontSize="small" />, badge: 'LIVE' },
      { label: 'All Stocks', path: '/all-stocks', icon: <GridView fontSize="small" /> },
      { label: 'F&O Stocks', path: '/future-stocks', icon: <Analytics fontSize="small" /> },
      { label: 'Heat Map', path: '/heatmap', icon: <Whatshot fontSize="small" /> },
    ],
    market: [
      { label: 'Top Buyers', path: '/top-buyers', icon: <TrendingUp fontSize="small" /> },
      { label: 'Top Sellers', path: '/top-sellers', icon: <TrendingDown fontSize="small" /> },
      { label: 'Volume Best', path: '/volume-best', icon: <Equalizer fontSize="small" /> },
    ],
    trading: [
      { label: 'Intraday', path: '/top-buy', icon: <Star fontSize="small" /> },
      { label: 'Swing', path: '/swing-buy', icon: <TrendingUp fontSize="small" /> },
      { label: 'Weekly', path: '/weekly-buy', icon: <DateRange fontSize="small" /> },
      { label: 'Monthly', path: '/monthly-buy', icon: <CalendarMonth fontSize="small" /> },
    ],
    analysis: [
      { label: 'Signal', path: '/signal', icon: <Assessment fontSize="small" /> },
      { label: 'Indicators', path: '/indicators', icon: <Biotech fontSize="small" /> },
      { label: 'History', path: '/history', icon: <HistoryIcon fontSize="small" /> },
      { label: 'Backtest', path: '/backtest', icon: <Science fontSize="small" /> },
      { label: 'Universe', path: '/universe', icon: <Public fontSize="small" /> },
    ],
    tools: [
      { label: 'Scanner', path: '/scanner', icon: <AccountTree fontSize="small" /> },
      { label: 'Watchlist', path: '/watchlist', icon: <Bookmarks fontSize="small" /> },
      { label: 'Settings', path: '/settings', icon: <Settings fontSize="small" /> },
    ],
  };

  const DrawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      {/* Logo */}
      <Box sx={{
        p: 2.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        background: themeMode === 'dark'
          ? 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(156, 39, 176, 0.1) 100%)'
          : 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
      }}>
        <Box sx={{
          width: 42,
          height: 42,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2196f3 0%, #9c27b0 100%)',
          boxShadow: 3,
        }}>
          <Analytics sx={{ color: 'white', fontSize: 28 }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={900} lineHeight={1.2} letterSpacing={0.3} fontSize={15}>
            STOCK AI
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={700} fontSize={10}>
            ALL STOCKS • 4000+
          </Typography>
        </Box>
      </Box>

      {/* Market Snapshot — Compact */}
      {market && !isMobile && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 2,
              background: themeMode === 'dark'
                ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                : 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} fontSize={10}>
                NIFTY 50
              </Typography>
              <Chip
                label={market.market_trend?.toUpperCase()}
                size="small"
                color={market.market_trend === 'bullish' ? 'success' : market.market_trend === 'bearish' ? 'error' : 'warning'}
                sx={{ height: 20, fontSize: 9, fontWeight: 800 }}
              />
            </Box>
            <Typography variant="h6" fontWeight={800} fontSize={16} lineHeight={1.3}>
              {market.nifty_price?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}
              {market.nifty_change_pct != null && (
                <Typography
                  component="span"
                  variant="caption"
                  color={market.nifty_change_pct >= 0 ? 'success.main' : 'error.main'}
                  ml={1}
                  fontWeight={700}
                  fontSize={12}
                >
                  {market.nifty_change_pct >= 0 ? '▲' : '▼'} {Math.abs(market.nifty_change_pct)?.toFixed(2)}%
                </Typography>
              )}
            </Typography>
            {market.vix && (
              <Typography
                variant="caption"
                display="block"
                color={market.vix_safe ? 'success.main' : 'error.main'}
                mt={0.5}
                fontWeight={700}
                fontSize={10}
              >
                VIX: {market.vix?.toFixed(1)} • {market.vix_safe ? '🟢 Safe' : '🔴 High'}
              </Typography>
            )}
          </Paper>
        </Box>
      )}

      {/* Session Status Panel */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <GlobalMarketStatus variant="panel" />
      </Box>

      {/* Navigation — Collapsible Sections */}
      <List dense sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {/* Overview */}
        {menuSections.overview.map(item => (
          <ListItemButton key={item.path} sx={itemSx(item.path)} onClick={() => nav(item.path)}>
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: 13.5, fontWeight: isActive(item.path) ? 700 : 600 }}
            />
            {item.badge && (
              <Chip
                label={item.badge}
                size="small"
                sx={{
                  height: 20,
                  fontSize: 9,
                  fontWeight: 900,
                  bgcolor: '#00c853',
                  color: 'white',
                  letterSpacing: 0.5,
                }}
              />
            )}
          </ListItemButton>
        ))}

        <Divider sx={{ my: 1, mx: 2 }} />

        {/* Market Data */}
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 2.5, py: 1, display: 'block', fontSize: 11 }}>
          MARKET DATA
        </Typography>
        {menuSections.market.map(item => (
          <ListItemButton key={item.path} sx={itemSx(item.path)} onClick={() => nav(item.path)}>
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: isActive(item.path) ? 700 : 600 }} />
          </ListItemButton>
        ))}

        <Divider sx={{ my: 1, mx: 2 }} />

        {/* Trading Screens — Collapsible */}
        <Box onClick={() => toggleSection('trading')} sx={sectionHeaderSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} fontSize={11}>
              TRADING SCREENS
            </Typography>
            <IconButton size="small">{expandedSections.trading ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}</IconButton>
          </Box>
        </Box>
        <Collapse in={expandedSections.trading}>
          {menuSections.trading.map(item => (
            <ListItemButton key={item.path} sx={itemSx(item.path)} onClick={() => nav(item.path)}>
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: isActive(item.path) ? 700 : 600 }} />
            </ListItemButton>
          ))}
        </Collapse>

        <Divider sx={{ my: 1, mx: 2 }} />

        {/* Analysis — Collapsible */}
        <Box onClick={() => toggleSection('analysis')} sx={sectionHeaderSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} fontSize={11}>
              ANALYSIS
            </Typography>
            <IconButton size="small">{expandedSections.analysis ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}</IconButton>
          </Box>
        </Box>
        <Collapse in={expandedSections.analysis}>
          {menuSections.analysis.map(item => (
            <ListItemButton key={item.path} sx={itemSx(item.path)} onClick={() => nav(item.path)}>
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: isActive(item.path) ? 700 : 600 }} />
            </ListItemButton>
          ))}
        </Collapse>

        <Divider sx={{ my: 1, mx: 2 }} />

        {/* Tools — Collapsible */}
        <Box onClick={() => toggleSection('tools')} sx={sectionHeaderSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} fontSize={11}>
              TOOLS
            </Typography>
            <IconButton size="small">{expandedSections.tools ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}</IconButton>
          </Box>
        </Box>
        <Collapse in={expandedSections.tools}>
          {menuSections.tools.map(item => (
            <ListItemButton key={item.path} sx={itemSx(item.path)} onClick={() => nav(item.path)}>
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: isActive(item.path) ? 700 : 600 }} />
            </ListItemButton>
          ))}
        </Collapse>
      </List>

      <Divider />
      <Box sx={{ p: 1.5, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} fontSize={10}>
          v3.0 • Institutional Engine
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
          backdropFilter: 'blur(20px)',
          backgroundColor: themeMode === 'dark' ? 'rgba(15, 22, 41, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 2 } }}>
          <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: { xs: 0.5, sm: 2 }, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>

          {/* Logo + Title (desktop/tablet) */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, mr: 2 }}>
            <Analytics sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h6" fontWeight={900} sx={{ fontSize: { sm: 14, md: 16 }, letterSpacing: 0.5 }}>
              STOCK AI SCREENER
            </Typography>
            <Chip label="4000+ STOCKS" size="small" color="primary" sx={{ height: 22, fontSize: 10, fontWeight: 800 }} />
          </Box>

          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: 0.5, mr: 1 }}>
            <Analytics sx={{ color: 'primary.main', fontSize: 24 }} />
            <Typography variant="subtitle2" fontWeight={900} fontSize={13}>
              STOCK AI
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Search Bar */}
          <Autocomplete
            size="small"
            options={allStocks}
            getOptionLabel={option => `${option.symbol} - ${option.name}`}
            onChange={(_, value) => {
              if (value) navigate(`/stock/${value.symbol}`);
            }}
            sx={{ width: { xs: 140, sm: 200, md: 280, lg: 350 }, mr: { xs: 0.5, sm: 2 } }}
            renderInput={params => (
              <TextField
                {...params}
                placeholder="🔍 Search..."
                variant="outlined"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  style: { fontSize: { xs: 12, sm: 13 }, height: 36 },
                }}
              />
            )}
          />

          {/* Market Status (desktop only) */}
          {market && (
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 2, mr: 2 }}>
              <Box textAlign="right">
                <Typography variant="caption" color="text.secondary" display="block" lineHeight={1} fontSize={10}>
                  NIFTY 50
                </Typography>
                <Typography variant="body2" fontWeight={800} fontSize={14}>
                  {market.nifty_price?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}
                </Typography>
              </Box>
              {market.vix && (
                <Chip
                  label={`VIX ${market.vix.toFixed(1)}`}
                  size="small"
                  color={market.vix_safe ? 'success' : 'error'}
                  sx={{ fontWeight: 700, height: 24 }}
                />
              )}
            </Box>
          )}

          {/* Session Badge */}
          <Box sx={{ mx: { xs: 0.5, sm: 1 } }}>
            <GlobalMarketStatus variant="compact" />
          </Box>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              size={isMobile ? 'small' : 'medium'}
              onClick={() => {
                navigate('/watchlist');
                dispatch(markAllRead());
              }}
            >
              <Badge badgeContent={unread} color="error">
                <Notifications fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton size={isMobile ? 'small' : 'medium'} onClick={onToggleTheme}>
              {themeMode === 'dark' ? <WbSunny fontSize="small" /> : <DarkMode fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Desktop Drawer (Permanent) */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_W,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_W,
            boxSizing: 'border-box',
            mt: '64px',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        {DrawerContent}
      </Drawer>

      {/* Mobile Drawer (Swipeable) */}
      <SwipeableDrawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onOpen={() => setMobileOpen(true)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_W },
        }}
      >
        {DrawerContent}
      </SwipeableDrawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: { xs: '56px', sm: '64px' },
          mb: { xs: `${BOTTOM_NAV_HEIGHT}px`, md: 0 },
          ml: { xs: 0, md: 0 },
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        {/* Sticky Market Status Bar */}
        <MarketStatusBar />

        {/* Page Content */}
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>{children}</Box>
      </Box>

      {/* Bottom Navigation (Mobile Only) */}
      {isMobile && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar,
            borderTop: 1,
            borderColor: 'divider',
            height: BOTTOM_NAV_HEIGHT,
          }}
          elevation={8}
        >
          <BottomNavigation
            value={bottomNavValue}
            onChange={(_, newValue) => {
              setBottomNavValue(newValue);
              const paths = ['/', '/all-stocks', '/scanner', '/watchlist'];
              if (paths[newValue]) navigate(paths[newValue]);
            }}
            showLabels
            sx={{ height: '100%', bgcolor: 'background.paper' }}
          >
            <BottomNavigationAction label="Home" icon={<Home />} />
            <BottomNavigationAction label="Stocks" icon={<BarChart />} />
            <BottomNavigationAction label="Scan" icon={<Search />} />
            <BottomNavigationAction label="Watch" icon={<Bookmarks />} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};
