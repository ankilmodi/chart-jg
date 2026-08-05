/**
 * src/components/MarketStatusBar.tsx
 * ════════════════════════════════════════════════════════════════════════════
 * Full-featured sticky Market Status Bar
 *
 * Shows ONE of three states (auto-switching without page reload):
 *
 * 🟢 LIVE MARKET  — blinking dot · "Live Data" · countdown to close · auto-refresh
 * 🟡 PRE OPEN     — amber · "Previous Close" · countdown to open
 * 🔴 MARKET CLOSED — red · "Today's EOD" / "Previous Close" · next open time
 *
 * Architecture:
 *   • useSessionClock()   — 1-second live IST clock (no API needed)
 *   • useEngineStatus()   — backend-authoritative session (30s poll)
 *   • useEngineOverview() — NIFTY 50 + BANK NIFTY + VIX tickers
 *
 * The bar auto-switches session exactly at 09:00 / 09:15 / 15:30 IST
 * using precise timers — no page reload required.
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Stack, Typography, Chip, Tooltip, IconButton,
  Divider, LinearProgress, Collapse, useTheme,
} from '@mui/material';
import {
  Refresh, RadioButtonChecked, TrendingUp, TrendingDown,
  Schedule, InfoOutlined, Close, WifiOff,
} from '@mui/icons-material';
import { keyframes } from '@mui/system';
import { useSessionClock, useEngineStatus, useEngineOverview, useMarketEngine } from '../hooks/useLiveMarketData';

// ── Animations ─────────────────────────────────────────────────────────────

const livePulse = keyframes`
  0%   { box-shadow: 0 0 0 0px rgba(34,197,94,0.7); }
  70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0);   }
  100% { box-shadow: 0 0 0 0px rgba(34,197,94,0);   }
`;
const blink = keyframes`
  0%,100% { opacity: 1;   }
  50%     { opacity: 0.3; }
`;
const slideIn = keyframes`
  from { transform: translateY(-100%); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
`;

// ── Sub-components ──────────────────────────────────────────────────────────

const Separator: React.FC = () => (
  <Divider
    orientation="vertical"
    flexItem
    sx={{ borderColor: 'rgba(255,255,255,0.12)', mx: { xs: 0.5, sm: 1 } }}
  />
);

interface IndexTickerProps {
  label: string;
  price: number | null;
  changePct: number | null;
  isOpen: boolean;
}
const IndexTicker: React.FC<IndexTickerProps> = ({ label, price, changePct, isOpen }) => {
  if (price == null) return null;
  const up = (changePct ?? 0) >= 0;
  return (
    <Stack direction="row" alignItems="center" spacing={0.6} sx={{ flexShrink: 0 }}>
      {up ? (
        <TrendingUp sx={{ fontSize: 13, color: '#4ade80' }} />
      ) : (
        <TrendingDown sx={{ fontSize: 13, color: '#f87171' }} />
      )}
      <Box>
        <Typography variant="caption" sx={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', display: 'block', lineHeight: 1 }}>
          {label}
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: '#f1f5f9', lineHeight: 1 }}
        >
          {price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          <Typography
            component="span"
            variant="caption"
            sx={{
              fontSize: 9, fontWeight: 600, ml: 0.4,
              color: up ? '#4ade80' : '#f87171',
            }}
          >
            {(changePct ?? 0) >= 0 ? '+' : ''}{(changePct ?? 0).toFixed(2)}%
          </Typography>
        </Typography>
      </Box>
    </Stack>
  );
};

// ── Main component ──────────────────────────────────────────────────────────

export const MarketStatusBar: React.FC = () => {
  const theme     = useTheme();
  const clock     = useSessionClock();
  const { manualRefresh } = useMarketEngine();
  const { data: status, isFetching } = useEngineStatus();
  const { data: overview } = useEngineOverview();

  const [dismissed,     setDismissed]     = useState(false);
  const [refreshTimer,  setRefreshTimer]  = useState(clock.refreshMs / 1000);
  const [prevSession,   setPrevSession]   = useState(clock.sessionType);

  // Auto-undismiss on session change
  useEffect(() => {
    if (clock.sessionType !== prevSession) {
      setPrevSession(clock.sessionType);
      setDismissed(false);
      setRefreshTimer(clock.refreshMs / 1000);
    }
  }, [clock.sessionType, prevSession, clock.refreshMs]);

  // Countdown-to-next-refresh timer
  useEffect(() => {
    setRefreshTimer(clock.refreshMs / 1000);
    const id = setInterval(() => {
      setRefreshTimer(prev => (prev <= 1 ? clock.refreshMs / 1000 : prev - 1));
    }, 1_000);
    return () => clearInterval(id);
  }, [clock.refreshMs, clock.sessionType]);

  const isLive    = clock.sessionType === 'LIVE';
  const isPreOpen = clock.sessionType === 'PRE_OPEN';
  const isClosed  = !isLive && !isPreOpen;

  // ── Colours ────────────────────────────────────────────────────────────
  const barBg = isLive
    ? 'linear-gradient(90deg, #052e16 0%, #14532d 30%, #052e16 100%)'
    : isPreOpen
    ? 'linear-gradient(90deg, #451a03 0%, #78350f 30%, #451a03 100%)'
    : 'linear-gradient(90deg, #1c0a0a 0%, #3b0d0d 30%, #1c0a0a 100%)';

  const borderColor = isLive ? '#16a34a' : isPreOpen ? '#d97706' : '#dc2626';
  const dotColor    = clock.sessionColor;

  // ── Dismissible for closed/pre-open only ──────────────────────────────
  if (isClosed && dismissed) return null;

  const totalSecs     = clock.refreshMs / 1000;
  const progressValue = ((totalSecs - refreshTimer) / totalSecs) * 100;

  // ── Status chip label ────────────────────────────────────────────────
  const chipLabel = status?.data_mode === 'eod'
    ? "Today's EOD Data"
    : status?.data_mode === 'prev_close'
    ? 'Previous Close'
    : 'Live Data';

  const chipColor = isLive ? '#4ade80' : isPreOpen ? '#fbbf24' : '#f87171';

  return (
    <Box
      sx={{
        width: '100%',
        background: barBg,
        borderBottom: `2px solid ${borderColor}`,
        boxShadow: `0 2px 16px ${borderColor}33`,
        position: 'sticky',
        top: 48,
        zIndex: theme.zIndex.appBar - 1,
        animation: `${slideIn} 0.3s ease`,
        overflow: 'hidden',
      }}
    >
      {/* Refresh progress bar (ultra-thin, top edge) */}
      <LinearProgress
        variant="determinate"
        value={progressValue}
        sx={{
          height: 2,
          bgcolor: 'transparent',
          '& .MuiLinearProgress-bar': {
            bgcolor: dotColor,
            transition: 'none',
          },
        }}
      />

      <Stack
        direction="row"
        alignItems="center"
        spacing={0}
        sx={{ px: { xs: 1.5, sm: 2.5 }, py: 0.5, minHeight: 36, flexWrap: 'nowrap', overflow: 'hidden' }}
      >
        {/* ── Status dot + label ──────────────────────────────────────── */}
        <Stack direction="row" alignItems="center" spacing={0.8} sx={{ flexShrink: 0 }}>
          <Box
            sx={{
              width: 9, height: 9, borderRadius: '50%',
              bgcolor: dotColor, flexShrink: 0,
              animation: isLive
                ? `${blink} 1.2s ease-in-out infinite, ${livePulse} 2s ease-out infinite`
                : isPreOpen ? `${blink} 2s ease-in-out infinite` : 'none',
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 900, letterSpacing: 1,
              fontSize: { xs: 9, sm: 11 },
              color: dotColor,
              fontFamily: 'monospace',
              flexShrink: 0,
            }}
          >
            {clock.sessionLabel}
          </Typography>
        </Stack>

        <Separator />

        {/* ── Data mode chip ──────────────────────────────────────────── */}
        <Chip
          label={chipLabel}
          size="small"
          sx={{
            height: 18, fontSize: 9, fontWeight: 800,
            bgcolor: `${chipColor}22`,
            color: chipColor,
            border: `1px solid ${chipColor}55`,
            flexShrink: 0,
          }}
        />

        {/* ── Countdown ────────────────────────────────────────────────── */}
        {clock.countdown && (
          <>
            <Separator />
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
              <Schedule sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }} />
              <Typography variant="caption" sx={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                {isLive ? 'Closes in' : 'Opens in'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: 11, fontWeight: 800, fontFamily: 'monospace',
                  color: isLive ? '#4ade80' : '#fbbf24',
                }}
              >
                {clock.countdown}
              </Typography>
            </Stack>
          </>
        )}

        {/* ── Next open (when closed) ────────────────────────────────── */}
        {isClosed && status?.next_open_readable && (
          <>
            <Separator />
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0, display: { xs: 'none', md: 'flex' } }}>
              <Schedule sx={{ fontSize: 11, color: '#86efac' }} />
              <Typography variant="caption" sx={{ fontSize: 9, color: '#86efac', fontWeight: 700 }}>
                Next Open: {status.next_open_readable}
              </Typography>
            </Stack>
          </>
        )}

        <Separator />

        {/* ── Index tickers (desktop only) ────────────────────────────── */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ display: { xs: 'none', lg: 'flex' }, flexShrink: 0 }}
        >
          <IndexTicker
            label="NIFTY 50"
            price={overview?.nifty_price ?? null}
            changePct={overview?.nifty_change_pct ?? null}
            isOpen={isLive}
          />
          <IndexTicker
            label="BANK NIFTY"
            price={overview?.banknifty_price ?? null}
            changePct={overview?.banknifty_change_pct ?? null}
            isOpen={isLive}
          />
          {overview?.vix != null && (
            <Stack direction="row" alignItems="center" spacing={0.4} sx={{ flexShrink: 0 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: overview.vix_safe ? '#4ade80' : '#f87171' }} />
              <Typography variant="caption" sx={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', display: 'block', lineHeight: 1 }}>
                VIX
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: overview.vix_safe ? '#4ade80' : '#f87171' }}
              >
                {overview.vix.toFixed(2)}
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* ── Spacer ────────────────────────────────────────────────────── */}
        <Box sx={{ flexGrow: 1 }} />

        {/* ── IST clock ────────────────────────────────────────────────── */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ display: { xs: 'none', sm: 'flex' }, flexShrink: 0, mx: 1 }}
        >
          <Typography variant="caption" sx={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
            IST
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontWeight: 700 }}>
            {clock.istTime}
          </Typography>
        </Stack>

        {/* ── Refresh countdown ────────────────────────────────────────── */}
        <Tooltip title={`Auto-refresh every ${totalSecs}s`}>
          <Typography
            variant="caption"
            sx={{
              fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace',
              display: { xs: 'none', md: 'block' }, flexShrink: 0,
            }}
          >
            ↻{Math.ceil(refreshTimer)}s
          </Typography>
        </Tooltip>

        {/* ── Fetching indicator ───────────────────────────────────────── */}
        {isFetching && (
          <Box
            sx={{
              width: 5, height: 5, borderRadius: '50%',
              bgcolor: '#60a5fa', mx: 0.5, flexShrink: 0,
              animation: `${blink} 0.8s ease-in-out infinite`,
            }}
          />
        )}

        {/* ── Info tooltip ─────────────────────────────────────────────── */}
        <Tooltip
          title={
            <Box sx={{ maxWidth: 260 }}>
              <Typography variant="caption" display="block" fontWeight={800} mb={0.5} color="#fff">
                Market Data Info
              </Typography>
              {[
                `Session: ${clock.sessionType}`,
                `Data Mode: ${clock.dataModeLabel}`,
                `Refresh: Every ${totalSecs}s`,
                `Market: 09:15 – 15:30 IST (Mon–Fri)`,
                status?.holiday_name ? `Holiday: ${status.holiday_name}` : null,
                status?.last_eod_stored_at ? `EOD stored: ${status.last_eod_stored_at}` : null,
              ].filter(Boolean).map((txt, i) => (
                <Typography key={i} variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  • {txt}
                </Typography>
              ))}
            </Box>
          }
          arrow placement="bottom"
        >
          <InfoOutlined sx={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', cursor: 'help', flexShrink: 0, ml: 0.5, '&:hover': { color: 'rgba(255,255,255,0.6)' } }} />
        </Tooltip>

        {/* ── Manual refresh ───────────────────────────────────────────── */}
        <Tooltip title="Refresh market data">
          <IconButton
            size="small"
            onClick={manualRefresh}
            sx={{ p: 0.4, color: 'rgba(255,255,255,0.3)', ml: 0.5, flexShrink: 0, '&:hover': { color: 'rgba(255,255,255,0.8)', bgcolor: 'rgba(255,255,255,0.08)' } }}
          >
            <Refresh sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>

        {/* ── Dismiss (non-live only) ─────────────────────────────────── */}
        {!isLive && (
          <Tooltip title="Dismiss">
            <IconButton
              size="small"
              onClick={() => setDismissed(true)}
              sx={{ p: 0.3, color: 'rgba(255,255,255,0.2)', flexShrink: 0, '&:hover': { color: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.06)' } }}
            >
              <Close sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
};

export default MarketStatusBar;
