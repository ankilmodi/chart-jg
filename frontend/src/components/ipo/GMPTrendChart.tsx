import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { Box, Typography, Stack, Chip } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface GMPPoint { timestamp: string; gmp: number; gmp_pct: number; }
interface Props { gmpHistory: GMPPoint[]; issuePrice?: number; }

export const GMPTrendChart: React.FC<Props> = ({ gmpHistory, issuePrice }) => {
  if (!gmpHistory?.length) return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography color="text.secondary">No GMP data available</Typography>
    </Box>
  );

  const data = gmpHistory.map(p => ({
    date: new Date(p.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    gmp: p.gmp,
    pct: p.gmp_pct,
  }));

  const latest = gmpHistory[gmpHistory.length - 1];
  const positive = latest.gmp >= 0;
  const color = positive ? '#00c853' : '#ff1744';

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle2" fontWeight={700}>GMP Trend</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {positive ? <TrendingUp sx={{ color, fontSize: 18 }} /> : <TrendingDown sx={{ color, fontSize: 18 }} />}
          <Chip label={`₹${latest.gmp} (${positive ? '+' : ''}${latest.gmp_pct.toFixed(1)}%)`}
            size="small" sx={{ bgcolor: `${color}18`, color, fontWeight: 700, fontSize: 12 }} />
        </Stack>
      </Stack>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gmpGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${v}`} />
          <Tooltip formatter={(v: number) => [`₹${v}`, 'GMP']} />
          <ReferenceLine y={0} stroke="#888" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="gmp" stroke={color} fill="url(#gmpGrad)" strokeWidth={2.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};
