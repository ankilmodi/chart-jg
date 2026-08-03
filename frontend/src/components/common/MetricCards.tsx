/**
 * Reusable UI components.
 */
import React from 'react';
import {
  Card, CardContent, Typography, Box, Chip, CircularProgress,
  Skeleton, Alert, LinearProgress, Tooltip,
} from '@mui/material';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import TrendingDownIcon  from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon  from '@mui/icons-material/TrendingFlat';
import { signalColor, trendColor, changeColor } from '../../theme/theme';

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title, value, subtitle, color, icon, loading = false,
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        {icon && <Box sx={{ opacity: 0.7 }}>{icon}</Box>}
      </Box>
      {loading ? (
        <Skeleton variant="text" width="60%" height={40} />
      ) : (
        <Typography variant="h5" fontWeight={700} sx={{ color: color || 'text.primary' }}>
          {value}
        </Typography>
      )}
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// ---------------------------------------------------------------------------
// PriceChange chip
// ---------------------------------------------------------------------------

interface PriceChangeProps {
  value: number;
  pct: number;
}

export const PriceChange: React.FC<PriceChangeProps> = ({ value, pct }) => {
  const color  = changeColor(value);
  const prefix = value >= 0 ? '+' : '';
  return (
    <Box display="flex" gap={1} alignItems="center">
      <Chip
        label={`${prefix}${value.toFixed(2)}`}
        size="small"
        sx={{ bgcolor: color, color: '#000', fontWeight: 700 }}
      />
      <Chip
        label={`${prefix}${pct.toFixed(2)}%`}
        size="small"
        sx={{ bgcolor: color, color: '#000', fontWeight: 700 }}
      />
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Signal Badge
// ---------------------------------------------------------------------------

interface SignalBadgeProps {
  signal: string;
  confidence: number;
  size?: 'small' | 'medium' | 'large';
}

export const SignalBadge: React.FC<SignalBadgeProps> = ({
  signal, confidence, size = 'medium',
}) => {
  const color = signalColor(signal);
  const fontSize = size === 'large' ? '2rem' : size === 'medium' ? '1.4rem' : '1rem';

  return (
    <Box textAlign="center">
      <Box
        sx={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          px: 3,
          py: 1.5,
          borderRadius: 3,
          border: `2px solid ${color}`,
          boxShadow: `0 0 20px ${color}44`,
          bgcolor: `${color}11`,
        }}
      >
        <Typography sx={{ fontSize, fontWeight: 800, color, letterSpacing: 2 }}>
          {signal}
        </Typography>
        <Box sx={{ width: '100%' }}>
          <LinearProgress
            variant="determinate"
            value={confidence}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: `${color}33`,
              '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
            }}
          />
          <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
            Confidence: {confidence.toFixed(1)}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Trend indicator
// ---------------------------------------------------------------------------

interface TrendBadgeProps {
  trend: string;
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({ trend }) => {
  const color = trendColor(trend);
  const Icon =
    trend === 'bullish' ? TrendingUpIcon :
    trend === 'bearish' ? TrendingDownIcon :
    TrendingFlatIcon;

  return (
    <Chip
      icon={<Icon style={{ color }} />}
      label={trend.charAt(0).toUpperCase() + trend.slice(1)}
      variant="outlined"
      sx={{ borderColor: color, color, fontWeight: 600 }}
    />
  );
};

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading market data…',
}) => (
  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8} gap={2}>
    <CircularProgress size={48} />
    <Typography color="text.secondary">{message}</Typography>
  </Box>
);

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => (
  <Alert
    severity="error"
    action={
      onRetry ? (
        <Chip label="Retry" onClick={onRetry} size="small" color="error" variant="outlined" />
      ) : undefined
    }
    sx={{ borderRadius: 2 }}
  >
    {error}
  </Alert>
);

// ---------------------------------------------------------------------------
// Indicator value chip
// ---------------------------------------------------------------------------

interface IndicatorChipProps {
  label: string;
  value?: number | string | null;
  unit?: string;
  bullish?: boolean | null;
  tooltip?: string;
}

export const IndicatorChip: React.FC<IndicatorChipProps> = ({
  label, value, unit = '', bullish, tooltip,
}) => {
  const displayVal = value != null ? (
    typeof value === 'number' ? value.toFixed(2) : value
  ) : 'N/A';

  const color =
    bullish === true  ? 'success' :
    bullish === false ? 'error'   :
    'default';

  const chip = (
    <Box sx={{ display: 'inline-block', m: 0.5 }}>
      <Chip
        label={`${label}: ${displayVal}${unit}`}
        color={color as any}
        size="small"
        variant="outlined"
        sx={{ fontFamily: 'monospace', fontWeight: 600 }}
      />
    </Box>
  );

  return tooltip ? <Tooltip title={tooltip}>{chip}</Tooltip> : chip;
};
