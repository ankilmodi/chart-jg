import React, { useState } from 'react';
import {
  Box, Typography, Stack, Chip, Paper, Tooltip,
  ToggleButton, ToggleButtonGroup, CircularProgress, Alert, Grid,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchHeatmap } from '../services/api';
import { useNavigate } from 'react-router-dom';
import type { HeatmapItem } from '../utils/types';

const COLOR_MAP: Record<string, string> = {
  dark_green: '#1b5e20',
  green:      '#2e7d32',
  yellow:     '#f9a825',
  orange:     '#e65100',
  red:        '#b71c1c',
};

const TEXT_MAP: Record<string, string> = {
  dark_green: '#ffffff',
  green:      '#ffffff',
  yellow:     '#000000',
  orange:     '#ffffff',
  red:        '#ffffff',
};

const LABEL_MAP: Record<string, string> = {
  dark_green: 'Strong Buy',
  green:      'Buy',
  yellow:     'Neutral',
  orange:     'Sell',
  red:        'Strong Sell',
};

const HeatCell: React.FC<{ item: HeatmapItem; size: number }> = ({ item, size }) => {
  const navigate = useNavigate();
  const bg   = COLOR_MAP[item.color] || '#757575';
  const txt  = TEXT_MAP[item.color] || '#fff';

  return (
    <Tooltip
      arrow
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>{item.symbol}</Typography>
          <Typography variant="caption" display="block">{item.name}</Typography>
          <Typography variant="caption" display="block">Price: ₹{item.price?.toFixed(2)}</Typography>
          <Typography variant="caption" display="block"
            sx={{ color: item.change_pct >= 0 ? '#a5d6a7' : '#ef9a9a' }}>
            Change: {item.change_pct >= 0 ? '+' : ''}{item.change_pct?.toFixed(2)}%
          </Typography>
          <Typography variant="caption" display="block">
            Buy Score: {item.buy_score?.toFixed(0)}/100
          </Typography>
          <Typography variant="caption" display="block">
            Signal: {item.signal}
          </Typography>
          {item.oi_change_pct != null && (
            <Typography variant="caption" display="block">
              OI Chg: {item.oi_change_pct?.toFixed(2)}%
            </Typography>
          )}
          {item.trend && (
            <Typography variant="caption" display="block">Trend: {item.trend}</Typography>
          )}
        </Box>
      }
    >
      <Box
        onClick={() => navigate(`/stock/${item.symbol}`)}
        sx={{
          width: size, height: size,
          bgcolor: bg,
          color: txt,
          borderRadius: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.1)',
          p: 0.5,
          transition: 'transform 0.15s',
          '&:hover': { transform: 'scale(1.06)', zIndex: 2 },
        }}
      >
        <Typography variant="caption" fontWeight={700} fontSize={size > 80 ? 12 : 10} textAlign="center" lineHeight={1.2}>
          {item.symbol}
        </Typography>
        <Typography variant="caption" fontSize={size > 80 ? 11 : 9} textAlign="center">
          {item.change_pct >= 0 ? '+' : ''}{item.change_pct?.toFixed(1)}%
        </Typography>
        {size > 80 && (
          <Typography variant="caption" fontSize={9} textAlign="center">
            {item.buy_score?.toFixed(0)}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

export default function HeatMapPage() {
  const [sizeMode, setSizeMode] = useState<'equal' | 'volume' | 'score'>('equal');
  const [groupBy, setGroupBy] = useState<'sector' | 'signal'>('sector');

  const { data, isLoading, error } = useQuery({
    queryKey: ['heatmap'],
    queryFn: () => fetchHeatmap(),
    refetchInterval: 300_000,
  });

  const items: HeatmapItem[] = data?.items || [];

  // Group by sector or signal
  const grouped = items.reduce<Record<string, HeatmapItem[]>>((acc, item) => {
    const key = groupBy === 'sector' ? item.sector : item.signal;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const getCellSize = (item: HeatmapItem) => {
    if (sizeMode === 'volume') {
      const ratio = item.volume ? Math.min(item.volume / 1_000_000, 1) : 0;
      return Math.max(60, Math.min(140, 60 + ratio * 80));
    }
    if (sizeMode === 'score') {
      return Math.max(60, Math.min(130, item.buy_score * 1.2));
    }
    return 90; // equal
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2} flexWrap="wrap">
        <Typography variant="h5" fontWeight={700}>🗺️ Heat Map</Typography>
        <Chip label={`${items.length} stocks`} size="small" />
        {isLoading && <CircularProgress size={16} />}
      </Stack>

      {/* Controls */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Box>
          <Typography variant="caption" color="text.secondary" mb={0.5} display="block">Box Size</Typography>
          <ToggleButtonGroup value={sizeMode} exclusive size="small"
            onChange={(_, v) => v && setSizeMode(v)}>
            <ToggleButton value="equal">Equal</ToggleButton>
            <ToggleButton value="volume">Volume</ToggleButton>
            <ToggleButton value="score">Score</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" mb={0.5} display="block">Group By</Typography>
          <ToggleButtonGroup value={groupBy} exclusive size="small"
            onChange={(_, v) => v && setGroupBy(v)}>
            <ToggleButton value="sector">Sector</ToggleButton>
            <ToggleButton value="signal">Signal</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Stack>

      {/* Legend */}
      <Stack direction="row" spacing={1} mb={3} flexWrap="wrap">
        {Object.entries(LABEL_MAP).map(([key, label]) => (
          <Chip key={key}
            label={label}
            size="small"
            sx={{ bgcolor: COLOR_MAP[key], color: TEXT_MAP[key], fontWeight: 600 }}
          />
        ))}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{(error as Error).message}</Alert>}

      {/* Heatmap grid */}
      {!isLoading && Object.entries(grouped).map(([groupName, groupItems]) => (
        <Box key={groupName} mb={3}>
          <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.secondary">
            {groupName} ({groupItems.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {groupItems
              .sort((a, b) => b.buy_score - a.buy_score)
              .map(item => (
                <HeatCell key={item.symbol} item={item} size={getCellSize(item)} />
              ))
            }
          </Box>
        </Box>
      ))}
    </Box>
  );
}
