/**
 * Market-Standard Terminal Theme — Bloomberg / Zerodha / Sensibull Style
 * Deep navy base, electric greens/reds, glassmorphism cards, gradient accents
 */
import { createTheme, type Theme } from '@mui/material/styles';

// ─── Color Tokens ────────────────────────────────────────────────────────────
export const C = {
  // Trading signals
  bullGreen:   '#00e676',
  bullGreenDim:'#00c853',
  bearRed:     '#ff1744',
  bearRedDim:  '#d50000',
  amber:       '#ffab00',
  amberDim:    '#ff8f00',

  // Brand accent
  neonBlue:    '#00b0ff',
  neonPurple:  '#d500f9',
  neonCyan:    '#00e5ff',
  neonGold:    '#ffd600',

  // Dark backgrounds — deep navy layers
  bg0:         '#060b18',   // deepest
  bg1:         '#0b1120',   // default background
  bg2:         '#0f1729',   // paper
  bg3:         '#141e33',   // elevated card
  bg4:         '#1a2540',   // hover/focus surface

  // Borders / dividers
  border:      'rgba(0,176,255,0.12)',
  borderBright:'rgba(0,176,255,0.25)',

  // Text
  textPrimary:   '#e2e8f8',
  textSecondary: '#7b8db5',
  textMuted:     '#445070',

  // Light mode
  lBg0:        '#eef2fc',
  lBg1:        '#f4f7ff',
  lPaper:      '#ffffff',
  lBorder:     'rgba(21,101,192,0.12)',
  lText:       '#0d1b3e',
  lTextSub:    '#3d5a9e',
};

// ─── Dark Palette ─────────────────────────────────────────────────────────────
const darkPalette = {
  mode: 'dark' as const,
  primary:   { main: C.neonBlue,  light: '#64dfff', dark: '#0077b6',   contrastText: '#000' },
  secondary: { main: C.neonPurple,light: '#ea00ff', dark: '#9900b3',   contrastText: '#fff' },
  success:   { main: C.bullGreen, light: '#69f0ae', dark: C.bullGreenDim, contrastText: '#000' },
  error:     { main: C.bearRed,   light: '#ff5252', dark: C.bearRedDim,   contrastText: '#fff' },
  warning:   { main: C.amber,     light: '#ffd740', dark: C.amberDim,    contrastText: '#000' },
  info:      { main: C.neonCyan,  light: '#80efff', dark: '#006f7f',    contrastText: '#000' },
  background:{ default: C.bg1,    paper: C.bg2 },
  text:      { primary: C.textPrimary, secondary: C.textSecondary, disabled: C.textMuted },
  divider:   C.border,
  action: {
    active:            C.textSecondary,
    hover:             'rgba(0,176,255,0.06)',
    selected:          'rgba(0,176,255,0.12)',
    disabled:          'rgba(123,141,181,0.3)',
    disabledBackground:'rgba(123,141,181,0.08)',
  },
};

// ─── Light Palette ────────────────────────────────────────────────────────────
const lightPalette = {
  mode: 'light' as const,
  primary:   { main: '#1565c0', light: '#5e92f3', dark: '#003c8f', contrastText: '#fff' },
  secondary: { main: '#6200ea', light: '#9d46ff', dark: '#0a00b6', contrastText: '#fff' },
  success:   { main: '#1b5e20', light: '#43a047', dark: '#003300', contrastText: '#fff' },
  error:     { main: '#b71c1c', light: '#ef5350', dark: '#7f0000', contrastText: '#fff' },
  warning:   { main: '#e65100', light: '#ff9800', dark: '#ac1900', contrastText: '#fff' },
  info:      { main: '#0277bd', light: '#58a5f0', dark: '#004c8c', contrastText: '#fff' },
  background:{ default: C.lBg0, paper: C.lPaper },
  text:      { primary: C.lText, secondary: C.lTextSub, disabled: '#8fa4d4' },
  divider:   C.lBorder,
  action: {
    active:             C.lTextSub,
    hover:             'rgba(21,101,192,0.06)',
    selected:          'rgba(21,101,192,0.12)',
    disabled:          'rgba(61,90,158,0.3)',
    disabledBackground:'rgba(61,90,158,0.08)',
  },
};

// ─── Typography ───────────────────────────────────────────────────────────────
const typography = {
  fontFamily: '"Inter", "JetBrains Mono", "Roboto Mono", "Roboto", sans-serif',
  h1: { fontWeight: 900, letterSpacing: '-0.03em' },
  h2: { fontWeight: 900, letterSpacing: '-0.02em' },
  h3: { fontWeight: 800, letterSpacing: '-0.015em' },
  h4: { fontWeight: 800, letterSpacing: '-0.01em' },
  h5: { fontWeight: 700, letterSpacing: '-0.005em' },
  h6: { fontWeight: 700 },
  subtitle1: { fontWeight: 600 },
  subtitle2: { fontWeight: 700, letterSpacing: 0.2 },
  body1: { fontSize: '0.875rem', lineHeight: 1.65 },
  body2: { fontSize: '0.8125rem', lineHeight: 1.55 },
  button: { fontWeight: 700, textTransform: 'none' as const, letterSpacing: 0.4 },
  caption: { fontSize: '0.7rem', lineHeight: 1.4, letterSpacing: 0.3 },
  overline: { fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 1.5 },
};

// ─── Component Overrides ──────────────────────────────────────────────────────
const components = {
  MuiCssBaseline: {
    styleOverrides: {
      html: { width: '100%', height: '100%', overflowX: 'hidden', WebkitFontSmoothing: 'antialiased' },
      body: { width: '100%', height: '100%', overflowX: 'hidden', margin: 0, padding: 0 },
      '#root': { width: '100%', minHeight: '100vh', overflowX: 'hidden' },
      // Custom terminal scrollbar
      '::-webkit-scrollbar':       { width: '5px', height: '5px' },
      '::-webkit-scrollbar-track': { background: 'transparent' },
      '::-webkit-scrollbar-thumb': {
        background: 'rgba(0,176,255,0.25)',
        borderRadius: '3px',
        '&:hover': { background: 'rgba(0,176,255,0.45)' },
      },
      // Selection highlight
      '::selection': { background: 'rgba(0,176,255,0.3)', color: '#fff' },
    },
  },

  MuiCard: {
    styleOverrides: {
      root: ({ theme }: any) => ({
        borderRadius: 14,
        backgroundImage: 'none',
        border: `1px solid ${theme.palette.mode === 'dark' ? C.border : C.lBorder}`,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0,176,255,0.12), 0 2px 8px rgba(0,0,0,0.4)'
            : '0 8px 24px rgba(21,101,192,0.15)',
          borderColor: theme.palette.mode === 'dark' ? C.borderBright : 'rgba(21,101,192,0.3)',
        },
      }),
    },
  },

  MuiPaper: {
    styleOverrides: {
      root: ({ theme }: any) => ({
        backgroundImage: 'none',
        border: `1px solid ${theme.palette.mode === 'dark' ? C.border : C.lBorder}`,
      }),
      rounded: { borderRadius: 14 },
      elevation0: { border: 'none' },
      elevation1: { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
      elevation2: { boxShadow: '0 4px 16px rgba(0,0,0,0.2)' },
      elevation3: { boxShadow: '0 6px 24px rgba(0,0,0,0.25)' },
      elevation8: { boxShadow: '0 8px 32px rgba(0,0,0,0.35)' },
    },
  },

  MuiAppBar: {
    styleOverrides: {
      root: ({ theme }: any) => ({
        backgroundImage: 'none',
        borderBottom: `1px solid ${theme.palette.mode === 'dark' ? C.border : C.lBorder}`,
        boxShadow: 'none',
      }),
    },
  },

  MuiDrawer: {
    styleOverrides: {
      paper: ({ theme }: any) => ({
        backgroundImage: 'none',
        borderRight: `1px solid ${theme.palette.mode === 'dark' ? C.border : C.lBorder}`,
        background: theme.palette.mode === 'dark' ? C.bg1 : '#fff',
      }),
    },
  },

  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 800,
        borderRadius: 6,
        transition: 'all 0.2s',
        letterSpacing: 0.3,
      },
      filled: { fontWeight: 900 },
      sizeSmall: { height: 20, fontSize: '0.65rem' },
    },
  },

  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontWeight: 700,
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
        '&:active': { transform: 'translateY(0) scale(0.97)' },
      },
      contained: { boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
      containedPrimary: {
        background: 'linear-gradient(135deg, #00b0ff 0%, #0077b6 100%)',
        '&:hover': { background: 'linear-gradient(135deg, #29c5ff 0%, #0090e0 100%)' },
      },
      outlinedPrimary: { borderWidth: '1.5px', '&:hover': { borderWidth: '1.5px' } },
      sizeSmall: { padding: '4px 12px', fontSize: '0.78rem' },
      sizeLarge: { padding: '10px 28px', fontSize: '1rem' },
    },
  },

  MuiIconButton: {
    styleOverrides: {
      root: {
        transition: 'all 0.2s',
        '&:hover': { transform: 'scale(1.1)' },
        '&:active': { transform: 'scale(0.92)' },
      },
    },
  },

  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        '&.Mui-selected': {
          background: 'linear-gradient(90deg, rgba(0,176,255,0.18) 0%, rgba(0,176,255,0.06) 100%)',
          borderLeft: `3px solid ${C.neonBlue}`,
          paddingLeft: 'calc(16px - 3px)',
          '&:hover': {
            background: 'linear-gradient(90deg, rgba(0,176,255,0.24) 0%, rgba(0,176,255,0.10) 100%)',
          },
        },
        '&:hover': { paddingLeft: 20 },
      },
    },
  },

  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          transition: 'all 0.2s',
          '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(0,176,255,0.15)' },
        },
      },
    },
  },

  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${C.border}`,
        padding: '10px 14px',
      },
      head: {
        fontWeight: 800,
        fontSize: '0.7rem',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.8,
        borderBottom: `2px solid ${C.borderBright}`,
      },
      stickyHeader: {
        backgroundImage: 'none',
      },
    },
  },

  MuiTableRow: {
    styleOverrides: {
      root: {
        transition: 'background 0.15s',
        '&:hover': {
          background: 'rgba(0,176,255,0.04) !important',
        },
      },
    },
  },

  MuiLinearProgress: {
    styleOverrides: {
      root: { borderRadius: 4, height: 5, backgroundColor: 'rgba(255,255,255,0.06)' },
    },
  },

  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: '0.72rem',
        fontWeight: 700,
        backdropFilter: 'blur(12px)',
        background: 'rgba(11,17,32,0.92)',
        border: `1px solid ${C.border}`,
      },
    },
  },

  MuiAlert: {
    styleOverrides: {
      root: { borderRadius: 10, fontWeight: 600 },
    },
  },

  MuiBadge: {
    styleOverrides: {
      badge: { fontWeight: 800, fontSize: '0.65rem', minWidth: 17, height: 17, padding: '0 4px' },
    },
  },

  MuiDivider: {
    styleOverrides: {
      root: { borderColor: C.border },
    },
  },

  MuiToggleButton: {
    styleOverrides: {
      root: {
        fontWeight: 700,
        fontSize: '0.75rem',
        letterSpacing: 0.3,
        borderRadius: '6px !important',
        transition: 'all 0.2s',
        '&.Mui-selected': {
          background: 'linear-gradient(135deg, rgba(0,176,255,0.2) 0%, rgba(0,176,255,0.1) 100%)',
        },
      },
    },
  },

  MuiBottomNavigationAction: {
    styleOverrides: {
      root: {
        transition: 'all 0.2s',
        '&.Mui-selected': { color: C.neonBlue },
      },
    },
  },
};

// ─── Theme Factory ────────────────────────────────────────────────────────────
export const createAppTheme = (mode: 'dark' | 'light'): Theme =>
  createTheme({
    breakpoints: { values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 } },
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography,
    components,
    shape: { borderRadius: 10 },
    spacing: 8,
    transitions: {
      duration: { shortest: 120, shorter: 180, short: 220, standard: 280, complex: 360, enteringScreen: 210, leavingScreen: 175 },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
  });

// ─── Color Helpers ────────────────────────────────────────────────────────────
export const signalColor = (signal: string) => {
  const s = signal.toUpperCase();
  if (s === 'BUY' || s === 'STRONG BUY') return C.bullGreen;
  if (s === 'SELL' || s === 'STRONG SELL') return C.bearRed;
  return C.amber;
};

export const changeColor = (value: number) => (value >= 0 ? C.bullGreen : C.bearRed);

export const trendColor = (trend: string) => {
  const t = trend.toLowerCase();
  if (t.includes('bull') || t.includes('up')) return C.bullGreen;
  if (t.includes('bear') || t.includes('down')) return C.bearRed;
  return C.amber;
};

export const scoreColor = (score: number) => {
  if (score >= 75) return C.bullGreen;
  if (score >= 50) return C.amber;
  return C.bearRed;
};

export const gradients = {
  primary:  `linear-gradient(135deg, ${C.neonBlue} 0%, ${C.neonPurple} 100%)`,
  success:  `linear-gradient(135deg, ${C.bullGreen} 0%, ${C.bullGreenDim} 100%)`,
  error:    `linear-gradient(135deg, ${C.bearRed} 0%, ${C.bearRedDim} 100%)`,
  warning:  `linear-gradient(135deg, ${C.amber} 0%, ${C.amberDim} 100%)`,
  info:     `linear-gradient(135deg, ${C.neonCyan} 0%, ${C.neonBlue} 100%)`,
  dark:     `linear-gradient(135deg, ${C.bg0} 0%, ${C.bg2} 100%)`,
  header:   `linear-gradient(135deg, ${C.bg1} 0%, ${C.bg2} 100%)`,
  glow:     `radial-gradient(ellipse at top, rgba(0,176,255,0.08) 0%, transparent 70%)`,
};
