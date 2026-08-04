import React from 'react';
import { Chip, Box, Typography } from '@mui/material';
import { Star, StarBorder } from '@mui/icons-material';

interface Props {
  score?: number;
  label?: string;
  size?: 'small' | 'medium';
}

const COLORS: Record<string, string> = {
  'Excellent':  '#00c853',
  'Very Good':  '#64dd17',
  'Good':       '#ffd600',
  'Risky':      '#ff1744',
};

export const IPORatingBadge: React.FC<Props> = ({ score, label, size = 'medium' }) => {
  const lbl   = label || (score != null
    ? score >= 90 ? 'Excellent' : score >= 80 ? 'Very Good' : score >= 70 ? 'Good' : 'Risky'
    : 'N/A');
  const color = COLORS[lbl] || '#888';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Chip
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Star sx={{ fontSize: size === 'small' ? 12 : 14, color }} />
            <Typography fontWeight={700} fontSize={size === 'small' ? 11 : 13} color={color}>
              {score != null ? `${score.toFixed(0)}/100` : 'N/A'}
            </Typography>
            <Typography fontWeight={600} fontSize={size === 'small' ? 10 : 12} color="text.secondary">
              {lbl}
            </Typography>
          </Box>
        }
        size={size}
        sx={{
          bgcolor: `${color}15`,
          border: `1px solid ${color}55`,
          height: size === 'small' ? 22 : 28,
        }}
      />
    </Box>
  );
};
