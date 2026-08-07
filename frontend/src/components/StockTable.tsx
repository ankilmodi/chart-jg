import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Box, Typography, TableSortLabel, LinearProgress,
  Stack, TablePagination, useTheme
} from '@mui/material';
import type { StockResult } from '../utils/types';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: StockResult) => React.ReactNode;
}

interface Props {
  data: StockResult[];
  loading?: boolean;
  compact?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const getSMCSignal = (stock: StockResult): string => {
  if (stock.smart_money_flow) return stock.smart_money_flow;
  const volRatio = stock.volume_ratio || 1;
  const isUp = (stock.change_pct || 0) > 0;
  const isDown = (stock.change_pct || 0) < 0;
  if (volRatio > 1.5 && isUp) return 'Institutional Buy Flow';
  if (volRatio > 1.5 && isDown) return 'Institutional Selling';
  if (stock.breakout_type === 'bullish') return 'Bullish Breakout';
  if (stock.breakout_type === 'bearish') return 'Bearish Breakdown';
  if (volRatio > 1.2 && isUp) return 'Smart Money Accumulation';
  if (volRatio > 1.2 && isDown) return 'Smart Money Distribution';
  if (stock.support && stock.current_price <= stock.support * 1.01) return 'Order Block Support';
  if (stock.resistance && stock.current_price >= stock.resistance * 0.99) return 'Order Block Resistance';
  return 'Retail Consolidation';
};

export const getActionVerdict = (signal: string | undefined): { label: string, color: string } => {
  const s = (signal || '').toUpperCase();
  if (s.includes('STRONG BUY')) return { label: 'BUY / ACCUMULATE', color: 'success' };
  if (s === 'BUY') return { label: 'BUY', color: 'primary' };
  if (s === 'HOLD') return { label: 'HOLD', color: 'warning' };
  if (s === 'WATCH') return { label: 'WAIT', color: 'info' };
  if (s === 'SELL') return { label: 'SELL', color: 'error' };
  if (s.includes('STRONG SELL')) return { label: 'SELL / BOOK PROFIT', color: 'error' };
  return { label: 'AVOID', color: 'default' };
};

const calculateStopLoss = (stock: StockResult): number => {
  if (stock.stop_loss) return stock.stop_loss;
  const price = stock.current_price || 0;
  const isBuy = stock.signal?.includes('BUY') || stock.trade_type !== 'sell';
  if (isBuy) {
    if (stock.support && stock.support < price) return stock.support;
    if (stock.ema20 && stock.ema20 < price) return stock.ema20;
    return price - (stock.atr || price * 0.02) * 1.5;
  } else {
    if (stock.resistance && stock.resistance > price) return stock.resistance;
    if (stock.ema20 && stock.ema20 > price) return stock.ema20;
    return price + (stock.atr || price * 0.02) * 1.5;
  }
};

const calculateTargets = (stock: StockResult) => {
  const price = stock.current_price || 0;
  const sl = calculateStopLoss(stock);
  const risk = Math.abs(price - sl) || (price * 0.02);
  const isBuy = stock.signal?.includes('BUY') || stock.trade_type !== 'sell';
  if (isBuy) {
    return {
      t1: stock.target1 || price + risk,
      t2: stock.target2 || price + risk * 2,
      t3: stock.target3 || price + risk * 3,
    };
  }
  return {
    t1: stock.target1 || price - risk,
    t2: stock.target2 || price - risk * 2,
    t3: stock.target3 || price - risk * 3,
  };
};

// ─── Columns ──────────────────────────────────────────────────────────────────
const columns: Column[] = [
  {
    id: 'symbol',
    label: 'Stock Ticker',
    minWidth: 140,
    format: (val, row) => (
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
          {val}
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.2 }} noWrap>
          {row.name}
        </Typography>
      </Box>
    ),
  },
  {
    id: 'current_price',
    label: 'Current Price (₹)',
    minWidth: 100,
    align: 'right',
    format: (_, row) => {
      const up = (row.change_pct || 0) >= 0;
      return (
        <Stack alignItems="flex-end">
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: up ? 'success.main' : 'error.main', fontVariantNumeric: 'tabular-nums' }}>
            ₹{row.current_price?.toFixed(2) ?? '—'}
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: up ? 'success.main' : 'error.main', fontVariantNumeric: 'tabular-nums' }}>
            {up ? '+' : ''}{row.change_pct?.toFixed(2) ?? '0.00'}%
          </Typography>
        </Stack>
      );
    }
  },
  {
    id: 'rsi',
    label: 'RSI Indicators',
    minWidth: 100,
    align: 'center',
    format: (val) => {
      if (val == null) return '—';
      let color = 'success.main';
      if (val >= 70) color = 'error.main';
      else if (val >= 60) color = 'warning.main';
      else if (val >= 40) color = 'info.main';
      else if (val >= 30) color = '#8bc34a';
      return (
        <Typography sx={{ fontSize: 13, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
          {val.toFixed(2)}
        </Typography>
      );
    }
  },
  {
    id: 'smc_signal',
    label: 'Smart Money (SMC) Signal',
    minWidth: 170,
    align: 'left',
    format: (_, row) => (
      <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
        {getSMCSignal(row)}
      </Typography>
    )
  },
  {
    id: 'action',
    label: 'Action Verdict',
    minWidth: 140,
    align: 'center',
    format: (_, row) => {
      const verdict = getActionVerdict(row.signal);
      return <Chip label={verdict.label} size="small" color={verdict.color as any} sx={{ fontWeight: 800, fontSize: '0.62rem', height: 22, letterSpacing: 0.3 }} />;
    }
  },
  {
    id: 'stop_loss',
    label: 'Stop Loss',
    minWidth: 90,
    align: 'right',
    format: (_, row) => (
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
        ₹{calculateStopLoss(row).toFixed(2)}
      </Typography>
    )
  },
  {
    id: 'target1',
    label: 'Target 1 (1M)',
    minWidth: 90,
    align: 'right',
    format: (_, row) => (
      <Typography sx={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
        ₹{calculateTargets(row).t1.toFixed(2)}
      </Typography>
    )
  },
  {
    id: 'target2',
    label: 'Target 2 (1M)',
    minWidth: 90,
    align: 'right',
    format: (_, row) => (
      <Typography sx={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
        ₹{calculateTargets(row).t2.toFixed(2)}
      </Typography>
    )
  },
  {
    id: 'target3',
    label: 'Target 3 (1M)',
    minWidth: 90,
    align: 'right',
    format: (_, row) => (
      <Typography sx={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
        ₹{calculateTargets(row).t3.toFixed(2)}
      </Typography>
    )
  }
];

export const StockTable: React.FC<Props> = ({ data, loading, compact }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const [orderBy, setOrderBy] = useState<string>('action');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleSort = (colId: string) => {
    setOrder(colId === orderBy && order === 'desc' ? 'asc' : 'desc');
    setOrderBy(colId);
  };

  const getSortValue = (row: StockResult, colId: string) => {
    if (colId === 'smc_signal') return getSMCSignal(row);
    if (colId === 'action') return getActionVerdict(row.signal).label;
    if (colId === 'stop_loss') return calculateStopLoss(row);
    if (colId === 'target1') return calculateTargets(row).t1;
    if (colId === 'target2') return calculateTargets(row).t2;
    if (colId === 'target3') return calculateTargets(row).t3;
    return (row as any)[colId] ?? 0;
  };

  const sorted = [...data].sort((a, b) => {
    const av = getSortValue(a, orderBy);
    const bv = getSortValue(b, orderBy);
    return order === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
  });

  const paginated = rowsPerPage > 0
    ? sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : sorted;

  return (
    <Paper
      elevation={0}
      sx={{
        overflow: 'hidden', borderRadius: 3,
        border: '1px solid', borderColor: 'divider',
        background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
      }}
    >
      <TableContainer sx={{ maxHeight: 620, overflowX: 'auto' }}>
        <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              {columns.map(col => (
                <TableCell
                  key={col.id}
                  align={col.align || 'left'}
                  sx={{
                    minWidth: col.minWidth,
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    letterSpacing: 0.5,
                    bgcolor: isDark ? '#0b1120' : '#f4f7ff',
                    borderBottom: '2px solid',
                    borderColor: isDark ? 'rgba(0,176,255,0.2)' : 'rgba(21,101,192,0.15)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <TableSortLabel
                    active={orderBy === col.id}
                    direction={orderBy === col.id ? order : 'asc'}
                    onClick={() => handleSort(col.id)}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={columns.length} sx={{ p: 0, border: 'none' }}>
                  <LinearProgress />
                </TableCell>
              </TableRow>
            )}
            {!loading && paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No stocks match your filters</Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading && paginated.map((row, idx) => {
              const isBuy = row.trade_type !== 'sell' && row.signal !== 'SELL' && row.signal !== 'STRONG SELL';
              return (
                <TableRow
                  hover
                  key={row.symbol}
                  onClick={() => navigate(`/stock/${row.symbol}`)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    bgcolor: idx % 2 === 0
                      ? 'transparent'
                      : (isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)'),
                    borderLeft: '3px solid',
                    borderLeftColor: isBuy ? 'success.main' : 'error.main',
                    '&:hover': { bgcolor: isDark ? 'rgba(0,176,255,0.05) !important' : 'rgba(21,101,192,0.04) !important' },
                  }}
                >
                  {columns.map(col => (
                    <TableCell key={col.id} align={col.align || 'left'} sx={{ py: 1.5 }}>
                      {col.format ? col.format((row as any)[col.id], row) : ((row as any)[col.id] ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={sorted.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
        sx={{ borderTop: '1px solid', borderColor: 'divider' }}
      />
    </Paper>
  );
};
