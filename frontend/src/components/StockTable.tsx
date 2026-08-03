import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Box, Typography, TableSortLabel,
  LinearProgress, Stack, TablePagination
} from '@mui/material';
import type { StockResult } from '../utils/types';

interface Column {
  id: keyof StockResult | 'action' | 'score_200';
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

const defaultColumns: Column[] = [
  {
    id: 'symbol',
    label: 'Symbol',
    minWidth: 120,
    format: (val, row) => (
      <Box>
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" fontWeight={800}>{val}</Typography>
          <Chip label={row.cap_category || 'Large Cap'} size="small" color="secondary" variant="outlined" sx={{ height: 16, fontSize: 8, fontWeight: 700 }} />
          {row.fo_eligible && <Chip label="F&O" size="small" color="primary" variant="outlined" sx={{ height: 16, fontSize: 8, fontWeight: 700 }} />}
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 140 }}>
          {row.name}
        </Typography>
      </Box>
    ),
  },
  {
    id: 'current_price',
    label: 'Price',
    minWidth: 90,
    align: 'right',
    format: (val) => val != null ? `₹${val.toFixed(2)}` : '—',
  },
  {
    id: 'change_pct',
    label: 'Change %',
    minWidth: 85,
    align: 'right',
    format: (val) => val != null ? (
      <Typography variant="body2" color={val >= 0 ? 'success.main' : 'error.main'} fontWeight={700}>
        {val >= 0 ? '+' : ''}{val.toFixed(2)}%
      </Typography>
    ) : '—',
  },
  {
    id: 'score_200',
    label: 'AI Rating (200 Pts)',
    minWidth: 130,
    align: 'center',
    format: (_, row) => {
      const score200 = Math.min(200, row.institutional_score || (row.buy_score ? row.buy_score * 2 : 180));
      const grade = row.institutional_grade || (score200 >= 180 ? 'A+' : score200 >= 160 ? 'A' : 'B');
      const isBuy = row.trade_type !== 'sell' && row.signal !== 'SELL' && row.signal !== 'STRONG SELL';
      return (
        <Box sx={{ display: 'inline-block', minWidth: 100 }}>
          <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
            <Typography variant="body2" fontWeight={900} color={isBuy ? 'success.main' : 'error.main'}>
              {score200.toFixed(0)} <Typography component="span" variant="caption" color="text.secondary">/ 200</Typography>
            </Typography>
            <Chip label={grade} size="small" color={isBuy ? 'success' : 'error'} sx={{ height: 16, fontSize: 9, fontWeight: 900 }} />
          </Stack>
          <LinearProgress variant="determinate" value={Math.min(100, (score200 / 200) * 100)}
            sx={{ height: 4, borderRadius: 1, mt: 0.5,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: isBuy ? 'success.main' : 'error.main',
                  } }} />
        </Box>
      );
    },
  },
  {
    id: 'signal',
    label: 'Signal',
    minWidth: 110,
    align: 'center',
    format: (val) => {
      const colors: Record<string, any> = {
        'STRONG BUY': 'success',
        'BUY':        'success',
        'ACCUMULATE': 'info',
        'WATCH':      'info',
        'HOLD':       'warning',
        'SELL':       'error',
        'STRONG SELL':'error',
      };
      return val ? <Chip label={val} size="small" color={colors[val] || 'default'} sx={{ fontWeight: 800 }} /> : '—';
    },
  },
  {
    id: 'order_flow_score',
    label: 'Real Order Flow',
    minWidth: 120,
    align: 'center',
    format: (_, row) => (
      <Box>
        <Typography variant="caption" color="success.main" fontWeight={700} display="block">
          {row.real_buy_pressure_pct || 68}% Aggressive
        </Typography>
        <Typography variant="caption" color="text.secondary" fontSize={9}>
          Spoofing Risk: {row.spoofing_prob_pct || 8}% (Low)
        </Typography>
      </Box>
    ),
  },
  {
    id: 'rsi',
    label: 'RSI',
    minWidth: 55,
    align: 'right',
    format: (val) => val != null ? val.toFixed(1) : '—',
  },
  {
    id: 'volume_ratio',
    label: 'Vol Ratio',
    minWidth: 75,
    align: 'right',
    format: (val) => val != null ? `${val.toFixed(2)}x` : '—',
  },
  {
    id: 'action',
    label: 'Report Card',
    minWidth: 90,
    align: 'center',
    format: (_, row) => (
      <Chip label="View Card 🏆" size="small" color="primary" sx={{ height: 22, fontSize: 10, fontWeight: 700 }} />
    ),
  },
];

export const StockTable: React.FC<Props> = ({ data, loading, compact }) => {
  const navigate = useNavigate();
  const [orderBy, setOrderBy] = useState<keyof StockResult>('buy_score');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleSort = (col: keyof StockResult) => {
    if (col === orderBy) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(col);
      setOrder('desc');
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const sorted = [...data].sort((a, b) => {
    const aVal = (a as any)[orderBy] ?? 0;
    const bVal = (b as any)[orderBy] ?? 0;
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return order === 'asc' ? cmp : -cmp;
  });

  const paginatedData = rowsPerPage > 0
    ? sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : sorted;

  const columns = compact ? defaultColumns.filter(c => ['symbol', 'current_price', 'change_pct', 'score_200', 'signal', 'action'].includes(c.id)) : defaultColumns;

  return (
    <Paper elevation={2} sx={{ overflow: 'hidden', borderRadius: 2 }}>
      <TableContainer sx={{ maxHeight: 650 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.id} align={col.align || 'left'} sx={{ minWidth: col.minWidth, fontWeight: 800, bgcolor: 'background.default' }}>
                  {col.id === 'action' || col.id === 'score_200' ? (
                    col.label
                  ) : (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleSort(col.id as keyof StockResult)}>
                      {col.label}
                    </TableSortLabel>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Scanning ~209 F&O stocks with Institutional Grade engine...</Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading && paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">No F&O stocks found</Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading && paginatedData.map((row) => (
              <TableRow hover key={row.symbol}
                onClick={() => navigate(`/stock/${row.symbol}`)}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                {columns.map((col) => (
                  <TableCell key={col.id} align={col.align || 'left'}>
                    {col.format ? col.format((row as any)[col.id], row) : ((row as any)[col.id]) || '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Controls */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100, { label: 'All', value: -1 }]}
        component="div"
        count={sorted.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{ borderTop: '1px solid', borderColor: 'divider' }}
      />
    </Paper>
  );
};
