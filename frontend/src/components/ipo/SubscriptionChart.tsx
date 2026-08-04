import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Box, Typography } from '@mui/material';
import { IPOSubscription } from '../../services/ipoApi';

interface Props { subscription: IPOSubscription; }

export const SubscriptionChart: React.FC<Props> = ({ subscription }) => {
  const dayData = subscription.days.map(d => ({
    name: `Day ${d.day}`,
    Retail: d.retail_times,
    HNI:    d.hni_times,
    QIB:    d.qib_times,
    Total:  d.total_times,
  }));

  const hourlyData = subscription.hourly.slice(-12).map((h, i) => ({
    time: new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    Total:  h.total_times,
    Retail: h.retail_times,
  }));

  if (!dayData.length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Subscription data not yet available</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} mb={1}>Day-wise Subscription (times)</Typography>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={dayData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} unit="x" />
          <Tooltip formatter={(v: number) => `${v.toFixed(2)}x`} />
          <Legend />
          <Area type="monotone" dataKey="Retail" stroke="#2196f3" fill="#2196f322" strokeWidth={2} />
          <Area type="monotone" dataKey="HNI"    stroke="#ff9800" fill="#ff980022" strokeWidth={2} />
          <Area type="monotone" dataKey="QIB"    stroke="#00c853" fill="#00c85322" strokeWidth={2} />
          <Area type="monotone" dataKey="Total"  stroke="#9c27b0" fill="#9c27b022" strokeWidth={2} strokeDasharray="5 5" />
        </AreaChart>
      </ResponsiveContainer>

      {hourlyData.length > 0 && (
        <>
          <Typography variant="subtitle2" fontWeight={700} mt={3} mb={1}>Hourly Subscription Trend</Typography>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="x" />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}x`} />
              <Area type="monotone" dataKey="Total"  stroke="#6c63ff" fill="#6c63ff22" strokeWidth={2} />
              <Area type="monotone" dataKey="Retail" stroke="#2196f3" fill="#2196f315" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
    </Box>
  );
};
