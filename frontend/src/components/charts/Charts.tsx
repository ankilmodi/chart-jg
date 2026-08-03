/**
 * Candlestick + EMA Overlay Chart using Recharts
 * Recharts doesn't have native candlestick; we simulate with a custom shape.
 */
import React, { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';
import type { Candle, IndicatorValues } from '../../utils/types';

// Custom candlestick bar shape
const CandleShape = (props: any) => {
  const { x, y, width, payload } = props;
  if (!payload) return null;

  const { open, close, high, low } = payload;
  const isGreen = close >= open;
  const color   = isGreen ? '#00e676' : '#ff1744';
  const bodyH   = Math.max(Math.abs(close - open), 1);
  const bodyY   = Math.min(open, close);
  const wickX   = x + width / 2;

  return (
    <g>
      {/* wick */}
      <line x1={wickX} y1={y}     x2={wickX} y2={y + props.height} stroke={color} strokeWidth={1} />
      {/* body – this will be overridden by the yAxis domain so we keep it minimal */}
      <rect x={x + 1} y={bodyY} width={Math.max(width - 2, 2)} height={bodyH} fill={color} />
    </g>
  );
};

// ---------------------------------------------------------------------------
// Price + EMA chart
// ---------------------------------------------------------------------------

interface PriceChartProps {
  candles: Candle[];
  indicators?: IndicatorValues;
}

export const PriceChart: React.FC<PriceChartProps> = ({ candles, indicators }) => {
  const theme = useTheme();

  const data = useMemo(() =>
    candles.slice(-80).map((c) => ({
      time:  c.timestamp.slice(11, 16),
      open:  c.open,
      high:  c.high,
      low:   c.low,
      close: c.close,
      price: c.close,
    })),
  [candles]);

  const vwap   = indicators?.vwap;
  const ema9   = indicators?.ema9;
  const ema20  = indicators?.ema20;
  const ema50  = indicators?.ema50;

  const gridColor  = theme.palette.mode === 'dark' ? '#ffffff11' : '#00000011';
  const textColor  = theme.palette.text.secondary;

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={1}>
        Price Chart (5m) with EMA
      </Typography>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="time"
            tick={{ fill: textColor, fontSize: 11 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: textColor, fontSize: 11 }}
            tickLine={false}
            width={80}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <Tooltip
            contentStyle={{
              background: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 8,
            }}
            formatter={(val: number) => val.toFixed(2)}
          />
          <Legend />

          {/* Price line */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#2196f3"
            dot={false}
            strokeWidth={1.5}
            name="Price"
          />

          {/* EMA lines as constant reference lines */}
          {ema9  && <ReferenceLine y={ema9}  stroke="#ff9800" strokeDasharray="4 2" label={{ value: `EMA9 ${ema9}`,  fill: '#ff9800', fontSize: 10 }} />}
          {ema20 && <ReferenceLine y={ema20} stroke="#9c27b0" strokeDasharray="4 2" label={{ value: `EMA20 ${ema20}`, fill: '#9c27b0', fontSize: 10 }} />}
          {ema50 && <ReferenceLine y={ema50} stroke="#00bcd4" strokeDasharray="4 2" label={{ value: `EMA50 ${ema50}`, fill: '#00bcd4', fontSize: 10 }} />}
          {vwap  && <ReferenceLine y={vwap}  stroke="#00e676" strokeDasharray="6 3" label={{ value: `VWAP ${vwap}`,  fill: '#00e676', fontSize: 10 }} />}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Volume chart
// ---------------------------------------------------------------------------

interface VolumeChartProps {
  candles: Candle[];
  volumeMa?: number;
}

export const VolumeChart: React.FC<VolumeChartProps> = ({ candles, volumeMa }) => {
  const theme = useTheme();
  const data = useMemo(() =>
    candles.slice(-80).map((c) => ({
      time:   c.timestamp.slice(11, 16),
      volume: c.volume,
      color:  c.close >= c.open ? '#00e67688' : '#ff174488',
    })),
  [candles]);

  const gridColor = theme.palette.mode === 'dark' ? '#ffffff11' : '#00000011';
  const textColor = theme.palette.text.secondary;

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={1}>
        Volume
      </Typography>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={data} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="time" tick={{ fill: textColor, fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: textColor, fontSize: 10 }} tickLine={false} width={70}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
          <Tooltip
            contentStyle={{ background: theme.palette.background.paper, borderRadius: 8 }}
            formatter={(v: number) => `${(v / 1000).toFixed(1)}K`}
          />
          <Bar dataKey="volume" fill="#2196f344" name="Volume" />
          {volumeMa && <ReferenceLine y={volumeMa} stroke="#ffc107" strokeDasharray="4 2" label={{ value: 'Avg', fill: '#ffc107', fontSize: 10 }} />}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// MACD chart
// ---------------------------------------------------------------------------

interface MacdChartProps {
  candles: Candle[];
}

export const MacdChart: React.FC<MacdChartProps> = ({ candles }) => {
  const theme = useTheme();
  // Compute simple MACD from candles for charting
  const data = useMemo(() => {
    const closes = candles.map(c => c.close);
    const ema = (arr: number[], period: number): number[] => {
      const k = 2 / (period + 1);
      const result: number[] = [arr[0]];
      for (let i = 1; i < arr.length; i++) {
        result.push(arr[i] * k + result[i - 1] * (1 - k));
      }
      return result;
    };
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    const macdLine  = ema12.map((v, i) => v - ema26[i]);
    const signalArr = ema(macdLine, 9);
    return candles.slice(-80).map((c, i) => {
      const idx = candles.length - 80 + i;
      return {
        time:   c.timestamp.slice(11, 16),
        macd:   +macdLine[idx]?.toFixed(2) || 0,
        signal: +signalArr[idx]?.toFixed(2) || 0,
        hist:   +(macdLine[idx] - signalArr[idx])?.toFixed(2) || 0,
      };
    });
  }, [candles]);

  const gridColor = theme.palette.mode === 'dark' ? '#ffffff11' : '#00000011';
  const textColor = theme.palette.text.secondary;

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={1}>MACD (12,26,9)</Typography>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="time" tick={{ fill: textColor, fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: textColor, fontSize: 10 }} tickLine={false} width={60} />
          <ReferenceLine y={0} stroke={theme.palette.divider} />
          <Tooltip contentStyle={{ background: theme.palette.background.paper, borderRadius: 8 }} />
          <Legend />
          <Bar dataKey="hist" fill="#2196f355" name="Histogram" />
          <Line type="monotone" dataKey="macd"   stroke="#ff9800" dot={false} strokeWidth={1.5} name="MACD" />
          <Line type="monotone" dataKey="signal" stroke="#e91e63" dot={false} strokeWidth={1.5} name="Signal" />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// RSI chart
// ---------------------------------------------------------------------------

interface RsiChartProps {
  candles: Candle[];
}

export const RsiChart: React.FC<RsiChartProps> = ({ candles }) => {
  const theme = useTheme();
  const data = useMemo(() => {
    const closes = candles.map(c => c.close);
    const rsiValues: number[] = [50];
    for (let i = 1; i < closes.length; i++) {
      const slice = closes.slice(Math.max(0, i - 14), i + 1);
      const gains = [], losses = [];
      for (let j = 1; j < slice.length; j++) {
        const diff = slice[j] - slice[j - 1];
        if (diff > 0) gains.push(diff); else losses.push(-diff);
      }
      const ag = gains.length ? gains.reduce((a, b) => a + b) / gains.length : 0;
      const al = losses.length ? losses.reduce((a, b) => a + b) / losses.length : 0;
      rsiValues.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
    }
    return candles.slice(-80).map((c, i) => ({
      time: c.timestamp.slice(11, 16),
      rsi:  +rsiValues[candles.length - 80 + i]?.toFixed(2) || 50,
    }));
  }, [candles]);

  const gridColor = theme.palette.mode === 'dark' ? '#ffffff11' : '#00000011';
  const textColor = theme.palette.text.secondary;

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={1}>RSI (14)</Typography>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={data} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="time" tick={{ fill: textColor, fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={{ fill: textColor, fontSize: 10 }} tickLine={false} width={35} />
          <ReferenceLine y={70} stroke="#ff174488" strokeDasharray="4 2" label={{ value: '70', fill: '#ff1744', fontSize: 10 }} />
          <ReferenceLine y={55} stroke="#00e67688" strokeDasharray="4 2" label={{ value: '55', fill: '#00e676', fontSize: 10 }} />
          <ReferenceLine y={45} stroke="#ff174488" strokeDasharray="4 2" label={{ value: '45', fill: '#ff1744', fontSize: 10 }} />
          <ReferenceLine y={30} stroke="#ff174488" strokeDasharray="4 2" label={{ value: '30', fill: '#ff1744', fontSize: 10 }} />
          <Tooltip contentStyle={{ background: theme.palette.background.paper, borderRadius: 8 }} />
          <Line type="monotone" dataKey="rsi" stroke="#9c27b0" dot={false} strokeWidth={2} name="RSI" />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};
