/**
 * Backtest Page – historical performance of the weekly strategy.
 */
import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button,
  CircularProgress, Alert, Divider, Chip,
  TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip, ResponsiveContainer,
} from 'recharts';
import { fetchBacktest } from '../services/api';
import type { BacktestResult } from '../utils/types';

// ── stat card ──────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}> = ({ label, value, color, sub }) => (
  <Card>
    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={800} color={color}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </CardContent>
  </Card>
);

// ── Main Page ──────────────────────────────────────────────────────────────

const BacktestPage: React.FC = () => {
  const [years, setYears]     = useState(3);
  const [capital, setCapital] = useState(100000);
  const [minScore, setMinScore] = useState(70);
  const [run, setRun]         = useState(false);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<BacktestResult>({
    queryKey:  ['backtest', years, capital, minScore],
    queryFn:   () => fetchBacktest(years, capital, minScore),
    enabled:   run,
    staleTime: 10 * 60_000,
  });

  const handleRun = () => {
    setRun(true);
    if (run) refetch();
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>📈 Strategy Backtest</Typography>
        <Typography variant="body2" color="text.secondary">
          Replay the weekly AI scanner on NIFTY 50 historical data
        </Typography>
      </Box>

      {/* Config card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} mb={2}>Backtest Parameters</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              type="number"
              label="Years"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              inputProps={{ min: 1, max: 10 }}
              sx={{ width: 100 }}
            />
            <TextField
              size="small"
              type="number"
              label="Capital (INR)"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              inputProps={{ min: 10000, step: 10000 }}
              sx={{ width: 150 }}
            />
            <TextField
              size="small"
              type="number"
              label="Min AI Score"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              inputProps={{ min: 50, max: 100, step: 5 }}
              sx={{ width: 120 }}
            />
            <Button
              variant="contained"
              startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
              onClick={handleRun}
              disabled={isLoading}
            >
              {isLoading ? 'Running…' : 'Run Backtest'}
            </Button>
            {isLoading && (
              <Typography variant="caption" color="text.secondary">
                Fetching historical data… this may take 30–60 s
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error).message}
        </Alert>
      )}

      {!run && !data && (
        <Alert severity="info">
          Configure parameters above and click Run Backtest to see historical performance.
        </Alert>
      )}

      {data && (
        <>
          {/* Summary stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard label="Period" value={data.period} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                label="Total Return"
                value={`${data.total_return_pct.toFixed(1)}%`}
                color={data.total_return_pct >= 0 ? '#00e676' : '#ff1744'}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                label="CAGR"
                value={`${data.cagr.toFixed(1)}%`}
                color={data.cagr >= 15 ? '#00e676' : '#ffc107'}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                label="Win Rate"
                value={`${data.win_rate.toFixed(1)}%`}
                color={data.win_rate >= 55 ? '#00e676' : '#ff1744'}
                sub={`${data.winning_trades}W / ${data.losing_trades}L`}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                label="Max Drawdown"
                value={`${data.max_drawdown.toFixed(1)}%`}
                color={data.max_drawdown > -20 ? '#ffc107' : '#ff1744'}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                label="Sharpe Ratio"
                value={data.sharpe_ratio.toFixed(2)}
                color={data.sharpe_ratio >= 1 ? '#00e676' : '#ffc107'}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard label="Total Trades" value={data.total_trades} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                label="Profit Factor"
                value={data.profit_factor.toFixed(2)}
                color={data.profit_factor >= 1.5 ? '#00e676' : '#ffc107'}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                label="Avg Weekly Return"
                value={`${data.avg_weekly_return.toFixed(2)}%`}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                label="Avg Win"
                value={`${data.avg_win_pct.toFixed(2)}%`}
                color="#00e676"
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                label="Avg Loss"
                value={`${data.avg_loss_pct.toFixed(2)}%`}
                color="#ff1744"
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                label="Best / Worst"
                value={`${data.best_trade_pct.toFixed(1)}% / ${data.worst_trade_pct.toFixed(1)}%`}
              />
            </Grid>
          </Grid>

          {/* Equity curve */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} mb={2}>Equity Curve</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.equity_curve}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6c63ff" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <RechartsTip
                    formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Equity']}
                    contentStyle={{ background: '#0e1526', border: '1px solid #333' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#6c63ff"
                    fill="url(#eqGrad)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trade log */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} mb={2}>
                Trade Log (last {data.trades.length} trades)
              </Typography>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['Week', 'Symbol', 'Entry', 'Exit', 'Target', 'SL', 'Return%', 'Outcome', 'Days', 'Score'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...data.trades].reverse().map((t, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontSize: 11 }}>{t.week_start}</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>{t.symbol}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>₹{t.entry_price.toFixed(0)}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>₹{t.exit_price.toFixed(0)}</TableCell>
                        <TableCell sx={{ fontSize: 11, color: '#00e676' }}>₹{t.target.toFixed(0)}</TableCell>
                        <TableCell sx={{ fontSize: 11, color: '#ff1744' }}>₹{t.stop_loss.toFixed(0)}</TableCell>
                        <TableCell sx={{
                          fontSize: 11, fontWeight: 700,
                          color: t.return_pct >= 0 ? '#00e676' : '#ff1744',
                        }}>
                          {t.return_pct.toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={t.outcome}
                            size="small"
                            sx={{
                              fontSize: 9, fontWeight: 700,
                              bgcolor: t.outcome === 'WIN' ? '#00e67622' : '#ff174422',
                              color:   t.outcome === 'WIN' ? '#00e676'   : '#ff1744',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{t.holding_days}d</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{t.confidence_score.toFixed(0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default BacktestPage;
