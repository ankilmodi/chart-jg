import React, { useState } from 'react';
import {
  Box, Typography, Stack, Chip, Paper, Button, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, LinearProgress, Tooltip,
} from '@mui/material';
import { Add, Delete, Refresh } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWatchlist, addToWatchlist, removeWatchlist } from '../services/api';
import { useAppDispatch } from '../store/hooks';
import { addItem, removeItem } from '../store';
import type { WatchlistItem } from '../utils/types';

export default function WatchlistPage() {
  const qc      = useQueryClient();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ symbol: '', name: '', sector: '', notes: '', target: '', stop_loss: '' });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['watchlist'],
    queryFn: fetchWatchlist,
  });

  const addMutation = useMutation({
    mutationFn: (item: WatchlistItem) => addToWatchlist(item),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); setOpen(false); },
  });

  const removeMutation = useMutation({
    mutationFn: (symbol: string) => removeWatchlist(symbol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  const handleAdd = () => {
    const item: WatchlistItem = {
      symbol:    form.symbol.toUpperCase(),
      name:      form.name,
      sector:    form.sector,
      added_at:  new Date().toISOString(),
      notes:     form.notes || undefined,
      target:    form.target ? Number(form.target) : undefined,
      stop_loss: form.stop_loss ? Number(form.stop_loss) : undefined,
    };
    addMutation.mutate(item);
    dispatch(addItem(item));
  };

  const items: any[] = data?.items ?? [];

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>📋 Watchlist</Typography>
        <Chip label={`${items.length} stocks`} size="small" />
        <Box flex={1} />
        <IconButton size="small" onClick={() => refetch()}><Refresh /></IconButton>
        <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setOpen(true)}>
          Add Stock
        </Button>
      </Stack>

      {error && <Alert severity="error">{(error as Error).message}</Alert>}
      {isLoading && <LinearProgress />}

      <Paper elevation={2}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Symbol','Name','Sector','Price','Change%','Buy Score','Signal','Target','Stop Loss','Notes','Action'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No stocks in watchlist. Click "Add Stock" to begin.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {items.map((item: any) => (
                <TableRow hover key={item.symbol}>
                  <TableCell><Typography fontWeight={700}>{item.symbol}</Typography></TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.sector}</TableCell>
                  <TableCell>{item.current_price ? `₹${item.current_price?.toFixed(2)}` : '—'}</TableCell>
                  <TableCell sx={{ color: (item.change_pct || 0) >= 0 ? 'success.main' : 'error.main' }}>
                    {item.change_pct != null ? `${item.change_pct >= 0 ? '+' : ''}${item.change_pct?.toFixed(2)}%` : '—'}
                  </TableCell>
                  <TableCell>
                    {item.buy_score != null ? (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2" fontWeight={700}>{item.buy_score?.toFixed(0)}</Typography>
                        <LinearProgress variant="determinate" value={item.buy_score}
                          sx={{ width: 40, height: 4, borderRadius: 1 }} />
                      </Stack>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {item.signal ? (
                      <Chip label={item.signal} size="small"
                        color={item.signal?.includes('BUY') ? 'success' : item.signal?.includes('SELL') ? 'error' : 'warning'} />
                    ) : '—'}
                  </TableCell>
                  <TableCell>{item.target ? `₹${item.target}` : '—'}</TableCell>
                  <TableCell>{item.stop_loss ? `₹${item.stop_loss}` : '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 120 }}>
                    <Typography variant="caption" noWrap>{item.notes || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Remove">
                      <IconButton size="small" color="error"
                        onClick={() => { removeMutation.mutate(item.symbol); dispatch(removeItem(item.symbol)); }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add to Watchlist</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Symbol *" size="small" value={form.symbol}
              onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} />
            <TextField label="Name" size="small" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <TextField label="Sector" size="small" value={form.sector}
              onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} />
            <Stack direction="row" spacing={1}>
              <TextField label="Target Price (₹)" size="small" type="number" value={form.target}
                onChange={e => setForm(f => ({ ...f, target: e.target.value }))} />
              <TextField label="Stop Loss (₹)" size="small" type="number" value={form.stop_loss}
                onChange={e => setForm(f => ({ ...f, stop_loss: e.target.value }))} />
            </Stack>
            <TextField label="Notes" size="small" multiline rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!form.symbol || addMutation.isPending}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
