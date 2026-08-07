/**
 * PageHeader — back button + title + slide-in page transition
 * Usage: <PageHeader title="Page Name" icon="📊" />
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Typography, Chip, Stack, useTheme, useMediaQuery } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

interface PageHeaderProps {
  title: string;
  icon?: string;
  subtitle?: string;
  chip?: string;
  /** extra content rendered to the right of the title */
  actions?: React.ReactNode;
  /** wrap children in the slide container too */
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title, icon, subtitle, chip, actions, children,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';

  // ── slide-in animation state ──────────────────────────────────────────────
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // tiny delay so the transform is applied before the transition starts
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const handleBack = () => {
    // go back in history, fall back to dashboard
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <Box
      sx={{
        // ── slide-in from right ──────────────────────────────────────────
        transform: visible ? 'translateX(0)' : 'translateX(40px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease',
        mb: 2,
      }}
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: { xs: 0, sm: 0 },
          py: { xs: 0.5, sm: 0.75 },
          mb: subtitle ? 0.5 : (children ? 1.5 : 0),
        }}
      >
        {/* Back button */}
        <IconButton
          onClick={handleBack}
          size={isMobile ? 'small' : 'medium'}
          sx={{
            mr: 0.25,
            bgcolor: isDark ? 'rgba(0,176,255,0.1)' : 'rgba(21,101,192,0.08)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(0,176,255,0.25)' : 'rgba(21,101,192,0.2)',
            color: isDark ? '#00b0ff' : 'primary.main',
            flexShrink: 0,
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: isDark ? 'rgba(0,176,255,0.2)' : 'rgba(21,101,192,0.15)',
              transform: 'translateX(-3px)',
              boxShadow: isDark ? '0 0 12px rgba(0,176,255,0.3)' : '0 4px 12px rgba(21,101,192,0.2)',
            },
            '&:active': { transform: 'translateX(-1px) scale(0.93)' },
          }}
        >
          <ArrowBack sx={{ fontSize: isMobile ? 18 : 20 }} />
        </IconButton>

        {/* Title */}
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: 15, sm: 18, md: 20 },
            lineHeight: 1.25,
            letterSpacing: -0.3,
            flex: 1,
            minWidth: 0,
          }}
          noWrap
        >
          {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
          {title}
        </Typography>

        {/* Chip */}
        {chip && (
          <Chip
            label={chip}
            size="small"
            color="primary"
            sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800, flexShrink: 0 }}
          />
        )}

        {/* Actions slot */}
        {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
      </Stack>

      {/* Subtitle */}
      {subtitle && (
        <Typography
          sx={{
            fontSize: { xs: 11, sm: 12.5 },
            color: 'text.secondary',
            fontWeight: 500,
            lineHeight: 1.5,
            mb: children ? 1.5 : 0,
            pl: { xs: 0, sm: 0 },
          }}
        >
          {subtitle}
        </Typography>
      )}

      {/* Optional children (e.g. filter bar) */}
      {children}
    </Box>
  );
};

/**
 * PageSlide — wraps any page content in the slide-in animation.
 * Use this when PageHeader is already in a child component (like ScreenerPage).
 */
export const PageSlide: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  return (
    <Box
      sx={{
        transform: visible ? 'translateX(0)' : 'translateX(40px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease',
      }}
    >
      {children}
    </Box>
  );
};
