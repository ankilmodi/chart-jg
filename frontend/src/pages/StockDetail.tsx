import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Chip, Grid, Paper, Divider,
  LinearProgress, Alert, Button, IconButton, Dialog, DialogTitle, DialogContent,
  TextField, ToggleButtonGroup, ToggleButton, Skeleton, CircularProgress
} from '@mui/material';
import {
  ArrowBack, Refresh, Calculate, Dashboard, Analytics, WarningAmber
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { fetchStockDetail } from '../services/api';
import { StockBriefCard } from '../components/StockBriefCard';
import { StockReportCard } from '../components/StockReportCard';
import { useSessionClock } from '../hooks/useLiveMarketData';
import type { StockResult } from '../utils/types';

export default function StockDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate   = useNavigate();
  const [calcOpen, setCalcOpen] = useState(false);
  const [lots, setLots] = useState(1);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [viewMode, setViewMode] = useState<'brief' | 'full'>('brief');

  // Session clock for IST market hours & auto-polling rate
  const { refreshMs, isMarketOpen, sessionLabel, dataModeLabel } = useSessionClock();

  // 5-second polling during market open; 5-min polling after close
  const pollInterval = isMarketOpen ? 5_000 : 300_000;

  const { data: stock, isLoading, error, refetch, isFetching } = useQuery<StockResult>({
    queryKey:        ['stock-detail', symbol, tradeType],
    queryFn:         () => fetchStockDetail(symbol!, tradeType),
    enabled:         Boolean(symbol),
    refetchInterval: pollInterval,
    staleTime:       0,       // Always treat as stale to re-render fresh API data instantly
    gcTime:          0,       // No memory caching across navigations
    retry:           3,
    placeholderData: (prev) => prev,  // Keep previous data visible while fetching fresh
  });

  // Dev logging for auditability
  const prevPriceRef = useRef<number | null>(null);
  useEffect(() => {
    if (import.meta.env.DEV && stock) {
      console.log(`[StockDetail] Render Timestamp: ${new Date().toISOString()}`);
      console.log(`[StockDetail] API Scanned At: ${stock.scanned_at || 'N/A'}`);
      console.log(`[StockDetail] Price: Prev=${prevPriceRef.current}, New=${stock.current_price}`);
      prevPriceRef.current = stock.current_price ?? null;
    }
  }, [stock]);

  // Check if API data is delayed (> 60s old during open market)
  const isDelayed = React.useMemo(() => {
    if (!isMarketOpen || !stock?.scanned_at) return false;
    try {
      const scannedTime = new Date(stock.scanned_at).getTime();
      const ageSec = (Date.now() - scannedTime) / 1000;
      return ageSec > 60;
    } catch {
      return false;
    }
  }, [isMarketOpen, stock?.scanned_at]);

  // Initial loading skeleton
  if (isLoading && !stock) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={40} width={200} />
          <Skeleton variant="rectangular" height={220} borderRadius={3} />
          <Skeleton variant="rectangular" height={400} borderRadius={3} />
        </Stack>
      </Box>
    );
  }

  // Error view with manual retry button
  if (error && !stock) {
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error).message || 'Failed to fetch live stock data'}
        </Alert>
        <Button variant="contained" startIcon={<Refresh />} onClick={() => refetch()}>
          Retry Live Fetch
        </Button>
      </Box>
    );
  }

  if (!stock) return null;

  const price = stock.current_price || 0;
  const entry = stock.entry_price || price;
  const t1    = stock.target1 || (price * 1.04);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 2.5 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Delayed Data Warning Banner */}
      {isDelayed && (
        <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2, fontWeight: 700 }}>
          ⚠️ Live data delayed (API timestamp is older than 60s) — Retrying live stream...
        </Alert>
      )}

      {/* Navigation & View Mode Toggle Bar */}
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2.5} flexWrap="wrap">
        <Button startIcon={<ArrowBack />} variant="outlined" size="small" onClick={() => navigate(-1)} sx={{ fontWeight: 700 }}>
          Back
        </Button>
        
        {/* Trade Direction Switcher */}
        <ToggleButtonGroup
          value={tradeType}
          exclusive
          onChange={(_, val) => val && setTradeType(val)}
          size="small"
        >
          <ToggleButton value="buy" sx={{ fontWeight: 800, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.main', color: 'common.white' } }}>
            🟢 BEST BUY (LONG)
          </ToggleButton>
          <ToggleButton value="sell" sx={{ fontWeight: 800, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.main', color: 'common.white' } }}>
            🔴 BEST SELL (SHORT)
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Card View Switcher */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, val) => val && setViewMode(val)}
          size="small"
        >
          <ToggleButton value="brief" sx={{ fontWeight: 800 }}>
            📊 BRIEF CARD (IMAGE STYLE)
          </ToggleButton>
          <ToggleButton value="full" sx={{ fontWeight: 800 }}>
            🏆 FULL BLOOMBERG REPORT
          </ToggleButton>
        </ToggleButtonGroup>

        <Box flex={1} />
        
        {/* Live indicator */}
        {isFetching && <CircularProgress size={16} sx={{ mr: 1 }} />}

        <Button startIcon={<Calculate />} variant="contained" size="small" color="primary" onClick={() => setCalcOpen(true)} sx={{ fontWeight: 700 }}>
          Trade Calc
        </Button>
        <IconButton size="small" onClick={() => refetch()} title="Refresh live stock quote">
          <Refresh fontSize="small" />
        </IconButton>
      </Stack>

      {/* RENDER SELECTED CARD VIEW */}
      {viewMode === 'brief' ? (
        <StockBriefCard stock={stock} onOpenCalculator={() => setCalcOpen(true)} />
      ) : (
        <StockReportCard stock={stock} />
      )}

      {/* Trade Calculator Modal */}
      <Dialog open={calcOpen} onClose={() => setCalcOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>F&O Position Size Calculator</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Stock Price" value={`₹${price.toFixed(2)}`} disabled fullWidth />
            <TextField label="Lot Size" value={stock.lot_size || 2500} disabled fullWidth />
            <TextField label="Number of Lots" type="number" value={lots} onChange={(e) => setLots(Math.max(1, Number(e.target.value)))} fullWidth />
            <Divider />
            <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Total Shares:</Typography><Typography variant="body2" fontWeight={800}>{(stock.lot_size || 2500) * lots}</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Total Exposure Value:</Typography><Typography variant="body2" fontWeight={800}>₹{((stock.lot_size || 2500) * lots * price).toLocaleString('en-IN')}</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Approx Margin Required:</Typography><Typography variant="body2" fontWeight={800} color="primary.main">₹{(((stock.lot_size || 2500) * lots * price) * 0.20).toLocaleString('en-IN')}</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Target 1 Profit (+7.6%):</Typography><Typography variant="body2" fontWeight={800} color="success.main">₹{(((t1 - entry) * (stock.lot_size || 2500) * lots)).toLocaleString('en-IN')}</Typography></Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
