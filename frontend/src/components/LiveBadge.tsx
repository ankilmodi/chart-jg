/**
 * src/components/LiveBadge.tsx
 * ════════════════════════════════════════════════════════════════════════════
 * Reusable session-aware badge component.
 *
 * Usage:
 *   <LiveBadge />                          → auto-detects session
 *   <LiveBadge variant="chip" />           → compact chip
 *   <LiveBadge variant="dot" />            → small dot only
 *   <LiveBadge variant="full" />           → full label + dot
 *   <LiveBadge dataMode="eod" />           → forced EOD badge
 *
 * Connects to useSessionClock for instant 1-second updates.
 */
import React from 'react';
import { Box, Chip, Tooltip, Typography, Stack } from '@mui/material';
import { SignalCellularAlt, WifiOff, Schedule } from '@mui/icons-material';
import { keyframes } from '@mui/system';
import { useSessionClock } from '../hooks/useLiveMarketData';
import type { DataMode, SessionType } from '../services/MarketDataEngine';

// ── Animations ─────────────────────────────────────────────────────────────
const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
  70%  { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
  100% { box-shadow: 0 0 0 0 rgba(34,197,94,0);   }
`;
const blink = keyframes`
  0%,100% { opacity: 1;   }
  50%     { opacity: 0.2; }
`;

// ── Badge config ────────────────────────────────────────────────────────────
interface BadgeConfig {
  label:       string;
  color:       string;
  bgColor:     string;
  borderColor: string;
  animate:     boolean;
  icon:        React.ReactNode;
}

const SESSION_CONFIG: Record<SessionType, BadgeConfig> = {
  LIVE: {
    label:       'LIVE',
    color:       '#22c55e',
    bgColor:     'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.4)',
    animate:     true,
    icon:        <SignalCellularAlt sx={{ fontSize: 11 }} />,
  },
  PRE_OPEN: {
    label:       'PRE OPEN',
    color:       '#f59e0b',
    bgColor:     'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.4)',
    animate:     false,
    icon:        <Schedule sx={{ fontSize: 11 }} />,
  },
  AFTER_HOURS: {
    label:       'CLOSED · EOD',
    color:       '#ef4444',
    bgColor:     'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.35)',
    animate:     false,
    icon:        <WifiOff sx={{ fontSize: 11 }} />,
  },
  HOLIDAY: {
    label:       'HOLIDAY',
    color:       '#a78bfa',
    bgColor:     'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.35)',
    animate:     false,
    icon:        <WifiOff sx={{ fontSize: 11 }} />,
  },
  WEEKEND: {
    label:       'WEEKEND',
    color:       '#ef4444',
    bgColor:     'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.35)',
    animate:     false,
    icon:        <WifiOff sx={{ fontSize: 11 }} />,
  },
};

const DATA_MODE_LABEL: Record<DataMode, string> = {
  live:       'Live Data',
  eod:        "Today's EOD",
  prev_close: 'Previous Close',
};

// ── Props ───────────────────────────────────────────────────────────────────
interface LiveBadgeProps {
  /** Visual variant */
  variant?:  'dot' | 'chip' | 'full' | 'inline';
  /** Override data mode label (if you already know it from API response) */
  dataMode?: DataMode;
  /** Force a specific session type (otherwise auto-detected) */
  session?:  SessionType;
  /** Custom tooltip text */
  tooltip?:  string;
  /** Font size multiplier */
  size?:     'xs' | 'sm' | 'md';
}

export const LiveBadge: React.FC<LiveBadgeProps> = ({
  variant  = 'chip',
  dataMode,
  session,
  tooltip,
  size     = 'sm',
}) => {
  const clock   = useSessionClock();
  const st      = session ?? clock.sessionType;
  const config  = SESSION_CONFIG[st];
  const dm      = dataMode ?? clock.dataMode;
  const dmLabel = DATA_MODE_LABEL[dm];

  const fontSize = size === 'xs' ? 8 : size === 'sm' ? 10 : 12;
  const dotSize  = size === 'xs' ? 6 : size === 'sm' ? 8  : 10;

  const tooltipText = tooltip ?? [
    `Session: ${st}`,
    `Data: ${dmLabel}`,
    `IST: ${clock.istTime}`,
    clock.countdown ? `${st === 'LIVE' ? 'Closes' : 'Opens'} in: ${clock.countdown}` : null,
  ].filter(Boolean).join('\n');

  const dot = (
    <Box
      sx={{
        width: dotSize, height: dotSize, borderRadius: '50%',
        bgcolor: config.color, flexShrink: 0,
        animation: config.animate
          ? `${blink} 1.3s ease-in-out infinite, ${pulse} 2s ease-out infinite`
          : 'none',
      }}
    />
  );

  if (variant === 'dot') {
    return <Tooltip title={tooltipText}>{dot}</Tooltip>;
  }

  if (variant === 'chip') {
    return (
      <Tooltip title={tooltipText} arrow>
        <Chip
          size="small"
          label={config.label}
          icon={config.animate
            ? <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: config.color, ml: '6px !important', animation: `${blink} 1.3s ease-in-out infinite` }} />
            : undefined
          }
          sx={{
            height: 20,
            fontSize,
            fontWeight: 800,
            letterSpacing: 0.5,
            bgcolor: config.bgColor,
            color:   config.color,
            border:  `1px solid ${config.borderColor}`,
            fontFamily: 'monospace',
            cursor: 'default',
            '& .MuiChip-icon': { ml: '4px' },
          }}
        />
      </Tooltip>
    );
  }

  if (variant === 'inline') {
    return (
      <Tooltip title={tooltipText} arrow>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ display: 'inline-flex', cursor: 'default' }}>
          {dot}
          <Typography
            variant="caption"
            sx={{ fontSize, fontWeight: 700, color: config.color, fontFamily: 'monospace', lineHeight: 1 }}
          >
            {config.label}
          </Typography>
        </Stack>
      </Tooltip>
    );
  }

  // full variant
  return (
    <Tooltip title={tooltipText} arrow>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.7,
          px: 1, py: 0.4,
          borderRadius: 1,
          border: `1px solid ${config.borderColor}`,
          bgcolor: config.bgColor,
          cursor: 'default',
        }}
      >
        {dot}
        <Stack>
          <Typography variant="caption" sx={{ fontSize, fontWeight: 800, color: config.color, lineHeight: 1, letterSpacing: 0.5 }}>
            {config.label}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: fontSize - 1, color: 'text.secondary', lineHeight: 1 }}>
            {dmLabel}
          </Typography>
        </Stack>
      </Box>
    </Tooltip>
  );
};

export default LiveBadge;
