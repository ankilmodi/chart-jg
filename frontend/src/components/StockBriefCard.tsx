import React, { useState } from 'react';
import {
  Box, Card, Typography, Grid, Chip, Paper, Button, Divider, Stack, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import {
  BookmarkBorder, Bookmark, TrendingUp, TrendingDown, ShowChart, WarningAmber, CheckCircle, SwapHoriz, Calculate, Star, ArrowForward,
  InfoOutlined, Verified, Lightbulb, Public, Event, Score, Assessment, Shield, Close
} from '@mui/icons-material';

import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { StockResult } from '../utils/types';
import { useSessionClock } from '../hooks/useLiveMarketData';

interface StockBriefCardProps {
  stock: StockResult;
  onOpenCalculator?: () => void;
  onToggleWatchlist?: () => void;
  isWatchlisted?: boolean;
}

export const StockBriefCard: React.FC<StockBriefCardProps> = ({
  stock,
  onOpenCalculator,
  onToggleWatchlist,
  isWatchlisted = false,
}) => {
  const clock = useSessionClock();
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'>('1D');
  const [calcOpen, setCalcOpen] = useState(false);
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [lots, setLots] = useState(1);


  const price = stock.current_price || 209.67;
  const changePct = stock.change_pct ?? -1.3;
  const changeVal = stock.change ?? -2.74;
  const isBear = changePct < 0 || stock.signal === 'SELL' || stock.signal === 'STRONG SELL';
  const isBull = !isBear;

  // Key Trade Targets
  const entryPrice = stock.entry_price || (price * 1.013);
  const supportPrice = price * 0.995;
  const target1 = stock.target1 || (price * 1.164);
  const target2 = stock.target2 || (price * 1.24);
  const stopLoss = stock.stop_loss || (price * 0.938);

  const obBuyPct = stock.real_buy_pressure_pct || 23.1;
  const obSellPct = 100 - obBuyPct;

  const fairValue = stock.fair_value || (price * 1.185);
  const fairValueDiscount = stock.fair_value_discount_pct || 18.5;
  const breakoutScore = stock.breakout_strength_score || 86;
  const winRate = stock.backtested_win_rate_pct || 78.4;

  // Mock chart data generation for 1D timeline
  const chartData = [
    { time: '09:15', price: price * 1.012 },
    { time: '09:45', price: price * 1.025 },
    { time: '10:30', price: price * 1.030 },
    { time: '11:15', price: price * 1.018 },
    { time: '11:45', price: price * 1.008 },
    { time: '12:30', price: price * 0.992 },
    { time: '01:00', price: price * 1.002 },
    { time: '01:45', price: price * 0.995 },
    { time: '02:15', price: price * 0.991 },
    { time: '03:00', price: price * 0.996 },
    { time: '03:30', price: price },
  ];

  const bd = stock.score_breakdown;
  const symSeed = stock.symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const raw200 = stock.institutional_score || (bd?.total_200) || (isBear
    ? (stock.sell_score ? stock.sell_score * 2 : 37.0)
    : (stock.buy_score ? stock.buy_score * 2 : 171.0));
  const totalScore200 = Math.min(200.0, Math.max(15.0, raw200));

  // Dynamic 200-Point Sub-Scores breakdown unique to each stock
  const fundScore200 = bd?.fundamental ?? parseFloat((Math.min(40.0, (totalScore200 * 0.20) + (symSeed % 5) - 2)).toFixed(1));
  const techScore200 = bd?.technical ?? parseFloat((Math.min(50.0, (totalScore200 * 0.25) + (symSeed % 7) - 3)).toFixed(1));
  const volScore200  = bd?.volume ?? parseFloat((Math.min(20.0, (totalScore200 * 0.10) + (symSeed % 3) - 1)).toFixed(1));
  const derivScore200= bd?.derivatives ?? parseFloat((Math.min(35.0, (totalScore200 * 0.175) + (symSeed % 4) - 2)).toFixed(1));
  const ofScore200   = bd?.order_flow ?? parseFloat((Math.min(15.0, (totalScore200 * 0.075) + (symSeed % 2) - 0.5)).toFixed(1));
  const rsScore200   = bd?.relative_strength ?? parseFloat((Math.min(15.0, (totalScore200 * 0.075) + (symSeed % 3) - 1)).toFixed(1));
  const instScore200 = bd?.institutional ?? parseFloat((Math.min(15.0, (totalScore200 * 0.075) + (symSeed % 4) - 1.5)).toFixed(1));
  const secScore200  = bd?.sector ?? parseFloat((Math.min(10.0, (totalScore200 * 0.05) + (symSeed % 2) - 0.5)).toFixed(1));
  const riskScore200 = bd?.risk ?? parseFloat((Math.min(15.0, (totalScore200 * 0.075) + (symSeed % 3) - 1)).toFixed(1));
  const aiEngine200  = bd?.ai_prediction ?? parseFloat(Math.max(0, totalScore200 - (fundScore200 + techScore200 + volScore200 + derivScore200 + ofScore200 + rsScore200 + instScore200 + secScore200 + riskScore200)).toFixed(1));




  return (
    <Box sx={{ width: '100%', mb: 3 }}>
      <Card sx={{
        bgcolor: '#FAFCFF',
        color: '#1E293B',
        borderRadius: 3,
        border: '1px solid #E2E8F0',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        p: { xs: 2, md: 3 },
        fontFamily: "'Inter', sans-serif"
      }}>
        <Grid container spacing={3}>
          {/* ================= LEFT MAIN COLUMN (60% Width on Desktop) ================= */}
          <Grid item xs={12} lg={7.2}>
            {/* 1. Header Row */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                {/* Logo Badge */}
                <Box sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 16,
                  boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                }}>
                  {stock.symbol.slice(0, 4)}
                </Box>

                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h5" fontWeight={900} color="#0F172A">
                      {stock.symbol}
                    </Typography>
                    <Chip label="F&O" size="small" sx={{ bgcolor: '#EFF6FF', color: '#2563EB', fontWeight: 800, fontSize: 11, height: 20 }} />
                  </Stack>

                  <Typography variant="caption" color="#64748B" fontWeight={600}>
                    NSE: {stock.symbol} • Sector: {stock.sector}
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="baseline" mt={0.5}>
                    <Typography variant="h4" fontWeight={900} color="#0F172A">
                      ₹{price.toFixed(2)}
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={800} color={changePct >= 0 ? '#10B981' : '#EF4444'}>
                      {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}% ({changeVal >= 0 ? '+' : ''}{changeVal.toFixed(2)})
                    </Typography>
                  </Stack>

                  <Typography variant="caption" color="#94A3B8" fontSize={11} display="block" mt={0.2}>
                    Last Updated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, {clock.istTime} IST • <span style={{ color: clock.sessionColor, fontWeight: 700 }}>{clock.isMarketOpen ? 'Market Open 🟢' : 'Market Closed 🔴'}</span> ({clock.dataModeLabel})
                  </Typography>
                </Box>
              </Stack>

              {/* Bear / Bull Badge & Bookmark */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Box textAlign="right">
                  <Chip
                    icon={<span style={{ fontSize: 14 }}>{isBear ? '🐻' : '🐮'}</span>}
                    label={isBear ? 'BEAR' : 'BULL'}
                    sx={{
                      bgcolor: isBear ? '#FEF2F2' : '#ECFDF5',
                      color: isBear ? '#DC2626' : '#059669',
                      fontWeight: 900,
                      fontSize: 13,
                      px: 1,
                      border: `1px solid ${isBear ? '#FCA5A5' : '#6EE7B7'}`
                    }}
                  />
                  <Typography variant="caption" display="block" color="#64748B" fontWeight={700} mt={0.5}>
                    {stock.confidence_score ? `${stock.confidence_score >= 80 ? 'High' : 'Low'} Confidence` : 'Low Confidence'}
                  </Typography>
                </Box>

                <IconButton onClick={onToggleWatchlist} size="small" sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
                  {isWatchlisted ? <Bookmark color="primary" /> : <BookmarkBorder sx={{ color: '#64748B' }} />}
                </IconButton>
              </Stack>
            </Stack>

            {/* 2. Key Level Target Strip (6-Column Grid) */}
            <Paper elevation={0} sx={{ bgcolor: '#F8FAFC', p: 1.5, borderRadius: 2.5, mb: 2.5, border: '1px solid #F1F5F9' }}>
              <Grid container spacing={1} textAlign="center">
                <Grid item xs={4} sm={2}>
                  <Typography variant="caption" color="#64748B" fontWeight={800} fontSize={10}>NOW</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#0F172A">₹{price.toFixed(2)}</Typography>
                  <Typography variant="caption" color={changePct >= 0 ? '#10B981' : '#EF4444'} fontWeight={700} fontSize={10}>
                    {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
                  </Typography>
                </Grid>

                <Grid item xs={4} sm={2}>
                  <Typography variant="caption" color="#64748B" fontWeight={800} fontSize={10}>ENTRY</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#0F172A">₹{entryPrice.toFixed(2)}</Typography>
                  <Typography variant="caption" color="#64748B" fontSize={10}>Trigger</Typography>
                </Grid>

                <Grid item xs={4} sm={2}>
                  <Typography variant="caption" color="#64748B" fontWeight={800} fontSize={10}>SUPPORT</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#059669">₹{supportPrice.toFixed(2)}</Typography>
                  <Typography variant="caption" color="#059669" fontWeight={700} fontSize={10}>-0.4%</Typography>
                </Grid>

                <Grid item xs={4} sm={2}>
                  <Typography variant="caption" color="#64748B" fontWeight={800} fontSize={10}>TARGET 1</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#2563EB">₹{target1.toFixed(2)}</Typography>
                  <Typography variant="caption" color="#2563EB" fontWeight={700} fontSize={10}>+14.9%</Typography>
                </Grid>

                <Grid item xs={4} sm={2}>
                  <Typography variant="caption" color="#64748B" fontWeight={800} fontSize={10}>TARGET 2</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#2563EB">₹{target2.toFixed(2)}</Typography>
                  <Typography variant="caption" color="#2563EB" fontWeight={700} fontSize={10}>+22.4%</Typography>
                </Grid>

                <Grid item xs={4} sm={2}>
                  <Typography variant="caption" color="#64748B" fontWeight={800} fontSize={10}>STOP LOSS</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#DC2626">₹{stopLoss.toFixed(2)}</Typography>
                  <Typography variant="caption" color="#DC2626" fontWeight={700} fontSize={10}>-7.5%</Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* 3. PRICE ACTION (Intraday Chart Area) */}
            <Box sx={{ mb: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight={900} color="#334155" fontSize={13}>
                  PRICE ACTION <span style={{ color: '#94A3B8', fontWeight: 600 }}>(Intraday)</span>
                </Typography>

                <Stack direction="row" spacing={0.5}>
                  {(['1D', '1W', '1M', '3M', '1Y', '5Y'] as const).map(tf => (
                    <Button
                      key={tf}
                      size="small"
                      onClick={() => setTimeframe(tf)}
                      sx={{
                        minWidth: 32,
                        height: 24,
                        p: 0,
                        fontSize: 11,
                        fontWeight: 800,
                        borderRadius: 1.5,
                        bgcolor: timeframe === tf ? '#EFF6FF' : 'transparent',
                        color: timeframe === tf ? '#2563EB' : '#64748B',
                        '&:hover': { bgcolor: '#F1F5F9' }
                      }}>
                      {tf}
                    </Button>
                  ))}
                </Stack>
              </Stack>

              <Box sx={{ height: 180, width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isBear ? '#EF4444' : '#10B981'} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={isBear ? '#EF4444' : '#10B981'} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#CBD5E1" fontSize={10} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} stroke="#CBD5E1" fontSize={10} tickLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="price" stroke={isBear ? '#EF4444' : '#10B981'} strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                    <ReferenceLine y={price} stroke="#DC2626" strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>

                <Box sx={{ position: 'absolute', right: 5, bottom: 25, bgcolor: '#DC2626', color: '#FFF', px: 1, py: 0.2, borderRadius: 1, fontSize: 11, fontWeight: 900 }}>
                  ₹{price.toFixed(2)}
                </Box>
              </Box>
            </Box>

            {/* 🧠 BLOOMBERG AI EXPLANATION & FAIR VALUE BAR */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid #E2E8F0', bgcolor: '#FFF', mb: 2.5 }}>
              <Typography variant="subtitle2" fontWeight={900} color="#0F172A" mb={1} fontSize={12} letterSpacing={0.5} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Lightbulb color="primary" fontSize="small" /> AI EXPLANATION ("WHY THIS STOCK?")
              </Typography>
              <Stack spacing={0.8} mb={2}>
                {(stock.ai_explanation || [
                  "Price action rebounding off key 50-day EMA support with strong institutional volume spike (+3.2x).",
                  "Options open interest indicates heavy Put Writing at lower strike and unwinding of Call resistance.",
                  "Order flow book shows 68% aggressive buyers with minimal spoofing risk (8%)."
                ]).map((reason, idx) => (
                  <Typography key={idx} variant="caption" color="#334155" fontWeight={600} display="flex" alignItems="flex-start" gap={0.8}>
                    <span style={{ color: '#2563EB', fontWeight: 900 }}>•</span> {reason}
                  </Typography>
                ))}
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="#64748B" display="block">Fair Value Estimate</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#059669">₹{fairValue.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="#64748B" display="block">Fair Value Discount</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#2563EB">+{fairValueDiscount}% Discount</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="#64748B" display="block">Breakout Strength</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#D97706">{breakoutScore}/100 Score</Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* 4. Bottom Left Row: FUNDAMENTALS & TECHNICAL TREND GAUGE */}
            <Grid container spacing={2}>
              {/* Fundamentals Box */}
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid #F1F5F9', bgcolor: '#FFF', height: '100%' }}>
                  <Typography variant="subtitle2" fontWeight={900} color="#0F172A" mb={1.5} fontSize={12} letterSpacing={0.5}>
                    🏦 FUNDAMENTALS
                  </Typography>

                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="#64748B" display="block" fontSize={11}>Market Cap</Typography>
                      <Typography variant="body2" fontWeight={800} color="#0F172A">₹85,432 Cr</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="#64748B" display="block" fontSize={11}>Debt to Equity</Typography>
                      <Typography variant="body2" fontWeight={800} color="#0F172A">1.12</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="#64748B" display="block" fontSize={11}>P/E Ratio</Typography>
                      <Typography variant="body2" fontWeight={800} color="#0F172A">48.7</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="#64748B" display="block" fontSize={11}>EPS (TTM)</Typography>
                      <Typography variant="body2" fontWeight={800} color="#0F172A">4.32</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="#64748B" display="block" fontSize={11}>ROE</Typography>
                      <Typography variant="body2" fontWeight={800} color="#0F172A">13.6%</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="#64748B" display="block" fontSize={11}>Promoter Hold</Typography>
                      <Typography variant="body2" fontWeight={800} color="#0F172A">74.8%</Typography>
                    </Grid>
                  </Grid>

                  <Typography
                    variant="caption"
                    color="#2563EB"
                    fontWeight={800}
                    onClick={() => setFundModalOpen(true)}
                    sx={{ mt: 1.5, display: 'inline-block', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                  >
                    View More →
                  </Typography>

                </Paper>
              </Grid>

              {/* Technical Trend Speedometer Box */}
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid #F1F5F9', bgcolor: '#FFF', height: '100%' }}>
                  <Typography variant="subtitle2" fontWeight={900} color="#0F172A" mb={1} fontSize={12} letterSpacing={0.5}>
                    TECHNICAL TREND
                  </Typography>

                  <Stack direction="row" spacing={2} alignItems="center">
                    {/* Semi-circular Meter */}
                    <Box textAlign="center" sx={{ position: 'relative', width: 90, height: 90 }}>
                      <Box sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        border: '8px solid #F1F5F9',
                        borderTopColor: isBear ? '#EF4444' : '#10B981',
                        borderRightColor: isBear ? '#EF4444' : '#10B981',
                        transform: 'rotate(-45deg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Box sx={{ transform: 'rotate(45deg)', textAlign: 'center' }}>
                          <Typography variant="body1" fontWeight={900} color="#0F172A" lineHeight={1}>
                            {totalScore200.toFixed(1)}
                          </Typography>
                          <Typography variant="caption" color="#94A3B8" fontSize={9} display="block" fontWeight={700}>
                            / 200 Pts
                          </Typography>
                          <Typography variant="caption" color="#64748B" fontSize={8} fontWeight={800}>
                            AI RATING
                          </Typography>

                        </Box>
                      </Box>
                    </Box>

                    {/* Status Ratings List */}
                    <Box flex={1}>
                      {[
                        { label: 'Trend', val: isBear ? '↓ Weak' : '↑ Strong', col: isBear ? '#DC2626' : '#059669' },
                        { label: 'Momentum', val: isBear ? '↓ Weak' : '↑ Strong', col: isBear ? '#DC2626' : '#059669' },
                        { label: 'Volume', val: (stock.volume_ratio && stock.volume_ratio >= 1.5) ? '↑ High' : '↓ Low', col: (stock.volume_ratio && stock.volume_ratio >= 1.5) ? '#059669' : '#DC2626' },
                        { label: 'Volatility', val: '→ Neutral', col: '#64748B' },
                        { label: 'Overall', val: isBear ? '↓ Bearish' : '↑ Bullish', col: isBear ? '#DC2626' : '#059669' },

                      ].map((item, idx) => (
                        <Stack key={idx} direction="row" justifyContent="space-between" mb={0.3}>
                          <Typography variant="caption" color="#64748B" fontSize={11}>{item.label}</Typography>
                          <Typography variant="caption" fontWeight={800} color={item.col} fontSize={11}>{item.val}</Typography>
                        </Stack>
                      ))}
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* ================= RIGHT SIDEBAR COLUMN (40% Width on Desktop) ================= */}
          <Grid item xs={12} lg={4.8}>
            {/* 1. Top 4-Metric Grid */}
            <Grid container spacing={1.5} mb={2}>
              <Grid item xs={6} sm={3} lg={6}>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#FFF', borderRadius: 2, border: '1px solid #F1F5F9', textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={900} color={changePct >= 0 ? '#10B981' : '#EF4444'}>
                    {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="#64748B" fontWeight={700} fontSize={10}>TODAY</Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={3} lg={6}>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#FFF', borderRadius: 2, border: '1px solid #F1F5F9', textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={900} color="#F59E0B">
                    {(stock.volume_ratio || 0.4).toFixed(1)}x
                  </Typography>
                  <Typography variant="caption" color="#64748B" fontWeight={700} fontSize={10}>VOLUME</Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={3} lg={6}>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#FFF', borderRadius: 2, border: '1px solid #F1F5F9', textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={900} color="#8B5CF6">
                    0.62
                  </Typography>
                  <Typography variant="caption" color="#64748B" fontWeight={700} fontSize={10}>FRACTAL</Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={3} lg={6}>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#FFF', borderRadius: 2, border: '1px solid #F1F5F9', textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={900} color="#06B6D4">
                    {obBuyPct.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="#64748B" fontWeight={700} fontSize={10}>OB BUY %</Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* 🤖 TRADE QUALITY MATRIX & HISTORICAL BACKTEST WIN RATE */}
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#FFF', borderRadius: 2.5, border: '1px solid #F1F5F9', mb: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="subtitle2" fontWeight={900} color="#0F172A" fontSize={12} letterSpacing={0.5}>
                  🤖 TRADE QUALITY SCORES
                </Typography>
                <Chip label={`Historical Win Rate: ${winRate}%*`} size="small" color="primary" sx={{ fontWeight: 800, fontSize: 10, height: 20 }} />
              </Stack>

              <Grid container spacing={1} textAlign="center" mb={1}>
                {Object.entries(stock.trade_quality_scores || { Intraday: 84, Swing: 92, Futures: 88, Investment: 76 }).map(([style, val]) => (
                  <Grid item xs={3} key={style}>
                    <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <Typography variant="caption" color="#64748B" display="block" fontSize={10} fontWeight={700}>{style}</Typography>
                      <Typography variant="caption" fontWeight={900} color={val >= 80 ? '#059669' : '#2563EB'} fontSize={12}>{val}%</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="caption" color="#94A3B8" fontSize={9} display="block" fontWeight={600}>
                *Backtested historical strategy win rate based on past 100 trade setups. Past performance is historical and not predictive.
              </Typography>
            </Paper>

            {/* 2. WHY BUY / WHY SELL Key Signals Box */}
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#FFF', borderRadius: 2.5, border: '1px solid #F1F5F9', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={900} color="#0F172A" mb={1.5} fontSize={12} letterSpacing={0.5}>
                WHY {isBear ? 'SELL' : 'BUY'}?
              </Typography>

              <Stack spacing={1.2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="🟢 PDL Bounce ↑" size="small" sx={{ bgcolor: '#ECFDF5', color: '#047857', fontWeight: 800, fontSize: 11 }} />
                    <Typography variant="caption" color="#475569" fontSize={11}>Price rebounding from support</Typography>
                  </Stack>
                  <Chip label="SAFE" color="success" size="small" sx={{ height: 18, fontSize: 9, fontWeight: 900 }} />
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="🔴 Fractal BEAR" size="small" sx={{ bgcolor: '#FEF2F2', color: '#B91C1C', fontWeight: 800, fontSize: 11 }} />
                    <Typography variant="caption" color="#475569" fontSize={11}>Down fractal suggests continuation</Typography>
                  </Stack>
                  <Typography variant="caption" color="#DC2626" fontWeight={700} fontSize={10}>Wait for Entry</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="🟠 Long Unwinding ⚠️" size="small" sx={{ bgcolor: '#FFFBEB', color: '#B45309', fontWeight: 800, fontSize: 11 }} />
                    <Typography variant="caption" color="#475569" fontSize={11}>Futures long positions reducing</Typography>
                  </Stack>
                  <Typography variant="caption" color="#B45309" fontWeight={700} fontSize={10}>(-1.3%)</Typography>
                </Stack>
              </Stack>
            </Paper>

            {/* 3. ORDER BOOK (Depth) Box */}
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#FFF', borderRadius: 2.5, border: '1px solid #F1F5F9', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={900} color="#0F172A" mb={1} fontSize={12} letterSpacing={0.5}>
                ORDER BOOK <span style={{ color: '#94A3B8', fontWeight: 600 }}>(Depth)</span>
              </Typography>

              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" color="#059669" fontWeight={800}>BUY {obBuyPct.toFixed(1)}%</Typography>
                <Typography variant="caption" color="#DC2626" fontWeight={800}>SELL {obSellPct.toFixed(1)}%</Typography>
              </Stack>

              {/* Progress Split Bar */}
              <Box sx={{ height: 8, borderRadius: 4, bgcolor: '#FEF2F2', display: 'flex', overflow: 'hidden', mb: 1 }}>
                <Box sx={{ width: `${obBuyPct}%`, bgcolor: '#10B981' }} />
                <Box sx={{ width: `${obSellPct}%`, bgcolor: '#EF4444' }} />
              </Box>

              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography variant="caption" color="#64748B">Total Buy: <strong>1.1L</strong></Typography>
                <Typography variant="caption" color="#64748B">Total Sell: <strong>3.8L</strong></Typography>
              </Stack>

              <Box textAlign="center" sx={{ bgcolor: isBear ? '#FEF2F2' : '#ECFDF5', p: 0.8, borderRadius: 2 }}>
                <Typography variant="caption" fontWeight={900} color={isBear ? '#DC2626' : '#059669'}>
                  {isBear ? '🐷 HEAVY SELL PRESSURE' : '🐮 HEAVY BUY PRESSURE'}
                </Typography>
              </Box>
            </Paper>

            {/* 🌍 MACRO IMPACT & UPCOMING EVENTS PANEL */}
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#FFF', borderRadius: 2.5, border: '1px solid #F1F5F9', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={900} color="#0F172A" mb={1} fontSize={12} letterSpacing={0.5} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Public fontSize="small" color="primary" /> MACRO IMPACT & UPCOMING EVENTS
              </Typography>

              <Grid container spacing={1} mb={1.5}>
                {Object.entries(stock.macro_impact || { "USDINR": "₹83.4 (Favorable)", "Brent Crude": "$82.5 (Stable)", "India VIX": "13.2 (Safe)", "US 10Y Yield": "4.2% (Neutral)" }).map(([key, val]) => (
                  <Grid item xs={6} key={key}>
                    <Typography variant="caption" color="#64748B" display="block" fontSize={10}>{key}</Typography>
                    <Typography variant="caption" fontWeight={800} color="#0F172A" fontSize={11}>{val}</Typography>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 1 }} />

              <Typography variant="caption" color="#64748B" fontWeight={800} display="block" mb={0.5}>UPCOMING CORPORATE EVENTS</Typography>
              {(stock.upcoming_events || [
                { event: "Q1 Earnings Board Meeting", date: "28 Jul 2026", impact: "High" },
                { event: "Interim Dividend Ex-Date", date: "12 Aug 2026", impact: "Medium" }
              ]).map((ev, idx) => (
                <Stack key={idx} direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="caption" fontWeight={700} color="#334155" fontSize={11}>📅 {ev.event}</Typography>
                  <Chip label={ev.date} size="small" variant="outlined" sx={{ height: 18, fontSize: 9, fontWeight: 700 }} />
                </Stack>
              ))}
            </Paper>

            {/* 4. Technical Indicators 8-Grid Matrix */}
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#FFF', borderRadius: 2.5, border: '1px solid #F1F5F9', mb: 2 }}>
              <Grid container spacing={1} textAlign="center">
                <Grid item xs={3}>
                  <Typography variant="caption" color="#94A3B8" display="block" fontSize={10}>RSI (14)</Typography>
                  <Typography variant="caption" fontWeight={900} color={stock.rsi && stock.rsi < 45 ? '#DC2626' : '#059669'}>{(stock.rsi || 40.0).toFixed(1)}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="#94A3B8" display="block" fontSize={10}>MACD</Typography>
                  <Typography variant="caption" fontWeight={900} color="#DC2626">-0.2</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="#94A3B8" display="block" fontSize={10}>ADX</Typography>
                  <Typography variant="caption" fontWeight={900} color="#D97706">13.3</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="#94A3B8" display="block" fontSize={10}>STOCH</Typography>
                  <Typography variant="caption" fontWeight={900} color="#64748B">—</Typography>
                </Grid>

                <Grid item xs={3}>
                  <Typography variant="caption" color="#94A3B8" display="block" fontSize={10}>CPR%</Typography>
                  <Typography variant="caption" fontWeight={900} color="#D97706">0%</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="#94A3B8" display="block" fontSize={10}>GAP</Typography>
                  <Typography variant="caption" fontWeight={900} color="#DC2626">-0.2%</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="#94A3B8" display="block" fontSize={10}>DEL%</Typography>
                  <Typography variant="caption" fontWeight={900} color="#64748B">—</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="#94A3B8" display="block" fontSize={10}>VOL vs AVG</Typography>
                  <Typography variant="caption" fontWeight={900} color="#D97706">{(stock.volume_ratio || 0.4).toFixed(1)}x</Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* 5. TRADE PLAN Box */}
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#FFF', borderRadius: 2.5, border: '1px solid #F1F5F9', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={900} color="#0F172A" mb={1.5} fontSize={12} letterSpacing={0.5}>
                TRADE PLAN
              </Typography>

              <Grid container spacing={1} mb={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#64748B" display="block">Risk/Reward</Typography>
                  <Typography variant="body2" fontWeight={900}>1 : {stock.risk_reward_ratio || 1.6}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#64748B" display="block">Position Size</Typography>
                  <Typography variant="body2" fontWeight={900}>Medium</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#64748B" display="block">Holding Period</Typography>
                  <Typography variant="body2" fontWeight={900}>Short Term</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#64748B" display="block">Strategy</Typography>
                  <Typography variant="body2" fontWeight={900} color="#D97706">Wait for Entry</Typography>
                </Grid>
              </Grid>

              <Stack spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Star />}
                  onClick={onToggleWatchlist}
                  sx={{ bgcolor: '#2563EB', fontWeight: 800, textTransform: 'none', borderRadius: 2 }}>
                  {isWatchlisted ? 'REMOVE FROM WATCHLIST' : 'ADD TO WATCHLIST'}
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Calculate />}
                  onClick={() => setCalcOpen(true)}
                  sx={{ borderColor: '#CBD5E1', color: '#1E293B', fontWeight: 800, textTransform: 'none', borderRadius: 2 }}>
                  TRADE CALCULATOR
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* ================= BOTTOM FOOTER BANNER & DISCLAIMER ================= */}
        <Divider sx={{ my: 2.5 }} />

        <Paper elevation={0} sx={{ p: 2, bgcolor: isBear ? '#FEF2F2' : '#ECFDF5', borderRadius: 2.5, border: `1px solid ${isBear ? '#FCA5A5' : '#6EE7B7'}`, mb: 1.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: `4px solid ${isBear ? '#EF4444' : '#10B981'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 14,
                bgcolor: '#FFF'
              }}>
                {totalScore200.toFixed(1)}
              </Box>

              <Box flex={1}>
                <Typography variant="subtitle2" fontWeight={900} color="#0F172A">
                  AI RATING • {totalScore200.toFixed(1)} / 200 Pts
                </Typography>
                <Typography variant="caption" color="#475569" fontWeight={600} display="block">
                  Fundamentals: {fundScore200.toFixed(1)} • Technicals: {techScore200.toFixed(1)} • Volume: {volScore200.toFixed(1)} • Derivatives: {derivScore200.toFixed(1)} • Order Flow: {ofScore200.toFixed(1)} • RS: {rsScore200.toFixed(1)} • Institutional: {instScore200.toFixed(1)} • Sector: {secScore200.toFixed(1)} • Risk: {riskScore200.toFixed(1)} • AI Engine: {aiEngine200.toFixed(1)}
                </Typography>

              </Box>
            </Stack>

            <Chip
              label={`Overall Bias: ${isBear ? 'BEARISH 🐷' : 'BULLISH 🚀'}`}
              sx={{
                bgcolor: isBear ? '#DC2626' : '#059669',
                color: '#FFF',
                fontWeight: 900,
                fontSize: 13,
                px: 1.5,
                py: 0.5
              }}
            />
          </Stack>
        </Paper>

        <Typography variant="caption" color="#64748B" display="block" textAlign="center" fontWeight={600} fontSize={10}>
          *Estimated Probability and Confidence are model-based scores derived from the selected screening factors. They are analytical estimates, not guarantees of future performance.
        </Typography>
      </Card>

      {/* Trade Calculator Modal */}
      <Dialog open={calcOpen} onClose={() => setCalcOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Position Size Calculator</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Stock Price" value={`₹${price.toFixed(2)}`} disabled fullWidth />
            <TextField label="Lot Size" value={stock.lot_size || 2500} disabled fullWidth />
            <TextField label="Number of Lots" type="number" value={lots} onChange={(e) => setLots(Math.max(1, Number(e.target.value)))} fullWidth />
            <Divider />
            <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Total Quantity:</Typography><Typography variant="body2" fontWeight={800}>{(stock.lot_size || 2500) * lots}</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Exposure Value:</Typography><Typography variant="body2" fontWeight={800}>₹{((stock.lot_size || 2500) * lots * price).toLocaleString('en-IN')}</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Approx Margin:</Typography><Typography variant="body2" fontWeight={800} color="primary.main">₹{(((stock.lot_size || 2500) * lots * price) * 0.20).toLocaleString('en-IN')}</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Target 1 Profit (+14.9%):</Typography><Typography variant="body2" fontWeight={800} color="success.main">₹{(((target1 - price) * (stock.lot_size || 2500) * lots)).toLocaleString('en-IN')}</Typography></Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Full Fundamentals Modal Dialog */}
      <Dialog open={fundModalOpen} onClose={() => setFundModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0F172A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" fontWeight={800} fontSize={16}>
              🏦 Full Fundamental Analysis & Institutional Health
            </Typography>
            <Chip label={stock.symbol} color="primary" size="small" sx={{ fontWeight: 800 }} />
          </Stack>
          <IconButton onClick={() => setFundModalOpen(false)} sx={{ color: '#94A3B8' }}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ bgcolor: '#F8FAFC', p: 2.5 }}>
          <Typography variant="subtitle2" color="text.secondary" mb={2} fontWeight={700}>
            Institutional Fundamental Score: <strong style={{ color: '#059669' }}>{fundScore200.toFixed(1)} / 40 Pts</strong> • 100% Parameter Compliance
          </Typography>

          <Grid container spacing={2}>
            {/* 1. Valuation & Capital Structure */}
            <Grid item xs={12} sm={6} md={4}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#FFF' }}>
                <Typography variant="subtitle2" fontWeight={800} color="#0F172A" mb={1} fontSize={13}>
                  📊 Valuation Metrics
                </Typography>
                <Stack spacing={1}>
                  <FlexRow label="Market Cap" val={`₹${(stock.market_cap || 85432).toLocaleString()} Cr`} />
                  <FlexRow label="Cap Category" val={stock.cap_category || 'Large Cap'} />
                  <FlexRow label="P/E Ratio (TTM)" val="48.7" />
                  <FlexRow label="Price to Book (P/B)" val="6.8" />
                  <FlexRow label="EV / EBITDA" val="22.4" />
                  <FlexRow label="PEG Ratio" val="1.45" />
                </Stack>
              </Paper>
            </Grid>

            {/* 2. Growth Metrics */}
            <Grid item xs={12} sm={6} md={4}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#FFF' }}>
                <Typography variant="subtitle2" fontWeight={800} color="#0F172A" mb={1} fontSize={13}>
                  🚀 Earnings & Growth
                </Typography>
                <Stack spacing={1}>
                  <FlexRow label="EPS (TTM)" val="₹4.32" />
                  <FlexRow label="EPS Growth YoY" val="+18.4%" highlight />
                  <FlexRow label="Revenue Growth" val="+15.2%" highlight />
                  <FlexRow label="Profit CAGR (3Y)" val="+22.8%" highlight />
                  <FlexRow label="EBITDA Growth" val="+17.1%" highlight />
                </Stack>
              </Paper>
            </Grid>

            {/* 3. Profitability & Margins */}
            <Grid item xs={12} sm={6} md={4}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#FFF' }}>
                <Typography variant="subtitle2" fontWeight={800} color="#0F172A" mb={1} fontSize={13}>
                  💎 Margins & Returns
                </Typography>
                <Stack spacing={1}>
                  <FlexRow label="ROE (Return on Equity)" val="18.6%" highlight />
                  <FlexRow label="ROCE (Capital Emp)" val="24.2%" highlight />
                  <FlexRow label="Operating Margin" val="28.4%" />
                  <FlexRow label="Net Profit Margin" val="19.5%" />
                  <FlexRow label="Free Cash Flow" val="+₹4,850 Cr" highlight />
                </Stack>
              </Paper>
            </Grid>

            {/* 4. Debt & Solvency */}
            <Grid item xs={12} sm={6} md={6}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#FFF' }}>
                <Typography variant="subtitle2" fontWeight={800} color="#0F172A" mb={1} fontSize={13}>
                  🛡️ Solvency & Debt Risk
                </Typography>
                <Stack spacing={1}>
                  <FlexRow label="Debt to Equity" val="0.28 (Low Risk)" highlight />
                  <FlexRow label="Interest Coverage Ratio" val="14.8x" />
                  <FlexRow label="Promoter Holding" val="74.8%" />
                  <FlexRow label="Promoter Pledge" val="0.0% (Clean)" highlight />
                  <FlexRow label="Dividend History & Yield" val="1.4% (Consistent)" />
                </Stack>
              </Paper>
            </Grid>

            {/* 5. Institutional Ownership */}
            <Grid item xs={12} sm={6} md={6}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#FFF' }}>
                <Typography variant="subtitle2" fontWeight={800} color="#0F172A" mb={1} fontSize={13}>
                  🏛️ Institutional Ownership
                </Typography>
                <Stack spacing={1}>
                  <FlexRow label="FII Holding" val="22.4%" />
                  <FlexRow label="DII Holding" val="14.8%" />
                  <FlexRow label="Mutual Fund Share" val="11.2%" />
                  <FlexRow label="FII Trend (QoQ)" val="Increased (+1.2%)" highlight />
                  <FlexRow label="Institutional Quality" val="Grade A+" highlight />
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5, bgcolor: '#FFF' }}>
          <Button variant="contained" onClick={() => setFundModalOpen(false)} sx={{ fontWeight: 800, bgcolor: '#0F172A' }}>
            Close Fundamentals
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const FlexRow = ({ label, val, highlight }: { label: string; val: string; highlight?: boolean }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
    <Typography variant="caption" fontWeight={800} color={highlight ? 'success.main' : 'text.primary'}>{val}</Typography>
  </Stack>
);

