import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText,
  Divider, Badge, Chip, Tooltip, useTheme, useMediaQuery,
  TextField, Autocomplete, BottomNavigation, BottomNavigationAction,
  Collapse, Paper, SwipeableDrawer, alpha,
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard as DashboardIcon, GridView, Star,
  TrendingUp, TrendingDown, DateRange, CalendarMonth, Bookmarks, Settings,
  Notifications, WbSunny, DarkMode, Analytics, Whatshot, Equalizer,
  Assessment, History as HistoryIcon, Biotech, Science, Public,
  AccountTree, RocketLaunch, ExpandLess, ExpandMore,
  Home, BarChart, Search, Bolt,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketOverview, fetchFutureStocks } from '../services/api';
import { GlobalMarketStatus } from './GlobalMarketStatus';
import { MarketStatusBar } from './MarketStatusBar';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { markAllRead } from '../store';
import type { StockResult } from '../utils/types';

const DRAWER_W = 252;
const BOTTOM_NAV_H = 60;

interface LayoutProps {
  children: React.ReactNode;
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
}

// Sidebar nav item with glow effect on active
const NavItem: React.FC<{
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
  active: boolean;
  onClick: () => void;
  indent?: boolean;
}> = ({ label, path: _path, icon, badge, active, onClick, indent }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <ListItemButton
      selected={active}
      onClick={onClick}
      sx={{
        borderRadius: '8px',
        mx: 1,
        my: 0.25,
        pl: indent ? 3.5 : 1.5,
        pr: 1,
        py: 0.85,
        minHeight: 38,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        ...(active && {
          background: isDark
            ? 'linear-gradient(90deg, rgba(0,176,255,0.18) 0%, rgba(0,176,255,0.04) 100%)'
            : 'linear-gradient(90deg, rgba(21,101,192,0.14) 0%, rgba(21,101,192,0.04) 100%)',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0, top: '15%', bottom: '15%',
            width: '3px',
            borderRadius: '0 3px 3px 0',
            background: isDark
              ? 'linear-gradient(180deg, #00e5ff, #00b0ff)'
              : 'linear-gradient(180deg, #5e92f3, #1565c0)',
            boxShadow: isDark ? '0 0 8px rgba(0,176,255,0.8)' : 'none',
          },
        }),
        '&:hover': {
          background: isDark ? 'rgba(0,176,255,0.07)' : 'rgba(21,101,192,0.07)',
          transform: 'translateX(3px)',
        },
        '&:active': { transform: 'translateX(1px) scale(0.98)' },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 32,
          color: active
            ? (isDark ? '#00b0ff' : 'primary.main')
            : 'text.secondary',
          transition: 'color 0.18s',
          '& svg': { fontSize: 17 },
        }}
      >
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          fontSize: 13,
          fontWeight: active ? 700 : 500,
          color: active ? (isDark ? '#e2e8f8' : 'text.primary') : 'text.secondary',
          lineHeight: 1.3,
        }}
      />
      {badge && (
        <Chip
          label={badge}
          size="small"
          sx={{
            height: 17, fontSize: '0.6rem', fontWeight: 900,
            bgcolor: '#00c853', color: '#000', letterSpacing: 0.5,
          }}
        />
      )}
    </ListItemButton>
  );
};

// Section label
const SectionLabel: React.FC<{ label: string; collapsible?: boolean; open?: boolean; onToggle?: () => void }> = ({
  label, collapsible, open, onToggle,
}) => (
  <Box
    onClick={collapsible ? onToggle : undefined}
    sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: 2, pt: 1.5, pb: 0.5,
      cursor: collapsible ? 'pointer' : 'default',
      userSelect: 'none',
      '&:hover': collapsible ? { opacity: 0.8 } : {},
    }}
  >
    <Typography
      variant="overline"
      sx={{ fontSize: '0.62rem', fontWeight: 800, color: 'text.disabled', letterSpacing: 1.2 }}
    >
      {label}
    </Typography>
    {collapsible && (
      <Box sx={{ color: 'text.disabled', display: 'flex', alignItems: 'center' }}>
        {open ? <ExpandLess sx={{ fontSize: 15 }} /> : <ExpandMore sx={{ fontSize: 15 }} />}
      </Box>
    )}
  </Box>
);

export const Layout: React.FC<LayoutProps> = ({ children, themeMode, onToggleTheme }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = themeMode === 'dark';
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sections, setSections] = useState({ trading: true, analysis: false, tools: false });
  const [bottomVal, setBottomVal] = useState(0);
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
  const isActive = (p: string) => location.pathname === p;

  const nav = (path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const toggle = (s: keyof typeof sections) =>
    setSections(prev => ({ ...prev, [s]: !prev[s] }));

  const menuSections = {
    overview: [
      { label: 'Dashboard',     path: '/',             icon: <DashboardIcon /> },
      { label: 'IPO Assistant', path: '/ipo',           icon: <RocketLaunch />, badge: 'LIVE' },
      { label: 'All Stocks',    path: '/all-stocks',    icon: <GridView /> },
      { label: 'F&O Stocks',    path: '/future-stocks', icon: <Analytics /> },
      { label: 'Heat Map',      path: '/heatmap',       icon: <Whatshot /> },
    ],
    market: [
      { label: 'Top Buyers',  path: '/top-buyers',  icon: <TrendingUp /> },
      { label: 'Top Sellers', path: '/top-sellers', icon: <TrendingDown /> },
      { label: 'Volume Best', path: '/volume-best', icon: <Equalizer /> },
    ],
    trading: [
      { label: 'Intraday', path: '/top-buy',     icon: <Bolt /> },
      { label: 'Swing',    path: '/swing-buy',   icon: <TrendingUp /> },
      { label: 'Weekly',   path: '/weekly-buy',  icon: <DateRange /> },
      { label: 'Monthly',  path: '/monthly-buy', icon: <CalendarMonth /> },
    ],
    analysis: [
      { label: 'Signal',     path: '/signal',     icon: <Assessment /> },
      { label: 'Indicators', path: '/indicators', icon: <Biotech /> },
      { label: 'History',    path: '/history',    icon: <HistoryIcon /> },
      { label: 'Backtest',   path: '/backtest',   icon: <Science /> },
      { label: 'Universe',   path: '/universe',   icon: <Public /> },
    ],
    tools: [
      { label: 'Scanner',   path: '/scanner',   icon: <AccountTree /> },
      { label: 'Watchlist', path: '/watchlist', icon: <Bookmarks /> },
      { label: 'Settings',  path: '/settings',  icon: <Settings /> },
    ],
  };

  const DrawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Logo ── */}
      <Box
        sx={{
          px: 2, py: 1.75,
          display: 'flex', alignItems: 'center', gap: 1.5,
          borderBottom: '1px solid', borderColor: 'divider',
          background: isDark
            ? 'linear-gradient(135deg, rgba(0,176,255,0.08) 0%, rgba(213,0,249,0.05) 100%)'
            : 'linear-gradient(135deg, #e3f2fd 0%, #ede7f6 100%)',
        }}
      >
        <Box
          sx={{
            width: 36, height: 36, borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #00b0ff 0%, #d500f9 100%)',
            boxShadow: isDark ? '0 0 16px rgba(0,176,255,0.4)' : '0 4px 12px rgba(0,176,255,0.3)',
            flexShrink: 0,
          }}
        >
          <Analytics sx={{ color: '#fff', fontSize: 20 }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: 13.5, lineHeight: 1.2, letterSpacing: 0.5 }}>
            STOCK AI
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 9.5, letterSpacing: 0.5 }}>
            NSE SCREENER • 4000+
          </Typography>
        </Box>
      </Box>

      {/* ── Market Snapshot ── */}
      {market && (
        <Box sx={{ px: 1.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Paper
            elevation={0}
            sx={{
              px: 1.5, py: 1.25, borderRadius: 2,
              background: isDark
                ? 'linear-gradient(135deg, rgba(0,176,255,0.06) 0%, rgba(0,0,0,0.2) 100%)'
                : 'linear-gradient(135deg, #f0f8ff 0%, #fafbff 100%)',
              border: '1px solid', borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 1 }}>
                NIFTY 50
              </Typography>
              <Chip
                label={market.market_trend?.toUpperCase() ?? 'NEUTRAL'}
                size="small"
                color={market.market_trend === 'bullish' ? 'success' : market.market_trend === 'bearish' ? 'error' : 'warning'}
                sx={{ height: 17, fontSize: '0.6rem', fontWeight: 900 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 15, lineHeight: 1 }}>
                {market.nifty_price?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}
              </Typography>
              {market.nifty_change_pct != null && (
                <Typography
                  sx={{
                    fontSize: 11, fontWeight: 800,
                    color: market.nifty_change_pct >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {market.nifty_change_pct >= 0 ? '▲' : '▼'} {Math.abs(market.nifty_change_pct).toFixed(2)}%
                </Typography>
              )}
            </Box>
            {market.vix != null && (
              <Typography
                sx={{
                  fontSize: 9.5, fontWeight: 700, mt: 0.5,
                  color: market.vix_safe ? 'success.main' : 'error.main',
                }}
              >
                VIX {market.vix.toFixed(1)} • {market.vix_safe ? '🟢 Safe' : '🔴 High Risk'}
              </Typography>
            )}
          </Paper>
        </Box>
      )}

      {/* ── Session Status ── */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <GlobalMarketStatus variant="panel" />
      </Box>

      {/* ── Navigation ── */}
      <List dense disablePadding sx={{ flex: 1, overflowY: 'auto', pt: 0.5, pb: 1 }}>
        {/* Overview */}
        {menuSections.overview.map(item => (
          <NavItem key={item.path} {...item} active={isActive(item.path)} onClick={() => nav(item.path)} />
        ))}

        <Box sx={{ my: 0.75, mx: 1.5 }}><Divider /></Box>

        {/* Market Data */}
        <SectionLabel label="Market Data" />
        {menuSections.market.map(item => (
          <NavItem key={item.path} {...item} active={isActive(item.path)} onClick={() => nav(item.path)} />
        ))}

        <Box sx={{ my: 0.75, mx: 1.5 }}><Divider /></Box>

        {/* Trading Screens */}
        <SectionLabel label="Trading Screens" collapsible open={sections.trading} onToggle={() => toggle('trading')} />
        <Collapse in={sections.trading}>
          {menuSections.trading.map(item => (
            <NavItem key={item.path} {...item} active={isActive(item.path)} onClick={() => nav(item.path)} indent />
          ))}
        </Collapse>

        <Box sx={{ my: 0.75, mx: 1.5 }}><Divider /></Box>

        {/* Analysis */}
        <SectionLabel label="Analysis" collapsible open={sections.analysis} onToggle={() => toggle('analysis')} />
        <Collapse in={sections.analysis}>
          {menuSections.analysis.map(item => (
            <NavItem key={item.path} {...item} active={isActive(item.path)} onClick={() => nav(item.path)} indent />
          ))}
        </Collapse>

        <Box sx={{ my: 0.75, mx: 1.5 }}><Divider /></Box>

        {/* Tools */}
        <SectionLabel label="Tools" collapsible open={sections.tools} onToggle={() => toggle('tools')} />
        <Collapse in={sections.tools}>
          {menuSections.tools.map(item => (
            <NavItem key={item.path} {...item} active={isActive(item.path)} onClick={() => nav(item.path)} indent />
          ))}
        </Collapse>
      </List>

      {/* ── Footer ── */}
      <Box
        sx={{
          px: 2, py: 1, textAlign: 'center',
          borderTop: '1px solid', borderColor: 'divider',
          background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
        }}
      >
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontWeight: 700, letterSpacing: 0.5 }}>
          v3.0 • INSTITUTIONAL ENGINE
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* ── AppBar ── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: isDark ? 'rgba(11,17,32,0.85)' : 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(20px)',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: { xs: 54, sm: 60 }, px: { xs: 1, sm: 2 }, gap: 1 }}>

          {/* Hamburger (mobile) */}
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ display: { md: 'none' }, mr: 0.5 }}
            size="small"
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          {/* Brand (desktop) */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, mr: 2, flexShrink: 0 }}>
            <Box
              sx={{
                width: 28, height: 28, borderRadius: 1.5,
                background: 'linear-gradient(135deg, #00b0ff 0%, #d500f9 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isDark ? '0 0 10px rgba(0,176,255,0.4)' : '0 2px 8px rgba(0,176,255,0.3)',
              }}
            >
              <Analytics sx={{ color: '#fff', fontSize: 16 }} />
            </Box>
            <Typography sx={{ fontWeight: 900, fontSize: 14, letterSpacing: 0.5 }}>
              STOCK AI
            </Typography>
            <Chip
              label="NSE"
              size="small"
              color="primary"
              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900 }}
            />
          </Box>

          {/* Brand (mobile) */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: 0.75 }}>
            <Analytics sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography sx={{ fontWeight: 900, fontSize: 13 }}>STOCK AI</Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Search */}
          <Autocomplete
            size="small"
            options={allStocks}
            getOptionLabel={o => `${o.symbol} - ${o.name}`}
            onChange={(_, v) => { if (v) navigate(`/stock/${v.symbol}`); }}
            sx={{ width: { xs: 130, sm: 190, md: 260, lg: 320 }, mr: { xs: 0.5, sm: 1.5 } }}
            renderInput={params => (
              <TextField
                {...params}
                placeholder="Search symbol…"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <Search sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} />,
                  sx: { fontSize: 13, height: 34, borderRadius: 2 },
                }}
              />
            )}
          />

          {/* Nifty ticker (lg+) */}
          {market && (
            <Box
              sx={{
                display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 1.5, mr: 1.5,
                px: 1.5, py: 0.5, borderRadius: 2,
                bgcolor: isDark ? 'rgba(0,176,255,0.06)' : 'rgba(21,101,192,0.05)',
                border: '1px solid', borderColor: 'divider',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 9, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.8, lineHeight: 1 }}>
                  NIFTY 50
                </Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 13, lineHeight: 1.3 }}>
                  {market.nifty_price?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}
                </Typography>
              </Box>
              {market.nifty_change_pct != null && (
                <Typography
                  sx={{
                    fontSize: 12, fontWeight: 800,
                    color: market.nifty_change_pct >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {market.nifty_change_pct >= 0 ? '▲' : '▼'} {Math.abs(market.nifty_change_pct).toFixed(2)}%
                </Typography>
              )}
              {market.vix != null && (
                <Chip
                  label={`VIX ${market.vix.toFixed(1)}`}
                  size="small"
                  color={market.vix_safe ? 'success' : 'error'}
                  sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800 }}
                />
              )}
            </Box>
          )}

          {/* Session badge */}
          <GlobalMarketStatus variant="compact" />

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              size="small"
              onClick={() => { navigate('/watchlist'); dispatch(markAllRead()); }}
              sx={{ mx: 0.25 }}
            >
              <Badge badgeContent={unread} color="error">
                <Notifications sx={{ fontSize: 19 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
            <IconButton size="small" onClick={onToggleTheme}>
              {isDark ? <WbSunny sx={{ fontSize: 19 }} /> : <DarkMode sx={{ fontSize: 19 }} />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* ── Desktop Permanent Drawer ── */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_W, flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_W, boxSizing: 'border-box',
            mt: '60px',
            borderRight: '1px solid', borderColor: 'divider',
            bgcolor: isDark ? '#0b1120' : '#fff',
          },
        }}
      >
        {DrawerContent}
      </Drawer>

      {/* ── Mobile Swipeable Drawer ── */}
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

      {/* ── Main Content ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: { xs: '54px', sm: '60px' },
          mb: { xs: `${BOTTOM_NAV_H}px`, md: 0 },
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        <MarketStatusBar />
        <Box sx={{ p: { xs: 1.25, sm: 2, md: 2.5 } }}>{children}</Box>
      </Box>

      {/* ── Bottom Nav (mobile) ── */}
      {isMobile && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            zIndex: theme.zIndex.appBar,
            borderTop: '1px solid', borderColor: 'divider',
            height: BOTTOM_NAV_H,
            bgcolor: isDark ? 'rgba(11,17,32,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <BottomNavigation
            value={bottomVal}
            onChange={(_, v) => {
              setBottomVal(v);
              const paths = ['/', '/all-stocks', '/scanner', '/watchlist'];
              if (paths[v]) navigate(paths[v]);
            }}
            showLabels
            sx={{ height: '100%', bgcolor: 'transparent' }}
          >
            <BottomNavigationAction label="Home"   icon={<Home sx={{ fontSize: 22 }} />} sx={{ fontSize: '0.65rem' }} />
            <BottomNavigationAction label="Stocks" icon={<BarChart sx={{ fontSize: 22 }} />} sx={{ fontSize: '0.65rem' }} />
            <BottomNavigationAction label="Scan"   icon={<Search sx={{ fontSize: 22 }} />} sx={{ fontSize: '0.65rem' }} />
            <BottomNavigationAction label="Watch"  icon={<Bookmarks sx={{ fontSize: 22 }} />} sx={{ fontSize: '0.65rem' }} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};
