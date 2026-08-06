/**
 * Professional Market-Standard Theme
 * Mobile-optimized colors, gradients, and smooth transitions
 */
import { createTheme, type Theme } from '@mui/material/styles';

// Market-standard trading colors
const TRADING_GREEN = '#00e676';
const TRADING_RED = '#ff1744';
const TRADING_AMBER = '#ffc107';
const ACCENT_BLUE = '#2196f3';
const ACCENT_PURPLE = '#9c27b0';

// Dark theme palette — professional trading terminal style
const darkPalette = {
  mode: 'dark' as const,
  primary: {
    main: ACCENT_BLUE,
    light: '#64b5f6',
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: ACCENT_PURPLE,
    light: '#ba68c8',
    dark: '#7b1fa2',
    contrastText: '#ffffff',
  },
  success: {
    main: TRADING_GREEN,
    light: '#69f0ae',
    dark: '#00c853',
    contrastText: '#000000',
  },
  error: {
    main: TRADING_RED,
    light: '#ff5252',
    dark: '#d50000',
    contrastText: '#ffffff',
  },
  warning: {
    main: TRADING_AMBER,
    light: '#ffd54f',
    dark: '#ffa000',
    contrastText: '#000000',
  },
  info: {
    main: '#00bcd4',
    light: '#4dd0e1',
    dark: '#0097a7',
    contrastText: '#ffffff',
  },
  background: {
    default: '#0a0e1a', // Deep navy blue
    paper: '#0f1629', // Slightly lighter navy
  },
  text: {
    primary: '#e8eaf6', // Light indigo
    secondary: '#9fa8da', // Muted indigo
    disabled: '#5c6bc0',
  },
  divider: 'rgba(159, 168, 218, 0.12)',
  action: {
    active: '#9fa8da',
    hover: 'rgba(159, 168, 218, 0.08)',
    selected: 'rgba(159, 168, 218, 0.16)',
    disabled: 'rgba(159, 168, 218, 0.3)',
    disabledBackground: 'rgba(159, 168, 218, 0.12)',
  },
};

// Light theme palette — clean modern style
const lightPalette = {
  mode: 'light' as const,
  primary: {
    main: '#1565c0', // Deep blue
    light: '#5e92f3',
    dark: '#003c8f',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#6200ea', // Deep purple
    light: '#9d46ff',
    dark: '#0a00b6',
    contrastText: '#ffffff',
  },
  success: {
    main: '#2e7d32', // Forest green
    light: '#60ad5e',
    dark: '#005005',
    contrastText: '#ffffff',
  },
  error: {
    main: '#c62828', // Dark red
    light: '#ff5f52',
    dark: '#8e0000',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#f57f17', // Dark amber
    light: '#ffb04c',
    dark: '#bc5100',
    contrastText: '#000000',
  },
  info: {
    main: '#0288d1',
    light: '#5eb8ff',
    dark: '#005b9f',
    contrastText: '#ffffff',
  },
  background: {
    default: '#f0f4ff', // Soft blue-white
    paper: '#ffffff',
  },
  text: {
    primary: '#1a237e', // Deep indigo
    secondary: '#5c6bc0', // Medium indigo
    disabled: '#9fa8da',
  },
  divider: 'rgba(26, 35, 126, 0.12)',
  action: {
    active: '#5c6bc0',
    hover: 'rgba(92, 107, 192, 0.08)',
    selected: 'rgba(92, 107, 192, 0.16)',
    disabled: 'rgba(92, 107, 192, 0.3)',
    disabledBackground: 'rgba(92, 107, 192, 0.12)',
  },
};

const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: { fontWeight: 800, letterSpacing: '-0.02em', fontSize: '2.5rem' },
  h2: { fontWeight: 800, letterSpacing: '-0.02em', fontSize: '2rem' },
  h3: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: '1.75rem' },
  h4: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: '1.5rem' },
  h5: { fontWeight: 600, fontSize: '1.25rem' },
  h6: { fontWeight: 600, fontSize: '1rem' },
  subtitle1: { fontWeight: 600, fontSize: '1rem' },
  subtitle2: { fontWeight: 600, fontSize: '0.875rem' },
  body1: { fontSize: '0.875rem', lineHeight: 1.6 },
  body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
  button: { fontWeight: 600, textTransform: 'none' as const, letterSpacing: 0.3 },
  caption: { fontSize: '0.75rem', lineHeight: 1.4 },
  overline: { fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1 },
};

const components = {
  MuiCssBaseline: {
    styleOverrides: {
      html: {
        width: '100%',
        height: '100%',
        overflowX: 'hidden' as const,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      body: {
        width: '100%',
        height: '100%',
        overflowX: 'hidden' as const,
        margin: 0,
        padding: 0,
        boxSizing: 'border-box' as const,
      },
      '#root': {
        width: '100%',
        minHeight: '100vh',
        overflowX: 'hidden' as const,
      },
      // Smooth scrolling
      '*': {
        scrollBehavior: 'smooth' as const,
      },
      // Custom scrollbar (dark)
      '::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '::-webkit-scrollbar-track': {
        background: 'rgba(0,0,0,0.1)',
      },
      '::-webkit-scrollbar-thumb': {
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '4px',
        '&:hover': {
          background: 'rgba(255,255,255,0.3)',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        backgroundImage: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
      rounded: {
        borderRadius: 12,
      },
      elevation1: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      elevation2: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      },
      elevation3: {
        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 700,
        borderRadius: 8,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'scale(1.05)',
        },
      },
      filled: {
        fontWeight: 800,
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        textTransform: 'none' as const,
        fontWeight: 600,
        padding: '8px 20px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
        '&:active': {
          transform: 'translateY(0)',
        },
      },
      contained: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      },
      sizeLarge: {
        padding: '12px 28px',
        fontSize: '1rem',
      },
      sizeSmall: {
        padding: '6px 16px',
        fontSize: '0.813rem',
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'scale(1.1)',
        },
        '&:active': {
          transform: 'scale(0.95)',
        },
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backdropFilter: 'blur(10px)',
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 10,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
          '&.Mui-focused': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.2)',
          },
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: '1px solid rgba(224, 224, 224, 0.08)',
      },
      head: {
        fontWeight: 700,
        fontSize: '0.813rem',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        fontSize: '0.875rem',
        fontWeight: 600,
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        height: 6,
      },
    },
  },
  MuiBadge: {
    styleOverrides: {
      badge: {
        fontWeight: 700,
        fontSize: '0.7rem',
        minWidth: 18,
        height: 18,
      },
    },
  },
};

export const createAppTheme = (mode: 'dark' | 'light'): Theme =>
  createTheme({
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography,
    components,
    shape: { borderRadius: 10 },
    spacing: 8,
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
  });

// Utility color helpers (theme-independent)
export const signalColor = (signal: string) => {
  const s = signal.toUpperCase();
  if (s === 'BUY' || s === 'STRONG BUY') return TRADING_GREEN;
  if (s === 'SELL' || s === 'STRONG SELL') return TRADING_RED;
  return TRADING_AMBER;
};

export const changeColor = (value: number) => (value >= 0 ? TRADING_GREEN : TRADING_RED);

export const trendColor = (trend: string) => {
  const t = trend.toLowerCase();
  if (t === 'bullish' || t === 'strong uptrend') return TRADING_GREEN;
  if (t === 'bearish' || t === 'weak downtrend') return TRADING_RED;
  return TRADING_AMBER;
};

export const scoreColor = (score: number) => {
  if (score >= 75) return TRADING_GREEN;
  if (score >= 50) return TRADING_AMBER;
  return TRADING_RED;
};

// Gradient utilities
export const gradients = {
  primary: 'linear-gradient(135deg, #2196f3 0%, #9c27b0 100%)',
  success: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)',
  error: 'linear-gradient(135deg, #ff1744 0%, #d50000 100%)',
  warning: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
  info: 'linear-gradient(135deg, #00bcd4 0%, #0288d1 100%)',
  dark: 'linear-gradient(135deg, #0a0e1a 0%, #0f1629 100%)',
  light: 'linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%)',
};
