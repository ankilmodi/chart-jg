/**
 * src/components/MarketClosedBanner.tsx
 *
 * A prominent sticky banner shown between the AppBar and page content
 * whenever the NSE/BSE market is CLOSED or in PRE_OPEN state.
 *
 * Banner shows:
 *   🔴 MARKET CLOSED  |  Showing Today's EOD Closing Data  |  Next Open: ...
 *
 * Auto-dismisses when market opens (detected via useMarketSession).
 * User can also manually dismiss it (re-appears on next page load).
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Chip, Stack, IconButton, Collapse,
  Tooltip, Divider,
} from '@mui/material';
import {
  Close, AccessTime, QueryStats, Schedule,
  RadioButtonChecked, InfoOutlined,
} from '@mui/icons-material';
import { keyframes } from '@mui/system';
import { useMarketSession } from '../hooks/useMarketSession';

// ── Animations ─────────────────────────────────────────────────────────────
const pulse = keyframes`
  0%   { opacity: 1; }
  50%  { opacity: 0.5; }
  100% { opacity: 1; }
`;

// ── Helpers ─────────────────────────────────────────────────────────────────
function nowIST(): Date {
  const utc = Date.now() + new Date().getTimezoneOffset() * 60_000;
  return new Date(utc + 5.5 * 3_600_000);
}

function formatNextOpen(iso: string | null): string {
  if (!iso) return 'Next Trading Day 09:15 IST';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    }) + ' IST';
  } catch {
    return '09:15 IST Next Trading Day';
  }
}

function formatISTClock(): string {
  return nowIST().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getDataAsOf(): string {
  const ist = nowIST();
  const h = ist.getHours();
  const m = ist.getMinutes();
  // Before 9:15 → previous day's EOD
  if (h < 9 || (h === 9 && m < 15)) {
    const prev = new Date(ist);
    prev.setDate(prev.getDate() - 1);
    // Skip weekend
    while (prev.getDay() === 0 || prev.getDay() === 6) {
      prev.setDate(prev.getDate() - 1);
    }
    return prev.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  // After 15:30 → today's closing data
  return ist.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── Component ────────────────────────────────────────────────────────────────
export const MarketClosedBanner: React.FC = () => {
  const { status, isOpen } = useMarketSession();
  const [dismissed, setDismissed] = useState(false);
  const [clock, setClock] = useState(formatISTClock());
  const [dataAsOf] = useState(getDataAsOf());

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setClock(formatISTClock()), 1_000);
    return () => clearInterval(id);
  }, []);

  // Auto-show again when market opens
  useEffect(() => {
    if (isOpen) setDismissed(false);
  }, [isOpen]);

  // Don't show when market is live
  if (isOpen || dismissed) return null;

  const isHoliday  = status.status === 'HOLIDAY';
  const isPreOpen  = status.status === 'PRE_OPEN';

  const bannerBg   = isPreOpen
    ? 'linear-gradient(90deg, #78350f 0%, #92400e 50%, #78350f 100%)'
    : 'linear-gradient(90deg, #1a0000 0%, #3b0a0a 40%, #2d0808 70%, #1a0000 100%)';

  const borderColor = isPreOpen ? '#f59e0b' : '#ef4444';

  const statusLabel = isHoliday
    ? `🏖️ MARKET HOLIDAY — ${status.holidayName ?? 'NSE Holiday'}`
    : isPreOpen
    ? '⏳ PRE-OPEN SESSION'
    : '🔴 MARKET CLOSED';

  const statusColor = isPreOpen ? '#fbbf24' : '#f87171';

  return (
    <Collapse in={!dismissed}>
      <Box
        sx={{
          width: '100%',
          background: bannerBg,
          borderBottom: `2px solid ${borderColor}`,
          borderTop: `1px solid rgba(239,68,68,0.3)`,
          px: { xs: 1.5, sm: 2.5, md: 3 },
          py: 0.6,
          position: 'sticky',
          top: 48,       // below AppBar (48px dense)
          zIndex: 1100,
          boxShadow: `0 2px 12px rgba(239,68,68,0.25)`,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 1, sm: 2 }}
          flexWrap="wrap"
          sx={{ gap: 0.5 }}
        >
          {/* Blinking status indicator */}
          <RadioButtonChecked
            sx={{
              fontSize: 14,
              color: statusColor,
              animation: `${pulse} 1.8s ease-in-out infinite`,
              flexShrink: 0,
            }}
          />

          {/* Status label */}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 900,
              fontSize: { xs: 10, sm: 12 },
              color: statusColor,
              letterSpacing: 1,
              fontFamily: 'monospace',
              flexShrink: 0,
            }}
          >
            {statusLabel}
          </Typography>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ borderColor: 'rgba(255,255,255,0.15)', display: { xs: 'none', sm: 'block' } }}
          />

          {/* EOD Data label */}
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
            <QueryStats sx={{ fontSize: 13, color: '#fca5a5' }} />
            <Typography
              variant="caption"
              sx={{ fontSize: { xs: 10, sm: 11 }, color: '#fde8e8', fontWeight: 700 }}
            >
              {isPreOpen ? 'Showing Previous Day EOD Data' : `Showing Today's EOD Data`}
            </Typography>
            <Chip
              label={`As of ${dataAsOf} · 15:30 IST`}
              size="small"
              sx={{
                height: 18,
                fontSize: 9,
                fontWeight: 800,
                bgcolor: 'rgba(254,202,202,0.15)',
                color: '#fca5a5',
                border: '1px solid rgba(239,68,68,0.4)',
              }}
            />
          </Stack>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ borderColor: 'rgba(255,255,255,0.15)', display: { xs: 'none', md: 'block' } }}
          />

          {/* Current IST time */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ display: { xs: 'none', sm: 'flex' }, flexShrink: 0 }}
          >
            <AccessTime sx={{ fontSize: 12, color: '#9ca3af' }} />
            <Typography
              variant="caption"
              sx={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}
            >
              IST {clock}
            </Typography>
          </Stack>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ borderColor: 'rgba(255,255,255,0.15)', display: { xs: 'none', md: 'block' } }}
          />

          {/* Next open */}
          {status.nextOpen && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ display: { xs: 'none', md: 'flex' }, flexShrink: 0 }}
            >
              <Schedule sx={{ fontSize: 12, color: '#86efac' }} />
              <Typography
                variant="caption"
                sx={{ fontSize: 10, color: '#86efac', fontWeight: 700 }}
              >
                Next Open: {formatNextOpen(status.nextOpen)}
              </Typography>
            </Stack>
          )}

          {/* Info tooltip */}
          <Tooltip
            title={
              <Box>
                <Typography variant="caption" display="block" fontWeight={700} mb={0.5}>
                  About the Data Shown
                </Typography>
                <Typography variant="caption" display="block">
                  • Market Hours: 09:15 – 15:30 IST (Mon–Fri)
                </Typography>
                <Typography variant="caption" display="block">
                  • Outside market hours, all prices reflect the most recent session's closing values
                </Typography>
                <Typography variant="caption" display="block">
                  • Technical indicators (RSI, EMA, Scores) are calculated on EOD historical data
                </Typography>
                <Typography variant="caption" display="block" mt={0.5} sx={{ color: '#86efac' }}>
                  • Data refreshes automatically when market opens at 09:15 IST
                </Typography>
              </Box>
            }
            arrow
            placement="bottom"
          >
            <InfoOutlined
              sx={{
                fontSize: 14,
                color: '#6b7280',
                cursor: 'help',
                flexShrink: 0,
                '&:hover': { color: '#9ca3af' },
              }}
            />
          </Tooltip>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Dismiss */}
          <Tooltip title="Dismiss banner">
            <IconButton
              size="small"
              onClick={() => setDismissed(true)}
              sx={{
                p: 0.3,
                color: '#6b7280',
                '&:hover': { color: '#9ca3af', bgcolor: 'rgba(255,255,255,0.08)' },
                flexShrink: 0,
              }}
            >
              <Close sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Collapse>
  );
};

export default MarketClosedBanner;
