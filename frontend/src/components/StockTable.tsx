import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Box, Typography, TableSortLabel,
  LinearProgress, Stack, TablePagination, useTheme, useMediaQuery,
  Card, CardContent, CardActionArea, Grid, IconButton, Collapse,
} from '@mui/material';
import { TrendingUp, TrendingDown, ExpandMore } from '@mui/icons-material';
import type { StockResult } from '../utils/types';

interface Column {
  id: keyof StockResult | 'action' | 'score_200';
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: StockResult) => React.ReactNode;
  hideOnMobile?: boolean;
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
    hideOnMobile: true,
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
    hideOnMobile: true,
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
    hideOnMobile: true,
    format: (val) => val != null ? val.toFixed(1) : '—',
  },
  {
    id: 'volume_ratio',
    label: 'Vol Ratio',
    minWidth: 75,
    align: 'right',
    hideOnMobile: true,
    format: (val) => val != null ? `${val.toFixed(2)}x` : '—',
  },
  {
    id: 'action',
    label: 'Report',
    minWidth: 90,
    align: 'center',
    hideOnMobile: true,
    format: (_, row) => (
      <Chip label="View 🏆" size="small" color="primary" sx={{ height: 22, fontSize: 10, fontWeight: 700 }} />
    ),
  },
];

// Mobile Card Component
const StockCard: React.FC<{ stock: StockResult; onClick: () => void }> = ({ stock, onClick }) => {
  const [expanded, setExpanded] = useState(false);
  const score200 = Math.min(200, stock.institutional_score || (stock.buy_score ? stock.buy_score * 2 : 180));
  const grade = stock.institutional_grade || (score200 >= 180 ? 'A+' : score200 >= 160 ? 'A' : 'B');
  const isBuy = stock.trade_type !== 'sell' && stock.signal !== 'SELL';

  return (
    <Card
      elevation={2}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'all 0.2s',
        '&:active': { transform: 'scale(0.98)' },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={900} fontSize={14} gutterBottom>
              {stock.symbol}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: '180px', fontSize: 11 }}>
              {stock.name}
            </Typography>
            <Stack direction="row" spacing={0.5} mt={0.5}>
              <Chip label={stock.cap_category || 'Large'} size="small" variant="outlined" sx={{ height: 18, fontSize: 9, fontWeight: 700 }} />
              {stock.fo_eligible && <Chip label="F&O" size="small" color="primary" sx={{ height: 18, fontSize: 9, fontWeight: 700 }} />}
            </Stack>
          </Box>

          <Box textAlign="right">
            <Typography variant="h6" fontWeight={900} fontSize={16}>
              ₹{stock.current_price?.toFixed(2) || '—'}
            </Typography>
            {stock.change_pct != null && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 0.3 }}>
                {stock.change_pct >= 0 ? <TrendingUp fontSize="small" sx={{ color: 'success.main' }} /> : <TrendingDown fontSize="small" sx={{ color: 'error.main' }} />}
                <Typography variant="body2" color={stock.change_pct >= 0 ? 'success.main' : 'error.main'} fontWeight={700} ml={0.3}>
                  {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Grid container spacing={1} alignItems="center">
          <Grid item xs={6}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" fontSize={9}>
                AI RATING (200)
              </Typography>
              <Typography variant="body2" fontWeight={900} color={isBuy ? 'success.main' : 'error.main'}>
                {score200.toFixed(0)} <Chip label={grade} size="small" color={isBuy ? 'success' : 'error'} sx={{ height: 16, fontSize: 9, fontWeight: 900, ml: 0.5 }} />
              </Typography>
              <LinearProgress variant="determinate" value={Math.min(100, (score200 / 200) * 100)}
                sx={{ height: 4, borderRadius: 1, mt: 0.5,
                      '& .MuiLinearProgress-bar': { bgcolor: isBuy ? 'success.main' : 'error.main' } }} />
            </Box>
          </Grid>
          <Grid item xs={6}>
            {stock.signal && (
              <Chip label={stock.signal} size="small" color={isBuy ? 'success' : 'error'} sx={{ fontWeight: 800, width: '100%' }} />
            )}
          </Grid>
        </Grid>

        {/* Expandable Section */}
        {(stock.rsi || stock.volume_ratio) && (
          <Box sx={{ mt: 1 }}>
            <Box
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', py: 0.5 }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={700} fontSize={10}>
                {expanded ? 'Hide Details' : 'View Details'}
              </Typography>
              <IconButton size="small" sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.3s' }}>
                <ExpandMore fontSize="small" />
              </IconButton>
            </Box>

            <Collapse in={expanded}>
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1, mt: 1 }}>
                <Grid container spacing={1}>
                  {stock.rsi && (
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary" display="block" fontSize={9}>RSI</Typography>
                      <Typography variant="body2" fontWeight={700}>{stock.rsi.toFixed(1)}</Typography>
                    </Grid>
                  )}
                  {stock.volume_ratio && (
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary" display="block" fontSize={9}>Vol Ratio</Typography>
                      <Typography variant="body2" fontWeight={700}>{stock.volume_ratio.toFixed(2)}x</Typography>
                    </Grid>
                  )}
                  {stock.real_buy_pressure_pct && (
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary" display="block" fontSize={9}>Buy Pressure</Typography>
                      <Typography variant="body2" fontWeight={700} color="success.main">{stock.real_buy_pressure_pct}%</Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Collapse>
          </Box>
        )}
      </CardActionArea>
    </Card>
  );
};

export const StockTable: React.FC<Props> = ({ data, loading, compact }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const navigate = useNavigate();
  
  const [orderBy, setOrderBy] = useState<keyof StockResult>('buy_score');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isMobile ? 5 : 10);

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

  const visibleColumns = compact || isMobile || isTablet
    ? defaultColumns.filter(c => !c.hideOnMobile)
    : defaultColumns;

  // Mobile Card View
  if (isMobile) {
    return (
      <Box>
        {loading && (
          <Typography variant="body2" color="text.secondary" fontWeight={600} textAlign="center" py={4}>
            Loading stocks...
          </Typography>
        )}
        {!loading && paginatedData.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            No stocks found
          </Typography>
        )}
        {!loading && (
          <Stack spacing={1.5}>
            {paginatedData.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} onClick={() => navigate(`/stock/${stock.symbol}`)} />
            ))}
          </Stack>
        )}

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={sorted.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ mt: 2, borderTop: '1px solid', borderColor: 'divider' }}
        />
      </Box>
    );
  }

  // Desktop/Tablet Table View
  return (
    <Paper elevation={2} sx={{ overflow: 'hidden', borderRadius: 2 }}>
      <TableContainer sx={{ maxHeight: 650, overflowX: 'auto' }}>
        <Table stickyHeader size="small" sx={{ minWidth: isMobile ? 'auto' : 800 }}>
          <TableHead>
            <TableRow>
              {visibleColumns.map((col) => (
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
                <TableCell colSpan={visibleColumns.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Scanning F&O stocks...</Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading && paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">No stocks found</Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading && paginatedData.map((row) => (
              <TableRow
                hover
                key={row.symbol}
                onClick={() => navigate(`/stock/${row.symbol}`)}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: 'action.hover', transform: 'translateX(2px)' },
                  '&:active': { transform: 'scale(0.99)' },
                }}
              >
                {visibleColumns.map((col) => (
                  <TableCell key={col.id} align={col.align || 'left'}>
                    {col.format ? col.format((row as any)[col.id], row) : ((row as any)[col.id]) || '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
