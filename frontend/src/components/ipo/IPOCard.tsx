import React from 'react';
import { Box, Card, CardContent, Typography, Chip, Stack, Divider, Button } from '@mui/material';
import { TrendingUp, TrendingDown, CalendarMonth, Business, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { IPOMaster } from '../../services/ipoApi';
import { IPORatingBadge } from './IPORatingBadge';

interface Props { ipo: IPOMaster; }

const STATUS_COLOR: Record<string, string> = {
  'Open':     '#00c853',
  'Upcoming': '#2196f3',
  'Closed':   '#ff9800',
  'Listed':   '#9e9e9e',
};

export const IPOCard: React.FC<Props> = ({ ipo }) => {
  const navigate = useNavigate();
  const gmpPositive = (ipo.gmp_pct ?? 0) >= 0;
  const statusColor = STATUS_COLOR[ipo.status] || '#888';
  const priceRange = ipo.issue_price_min && ipo.issue_price_max && ipo.issue_price_min !== ipo.issue_price_max
    ? `₹${ipo.issue_price_min}–₹${ipo.issue_price_max}`
    : ipo.issue_price ? `₹${ipo.issue_price}` : '—';

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        cursor: 'pointer',
        transition: 'all 0.22s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          borderColor: 'primary.main',
        },
      }}
      onClick={() => navigate(`/ipo/${ipo.id}`)}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2} noWrap maxWidth={200}>
              {ipo.company_name}
            </Typography>
            <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
              <Chip label={ipo.status} size="small"
                sx={{ bgcolor: `${statusColor}20`, color: statusColor, fontWeight: 700, fontSize: 10, height: 20 }} />
              <Chip label={ipo.issue_type} size="small" variant="outlined"
                sx={{ fontWeight: 600, fontSize: 10, height: 20 }} />
              {ipo.sector && (
                <Chip label={ipo.sector} size="small" variant="outlined"
                  sx={{ fontWeight: 500, fontSize: 10, height: 20, color: 'text.secondary' }} />
              )}
            </Stack>
          </Box>
          <IPORatingBadge score={ipo.rating} label={ipo.rating_label} size="small" />
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {/* Key Metrics */}
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="caption" color="text.secondary">Price</Typography>
            <Typography variant="body2" fontWeight={700}>{priceRange}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Issue Size</Typography>
            <Typography variant="body2" fontWeight={700}>
              {ipo.issue_size ? `₹${ipo.issue_size.toLocaleString('en-IN')}Cr` : '—'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Lot Size</Typography>
            <Typography variant="body2" fontWeight={700}>{ipo.lot_size ?? '—'}</Typography>
          </Box>
        </Stack>

        {/* GMP */}
        {ipo.gmp != null && (
          <Box sx={{
            mt: 1.5, p: 1, borderRadius: 2,
            bgcolor: gmpPositive ? 'success.main' : 'error.main',
            opacity: 0.85,
          }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              {gmpPositive ? <TrendingUp sx={{ fontSize: 16, color: '#fff' }} /> : <TrendingDown sx={{ fontSize: 16, color: '#fff' }} />}
              <Typography variant="caption" color="white" fontWeight={700}>
                GMP: ₹{ipo.gmp} ({gmpPositive ? '+' : ''}{ipo.gmp_pct?.toFixed(1)}%)
              </Typography>
            </Stack>
          </Box>
        )}

        {/* Dates */}
        <Stack direction="row" spacing={2} mt={1.5} alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarMonth sx={{ fontSize: 13, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {ipo.status === 'Open'
                ? `Closes: ${ipo.close_date}`
                : ipo.status === 'Upcoming'
                ? `Opens: ${ipo.open_date}`
                : ipo.status === 'Listed'
                ? `Listed: ${ipo.listing_date}`
                : `Allotment: ${ipo.allotment_date || ipo.listing_date}`}
            </Typography>
          </Box>
        </Stack>

        <Button size="small" endIcon={<ArrowForward />} sx={{ mt: 1.5, p: 0, minWidth: 0 }}
          onClick={(e) => { e.stopPropagation(); navigate(`/ipo/${ipo.id}`); }}>
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};
