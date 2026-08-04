import React from 'react';
import { Box, Paper, Typography, Stack, Chip, LinearProgress } from '@mui/material';
import { AccessTime, CheckCircle, TipsAndUpdates } from '@mui/icons-material';

interface Props {
  bestTime: string;
  applyProbability: string;
  allotmentPct?: number;
  recommendation: string;
  reasons: string[];
  avoidReasons: string[];
}

const REC_CONFIG: Record<string, { color: string; bg: string; emoji: string }> = {
  Apply: { color: '#00c853', bg: '#00c85318', emoji: '✅' },
  Wait:  { color: '#ff9800', bg: '#ff980018', emoji: '⏳' },
  Avoid: { color: '#ff1744', bg: '#ff174418', emoji: '🚫' },
};

const PROB_COLOR: Record<string, string> = {
  High: '#00c853', Medium: '#ff9800', Low: '#ff1744',
};

export const BestTimeCard: React.FC<Props> = ({
  bestTime, applyProbability, allotmentPct, recommendation, reasons, avoidReasons,
}) => {
  const cfg = REC_CONFIG[recommendation] || REC_CONFIG.Avoid;
  const probColor = PROB_COLOR[applyProbability] || '#888';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* AI Recommendation */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '2px solid', borderColor: cfg.color, bgcolor: cfg.bg }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
          <Typography fontSize={28}>{cfg.emoji}</Typography>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>AI RECOMMENDATION</Typography>
            <Typography variant="h5" fontWeight={900} color={cfg.color}>{recommendation.toUpperCase()}</Typography>
          </Box>
        </Stack>
        {reasons.map((r, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="flex-start" mb={0.5}>
            <CheckCircle sx={{ color: '#00c853', fontSize: 15, mt: 0.2 }} />
            <Typography variant="caption" color="text.secondary">{r}</Typography>
          </Stack>
        ))}
        {avoidReasons.map((r, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="flex-start" mb={0.5}>
            <Typography variant="caption" sx={{ color: '#ff1744' }}>⚠️ {r}</Typography>
          </Stack>
        ))}
      </Paper>

      {/* Best Time to Apply */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <AccessTime sx={{ color: '#2196f3', fontSize: 18 }} />
          <Typography variant="subtitle2" fontWeight={700}>Best Time to Apply</Typography>
        </Stack>
        <Chip
          label={bestTime}
          sx={{ bgcolor: '#2196f318', color: '#2196f3', fontWeight: 800, fontSize: 13, height: 32, px: 1 }}
        />
      </Paper>

      {/* Allotment Probability */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
          <TipsAndUpdates sx={{ color: probColor, fontSize: 18 }} />
          <Typography variant="subtitle2" fontWeight={700}>Allotment Probability</Typography>
          <Chip label={applyProbability} size="small"
            sx={{ bgcolor: `${probColor}18`, color: probColor, fontWeight: 700, ml: 'auto' }} />
        </Stack>
        <LinearProgress
          variant="determinate"
          value={allotmentPct ?? 0}
          sx={{
            height: 10, borderRadius: 5,
            bgcolor: `${probColor}22`,
            '& .MuiLinearProgress-bar': { bgcolor: probColor, borderRadius: 5 },
          }}
        />
        <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
          Estimated allotment chance: <strong style={{ color: probColor }}>{allotmentPct?.toFixed(0) ?? 0}%</strong>
        </Typography>
      </Paper>
    </Box>
  );
};
