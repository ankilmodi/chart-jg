/**
 * Universe Page – browse all stocks in the scanner universe.
 */
import React, { useState, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Chip,
  FormControl, InputLabel, Select, MenuItem,
  TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Alert, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import { fetchScannerUniverse } from '../services/api';
import type { ScannerUniverseStock } from '../utils/types';

interface UniverseResponse {
  index: string;
  total: number;
  stocks: ScannerUniverseStock[];
  sectors: string[];
}

const indexColors: Record<string, string> = {
  NIFTY50:      '#6c63ff',
  NIFTY_NEXT50: '#ff6584',
  BANKNIFTY:    '#00e676',
};

const UniversePage: React.FC = () => {
  const [indexFilter, setIndexFilter]   = useState('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [search, setSearch]             = useState('');

  const { data, isLoading, error } = useQuery<UniverseResponse>({
    queryKey:      ['scanner-universe', indexFilter],
    queryFn:       () => fetchScannerUniverse(indexFilter),
    staleTime:     30 * 60_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.stocks.filter((s) => {
      const matchSector = sectorFilter === 'ALL' || s.sector === sectorFilter;
      const matchSearch = !search || s.symbol.toLowerCase().includes(search.toLowerCase())
        || s.name.toLowerCase().includes(search.toLowerCase());
      return matchSector && matchSearch;
    });
  }, [data, sectorFilter, search]);

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>🗂️ Stock Universe</Typography>
        <Typography variant="body2" color="text.secondary">
          NIFTY 50, Next 50, and Bank NIFTY constituents monitored by the scanner
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Index</InputLabel>
              <Select
                value={indexFilter}
                label="Index"
                onChange={(e) => setIndexFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Indices</MenuItem>
                <MenuItem value="NIFTY50">NIFTY 50</MenuItem>
                <MenuItem value="NIFTY_NEXT50">NIFTY Next 50</MenuItem>
                <MenuItem value="BANKNIFTY">Bank NIFTY</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Sector</InputLabel>
              <Select
                value={sectorFilter}
                label="Sector"
                onChange={(e) => setSectorFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Sectors</MenuItem>
                {(data?.sectors ?? []).map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              placeholder="Search symbol / name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 220 }}
            />
            {data && (
              <Typography variant="caption" color="text.secondary">
                {filtered.length} / {data.total} stocks
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{(error as Error).message}</Alert>}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Symbol', 'Name', 'Sector', 'Index', 'Ticker'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((stock) => (
                <TableRow key={stock.ticker} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>{stock.symbol}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{stock.name}</TableCell>
                  <TableCell>
                    <Chip label={stock.sector} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={stock.index}
                      size="small"
                      sx={{
                        fontSize: 10, fontWeight: 700,
                        bgcolor: (indexColors[stock.index] ?? '#666') + '22',
                        color:   indexColors[stock.index] ?? '#666',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>{stock.ticker}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default UniversePage;
