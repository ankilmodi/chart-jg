/**
 * src/components/GlobalMarketStatus.tsx
 *
 * Full-featured market status panel.
 * Shows:
 *   🟢 Live Market      — blinking dot + countdown to close + auto-refresh timer
 *   🔴 Market Closed    — next open time
 *   🟡 Cached Data      — API failure fallback badge
 *   ⏳ Pre-Open         — countdown to market open
 *   🏖️ Holiday          — holiday name
 *
 * Designed to be embedded inside the Layout sidebar or as a standalone card.
 *
 * Props:
 *   variant: "compact"  → single row (AppBar)
 *            "panel"    → card with all details (Sidebar)
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Chip, Typography, IconButton, Tooltip, Stack,
  Divider, LinearProgress, Paper,
} from '@mui/material';
import { Refresh, AccessTime, WifiOff, SignalCellularAlt } from '@mui/icons-material';
import { keyframes } from '@mui/system';
import { useMarketSession } from '../hooks/useMarketSession';

// ── Animations ─────────────────────────────────────────────────────────────
const blink = keyframes`
  0%, 100% { opacity: 1;   transform: scale(1); }
  50%       { opacity: 0.2; transform: scale(0.8); }
`;

const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.5); }
  70%  { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
  100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
`;

// ── Helpers ─────────────────────────────────────────────────────────────────
function nowIST(): Date {
  const utc = Date.now() + new Date().getTimezoneOffset() * 60_000;
  return new Date(utc + 5.5 * 3_600_000);
}

function formatCountdown(targetH: number, targetM: number): string {
  const now    = nowIST();
  const target = new Date(now);
  target.setHours(targetH, targetM, 0, 0);
  let diff = target.getTime() - now.getTime();
  if (diff < 0) return '--:--:--';
  const h  = Math.floor(diff / 3_600_000);
  diff    -= h * 3_600_000;
  const m  = Math.floor(diff / 60_000);
  diff    -= m * 60_000;
  const s  = Math.floor(diff / 1_000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatNextOpen(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── Props ───────────────────────────────────────────────────────────────────
interface GlobalMarketStatusProps {
  /** "compact" = AppBar row, "panel" = sidebar card with full detail */
  variant?: 'compact' | 'panel';
}

// ── Component ────────────────────────────────────────────────────────────────
export const GlobalMarketStatus: React.FC<GlobalMarketStatusProps> = ({
  variant = 'compact',
}) => {
  const { status, isOpen, manualRefresh } = useMarketSession();

  const [lastUpdated,    setLastUpdated]    = useState<string>('—');
  const [countdown,      setCountdown]      = useState<string>('--:--:--');
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  // Update "last updated" when status changes
  useEffect(() => {
    setLastUpdated(
      new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    );
  }, [status]);

  // Live clock for countdown
  useEffect(() => {
    const tick = () => {
      if (isOpen) {
        // countdown to close
        setCountdown(formatCountdown(15, 30));
      } else {
        const ist = nowIST();
        const mins = ist.getHours() * 60 + ist.getMinutes();
        // pre-open: countdown to 09:15
        if (ist.getDay() !== 0 && ist.getDay() !== 6 && mins < 9 * 60 + 15) {
          setCountdown(formatCountdown(9, 15));
        } else {
          setCountdown('—');
        }
      }
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [isOpen]);

  // Auto-refresh display counter
  useEffect(() => {
    setRefreshCounter(status.refreshInterval);
    const id = setInterval(() => {
      setRefreshCounter(prev => (prev <= 1 ? status.refreshInterval : prev - 1));
    }, 1_000);
    return () => clearInterval(id);
  }, [status.refreshInterval, status]);

  // ── Derived visuals ────────────────────────────────────────────────────
  const isLive    = status.status === 'LIVE';
  const isPreOpen = status.status === 'PRE_OPEN';
  const isHoliday = status.status === 'HOLIDAY';
  const isCached  = !isLive && status.dataSource === 'cached';

  const dotColor   = isLive ? '#4caf50' : isCached ? '#ff9800' : '#f44336';
  const chipColor  = isLive ? 'success'  : isCached ? 'warning'  : 'error';

  const label = isLive
    ? '🟢 Live Market'
    : isCached
    ? '🟡 Cached Data'
    : isPreOpen
    ? '⏳ Pre-Open'
    : isHoliday
    ? `🏖️ ${status.holidayName ?? 'Holiday'}`
    : '🔴 Market Closed';

  // ── Compact variant (AppBar) ───────────────────────────────────────────
  if (variant === 'compact') {
    const tooltipText = [
      status.message,
      `IST: ${status.currentTimeIst}`,
      status.holidayName ? `Holiday: ${status.holidayName}` : null,
      !isOpen && status.nextOpen
        ? `Next open: ${formatNextOpen(status.nextOpen)}`
        : null,
      isOpen ? `Closes in: ${countdown}` : null,
      isPreOpen ? `Opens in: ${countdown}` : null,
      `Last updated: ${lastUpdated}`,
      `Auto-refresh: ${status.refreshInterval}s`,
    ].filter(Boolean).join('\n');

    return (
      <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltipText}</span>} arrow>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ cursor: 'default', userSelect: 'none' }}>
          {/* Blinking / pulsing dot */}
          <Box
            sx={{
              width: 8, height: 8, borderRadius: '50%',
              bgcolor: dotColor, flexShrink: 0,
              animation: isLive
                ? `${blink} 1.4s ease-in-out infinite, ${pulse} 2s ease-out infinite`
                : 'none',
            }}
          />

          {/* Status chip */}
          <Chip
            label={label}
            size="small"
            color={chipColor as 'success' | 'warning' | 'error'}
            variant={isLive ? 'filled' : 'outlined'}
            icon={isLive ? <SignalCellularAlt sx={{ fontSize: 12 }} /> : isCached ? <WifiOff sx={{ fontSize: 12 }} /> : undefined}
            sx={{ fontWeight: 800, fontSize: 11, height: 22 }}
          />

          {/* Countdown (desktop only) */}
          {(isLive || isPreOpen) && countdown !== '—' && (
            <Typography
              variant="caption"
              sx={{
                display: { xs: 'none', lg: 'block' },
                fontSize: 10, lineHeight: 1, fontFamily: 'monospace',
                color: isLive ? 'success.main' : 'text.secondary',
                fontWeight: 600,
              }}
            >
              {isLive ? `closes ${countdown}` : `opens ${countdown}`}
            </Typography>
          )}

          {/* Last updated (desktop only) */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: 'none', xl: 'block' }, fontSize: 10, lineHeight: 1 }}
          >
            {lastUpdated}
          </Typography>

          {/* Manual refresh button */}
          <Tooltip title="Refresh market data">
            <IconButton size="small" onClick={manualRefresh} sx={{ p: 0.3 }}>
              <Refresh sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Tooltip>
    );
  }

  // ── Panel variant (Sidebar card) ───────────────────────────────────────
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5, borderRadius: 2,
        borderColor: isLive ? 'success.main' : isCached ? 'warning.main' : 'divider',
        bgcolor: isLive ? 'rgba(76,175,80,0.06)' : isCached ? 'rgba(255,152,0,0.06)' : 'transparent',
      }}
    >
      {/* Header row */}
      <Stack direction="row" alignItems="center" spacing={1} mb={0.8}>
        <Box
          sx={{
            width: 10, height: 10, borderRadius: '50%',
            bgcolor: dotColor, flexShrink: 0,
            animation: isLive
              ? `${blink} 1.4s ease-in-out infinite`
              : 'none',
          }}
        />
        <Typography variant="body2" fontWeight={700} sx={{ flexGrow: 1 }}>
          {label}
        </Typography>
        <Tooltip title="Refresh market data">
          <IconButton size="small" onClick={manualRefresh} sx={{ p: 0.4 }}>
            <Refresh sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Status message */}
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {status.message}
      </Typography>

      <Divider sx={{ my: 0.8 }} />

      {/* Detail rows */}
      <Stack spacing={0.4}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">IST Time</Typography>
          <Typography variant="caption" fontWeight={600} fontFamily="monospace">
            {status.currentTimeIst.split(' ')[1] ?? '—'}
          </Typography>
        </Stack>

        {isLive && (
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Closes in</Typography>
            <Typography variant="caption" fontWeight={600} fontFamily="monospace" color="success.main">
              {countdown}
            </Typography>
          </Stack>
        )}

        {isPreOpen && (
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Opens in</Typography>
            <Typography variant="caption" fontWeight={600} fontFamily="monospace" color="warning.main">
              {countdown}
            </Typography>
          </Stack>
        )}

        {!isOpen && status.nextOpen && (
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Next open</Typography>
            <Typography variant="caption" fontWeight={600}>
              {formatNextOpen(status.nextOpen)}
            </Typography>
          </Stack>
        )}

        {status.holidayName && (
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Holiday</Typography>
            <Typography variant="caption" fontWeight={600}>{status.holidayName}</Typography>
          </Stack>
        )}

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">Data source</Typography>
          <Chip
            label={status.dataSource}
            size="small"
            color={isLive ? 'success' : isCached ? 'warning' : 'default'}
            sx={{ height: 16, fontSize: 9, fontWeight: 700 }}
          />
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">Last updated</Typography>
          <Typography variant="caption" fontFamily="monospace">{lastUpdated}</Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">Refresh in</Typography>
          <Typography variant="caption" fontFamily="monospace">{refreshCounter}s</Typography>
        </Stack>
      </Stack>

      {/* Progress bar showing time until next refresh */}
      <LinearProgress
        variant="determinate"
        value={Math.round(((status.refreshInterval - refreshCounter) / status.refreshInterval) * 100)}
        color={isLive ? 'success' : 'primary'}
        sx={{ mt: 1, height: 2, borderRadius: 1 }}
      />
    </Paper>
  );
};

export default GlobalMarketStatus;
