import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Stack, Grid, Paper, Chip, Divider,
  LinearProgress, Alert, Button, Table, TableBody,
  TableCell, TableRow, CircularProgress,
} from '@mui/material';
import {
  ArrowBack, TrendingUp, TrendingDown, CalendarMonth,
  Business, StarRate, InfoOutlined, Refresh,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchIPODetail } from '../services/ipoApi';
import { IPORatingBadge } from '../components/ipo/IPORatingBadge';
import { SubscriptionChart } from '../components/ipo/SubscriptionChart';
import { GMPTrendChart } from '../components/ipo/GMPTrendChart';
import { BestTimeCard } from '../components/ipo/BestTimeCard';

const STATUS_COLOR: Record<string, string> = {
  Open: '#00c853', Upcoming: '#2196f3', Closed: '#ff9800', Listed: '#9e9e9e',
};

const SCORE_LABELS: Record<string, string> = {
  gmp_score: 'GMP Score',
  retail_score: 'Retail Subscription',
  hni_score: 'HNI Subscription',
  qib_score: 'QIB Subscription',
  financial_growth_score: 'Financial Growth',
  profitability_score: 'Profitability',
  roe_score: 'ROE',
  industry_trend_score: 'Industry Trend',
};

const SCORE_MAX: Record<string, number> = {
  gmp_score: 20, retail_score: 20, hni_score: 15, qib_score: 20,
  financial_growth_score: 10, profitability_score: 5, roe_score: 5, industry_trend_score: 5,
};

export default function IPODetail() {
  const { ipo_id } = useParams<{ ipo_id: string }>();
  const navigate = useNavigate();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const load = async () => {
    if (!ipo_id) return;
    setLoading(true); setError('');
    try {
      const res = await fetchIPODetail(ipo_id);
      setData(res);
    } catch (e) {
      setError('Failed to load IPO details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [ipo_id]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Stack alignItems="center" spacing={2}>
        <CircularProgress size={48} />
        <Typography color="text.secondary">Loading IPO details…</Typography>
      </Stack>
    </Box>
  );

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return null;

  const ipo     = data.ipo || {};
  const rating  = data.rating || {};
  const bd      = rating.breakdown || {};
  const sub     = ipo.subscription || {};
  const gmpPos  = (ipo.gmp_pct ?? 0) >= 0;
  const statusColor = STATUS_COLOR[ipo.status] || '#888';
  const priceRange = ipo.issue_price_min && ipo.issue_price_max && ipo.issue_price_min !== ipo.issue_price_max
    ? `₹${ipo.issue_price_min} – ₹${ipo.issue_price_max}` : `₹${ipo.issue_price || '—'}`;

  // Build subscription for chart
  const subForChart = {
    ipo_id: ipo.id,
    days: ipo.subscription_days || [],
    hourly: ipo.subscription_hourly || [],
    retail_times: sub.retail_times || 0,
    hni_times: sub.hni_times || 0,
    qib_times: sub.qib_times || 0,
    employee_times: sub.employee_times || 0,
    total_times: sub.total_times || 0,
  };

  return (
    <Box>
      {/* Back */}
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/ipo')} sx={{ mb: 2 }}>
        Back to IPO List
      </Button>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
        borderRadius: 3, p: { xs: 2.5, md: 4 }, mb: 3, position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -60, right: -60, width: 250, height: 250,
          borderRadius: '50%', bgcolor: '#6c63ff18', filter: 'blur(50px)' }} />
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
              <Chip label={ipo.status} size="small"
                sx={{ bgcolor: `${statusColor}25`, color: statusColor, fontWeight: 800 }} />
              <Chip label={ipo.issue_type} size="small" variant="outlined"
                sx={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.25)' }} />
              {ipo.sector && (
                <Chip label={ipo.sector} size="small" variant="outlined"
                  sx={{ color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.2)' }} />
              )}
            </Stack>
            <Typography variant="h4" fontWeight={900} color="white" mb={0.5}>{ipo.company_name}</Typography>
            {ipo.symbol && <Typography color="rgba(255,255,255,0.5)" variant="body2">NSE: {ipo.symbol}</Typography>}

            <Stack direction="row" spacing={3} mt={2} flexWrap="wrap" gap={1}>
              <Box>
                <Typography variant="caption" color="rgba(255,255,255,0.4)">Issue Price</Typography>
                <Typography variant="h6" fontWeight={800} color="white">{priceRange}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="rgba(255,255,255,0.4)">Lot Size</Typography>
                <Typography variant="h6" fontWeight={800} color="white">{ipo.lot_size ?? '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="rgba(255,255,255,0.4)">Min. Investment</Typography>
                <Typography variant="h6" fontWeight={800} color="white">
                  {ipo.min_investment ? `₹${ipo.min_investment.toLocaleString('en-IN')}` : '—'}
                </Typography>
              </Box>
              {ipo.listing_gain_pct != null && (
                <Box>
                  <Typography variant="caption" color="rgba(255,255,255,0.4)">Listing Gain</Typography>
                  <Typography variant="h6" fontWeight={800}
                    color={ipo.listing_gain_pct >= 0 ? '#00c853' : '#ff1744'}>
                    {ipo.listing_gain_pct >= 0 ? '+' : ''}{ipo.listing_gain_pct.toFixed(1)}%
                  </Typography>
                </Box>
              )}
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)' }}>
              <Stack alignItems="center" spacing={1}>
                <IPORatingBadge score={rating.score} label={rating.label} />
                <Typography variant="h3" fontWeight={900} color={
                  rating.score >= 90 ? '#00c853' : rating.score >= 80 ? '#64dd17' : rating.score >= 70 ? '#ffd600' : '#ff1744'
                }>{rating.score?.toFixed(0) ?? '—'}</Typography>
                <Typography color="rgba(255,255,255,0.5)" fontSize={12}>out of 100</Typography>
                {ipo.gmp != null && (
                  <Chip
                    icon={gmpPos ? <TrendingUp /> : <TrendingDown />}
                    label={`GMP: ₹${ipo.gmp} (${gmpPos ? '+' : ''}${ipo.gmp_pct?.toFixed(1)}%)`}
                    sx={{
                      bgcolor: gmpPos ? '#00c85322' : '#ff174422',
                      color:   gmpPos ? '#00c853'   : '#ff1744',
                      fontWeight: 800, mt: 1,
                    }}
                  />
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* ── Left Column ──────────────────────────────────────────────── */}
        <Grid item xs={12} md={8}>

          {/* IPO Rating Breakdown */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <StarRate sx={{ color: '#ffd600' }} />
              <Typography variant="h6" fontWeight={800}>IPO Rating Breakdown</Typography>
              <Chip label={`${rating.score?.toFixed(0) ?? 0}/100`} size="small"
                sx={{ ml: 'auto', fontWeight: 800, bgcolor: 'primary.main', color: 'white' }} />
            </Stack>
            <Stack spacing={1.5}>
              {Object.entries(SCORE_LABELS).map(([key, label]) => {
                const val  = bd[key] ?? 0;
                const max  = SCORE_MAX[key] ?? 10;
                const pct  = (val / max) * 100;
                const clr  = pct >= 75 ? '#00c853' : pct >= 50 ? '#ffd600' : '#ff9800';
                return (
                  <Box key={key}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" fontWeight={600}>{label}</Typography>
                      <Typography variant="caption" fontWeight={800} color={clr}>{val.toFixed(1)}/{max}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 8, borderRadius: 4, bgcolor: `${clr}22`,
                            '& .MuiLinearProgress-bar': { bgcolor: clr, borderRadius: 4 } }} />
                  </Box>
                );
              })}
            </Stack>
          </Paper>

          {/* Subscription Chart */}
          {subForChart.days.length > 0 && (
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={800}>📊 Live Subscription Tracker</Typography>
                <Chip label="Auto-refresh 5min" size="small" sx={{ ml: 'auto', fontSize: 10 }} />
              </Stack>
              {/* Summary chips */}
              <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" gap={1}>
                {[
                  { label: 'Retail', val: sub.retail_times, color: '#2196f3' },
                  { label: 'HNI',    val: sub.hni_times,    color: '#ff9800' },
                  { label: 'QIB',    val: sub.qib_times,    color: '#00c853' },
                  { label: 'Total',  val: sub.total_times,  color: '#9c27b0' },
                ].map(({ label, val, color }) => (
                  <Chip key={label} label={`${label}: ${val?.toFixed(2) ?? 0}x`} size="small"
                    sx={{ bgcolor: `${color}15`, color, fontWeight: 700 }} />
                ))}
              </Stack>
              <SubscriptionChart subscription={subForChart} />
            </Paper>
          )}

          {/* GMP Trend */}
          {data.gmp_history?.length > 0 && (
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
              <GMPTrendChart gmpHistory={data.gmp_history} issuePrice={ipo.issue_price} />
            </Paper>
          )}

          {/* Key Details Table */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={800} mb={2}>📋 IPO Details</Typography>
            <Table size="small">
              <TableBody>
                {[
                  ['Company Name',    ipo.company_name],
                  ['Symbol',         ipo.symbol || 'TBA'],
                  ['Issue Price',    priceRange],
                  ['Issue Size',     ipo.issue_size ? `₹${ipo.issue_size.toLocaleString('en-IN')} Cr` : '—'],
                  ['Lot Size',       ipo.lot_size],
                  ['Min. Investment', ipo.min_investment ? `₹${ipo.min_investment.toLocaleString('en-IN')}` : '—'],
                  ['Face Value',     ipo.face_value ? `₹${ipo.face_value}` : '—'],
                  ['Exchange',       ipo.exchange],
                  ['Open Date',      ipo.open_date],
                  ['Close Date',     ipo.close_date],
                  ['Allotment Date', ipo.allotment_date || 'TBA'],
                  ['Listing Date',   ipo.listing_date],
                  ['Listing Price',  ipo.listing_price ? `₹${ipo.listing_price}` : 'TBA'],
                  ['Registrar',      ipo.registrar],
                  ['Lead Managers',  (ipo.lead_managers || []).join(', ') || '—'],
                  ['Revenue Growth', ipo.revenue_growth_pct != null ? `${ipo.revenue_growth_pct}%` : '—'],
                  ['Profit Growth',  ipo.profit_growth_pct != null ? `${ipo.profit_growth_pct}%` : '—'],
                  ['ROE',            ipo.roe != null ? `${ipo.roe}%` : '—'],
                  ['P/E Ratio',      ipo.pe_ratio != null ? `${ipo.pe_ratio}x` : '—'],
                ].map(([key, val]) => (
                  <TableRow key={String(key)}>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, width: '40%', fontSize: 13 }}>{key}</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{val ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {/* ── Right Column ──────────────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <BestTimeCard
            bestTime={rating.best_time_to_apply || 'Apply Day 1'}
            applyProbability={rating.apply_probability || 'Medium'}
            allotmentPct={rating.allotment_probability_pct}
            recommendation={rating.recommendation || 'Wait'}
            reasons={rating.recommendation_reasons || []}
            avoidReasons={rating.avoid_reasons || []}
          />
          <Button variant="outlined" startIcon={<Refresh />} onClick={load} fullWidth sx={{ mt: 2 }}>
            Refresh Data
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
