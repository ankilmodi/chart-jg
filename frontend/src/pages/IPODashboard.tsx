import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Stack, Tabs, Tab, TextField, Grid,
  InputAdornment, Chip, MenuItem, Select, FormControl,
  InputLabel, Button, CircularProgress, Alert, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Tooltip, LinearProgress, IconButton, Badge,
} from '@mui/material';
import {
  Search, Refresh, TrendingUp, TrendingDown, FilterList,
  RocketLaunch, BarChart, ViewModule, ViewList,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { fetchIPOList, IPOMaster } from '../services/ipoApi';
import { IPOCard } from '../components/ipo/IPOCard';
import { IPORatingBadge } from '../components/ipo/IPORatingBadge';

const TABS = [
  { label: 'All',       value: '',          color: '#6c63ff' },
  { label: 'Open',      value: 'open',      color: '#00c853' },
  { label: 'Upcoming',  value: 'upcoming',  color: '#2196f3' },
  { label: 'Closed',    value: 'closed',    color: '#ff9800' },
  { label: 'Listed',    value: 'listed',    color: '#9e9e9e' },
  { label: 'Mainboard', value: 'mainboard', color: '#e91e63' },
  { label: 'SME',       value: 'sme',       color: '#00bcd4' },
];

const STATUS_COLOR: Record<string, string> = {
  Open: '#00c853', Upcoming: '#2196f3', Closed: '#ff9800', Listed: '#9e9e9e',
};

const REC_COLOR: Record<string, string> = {
  Apply: '#00c853', Wait: '#ff9800', Avoid: '#ff1744',
};

export default function IPODashboard() {
  const navigate = useNavigate();
  const [tabIdx, setTabIdx]   = useState(0);
  const [search, setSearch]   = useState('');
  const [ipos, setIpos]       = useState<IPOMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [issueType, setIssueType] = useState<string>('all');
  const [minGmp, setMinGmp]   = useState('');
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy]   = useState('rating');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);

  const activeTab = TABS[tabIdx];

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const isTypeBased = ['mainboard', 'sme'].includes(activeTab.value);
      const params: any = {
        page, limit: 50,
        search: search || undefined,
        min_gmp: minGmp ? Number(minGmp) : undefined,
        min_rating: minRating ? Number(minRating) : undefined,
      };

      if (issueType !== 'all') {
        params.type = issueType;
      } else if (isTypeBased) {
        params.type = activeTab.value;
      }

      if (activeTab.value && !isTypeBased) {
        params.status = activeTab.value;
      }

      const data = await fetchIPOList(params);
      let list: IPOMaster[] = data.ipos || [];

      // Sort
      list = [...list].sort((a, b) => {
        if (sortBy === 'rating')   return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'gmp')      return (b.gmp_pct || 0) - (a.gmp_pct || 0);
        if (sortBy === 'name')     return a.company_name.localeCompare(b.company_name);
        return 0;
      });

      setIpos(list);
      setTotal(data.total || list.length);
    } catch (e: any) {
      setError('Failed to load IPO data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tabIdx, search, minGmp, minRating, sortBy, page, activeTab, issueType]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const t = setInterval(load, 300000);
    return () => clearInterval(t);
  }, [load]);

  const openCount    = ipos.filter(i => i.status === 'Open').length;
  const upcomingCount = ipos.filter(i => i.status === 'Upcoming').length;

  return (
    <Box>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: 3, p: { xs: 2.5, md: 4 }, mb: 3, position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200,
          borderRadius: '50%', bgcolor: '#6c63ff22', filter: 'blur(40px)' }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
              <RocketLaunch sx={{ color: '#6c63ff', fontSize: 32 }} />
              <Typography variant="h4" fontWeight={900} color="white">IPO Apply Assistant</Typography>
            </Stack>
            <Typography color="rgba(255,255,255,0.6)" variant="body2">
              AI-powered IPO analysis • GMP Tracker • 100-point Rating • Best Time Advisor
            </Typography>
            <Stack direction="row" spacing={1} mt={2}>
              {openCount > 0 && (
                <Chip label={`🟢 ${openCount} Open`} size="small"
                  sx={{ bgcolor: '#00c85322', color: '#00c853', fontWeight: 700 }} />
              )}
              {upcomingCount > 0 && (
                <Chip label={`🔵 ${upcomingCount} Upcoming`} size="small"
                  sx={{ bgcolor: '#2196f322', color: '#2196f3', fontWeight: 700 }} />
              )}
              <Chip label="Auto-refresh 5min" size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
            </Stack>
          </Box>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}>
              {viewMode === 'card' ? <ViewList /> : <ViewModule />}
            </IconButton>
            <Button variant="outlined" startIcon={<Refresh />} onClick={load} size="small"
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
              Refresh
            </Button>
            <Button variant="contained" startIcon={<BarChart />}
              onClick={() => navigate('/ipo/history')} size="small"
              sx={{ background: 'linear-gradient(135deg, #6c63ff, #43cea2)', whiteSpace: 'nowrap' }}>
              History
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius: 2, mb: 2, border: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tabIdx} onChange={(_, v) => { setTabIdx(v); setPage(1); }}
          variant="scrollable" scrollButtons="auto"
          sx={{ '& .MuiTab-root': { fontWeight: 700, fontSize: 13, minHeight: 44 } }}>
          {TABS.map((t, i) => (
            <Tab key={t.label} label={t.label}
              sx={{ '&.Mui-selected': { color: t.color } }} />
          ))}
        </Tabs>
      </Paper>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" flexWrap="wrap">
          <TextField size="small" placeholder="🔍 Search IPO name, symbol, sector..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            sx={{ minWidth: 260 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>IPO Type</InputLabel>
            <Select value={issueType} label="IPO Type" onChange={e => { setIssueType(e.target.value); setPage(1); }}>
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="mainboard">Mainboard</MenuItem>
              <MenuItem value="sme">SME</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="Min GMP%" type="number" value={minGmp}
            onChange={e => setMinGmp(e.target.value)} sx={{ width: 110 }} />
          <TextField size="small" label="Min Rating" type="number" value={minRating}
            onChange={e => setMinRating(e.target.value)} sx={{ width: 110 }} />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select value={sortBy} label="Sort By" onChange={e => setSortBy(e.target.value)}>
              <MenuItem value="rating">Rating</MenuItem>
              <MenuItem value="gmp">GMP %</MenuItem>
              <MenuItem value="name">Name</MenuItem>
            </Select>
          </FormControl>
          {(search || minGmp || minRating || issueType !== 'all') && (
            <Button size="small" onClick={() => { setSearch(''); setMinGmp(''); setMinRating(''); setIssueType('all'); }}>
              Clear Filters
            </Button>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {total} IPOs found
          </Typography>
        </Stack>
      </Paper>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && ipos.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <RocketLaunch sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">No IPOs match your filters</Typography>
        </Box>
      )}

      {viewMode === 'card' ? (
        <Grid container spacing={2}>
          {ipos.map(ipo => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={ipo.id}>
              <IPOCard ipo={ipo} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Paper} elevation={0}
          sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {['Company', 'Type', 'Price', 'Size', 'GMP', 'GMP%', 'Subscription', 'Rating', 'Status', 'Action'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {ipos.map(ipo => {
                const gmpPositive = (ipo.gmp_pct ?? 0) >= 0;
                const statusColor = STATUS_COLOR[ipo.status] || '#888';
                const recColor    = REC_COLOR[(ipo as any).recommendation] || '#888';
                return (
                  <TableRow key={ipo.id} hover sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/ipo/${ipo.id}`)}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={700} noWrap maxWidth={180}>{ipo.company_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{ipo.sector}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={ipo.issue_type} size="small" variant="outlined"
                        sx={{ fontSize: 10, height: 20 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {ipo.issue_price_min && ipo.issue_price_max && ipo.issue_price_min !== ipo.issue_price_max
                          ? `₹${ipo.issue_price_min}-${ipo.issue_price_max}`
                          : ipo.issue_price ? `₹${ipo.issue_price}` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {ipo.issue_size ? `₹${ipo.issue_size.toLocaleString('en-IN')}Cr` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}
                        color={gmpPositive ? 'success.main' : 'error.main'}>
                        {ipo.gmp != null ? `₹${ipo.gmp}` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {ipo.gmp_pct != null ? (
                        <Chip
                          icon={gmpPositive ? <TrendingUp sx={{ fontSize: 14 }} /> : <TrendingDown sx={{ fontSize: 14 }} />}
                          label={`${gmpPositive ? '+' : ''}${ipo.gmp_pct.toFixed(1)}%`}
                          size="small"
                          sx={{
                            bgcolor: gmpPositive ? '#00c85318' : '#ff174418',
                            color: gmpPositive ? '#00c853' : '#ff1744',
                            fontWeight: 700, fontSize: 11,
                          }}
                        />
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="text.primary">
                        {(ipo as any).subscription?.total_times != null
                          ? `${(ipo as any).subscription.total_times.toFixed(1)}x`
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IPORatingBadge score={ipo.rating} label={ipo.rating_label} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={ipo.status} size="small"
                        sx={{ bgcolor: `${statusColor}18`, color: statusColor, fontWeight: 700, fontSize: 11 }} />
                    </TableCell>
                    <TableCell>
                      {(ipo as any).recommendation && (
                        <Chip label={(ipo as any).recommendation} size="small"
                          sx={{ bgcolor: `${recColor}18`, color: recColor, fontWeight: 800, fontSize: 11 }} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
