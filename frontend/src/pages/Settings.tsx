import React from 'react';
import {
  Box, Typography, Stack, Switch, FormControlLabel, Slider,
  Paper, Grid, Button, Divider, Chip, Alert,
} from '@mui/material';
import { Settings, Refresh, Delete } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme, setRefreshInterval } from '../store';
import { clearCache } from '../services/api';

export default function SettingsPage() {
  const dispatch      = useAppDispatch();
  const themeMode     = useAppSelector(s => s.ui.themeMode);
  const refreshInt    = useAppSelector(s => s.ui.refreshInterval);
  const [cleared, setCleared] = React.useState(false);

  const handleClearCache = async () => {
    try { await clearCache(); setCleared(true); setTimeout(() => setCleared(false), 3000); }
    catch {}
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={3}>
        <Settings color="primary" />
        <Typography variant="h5" fontWeight={700}>Settings</Typography>
      </Stack>

      <Grid container spacing={3} maxWidth={600}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }} elevation={2}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Appearance</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={themeMode === 'dark'}
                  onChange={() => dispatch(setTheme(themeMode === 'dark' ? 'light' : 'dark'))}
                />
              }
              label={`${themeMode === 'dark' ? 'Dark' : 'Light'} Mode`}
            />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }} elevation={2}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Data Refresh</Typography>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Refresh interval: <strong>{refreshInt}s</strong>
            </Typography>
            <Slider
              value={refreshInt}
              min={60} max={600} step={60}
              marks={[
                { value: 60, label: '1m' },
                { value: 180, label: '3m' },
                { value: 300, label: '5m' },
                { value: 600, label: '10m' },
              ]}
              onChange={(_, v) => dispatch(setRefreshInterval(v as number))}
            />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }} elevation={2}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Cache</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Clear cached market data to force fresh fetch from Yahoo Finance.
            </Typography>
            {cleared && <Alert severity="success" sx={{ mb: 1 }}>Cache cleared!</Alert>}
            <Button variant="outlined" color="warning" startIcon={<Refresh />} onClick={handleClearCache}>
              Clear Cache
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }} elevation={2}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>Data Sources</Typography>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label="Yahoo Finance" color="success" size="small" />
                <Typography variant="body2">Primary – all NSE F&O stocks</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label="NSE" color="info" size="small" />
                <Typography variant="body2">OI, Delivery data (when available)</Typography>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }} elevation={2}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>About</Typography>
            <Typography variant="body2" color="text.secondary">
              Nifty F&O AI Analyzer v2.0 — Professional stock screening platform
              for NSE Futures & Options stocks. Uses 100-point transparent AI
              scoring engine with EMA, RSI, MACD, ADX, Supertrend, VWAP and OI analysis.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
