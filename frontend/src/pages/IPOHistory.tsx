import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Stack, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, LinearProgress,
  Grid, Card, CardContent, Button, TextField, InputAdornment
} from '@mui/material';
import { ArrowBack, TrendingUp, TrendingDown, Search, BarChart, Analytics } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { fetchIPOHistory, IPOListingHistory } from '../services/ipoApi';

export default function IPOHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<IPOListingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [stats, setStats]     = useState({ avg: 0, best: 0, worst: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchIPOHistory();
        setHistory(data.history || []);
        setStats({
          avg: data.avg_listing_gain || 0,
          best: data.best_gain || 0,
          worst: data.worst_gain || 0,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = history.filter(h =>
    h.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (h.sector && h.sector.toLowerCase().includes(search.toLowerCase()))
  );

  const chartData = filtered.slice(0, 15).map(h => ({
    name: h.company_name.length > 12 ? h.company_name.substring(0, 12) + '...' : h.company_name,
    gain: h.listing_gain_pct,
  }));

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/ipo')} sx={{ mb: 2 }}>
        Back to IPO Assistant
      </Button>

      {/* Header Banner */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        borderRadius: 3, p: { xs: 2.5, md: 3.5 }, mb: 3, color: 'white'
      }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
              <Analytics sx={{ color: '#43cea2', fontSize: 32 }} />
              <Typography variant="h4" fontWeight={900}>Historical IPO Performance</Typography>
            </Stack>
            <Typography color="rgba(255,255,255,0.7)" variant="body2">
              Track past listing gains, losses, and maximum price movements across 500+ Indian IPOs.
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={2} mt={2}>
          <Grid item xs={12} sm={4}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)' }}>
              <Typography variant="caption" color="rgba(255,255,255,0.6)">Average Listing Gain</Typography>
              <Typography variant="h5" fontWeight={800} color={stats.avg >= 0 ? '#00c853' : '#ff1744'}>
                {stats.avg >= 0 ? '+' : ''}{stats.avg.toFixed(1)}%
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)' }}>
              <Typography variant="caption" color="rgba(255,255,255,0.6)">Best Listing Gain</Typography>
              <Typography variant="h5" fontWeight={800} color="#00c853">
                +{stats.best.toFixed(1)}%
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)' }}>
              <Typography variant="caption" color="rgba(255,255,255,0.6)">Worst Listing Loss</Typography>
              <Typography variant="h5" fontWeight={800} color="#ff1744">
                {stats.worst.toFixed(1)}%
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Chart */}
      {chartData.length > 0 && (
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={800} mb={2}>Listing Gain Comparison (%)</Typography>
          <ResponsiveContainer width="100%" height={220}>
            <ReBarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(val: number) => [`${val >= 0 ? '+' : ''}${val}%`, 'Listing Gain']} />
              <ReferenceLine y={0} stroke="#888" />
              <Bar dataKey="gain" fill="#43cea2" radius={[4, 4, 0, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Filter */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <TextField size="small" placeholder="Search historical IPO..." value={search}
          onChange={e => setSearch(e.target.value)} fullWidth
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
      </Paper>

      {/* Table */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 800 }}>Company</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Issue Price</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Listing Price</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Listing Gain %</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Listing Date</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Max Gain %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(item => {
              const gainPos = item.listing_gain_pct >= 0;
              return (
                <TableRow key={item.ipo_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/ipo/${item.ipo_id}`)}>
                  <TableCell sx={{ fontWeight: 700 }}>{item.company_name}</TableCell>
                  <TableCell><Chip label={item.issue_type} size="small" variant="outlined" sx={{ fontSize: 10 }} /></TableCell>
                  <TableCell>₹{item.issue_price}</TableCell>
                  <TableCell>₹{item.listing_price}</TableCell>
                  <TableCell>
                    <Chip
                      icon={gainPos ? <TrendingUp sx={{ fontSize: 14 }} /> : <TrendingDown sx={{ fontSize: 14 }} />}
                      label={`${gainPos ? '+' : ''}${item.listing_gain_pct.toFixed(1)}%`}
                      size="small"
                      sx={{
                        bgcolor: gainPos ? '#00c85318' : '#ff174418',
                        color: gainPos ? '#00c853' : '#ff1744',
                        fontWeight: 800, fontSize: 11
                      }}
                    />
                  </TableCell>
                  <TableCell>{item.listing_date}</TableCell>
                  <TableCell sx={{ color: '#00c853', fontWeight: 700 }}>
                    {item.max_gain_pct ? `+${item.max_gain_pct}%` : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
