/**
 * src/components/MarketStatusBadge.tsx
 *
 * Compact AppBar badge showing:
 *  🟢 LIVE  — blinking green dot + "Live Market" + last-updated time
 *  🔴 CLOSED — red dot + "Market Closed" + next open time
 *  🟡 CACHED — yellow dot + "Cached Data" (API failure fallback)
 *
 * Props: none — reads from useMarketSession hook.
 */
import React, { useState, useEffect } from 'react';
import { Box, Chip, Tooltip, Typography, IconButton, Stack } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { keyframes } from '@mui/system';
import { useMarketSession } from '../hooks/useMarketSession';

// Blinking animation for live dot
const blink = keyframes`
  0%,100% { opacity: 1; }
  50%      { opacity: 0.2; }
`;

export const MarketStatusBadge: React.FC = () => {
  const { status, isOpen, manualRefresh } = useMarketSession();
  const [lastUpdated, setLastUpdated] = useState<string>('—');

  // Update "last updated" timestamp whenever status changes
  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [status]);

  // Choose dot colour and label
  const isLive    = status.status === 'LIVE';
  const isCached  = !isLive && status.dataSource === 'cached';
  const dotColor  = isLive ? '#4caf50' : isCached ? '#ff9800' : '#f44336';
  const chipColor = isLive ? 'success'  : isCached ? 'warning'  : 'error';

  const label = isLive
    ? '🟢 Live Market'
    : isCached
    ? '🟡 Cached Data'
    : status.status === 'PRE_OPEN'
    ? '⏳ Pre-Open'
    : status.status === 'HOLIDAY'
    ? `🏖️ Holiday`
    : '🔴 Market Closed';

  const tooltipLines = [
    status.message,
    `IST: ${status.currentTimeIst}`,
    status.holidayName ? `Holiday: ${status.holidayName}` : null,
    !isOpen && status.nextOpen
      ? `Next open: ${new Date(status.nextOpen).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}`
      : null,
    `Last updated: ${lastUpdated}`,
    `Refresh: every ${status.refreshInterval}s`,
  ].filter(Boolean).join('\n');

  return (
    <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltipLines}</span>} arrow>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ cursor: 'default' }}>
        {/* Blinking dot */}
        <Box
          sx={{
            width: 8, height: 8, borderRadius: '50%',
            bgcolor: dotColor,
            animation: isLive ? `${blink} 1.4s ease-in-out infinite` : 'none',
            flexShrink: 0,
          }}
        />

        {/* Status chip */}
        <Chip
          label={label}
          size="small"
          color={chipColor as any}
          variant={isLive ? 'filled' : 'outlined'}
          sx={{ fontWeight: 800, fontSize: 11, height: 22 }}
        />

        {/* Last updated (desktop only) */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: { xs: 'none', lg: 'block' }, fontSize: 10, lineHeight: 1 }}
        >
          {lastUpdated}
        </Typography>

        {/* Manual refresh */}
        <Tooltip title="Refresh market data">
          <IconButton size="small" onClick={manualRefresh} sx={{ p: 0.3 }}>
            <Refresh sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Tooltip>
  );
};

export default MarketStatusBadge;
