import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Chip, Grid, Paper, Divider,
  LinearProgress, Alert, Button, IconButton, Dialog, DialogTitle, DialogContent,
  TextField, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import {
  ArrowBack, Refresh, Calculate, Dashboard, Analytics
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { fetchStockDetail } from '../services/api';
import { StockBriefCard } from '../components/StockBriefCard';
import { StockReportCard } from '../components/StockReportCard';
import type { StockResult } from '../utils/types';

export default function StockDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate   = useNavigate();
  const [calcOpen, setCalcOpen] = useState(false);
  const [lots, setLots] = useState(1);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [viewMode, setViewMode] = useState<'brief' | 'full'>('brief');

  const { data: stock, isLoading, error, refetch } = useQuery<StockResult>({
    queryKey: ['stock', symbol, tradeType],
    queryFn: () => fetchStockDetail(symbol!, tradeType),
    enabled: !!symbol,
  });

  if (isLoading) return <Box sx={{ p: 4 }}><LinearProgress /><Typography mt={2} align="center" fontWeight={700}>Generating AI Stock Overview...</Typography></Box>;
  if (error)     return <Box sx={{ p: 4 }}><Alert severity="error">{(error as Error).message}</Alert></Box>;
  if (!stock)    return null;

  const price = stock.current_price || 0;
  const entry = stock.entry_price || price;
  const t1 = stock.target1 || (price * 1.04);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 2.5 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
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
        
        <Button startIcon={<Calculate />} variant="contained" size="small" color="primary" onClick={() => setCalcOpen(true)} sx={{ fontWeight: 700 }}>
          Trade Calc
        </Button>
        <IconButton size="small" onClick={() => refetch()}><Refresh fontSize="small" /></IconButton>
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
