import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Box, Typography, TableSortLabel, LinearProgress,
  Stack, TablePagination, useTheme, useMediaQuery,
  Card, CardActionArea, Skeleton, Divider, Tooltip,
} from '@mui/material';
import { TrendingUp, TrendingDown, Circle } from '@mui/icons-material';
import type { StockResult } from '../utils/types';

// ─── Types ────────────────────────────────────────────────────────────────────
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
  lastUpdated?: string;
  marketOpen?: boolean;
}

// ─── SMC Signal Calculator ────────────────────────────────────────────────────
export const getSMCSignal = (stock: StockResult): string => {
  // Use backend value if available
  if (stock.smart_money_flow) return stock.smart_money_flow;

  const volRatio    = stock.volume_ratio    || 1;
  const deliveryPct = stock.delivery_pct    || 0;
  const price       = stock.current_price   || 0;
  const changePct   = stock.change_pct      || 0;
  const isUp        = changePct > 0;
  const isDown      = changePct < 0;
  const vwap        = stock.vwap            || price;
  const ema20       = stock.ema20           || price;
  const oi          = stock.oi_change_pct   || 0;

  // Bullish / Bearish Breakout (backend breakout_type takes priority)
  if (stock.breakout_type === 'bullish' || (price > (stock.resistance || Infinity) * 0.998 && volRatio > 1.3))
    return 'Bullish Breakout';
  if (stock.breakout_type === 'bearish' || (price < (stock.support || 0) * 1.002 && volRatio > 1.3))
    return 'Bearish Breakdown';

  // Institutional flow — high volume + high delivery
  if (volRatio > 2.0 && deliveryPct > 60 && isUp)  return 'Institutional Buy Flow';
  if (volRatio > 2.0 && deliveryPct > 60 && isDown) return 'Institutional Selling';

  // Liquidity Grab — spike reversal
  if (volRatio > 2.5 && Math.abs(changePct) < 0.5)  return 'Liquidity Grab';

  // Smart Money — moderate volume confirmation
  if (volRatio > 1.5 && isUp  && price > vwap && price > ema20)
    return 'Smart Money Accumulation';
  if (volRatio > 1.5 && isDown && price < vwap && price < ema20)
    return 'Smart Money Distribution';

  // Order Blocks
  if (stock.support    && price <= stock.support    * 1.012) return 'Order Block Support';
  if (stock.resistance && price >= stock.resistance * 0.988) return 'Order Block Resistance';

  // Fallback
  return 'Retail Consolidation';
};

// ─── Action Verdict ───────────────────────────────────────────────────────────
export const getActionVerdict = (signal: string | undefined): { label: string; color: 'success' | 'primary' | 'warning' | 'info' | 'error' | 'default' } => {
  const s = (signal || '').toUpperCase();
  if (s.includes('STRONG BUY') || s === 'ACCUMULATE') return { label: 'BUY / ACCUMULATE', color: 'success' };
  if (s === 'BUY')         return { label: 'BUY',              color: 'primary'  };
  if (s === 'HOLD')        return { label: 'HOLD',             color: 'warning'  };
  if (s === 'WATCH')       return { label: 'WAIT',             color: 'info'     };
  if (s.includes('STRONG SELL')) return { label: 'SELL / BOOK PROFIT', color: 'error' };
  if (s === 'SELL')        return { label: 'SELL',             color: 'error'    };
  return { label: 'AVOID', color: 'default' };
};

// ─── Stop Loss Calculator ─────────────────────────────────────────────────────
const calcStopLoss = (stock: StockResult): number => {
  if (stock.stop_loss && stock.stop_loss > 0) return stock.stop_loss;
  const price = stock.current_price || 0;
  const atr   = stock.atr || price * 0.02;
  const isBuy = !stock.signal?.toUpperCase().includes('SELL') && stock.trade_type !== 'sell';

  if (isBuy) {
    const candidates = [stock.support, stock.ema20, stock.vwap, price - atr * 1.5].filter(Boolean) as number[];
    const below = candidates.filter(c => c < price);
    return below.length ? Math.max(...below) : price - atr * 1.5;
  } else {
    const candidates = [stock.resistance, stock.ema20, stock.vwap, price + atr * 1.5].filter(Boolean) as number[];
    const above = candidates.filter(c => c > price);
    return above.length ? Math.min(...above) : price + atr * 1.5;
  }
};

// ─── Targets Calculator ───────────────────────────────────────────────────────
const calcTargets = (stock: StockResult) => {
  const price = stock.current_price || 0;
  const sl    = calcStopLoss(stock);
  const risk  = Math.max(Math.abs(price - sl), price * 0.005);
  const isBuy = !stock.signal?.toUpperCase().includes('SELL') && stock.trade_type !== 'sell';
  const dir   = isBuy ? 1 : -1;
  return {
    t1: stock.target1 || price + dir * risk,
    t2: stock.target2 || price + dir * risk * 2,
    t3: stock.target3 || price + dir * risk * 3,
  };
};

// ─── RSI color ────────────────────────────────────────────────────────────────
const rsiColor = (val: number) => {
  if (val >= 70) return '#f44336';   // Red
  if (val >= 60) return '#ff9800';   // Orange
  if (val >= 40) return '#2196f3';   // Blue
  if (val >= 30) return '#8bc34a';   // Light Green
  return '#4caf50';                  // Green
};

// ─── SMC Signal Chip ──────────────────────────────────────────────────────────
const SMC_COLORS: Record<string, string> = {
  'Institutional Buy Flow':    '#1565c0',
  'Institutional Selling':     '#b71c1c',
  'Smart Money Accumulation':  '#2e7d32',
  'Smart Money Distribution':  '#e65100',
  'Bullish Breakout':          '#00695c',
  'Bearish Breakdown':         '#880e4f',
  'Liquidity Grab':            '#4527a0',
  'Order Block Support':       '#1b5e20',
  'Order Block Resistance':    '#bf360c',
  'Retail Consolidation':      '#546e7a',
};

const SmcChip: React.FC<{ value: string }> = ({ value }) => (
  <Box
    sx={{
      display: 'inline-block',
      px: 1, py: 0.25,
      borderRadius: 1,
      bgcolor: (SMC_COLORS[value] || '#546e7a') + '22',
      border: `1px solid ${SMC_COLORS[value] || '#546e7a'}55`,
      whiteSpace: 'nowrap',
    }}
  >
    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: SMC_COLORS[value] || '#546e7a', lineHeight: 1.3 }}>
      {value}
    </Typography>
  </Box>
);

// ─── Table columns definition ─────────────────────────────────────────────────
const COLUMNS: Column[] = [
  {
    id: 'symbol',
    label: 'Stock Ticker',
    minWidth: 150,
    format: (val, row) => (
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 900, color: 'primary.main', letterSpacing: 0.3 }}>
          {val}
        </Typography>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.1, maxWidth: 140 }} noWrap>
          {row.name}
        </Typography>
        <Stack direction="row" spacing={0.4} mt={0.3} flexWrap="wrap">
          {row.cap_category && (
            <Chip label={row.cap_category} size="small" variant="outlined"
              sx={{ height: 14, fontSize: 9, fontWeight: 700, '.MuiChip-label': { px: 0.6 } }} />
          )}
          {row.fo_eligible && (
            <Chip label="F&O" size="small" color="primary" variant="outlined"
              sx={{ height: 14, fontSize: 9, fontWeight: 700, '.MuiChip-label': { px: 0.6 } }} />
          )}
        </Stack>
      </Box>
    ),
  },
  {
    id: 'current_price',
    label: 'Current Price (₹)',
    minWidth: 110,
    align: 'right',
    format: (_, row) => {
      const chg = row.change_pct || 0;
      const up  = chg >= 0;
      return (
        <Stack alignItems="flex-end" spacing={0.1}>
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: up ? '#2e7d32' : '#c62828', fontVariantNumeric: 'tabular-nums' }}>
            ₹{(row.current_price ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
          <Stack direction="row" spacing={0.3} alignItems="center">
            {up
              ? <TrendingUp sx={{ fontSize: 11, color: '#2e7d32' }} />
              : <TrendingDown sx={{ fontSize: 11, color: '#c62828' }} />}
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: up ? '#2e7d32' : '#c62828', fontVariantNumeric: 'tabular-nums' }}>
              {up ? '+' : ''}{chg.toFixed(2)}%
            </Typography>
          </Stack>
        </Stack>
      );
    },
  },
  {
    id: 'rsi',
    label: 'RSI Indicators',
    minWidth: 90,
    align: 'center',
    format: (val) => {
      if (val == null) return <Typography sx={{ color: 'text.disabled', fontSize: 12 }}>—</Typography>;
      const color = rsiColor(val);
      return (
        <Tooltip title={val >= 70 ? 'Overbought' : val < 30 ? 'Oversold' : val >= 60 ? 'Bullish zone' : 'Neutral'}>
          <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>
              {val.toFixed(2)}
            </Typography>
            <Box sx={{ width: 36, height: 3, borderRadius: 2, bgcolor: color + '33', mt: 0.3, overflow: 'hidden' }}>
              <Box sx={{ width: `${Math.min(val, 100)}%`, height: '100%', bgcolor: color, borderRadius: 2 }} />
            </Box>
          </Box>
        </Tooltip>
      );
    },
  },
  {
    id: 'smc_signal',
    label: 'Smart Money (SMC) Signal',
    minWidth: 190,
    align: 'left',
    format: (_, row) => <SmcChip value={getSMCSignal(row)} />,
  },
  {
    id: 'action',
    label: 'Action Verdict',
    minWidth: 150,
    align: 'center',
    format: (_, row) => {
      const v = getActionVerdict(row.signal);
      return (
        <Chip
          label={v.label}
          size="small"
          color={v.color}
          sx={{ fontWeight: 900, fontSize: '0.65rem', height: 22, letterSpacing: 0.4, minWidth: 120 }}
        />
      );
    },
  },
  {
    id: 'stop_loss',
    label: 'Stop Loss',
    minWidth: 95,
    align: 'right',
    format: (_, row) => (
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#ef5350', fontVariantNumeric: 'tabular-nums' }}>
        ₹{calcStopLoss(row).toFixed(2)}
      </Typography>
    ),
  },
  {
    id: 'target1',
    label: 'Target 1 (1M)',
    minWidth: 95,
    align: 'right',
    format: (_, row) => (
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#43a047', fontVariantNumeric: 'tabular-nums' }}>
        ₹{calcTargets(row).t1.toFixed(2)}
      </Typography>
    ),
  },
  {
    id: 'target2',
    label: 'Target 2 (1M)',
    minWidth: 95,
    align: 'right',
    format: (_, row) => (
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#00897b', fontVariantNumeric: 'tabular-nums' }}>
        ₹{calcTargets(row).t2.toFixed(2)}
      </Typography>
    ),
  },
  {
    id: 'target3',
    label: 'Target 3 (1M)',
    minWidth: 95,
    align: 'right',
    format: (_, row) => (
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#1565c0', fontVariantNumeric: 'tabular-nums' }}>
        ₹{calcTargets(row).t3.toFixed(2)}
      </Typography>
    ),
  },
];

// ─── Loading Skeleton Rows ────────────────────────────────────────────────────
const SkeletonRows: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <TableRow key={i}>
        {COLUMNS.map(col => (
          <TableCell key={col.id} align={col.align || 'left'} sx={{ py: 1.5 }}>
            <Skeleton variant="text" width={col.id === 'symbol' ? 120 : col.id === 'smc_signal' ? 160 : 70} height={18} />
            {col.id === 'symbol' && <Skeleton variant="text" width={90} height={13} sx={{ mt: 0.5 }} />}
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

// ─── Mobile Stock Card ────────────────────────────────────────────────────────
const MobileStockCard: React.FC<{ stock: StockResult; onClick: () => void; isDark: boolean }> = ({ stock, onClick, isDark }) => {
  const chg = stock.change_pct || 0;
  const up  = chg >= 0;
  const verdict = getActionVerdict(stock.signal);
  const smc = getSMCSignal(stock);
  const targets = calcTargets(stock);
  const sl = calcStopLoss(stock);

  return (
    <Card elevation={0} sx={{
      border: '1px solid', borderColor: 'divider',
      borderLeft: '3px solid', borderLeftColor: up ? '#2e7d32' : '#c62828',
      borderRadius: 2, overflow: 'hidden',
      background: isDark ? 'rgba(255,255,255,0.025)' : '#fff',
      mb: 1,
    }}>
      <CardActionArea onClick={onClick} sx={{ p: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 14, color: 'primary.main' }}>{stock.symbol}</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.secondary' }} noWrap>{stock.name}</Typography>
          </Box>
          <Stack alignItems="flex-end">
            <Typography sx={{ fontWeight: 900, fontSize: 14, color: up ? '#2e7d32' : '#c62828', fontVariantNumeric: 'tabular-nums' }}>
              ₹{(stock.current_price ?? 0).toFixed(2)}
            </Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: up ? '#2e7d32' : '#c62828' }}>
              {up ? '+' : ''}{chg.toFixed(2)}%
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" mb={1} flexWrap="wrap">
          <SmcChip value={smc} />
          <Chip label={verdict.label} size="small" color={verdict.color} sx={{ fontWeight: 900, fontSize: '0.62rem', height: 20 }} />
          {stock.rsi != null && (
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: rsiColor(stock.rsi) }}>
              RSI: {stock.rsi.toFixed(2)}
            </Typography>
          )}
        </Stack>

        <Divider sx={{ mb: 1 }} />

        <Stack direction="row" justifyContent="space-between">
          <Box>
            <Typography sx={{ fontSize: 9, color: 'text.secondary', fontWeight: 700 }}>STOP LOSS</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#ef5350' }}>₹{sl.toFixed(2)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 9, color: 'text.secondary', fontWeight: 700 }}>T1</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#43a047' }}>₹{targets.t1.toFixed(2)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 9, color: 'text.secondary', fontWeight: 700 }}>T2</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#00897b' }}>₹{targets.t2.toFixed(2)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 9, color: 'text.secondary', fontWeight: 700 }}>T3</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#1565c0' }}>₹{targets.t3.toFixed(2)}</Typography>
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
};

// ─── Market Status Bar ────────────────────────────────────────────────────────
const MarketStatusBar: React.FC<{ marketOpen?: boolean; lastUpdated?: string; isDark: boolean }> = ({ marketOpen, lastUpdated, isDark }) => (
  <Stack
    direction="row" spacing={1.5} alignItems="center"
    sx={{
      px: 2, py: 0.75,
      bgcolor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(244,247,255,0.8)',
      borderBottom: '1px solid', borderColor: 'divider',
    }}
  >
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Circle sx={{ fontSize: 9, color: marketOpen ? '#2e7d32' : '#ef5350', animation: marketOpen ? 'pulse 1.5s ease-in-out infinite' : 'none',
        '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
      <Typography sx={{ fontSize: 11, fontWeight: 800, color: marketOpen ? '#2e7d32' : '#ef5350' }}>
        {marketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
      </Typography>
    </Stack>
    {lastUpdated && (
      <>
        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>•</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          Last updated: <strong>{lastUpdated}</strong>
        </Typography>
      </>
    )}
    {marketOpen && (
      <>
        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>•</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Auto-refreshing every 10s</Typography>
      </>
    )}
  </Stack>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ colSpan: number }> = ({ colSpan }) => (
  <TableRow>
    <TableCell colSpan={colSpan} align="center" sx={{ py: 10, border: 'none' }}>
      <Typography sx={{ fontSize: 36, mb: 1 }}>📊</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 16, color: 'text.secondary', mb: 0.5 }}>
        No stocks match your filters
      </Typography>
      <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
        Try adjusting your filters or refreshing the data.
      </Typography>
    </TableCell>
  </TableRow>
);

// ─── Main StockTable Component ────────────────────────────────────────────────
export const StockTable: React.FC<Props> = ({ data, loading, compact, lastUpdated, marketOpen }) => {
  const theme   = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark  = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const [orderBy, setOrderBy] = useState<string>('current_price');
  const [order,   setOrder]   = useState<'asc' | 'desc'>('desc');
  const [page,    setPage]    = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(compact ? 5 : 10);

  const handleSort = (colId: string) => {
    setOrder(colId === orderBy && order === 'desc' ? 'asc' : 'desc');
    setOrderBy(colId);
    setPage(0);
  };

  const getSortValue = (row: StockResult, colId: string): any => {
    if (colId === 'smc_signal') return getSMCSignal(row);
    if (colId === 'action')     return getActionVerdict(row.signal).label;
    if (colId === 'stop_loss')  return calcStopLoss(row);
    if (colId === 'target1')    return calcTargets(row).t1;
    if (colId === 'target2')    return calcTargets(row).t2;
    if (colId === 'target3')    return calcTargets(row).t3;
    return (row as any)[colId] ?? 0;
  };

  const sorted = [...data].sort((a, b) => {
    const av = getSortValue(a, orderBy);
    const bv = getSortValue(b, orderBy);
    if (typeof av === 'string') {
      return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return order === 'asc' ? av - bv : bv - av;
  });

  const paginated = rowsPerPage > 0
    ? sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : sorted;

  // ─── Mobile view ─────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <MarketStatusBar marketOpen={marketOpen} lastUpdated={lastUpdated} isDark={isDark} />
        <Box sx={{ p: 1.5 }}>
          {loading && <LinearProgress sx={{ borderRadius: 2, mb: 1.5 }} />}
          {!loading && paginated.length === 0 && (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 30, mb: 1 }}>📊</Typography>
              <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>No stocks match your filters</Typography>
            </Box>
          )}
          {paginated.map(stock => (
            <MobileStockCard
              key={stock.symbol}
              stock={stock}
              isDark={isDark}
              onClick={() => navigate(`/stock/${stock.symbol}`)}
            />
          ))}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={sorted.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
            sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 1 }}
          />
        </Box>
      </Paper>
    );
  }

  // ─── Desktop / Tablet table view ──────────────────────────────────────
  return (
    <Paper
      elevation={0}
      sx={{
        overflow: 'hidden', borderRadius: 3,
        border: '1px solid', borderColor: 'divider',
        background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
      }}
    >
      <MarketStatusBar marketOpen={marketOpen} lastUpdated={lastUpdated} isDark={isDark} />

      <TableContainer sx={{ maxHeight: 620, overflowX: 'auto' }}>
        <Table stickyHeader size="small" sx={{ minWidth: 1050 }}>
          {/* ── Header ── */}
          <TableHead>
            <TableRow>
              {COLUMNS.map(col => (
                <TableCell
                  key={col.id}
                  align={col.align || 'left'}
                  sx={{
                    minWidth: col.minWidth,
                    fontWeight: 900,
                    fontSize: '0.68rem',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    bgcolor: isDark ? '#0b1120' : '#f4f7ff',
                    borderBottom: '2px solid',
                    borderColor: isDark ? 'rgba(0,176,255,0.25)' : 'rgba(21,101,192,0.18)',
                    whiteSpace: 'nowrap',
                    py: 1.5,
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

          {/* ── Body ── */}
          <TableBody>
            {loading && <SkeletonRows count={rowsPerPage > 10 ? 10 : rowsPerPage} />}

            {!loading && paginated.length === 0 && <EmptyState colSpan={COLUMNS.length} />}

            {!loading && paginated.map((row, idx) => {
              const isBuy = !row.signal?.toUpperCase().includes('SELL') && row.trade_type !== 'sell';
              return (
                <TableRow
                  hover
                  key={row.symbol}
                  onClick={() => navigate(`/stock/${row.symbol}`)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                    bgcolor: idx % 2 === 0
                      ? 'transparent'
                      : isDark ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.013)',
                    borderLeft: '3px solid',
                    borderLeftColor: isBuy ? '#2e7d32' : '#c62828',
                    '&:hover': {
                      bgcolor: isDark
                        ? 'rgba(0,176,255,0.06) !important'
                        : 'rgba(21,101,192,0.05) !important',
                    },
                  }}
                >
                  {COLUMNS.map(col => (
                    <TableCell key={col.id} align={col.align || 'left'} sx={{ py: 1.25 }}>
                      {col.format
                        ? col.format((row as any)[col.id], row)
                        : ((row as any)[col.id] ?? '—')}
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
