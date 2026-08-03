import React, { useState } from 'react';
import {
  Box, Typography, Stack, Chip, Paper, Button, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Grid, Card, CardContent, LinearProgress,
} from '@mui/material';
import { Add, AccountBalance } from '@mui/icons-material';

interface Position {
  id: string;
  symbol: string;
  name: string;
  qty: number;
  avg_price: number;
  current_price?: number;
  pnl?: number;
  pnl_pct?: number;
  buy_score?: number;
}

const STORAGE_KEY = 'nifty_portfolio';

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ symbol: '', name: '', qty: '', avg_price: '' });

  const savePositions = (p: Position[]) => {
    setPositions(p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  };

  const addPosition = () => {
    const pos: Position = {
      id: Date.now().toString(),
      symbol: form.symbol.toUpperCase(),
      name: form.name,
      qty: Number(form.qty),
      avg_price: Number(form.avg_price),
    };
    savePositions([...positions, pos]);
    setForm({ symbol: '', name: '', qty: '', avg_price: '' });
    setShowForm(false);
  };

  const removePosition = (id: string) => savePositions(positions.filter(p => p.id !== id));

  const totalInvested = positions.reduce((s, p) => s + p.qty * p.avg_price, 0);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <AccountBalance color="primary" />
        <Typography variant="h5" fontWeight={700}>Portfolio</Typography>
        <Chip label={`${positions.length} positions`} size="small" />
        <Box flex={1} />
        <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setShowForm(!showForm)}>
          Add Position
        </Button>
      </Stack>

      {/* Summary */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <Card elevation={2}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary">Positions</Typography>
              <Typography variant="h5" fontWeight={700}>{positions.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card elevation={2}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary">Invested</Typography>
              <Typography variant="h6" fontWeight={700}>
                ₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add form */}
      {showForm && (
        <Paper sx={{ p: 2, mb: 2 }} elevation={2}>
          <Typography variant="subtitle2" mb={1.5}>Add New Position</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {[
              { label: 'Symbol', key: 'symbol', type: 'text' },
              { label: 'Name', key: 'name', type: 'text' },
              { label: 'Quantity', key: 'qty', type: 'number' },
              { label: 'Avg Price (₹)', key: 'avg_price', type: 'number' },
            ].map(f => (
              <Box key={f.key} component="input" placeholder={f.label}
                type={f.type}
                value={(form as any)[f.key]}
                onChange={(e: any) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={{
                  padding: '8px 12px', borderRadius: 4,
                  border: '1px solid #666', background: 'transparent',
                  color: 'inherit', width: 140, fontSize: 14,
                }}
              />
            ))}
            <Button variant="contained" size="small" onClick={addPosition}
              disabled={!form.symbol || !form.qty || !form.avg_price}>
              Add
            </Button>
            <Button size="small" onClick={() => setShowForm(false)}>Cancel</Button>
          </Stack>
        </Paper>
      )}

      {positions.length === 0 ? (
        <Alert severity="info">
          No positions yet. Click "Add Position" to track your trades.
        </Alert>
      ) : (
        <Paper elevation={2}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Symbol','Name','Qty','Avg Price','Invested','Remove'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {positions.map(pos => (
                  <TableRow hover key={pos.id}>
                    <TableCell><Typography fontWeight={700}>{pos.symbol}</Typography></TableCell>
                    <TableCell>{pos.name}</TableCell>
                    <TableCell>{pos.qty.toLocaleString()}</TableCell>
                    <TableCell>₹{pos.avg_price.toFixed(2)}</TableCell>
                    <TableCell>₹{(pos.qty * pos.avg_price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell>
                      <Button size="small" color="error" onClick={() => removePosition(pos.id)}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
