import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Box, Typography, TableSortLabel, LinearProgress,
  Stack, TablePagination, useTheme, useMediaQuery,
  Card, CardActionArea, Grid, IconButton, Collapse,
  Divider,
} from '@mui/material';
import { TrendingUp, TrendingDown, ExpandMore, ExpandLess } from '@mui/icons-material';
import type { StockResult } from '../utils/types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Column {
  id: keyof StockResult | 'action' | 'score_200';
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: StockResult) => React.ReactNode;
  hideOnTablet?: boolean;
}

interface Props {
  data: StockResult[];
  loading?: boolean;
  compact?: boolean;
}

// ─── Signal chip helper ───────────────────────────────────────────────────────
const SignalChip: React.FC<{ signal: string }> = ({ signal }) => {
  const colorMap: Record<string, any> = {
    'STRONG BUY': 'success',
    'BUY':        'success',
    'ACCUMULATE': 'info',
    'WATCH':      'info',
    'HOLD':       'warning',
    'SELL':       'error',
    'STRONG SELL':'error',
  };
  return (
    <Chip
      label={signal}
      size="small"
      color={colorMap[signal] || 'default'}
      sx={{ fontWeight: 800, height: 20, fontSize: '0.62rem', letterSpacing: 0.3 }}
    />
  );
};

// ─── Score bar ────────────────────────────────────────────────────────────────
const ScoreBar: React.FC<{ score200: number; grade: string; isBuy: boolean }> = ({ score200, grade, isBuy }) => (
  <Box sx={{ minWidth: 90 }}>
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" mb={0.3}>
      <Typography sx={{ fontSize: 12, fontWeight: 900, color: isBuy ? 'success.main' : 'error.main' }}>
        {score200.toFixed(0)}
      </Typography>
      <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }}>/200</Typography>
      <Chip
        label={grade}
        size="small"
        color={isBuy ? 'success' : 'error'}
        sx={{ height: 16, fontSize: '0.58rem', fontWeight: 900 }}
      />
    </Stack>
    <LinearProgress
      variant="determinate"
      value={Math.min(100, (score200 / 200) * 100)}
      sx={{
        height: 4, borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.07)',
        '& .MuiLinearProgress-bar': { bgcolor: isBuy ? 'success.main' : 'error.main', borderRadius: 2 },
      }}
    />
  </Box>
);

// ─── Desktop columns ──────────────────────────────────────────────────────────
const defaultColumns: Column[] = [
  {
    id: 'symbol',
    label: 'Symbol',
    minWidth: 130,
    format: (val, row) => (
      <Box>
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
          <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{val}</Typography>
          <Chip label={row.cap_category || 'Large'} size="small" variant="outlined" color="secondary"
            sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700 }} />
          {row.fo_eligible && (
            <Chip label="F&O" size="small" variant="outlined" color="primary"
              sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700 }} />
          )}
        </Stack>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.2 }} noWrap>
          {row.name}
        </Typography>
      </Box>
    ),
  },
  {
    id: 'current_price',
    label: 'Price',
    minWidth: 80,
    align: 'right',
    format: val => val != null ? (
      <Typography sx={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
        ₹{val.toFixed(2)}
      </Typography>
    ) : '—',
  },
  {
    id: 'change_pct',
    label: 'Chg %',
    minWidth: 75,
    align: 'right',
    format: val => val != null ? (
      <Stack direction="row" spacing={0.3} alignItems="center" justifyContent="flex-end">
        {val >= 0 ? <TrendingUp sx={{ fontSize: 13, color: 'success.main' }} /> : <TrendingDown sx={{ fontSize: 13, color: 'error.main' }} />}
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: val >= 0 ? 'success.main' : 'error.main', fontVariantNumeric: 'tabular-nums' }}>
          {val >= 0 ? '+' : ''}{val.toFixed(2)}%
        </Typography>
      </Stack>
    ) : '—',
  },
  {
    id: 'score_200',
    label: 'AI Score',
    minWidth: 110,
    align: 'center',
    hideOnTablet: true,
    format: (_, row) => {
      const score200 = Math.min(200, row.institutional_score || (row.buy_score ? row.buy_score * 2 : 180));
      const grade = row.institutional_grade || (score200 >= 180 ? 'A+' : score200 >= 160 ? 'A' : 'B');
      const isBuy = row.trade_type !== 'sell' && row.signal !== 'SELL' && row.signal !== 'STRONG SELL';
      return <ScoreBar score200={score200} grade={grade} isBuy={isBuy} />;
    },
  },
  {
    id: 'signal',
    label: 'Signal',
    minWidth: 100,
    align: 'center',
    format: val => val ? <SignalChip signal={val} /> : '—',
  },
  {
    id: 'rsi',
    label: 'RSI',
    minWidth: 55,
    align: 'right',
    hideOnTablet: true,
    format: val => val != null ? (
      <Typography sx={{
        fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: val > 70 ? 'error.main' : val < 30 ? 'success.main' : 'text.primary',
      }}>
        {val.toFixed(1)}
      </Typography>
    ) : '—',
  },
  {
    id: 'volume_ratio',
    label: 'Vol ×',
    minWidth: 65,
    align: 'right',
    hideOnTablet: true,
    format: val => val != null ? (
      <Typography sx={{
        fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: val >= 2 ? 'warning.main' : 'text.primary',
      }}>
        {val.toFixed(2)}×
      </Typography>
    ) : '—',
  },
  {
    id: 'action',
    label: 'Detail',
    minWidth: 72,
    align: 'center',
    hideOnTablet: true,
    format: () => (
      <Chip label="View" size="small" color="primary" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800, cursor: 'pointer' }} />
    ),
  },
];

// ─── Mobile Stock Card ────────────────────────────────────────────────────────
const StockCard: React.FC<{ stock: StockResult; onClick: () => void }> = ({ stock, onClick }) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const score200 = Math.min(200, stock.institutional_score || (stock.buy_score ? stock.buy_score * 2 : 180));
  const grade = stock.institutional_grade || (score200 >= 180 ? 'A+' : score200 >= 160 ? 'A' : 'B');
  const isBuy = stock.trade_type !== 'sell' && stock.signal !== 'SELL' && stock.signal !== 'STRONG SELL';
  const up = (stock.change_pct ?? 0) >= 0;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid', borderColor: 'divider',
        overflow: 'hidden',
        transition: 'all 0.18s',
        background: isDark ? 'rgba(255,255,255,0.025)' : '#fff',
        '&:active': { transform: 'scale(0.98)', opacity: 0.9 },
      }}
    >
      {/* coloured left border = signal */}
      <Box
        sx={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          bgcolor: isBuy ? 'success.main' : 'error.main',
          borderRadius: '3px 0 0 3px',
        }}
      />

      <CardActionArea onClick={onClick} sx={{ pl: 1.75, pr: 1.5, pt: 1.25, pb: 1 }}>
        {/* Row 1: Symbol + Price */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
          <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" mb={0.3}>
              <Typography sx={{ fontWeight: 900, fontSize: 14 }}>{stock.symbol}</Typography>
              <Chip label={stock.cap_category || 'Large'} size="small" variant="outlined"
                sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />
              {stock.fo_eligible && (
                <Chip label="F&O" size="small" color="primary" variant="outlined"
                  sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />
              )}
            </Stack>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.3 }} noWrap>
              {stock.name}
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography sx={{ fontWeight: 900, fontSize: 15, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
              ₹{stock.current_price?.toFixed(2) ?? '—'}
            </Typography>
            {stock.change_pct != null && (
              <Stack direction="row" spacing={0.3} alignItems="center" justifyContent="flex-end" mt={0.2}>
                {up ? <TrendingUp sx={{ fontSize: 12, color: 'success.main' }} /> : <TrendingDown sx={{ fontSize: 12, color: 'error.main' }} />}
                <Typography sx={{ fontSize: 11.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: up ? 'success.main' : 'error.main' }}>
                  {up ? '+' : ''}{stock.change_pct.toFixed(2)}%
                </Typography>
              </Stack>
            )}
          </Box>
        </Box>

        {/* Row 2: Score bar + Signal */}
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={7}>
            <ScoreBar score200={score200} grade={grade} isBuy={isBuy} />
          </Grid>
          <Grid item xs={5} sx={{ textAlign: 'right' }}>
            {stock.signal && <SignalChip signal={stock.signal} />}
          </Grid>
        </Grid>
      </CardActionArea>

      {/* Expandable details */}
      {(stock.rsi || stock.volume_ratio || stock.real_buy_pressure_pct) && (
        <>
          <Divider />
          <Box
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              py: 0.5, cursor: 'pointer', gap: 0.3,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700 }}>
              {expanded ? 'Hide' : 'Details'}
            </Typography>
            {expanded
              ? <ExpandLess sx={{ fontSize: 14, color: 'text.disabled' }} />
              : <ExpandMore sx={{ fontSize: 14, color: 'text.disabled' }} />
            }
          </Box>
          <Collapse in={expanded}>
            <Box
              sx={{
                px: 2, pb: 1.25,
                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.025)',
              }}
            >
              <Grid container spacing={1}>
                {stock.rsi != null && (
                  <Grid item xs={4}>
                    <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontWeight: 700 }}>RSI</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: stock.rsi > 70 ? 'error.main' : stock.rsi < 30 ? 'success.main' : 'text.primary' }}>
                      {stock.rsi.toFixed(1)}
                    </Typography>
                  </Grid>
                )}
                {stock.volume_ratio != null && (
                  <Grid item xs={4}>
                    <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontWeight: 700 }}>Vol ×</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: stock.volume_ratio >= 2 ? 'warning.main' : 'text.primary' }}>
                      {stock.volume_ratio.toFixed(2)}×
                    </Typography>
                  </Grid>
                )}
                {stock.real_buy_pressure_pct != null && (
                  <Grid item xs={4}>
                    <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontWeight: 700 }}>Buy Press</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'success.main' }}>
                      {stock.real_buy_pressure_pct}%
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
        </>
      )}
    </Card>
  );
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────
const LoadingCards = () => (
  <Stack spacing={1.5}>
    {[1, 2, 3].map(i => (
      <Card key={i} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 2 }}>
        <LinearProgress sx={{ borderRadius: 2, mb: 1 }} />
        <LinearProgress sx={{ borderRadius: 2, width: '60%' }} />
      </Card>
    ))}
  </Stack>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const StockTable: React.FC<Props> = ({ data, loading, compact }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const [orderBy, setOrderBy] = useState<keyof StockResult>('buy_score');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isMobile ? 6 : compact ? 5 : 10);

  const handleSort = (col: keyof StockResult) => {
    setOrder(col === orderBy && order === 'desc' ? 'asc' : 'desc');
    setOrderBy(col);
  };

  const sorted = [...data].sort((a, b) => {
    const av = (a as any)[orderBy] ?? 0;
    const bv = (b as any)[orderBy] ?? 0;
    return order === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
  });

  const paginated = rowsPerPage > 0
    ? sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : sorted;

  const visibleCols = (compact || isTablet)
    ? defaultColumns.filter(c => !c.hideOnTablet)
    : defaultColumns;

  // ── Mobile view ──
  if (isMobile) {
    return (
      <Box>
        {loading && <LoadingCards />}
        {!loading && paginated.length === 0 && (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No stocks found</Typography>
          </Box>
        )}
        {!loading && (
          <Stack spacing={1.25}>
            {paginated.map(stock => (
              <StockCard
                key={stock.symbol}
                stock={stock}
                onClick={() => navigate(`/stock/${stock.symbol}`)}
              />
            ))}
          </Stack>
        )}
        <TablePagination
          rowsPerPageOptions={[6, 12, 25]}
          component="div"
          count={sorted.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          sx={{ mt: 1, borderTop: '1px solid', borderColor: 'divider', '.MuiTablePagination-toolbar': { minHeight: 44 } }}
        />
      </Box>
    );
  }

  // ── Desktop / Tablet table view ──
  return (
    <Paper
      elevation={0}
      sx={{
        overflow: 'hidden', borderRadius: 3,
        border: '1px solid', borderColor: 'divider',
        background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
      }}
    >
      <TableContainer sx={{ maxHeight: 620 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {visibleCols.map(col => (
                <TableCell
                  key={col.id}
                  align={col.align || 'left'}
                  sx={{
                    minWidth: col.minWidth,
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    bgcolor: isDark ? '#0b1120' : '#f4f7ff',
                    borderBottom: '2px solid',
                    borderColor: isDark ? 'rgba(0,176,255,0.2)' : 'rgba(21,101,192,0.15)',
                  }}
                >
                  {col.id === 'action' || col.id === 'score_200' ? col.label : (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleSort(col.id as keyof StockResult)}
                    >
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
                <TableCell colSpan={visibleCols.length} sx={{ p: 0, border: 'none' }}>
                  <LinearProgress />
                </TableCell>
              </TableRow>
            )}
            {!loading && paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleCols.length} align="center" sx={{ py: 5 }}>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No stocks found</Typography>
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
                  {visibleCols.map(col => (
                    <TableCell key={col.id} align={col.align || 'left'} sx={{ py: 1 }}>
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
        rowsPerPageOptions={[10, 25, 50, 100, { label: 'All', value: -1 }]}
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
