import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Accordion, AccordionSummary,
  AccordionDetails, Chip, Stack, TextField, MenuItem,
} from '@mui/material';
import { ExpandMore, School } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { fetchFormulas } from '../services/api';
import type { FormulaEntry } from '../utils/types';

export default function FormulaPage() {
  const [category, setCategory] = useState('All');
  const { data, isLoading } = useQuery({
    queryKey: ['formulas'],
    queryFn: fetchFormulas,
  });

  const formulas: FormulaEntry[] = data?.formulas || [];
  const categories = ['All', ...Array.from(new Set(formulas.map(f => f.category)))];
  const filtered = category === 'All' ? formulas : formulas.filter(f => f.category === category);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <School color="primary" />
        <Typography variant="h5" fontWeight={700}>Formula & Calculations</Typography>
        <Chip label={`${filtered.length} indicators`} size="small" />
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={3}>
        Learn how every technical indicator is calculated and how to interpret them for trading decisions.
      </Typography>

      <TextField select size="small" value={category} onChange={e => setCategory(e.target.value)}
        label="Category" sx={{ width: 200, mb: 3 }}>
        {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
      </TextField>

      {isLoading && <Typography>Loading...</Typography>}

      {filtered.map((formula) => (
        <Accordion key={formula.name} sx={{ mb: 1 }} elevation={1}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Stack direction="row" spacing={1} alignItems="center" flex={1}>
              <Typography variant="subtitle1" fontWeight={700}>{formula.name}</Typography>
              <Chip label={formula.category} size="small" variant="outlined" />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="primary" fontWeight={600}>Formula:</Typography>
                <Paper sx={{ p: 1.5, mt: 0.5, bgcolor: 'action.hover', fontFamily: 'monospace', fontSize: 13 }}>
                  {formula.formula}
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="primary" fontWeight={600}>Calculation:</Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>{formula.calculation}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="primary" fontWeight={600}>Interpretation:</Typography>
                <Typography variant="body2" mt={0.5}>{formula.interpretation}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 1.5, bgcolor: 'success.dark', color: '#fff' }}>
                  <Typography variant="caption" fontWeight={700}>✅ BULLISH CONDITION</Typography>
                  <Typography variant="body2" mt={0.5}>{formula.bullish_condition}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 1.5, bgcolor: 'error.dark', color: '#fff' }}>
                  <Typography variant="caption" fontWeight={700}>❌ BEARISH CONDITION</Typography>
                  <Typography variant="body2" mt={0.5}>{formula.bearish_condition}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 1.5, bgcolor: 'info.dark', color: '#fff' }}>
                  <Typography variant="caption" fontWeight={700}>💡 EXAMPLE</Typography>
                  <Typography variant="body2" mt={0.5}>{formula.example}</Typography>
                </Paper>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
