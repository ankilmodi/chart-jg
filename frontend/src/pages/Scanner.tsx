import React, { useState } from 'react';
import {
  Box, Typography, Stack, Chip, Button, Slider, Paper,
  Alert, LinearProgress, Grid, Card, CardContent, CircularProgress,
} from '@mui/material';
import { PlayArrow, Refresh } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchScanner } from '../services/api';
import { StockTable } from '../components/StockTable';

export default function ScannerPage() {
  const qc = useQueryClient();
  const [minScore, setMinScore] = useState(65);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['scanner', minScore],
    queryFn: () => fetchScanner(minScore, false),
    refetchInterval: 300_000,
  });

  const runForceScan = () => {
    qc.invalidateQueries({ queryKey: ['scanner'] });
    refetch();
  };

  const stocks = data?.results ?? data?.stocks ?? [];
  const scanned = data?.scanned ?? 0;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2} flexWrap="wrap">
        <Typography variant="h5" fontWeight={700}>🔍 Full Scanner</Typography>
        {data && <Chip label={`${stocks.length} qualified / ${scanned} scanned`} size="small" color="primary" />}
        {(isLoading || isFetching) && <CircularProgress size={16} />}
      </Stack>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }} elevation={1}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Typography variant="body2" mb={0.5}>
              Min Buy Score: <strong>{minScore}</strong>
            </Typography>
            <Slider value={minScore} min={0} max={100} step={5}
              onChange={(_, v) => setMinScore(v as number)}
              marks={[{value:0,label:'0'},{value:50,label:'50'},{value:75,label:'75'},{value:100,label:'100'}]} />
          </Grid>
          <Grid item xs="auto">
            <Button variant="contained" startIcon={<PlayArrow />}
              onClick={runForceScan} disabled={isLoading || isFetching}>
              {isLoading ? 'Scanning…' : 'Run Scan'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Score band summary */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: '🔥 Excellent (91–100)', min: 91, max: 100, color: '#1b5e20' },
          { label: '⭐ Strong Buy (76–90)',  min: 76, max: 90,  color: '#2e7d32' },
          { label: '✅ Good (61–75)',         min: 61, max: 75,  color: '#1976d2' },
          { label: '👀 Watch (41–60)',        min: 41, max: 60,  color: '#f57c00' },
        ].map(band => {
          const count = stocks.filter((s: any) => (s.buy_score ?? s.confidence_score ?? 0) >= band.min && (s.buy_score ?? s.confidence_score ?? 0) <= band.max).length;
          return (
            <Grid item xs={6} sm={3} key={band.label}>
              <Card elevation={2} sx={{ borderLeft: `4px solid ${band.color}` }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption">{band.label}</Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ color: band.color }}>{count}</Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{(error as Error).message}</Alert>}
      {isLoading && <LinearProgress sx={{ mb: 1 }} />}

      <StockTable data={stocks} loading={isLoading} />

      <Typography variant="caption" color="text.secondary" mt={1} display="block">
        {data?.timestamp ?? ''}
      </Typography>
    </Box>
  );
}
