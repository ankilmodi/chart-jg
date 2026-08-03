/**
 * History page – last 100 candles table + charts.
 */
import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody,
  TableCell, TableHead, TableRow, Chip, TableContainer,
  TablePagination,
} from '@mui/material';
import { useHistory } from '../hooks/useMarketData';
import { LoadingState, ErrorState } from '../components/common/MetricCards';
import { PriceChart, VolumeChart, MacdChart, RsiChart } from '../components/charts/Charts';

const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const HistoryPage: React.FC = () => {
  const { data: history, isLoading, error } = useHistory(200);
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;

  if (isLoading && !history) return <LoadingState message="Loading candle history…" />;
  if (error && !history)     return <ErrorState error={(error as Error).message} />;
  if (!history)              return null;

  const candles = [...history.candles].reverse(); // newest first
  const sliced  = candles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const forCharts = [...history.candles]; // ascending for charts

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={3}>📜 Price History</Typography>

      {/* Charts */}
      <Box display="flex" flexDirection="column" gap={2} mb={3}>
        <Card>
          <CardContent>
            <PriceChart candles={forCharts} />
          </CardContent>
        </Card>
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
          <Card>
            <CardContent><VolumeChart candles={forCharts} /></CardContent>
          </Card>
          <Card>
            <CardContent><MacdChart candles={forCharts} /></CardContent>
          </Card>
          <Card>
            <CardContent><RsiChart candles={forCharts} /></CardContent>
          </Card>
        </Box>
      </Box>

      {/* Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1" fontWeight={700}>
              Candle Data ({history.interval}) – {history.total} bars
            </Typography>
            <Chip label={history.symbol} variant="outlined" size="small" />
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Open</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>High</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Low</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Close</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Volume</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Change</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sliced.map((c, i) => {
                  const change = c.close - c.open;
                  const isGreen = change >= 0;
                  const color   = isGreen ? '#00e676' : '#ff1744';
                  return (
                    <TableRow key={i} hover sx={{ bgcolor: `${color}05` }}>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>
                        {c.timestamp.slice(0, 16).replace('T', ' ')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, fontFamily: 'monospace' }}>{fmt(c.open)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, fontFamily: 'monospace', color: '#00e676' }}>{fmt(c.high)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, fontFamily: 'monospace', color: '#ff1744' }}>{fmt(c.low)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color }}>{fmt(c.close)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, fontFamily: 'monospace' }}>
                        {c.volume.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${isGreen ? '+' : ''}${fmt(change)}`}
                          size="small"
                          sx={{ bgcolor: `${color}22`, color, fontWeight: 700, fontSize: 11 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={candles.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPageOptions={[20]}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default HistoryPage;
