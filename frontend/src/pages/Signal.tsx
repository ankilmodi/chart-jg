/**
 * Signal Analysis page – detailed breakdown of BUY/SELL/WAIT signal.
 */
import React from 'react';
import {
  Box, Grid, Card, CardContent, Typography, LinearProgress,
  Divider, Chip, Table, TableBody, TableCell, TableRow, TableHead,
} from '@mui/material';
import { useSignal, useMarket } from '../hooks/useMarketData';
import { SignalBadge, TrendBadge, LoadingState, ErrorState } from '../components/common/MetricCards';
import { signalColor } from '../theme/theme';

const WEIGHTS: Record<string, number> = {
  'EMA Trend': 20,
  'MACD': 15,
  'Supertrend': 15,
  'RSI 14': 10,
  'ADX': 10,
  'VWAP': 10,
  'Volume': 10,
  'Support/Resistance': 10,
  'Bollinger Bands': 5,
  'ATR': 5,
};

const SignalPage: React.FC = () => {
  const { data: signal, isLoading, error, refetch } = useSignal();
  const { data: market } = useMarket();

  if (isLoading && !signal) return <LoadingState message="Computing signal…" />;
  if (error && !signal)     return <ErrorState error={(error as Error).message} onRetry={refetch} />;
  if (!signal)              return null;

  const color = signalColor(signal.signal);

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={3}>🎯 Signal Analysis</Typography>

      <Grid container spacing={2}>
        {/* Big signal display */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 3 }}>
              <SignalBadge signal={signal.signal} confidence={signal.confidence} size="large" />
              <TrendBadge trend={signal.trend} />
              {market && (
                <Box textAlign="center">
                  <Typography variant="h4" fontWeight={800}>
                    ₹{signal.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Current Price</Typography>
                </Box>
              )}
              <Divider sx={{ width: '100%' }} />
              <Box display="flex" gap={2} textAlign="center">
                <Box>
                  <Typography variant="h5" fontWeight={700} color="#00e676">{signal.buy_score}</Typography>
                  <Typography variant="caption" color="text.secondary">Buy Points</Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography variant="h5" fontWeight={700} color="#ff1744">{signal.sell_score}</Typography>
                  <Typography variant="caption" color="text.secondary">Sell Points</Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography variant="h5" fontWeight={700} sx={{ color }}>100</Typography>
                  <Typography variant="caption" color="text.secondary">Max Points</Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Last updated: {signal.last_updated}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Confidence breakdown */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                📋 Indicator Breakdown
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Indicator</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Value</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Points</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>Contribution</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Signal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {signal.reasons.map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{r.indicator}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 200 }}>
                        <Typography variant="caption" noWrap title={r.value}>{r.value}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${r.points}/${r.max_points}`}
                          size="small"
                          sx={{
                            bgcolor: r.points > 0 ? (r.bullish ? '#00e67622' : '#ff174422') : '#ffffff11',
                            color:   r.points > 0 ? (r.bullish ? '#00e676'   : '#ff1744'  ) : 'text.secondary',
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(r.points / r.max_points) * 100}
                          sx={{
                            height: 6, borderRadius: 3,
                            bgcolor: '#ffffff11',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: r.bullish ? '#00e676' : '#ff1744',
                              borderRadius: 3,
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={r.bullish ? '▲' : '▼'}
                          size="small"
                          sx={{
                            bgcolor: r.bullish ? '#00e67611' : '#ff174411',
                            color:   r.bullish ? '#00e676'   : '#ff1744',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Weight legend */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                ⚖️ Signal Formula Weights (Total = 100 pts)
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1.5}>
                {Object.entries(WEIGHTS).map(([name, weight]) => (
                  <Box key={name} sx={{ minWidth: 140 }}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">{name}</Typography>
                      <Typography variant="caption" fontWeight={700}>{weight}pts</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={weight}
                      sx={{
                        height: 6, borderRadius: 3,
                        bgcolor: '#ffffff11',
                        '& .MuiLinearProgress-bar': { bgcolor: '#2196f3', borderRadius: 3 },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SignalPage;
