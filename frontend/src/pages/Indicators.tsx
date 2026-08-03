/**
 * Full Indicators page – shows all computed indicator values.
 */
import React from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Divider,
  Chip, Table, TableBody, TableCell, TableRow, TableHead,
  LinearProgress,
} from '@mui/material';
import { useIndicators, useHistory } from '../hooks/useMarketData';
import { LoadingState, ErrorState } from '../components/common/MetricCards';
import { MacdChart, RsiChart } from '../components/charts/Charts';

const fmt = (v?: number | null, dp = 2) =>
  v != null ? v.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp }) : '—';

const BullBear: React.FC<{ bullish?: boolean | null }> = ({ bullish }) => {
  if (bullish === null || bullish === undefined) return <Chip label="—" size="small" />;
  return (
    <Chip
      label={bullish ? 'Bullish' : 'Bearish'}
      size="small"
      sx={{
        bgcolor: bullish ? '#00e67622' : '#ff174422',
        color:   bullish ? '#00e676'   : '#ff1744',
        fontWeight: 700,
      }}
    />
  );
};

const IndicatorsPage: React.FC = () => {
  const { data: ind, isLoading, error } = useIndicators();
  const { data: history } = useHistory(100);

  if (isLoading && !ind) return <LoadingState message="Calculating indicators…" />;
  if (error && !ind)      return <ErrorState error={(error as Error).message} />;
  if (!ind)               return null;

  const price = history?.candles.at(-1)?.close;

  const emaRows = [
    { name: 'EMA 9',   value: ind.ema9,   bullish: price && ind.ema9  ? price > ind.ema9  : null },
    { name: 'EMA 20',  value: ind.ema20,  bullish: price && ind.ema20 ? price > ind.ema20 : null },
    { name: 'EMA 50',  value: ind.ema50,  bullish: price && ind.ema50 ? price > ind.ema50 : null },
    { name: 'EMA 100', value: ind.ema100, bullish: price && ind.ema100 ? price > ind.ema100 : null },
    { name: 'EMA 200', value: ind.ema200, bullish: price && ind.ema200 ? price > ind.ema200 : null },
    { name: 'SMA 50',  value: ind.sma50,  bullish: price && ind.sma50  ? price > ind.sma50  : null },
    { name: 'SMA 200', value: ind.sma200, bullish: price && ind.sma200 ? price > ind.sma200 : null },
  ];

  const oscillatorRows = [
    { name: 'RSI 14',     value: fmt(ind.rsi14, 1),   bullish: ind.rsi14 ? ind.rsi14 >= 55 && ind.rsi14 <= 70 : null },
    { name: 'MACD',       value: fmt(ind.macd, 4),    bullish: ind.macd_hist != null ? ind.macd_hist > 0 : null },
    { name: 'MACD Hist',  value: fmt(ind.macd_hist, 4), bullish: ind.macd_hist != null ? ind.macd_hist > 0 : null },
    { name: 'MACD Cross', value: ind.macd_crossover || '—', bullish: ind.macd_crossover === 'bullish' },
    { name: 'ADX',        value: fmt(ind.adx, 1),     bullish: ind.adx && ind.adx_plus_di && ind.adx_minus_di ? ind.adx_plus_di > ind.adx_minus_di : null },
    { name: '+DI',        value: fmt(ind.adx_plus_di, 1),  bullish: ind.adx_plus_di && ind.adx_minus_di ? ind.adx_plus_di > ind.adx_minus_di : null },
    { name: '-DI',        value: fmt(ind.adx_minus_di, 1), bullish: ind.adx_plus_di && ind.adx_minus_di ? ind.adx_minus_di < ind.adx_plus_di : null },
    { name: 'Stoch RSI %K', value: fmt(ind.stoch_rsi_k), bullish: ind.stoch_rsi_k ? ind.stoch_rsi_k > 50 : null },
    { name: 'Stoch RSI %D', value: fmt(ind.stoch_rsi_d), bullish: ind.stoch_rsi_d ? ind.stoch_rsi_d > 50 : null },
    { name: 'CCI 20',    value: fmt(ind.cci, 1),      bullish: ind.cci ? ind.cci > 100 : null },
    { name: 'OBV',       value: ind.obv != null ? ind.obv.toLocaleString('en-IN') : '—', bullish: null },
  ];

  const trendRows = [
    { name: 'VWAP',            value: fmt(ind.vwap),      bullish: price && ind.vwap ? price > ind.vwap : null },
    { name: 'Supertrend',      value: fmt(ind.supertrend), bullish: ind.supertrend_direction === 'buy' },
    { name: 'ST Direction',    value: ind.supertrend_direction?.toUpperCase() || '—', bullish: ind.supertrend_direction === 'buy' },
    { name: 'ATR 14',          value: fmt(ind.atr),        bullish: null },
    { name: 'BB Upper',        value: fmt(ind.bb_upper),   bullish: null },
    { name: 'BB Middle',       value: fmt(ind.bb_middle),  bullish: price && ind.bb_middle ? price > ind.bb_middle : null },
    { name: 'BB Lower',        value: fmt(ind.bb_lower),   bullish: null },
    { name: 'BB Width %',      value: fmt(ind.bb_width, 2), bullish: null },
    { name: 'Ichimoku Tenkan', value: fmt(ind.ichimoku_tenkan), bullish: null },
    { name: 'Ichimoku Kijun',  value: fmt(ind.ichimoku_kijun),  bullish: null },
    { name: 'Volume Ratio',    value: ind.volume_ratio != null ? `${ind.volume_ratio}x` : '—', bullish: ind.volume_ratio ? ind.volume_ratio > 1 : null },
  ];

  const renderTable = (rows: Array<{ name: string; value: string | undefined; bullish: boolean | null }>) => (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 700 }}>Indicator</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700 }}>Value</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700 }}>Signal</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(({ name, value, bullish }) => (
          <TableRow key={name} hover>
            <TableCell sx={{ fontSize: 13 }}>{name}</TableCell>
            <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
              {value}
            </TableCell>
            <TableCell align="right">
              <BullBear bullish={bullish} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={3}>📊 Technical Indicators</Typography>

      {/* Trend / ATR / VWAP header */}
      <Box mb={2} display="flex" gap={1} flexWrap="wrap">
        <Chip label={`Trend: ${ind.trend.toUpperCase()}`}
          sx={{ bgcolor: ind.trend === 'bullish' ? '#00e67622' : ind.trend === 'bearish' ? '#ff174422' : '#ffc10722',
                color:   ind.trend === 'bullish' ? '#00e676'   : ind.trend === 'bearish' ? '#ff1744'   : '#ffc107',
                fontWeight: 700 }} />
        {ind.rsi14 && <Chip label={`RSI: ${ind.rsi14.toFixed(1)}`} variant="outlined" />}
        {ind.adx   && <Chip label={`ADX: ${ind.adx.toFixed(1)}`}   variant="outlined" />}
        {ind.macd_crossover && (
          <Chip
            label={`MACD: ${ind.macd_crossover}`}
            sx={{ bgcolor: ind.macd_crossover === 'bullish' ? '#00e67622' : '#ff174422',
                  color:   ind.macd_crossover === 'bullish' ? '#00e676'   : '#ff1744',
                  fontWeight: 700 }}
          />
        )}
      </Box>

      <Grid container spacing={2}>
        {/* Moving Averages */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>Moving Averages</Typography>
              <Divider sx={{ mb: 1 }} />
              {renderTable(emaRows)}
            </CardContent>
          </Card>
        </Grid>

        {/* Oscillators */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>Oscillators</Typography>
              <Divider sx={{ mb: 1 }} />
              {renderTable(oscillatorRows)}
            </CardContent>
          </Card>
        </Grid>

        {/* Trend / Bands */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>Trend & Bands</Typography>
              <Divider sx={{ mb: 1 }} />
              {renderTable(trendRows)}
            </CardContent>
          </Card>
        </Grid>

        {/* RSI chart */}
        {history?.candles && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <RsiChart candles={history.candles} />
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* MACD chart */}
        {history?.candles && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <MacdChart candles={history.candles} />
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default IndicatorsPage;
