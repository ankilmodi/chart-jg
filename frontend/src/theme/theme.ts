/**
 * Material UI theme – supports dark and light modes.
 */
import { createTheme, type Theme } from '@mui/material/styles';

const TRADING_GREEN = '#00e676';
const TRADING_RED   = '#ff1744';
const TRADING_AMBER = '#ffc107';
const ACCENT_BLUE   = '#2196f3';

const darkPalette = {
  mode: 'dark' as const,
  primary:   { main: ACCENT_BLUE,   light: '#64b5f6', dark: '#1565c0' },
  secondary: { main: '#7c4dff',     light: '#b47cff', dark: '#3f1dcb' },
  success:   { main: TRADING_GREEN, contrastText: '#000' },
  error:     { main: TRADING_RED,   contrastText: '#fff' },
  warning:   { main: TRADING_AMBER, contrastText: '#000' },
  background: {
    default: '#0a0e1a',
    paper:   '#0f1629',
  },
  text: {
    primary:   '#e8eaf6',
    secondary: '#9fa8da',
  },
};

const lightPalette = {
  mode: 'light' as const,
  primary:   { main: '#1565c0',     light: '#5e92f3', dark: '#003c8f' },
  secondary: { main: '#6200ea',     light: '#9d46ff', dark: '#0a00b6' },
  success:   { main: '#2e7d32',     contrastText: '#fff' },
  error:     { main: '#c62828',     contrastText: '#fff' },
  warning:   { main: '#f57f17',     contrastText: '#000' },
  background: {
    default: '#f0f4ff',
    paper:   '#ffffff',
  },
};

const typography = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  h4: { fontWeight: 700, letterSpacing: '-0.02em' },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
  subtitle1: { fontWeight: 500 },
  subtitle2: { fontWeight: 500, fontSize: '0.8rem' },
  body2: { fontSize: '0.82rem' },
};

const components = {
  MuiCssBaseline: {
    styleOverrides: {
      html: { width: '100%', height: '100%', overflowX: 'hidden' as const },
      body: { width: '100%', height: '100%', overflowX: 'hidden' as const, margin: 0, padding: 0, boxSizing: 'border-box' as const },
      '#root': { width: '100%', minHeight: '100vh', overflowX: 'hidden' as const },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        backgroundImage: 'none',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { fontWeight: 600, borderRadius: 8 },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: { borderRadius: 8, textTransform: 'none' as const, fontWeight: 600 },
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
    shape: { borderRadius: 8 },
  });

// Colour helpers (theme-independent)
export const signalColor = (signal: string) => {
  if (signal === 'BUY')  return TRADING_GREEN;
  if (signal === 'SELL') return TRADING_RED;
  return TRADING_AMBER;
};

export const changeColor = (value: number) =>
  value >= 0 ? TRADING_GREEN : TRADING_RED;

export const trendColor = (trend: string) => {
  if (trend === 'bullish')  return TRADING_GREEN;
  if (trend === 'bearish')  return TRADING_RED;
  return TRADING_AMBER;
};
