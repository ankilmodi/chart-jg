import React, { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

export const LiveClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = time.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

  const dateStr = time.toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <AccessTimeIcon fontSize="small" sx={{ opacity: 0.7 }} />
      <Box>
        <Typography variant="body2" fontWeight={700} fontFamily="monospace">
          {timeStr} IST
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {dateStr}
        </Typography>
      </Box>
    </Box>
  );
};
