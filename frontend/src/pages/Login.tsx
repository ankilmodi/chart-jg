import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Divider, Paper,
  InputAdornment, IconButton, Alert, CircularProgress, Chip
} from '@mui/material';
import {
  Analytics, Email, Lock, Visibility, VisibilityOff,
  Google, GitHub, TrendingUp, Shield, Bolt
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

/* ─── Tiny in-memory auth store (swap for real auth later) ─── */
const DEMO_USERS: Record<string, string> = {
  'admin@stockai.com': 'Admin@123',
  'trader@stockai.com': 'Trade@123',
  'demo@stockai.com': 'Demo@123',
};

export default function LoginPage() {
  const navigate = useNavigate();

  const [tab,      setTab]      = useState<'login' | 'signup'>('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleAuth = async () => {
    setError('');
    if (!email || !password) { setError('Please fill all fields.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900)); // Simulate network

    if (tab === 'login') {
      if (DEMO_USERS[email] === password) {
        localStorage.setItem('sai_user', JSON.stringify({ email, name: email.split('@')[0] }));
        navigate('/');
      } else {
        setError('Invalid email or password. Try demo@stockai.com / Demo@123');
      }
    } else {
      // Sign-up: just register in local
      if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return; }
      localStorage.setItem('sai_user', JSON.stringify({ email, name: name || email.split('@')[0] }));
      navigate('/');
    }
    setLoading(false);
  };

  const handleGoogle = () => {
    // Demo: auto-login as demo user
    localStorage.setItem('sai_user', JSON.stringify({ email: 'google@user.com', name: 'Google User' }));
    navigate('/');
  };
  const handleGithub = () => {
    localStorage.setItem('sai_user', JSON.stringify({ email: 'github@user.com', name: 'GitHub User' }));
    navigate('/');
  };

  const features = [
    { icon: <TrendingUp />, label: '4,349+ Indian Stocks' },
    { icon: <Bolt />,       label: 'Real-Time AI Analysis' },
    { icon: <Shield />,     label: 'Institutional Signals' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated blobs */}
      {['#6c63ff', '#f64f59', '#43cea2'].map((c, i) => (
        <Box key={i} sx={{
          position: 'absolute',
          width: 400, height: 400,
          borderRadius: '50%',
          background: c,
          opacity: 0.08,
          filter: 'blur(80px)',
          top: i === 0 ? '-10%' : i === 1 ? '60%' : '20%',
          left: i === 0 ? '-10%' : i === 1 ? '70%' : '60%',
          animation: `float${i} ${6 + i}s ease-in-out infinite alternate`,
          '@keyframes float0': { from: { transform: 'translate(0,0)' }, to: { transform: 'translate(40px,30px)' } },
          '@keyframes float1': { from: { transform: 'translate(0,0)' }, to: { transform: 'translate(-30px,20px)' } },
          '@keyframes float2': { from: { transform: 'translate(0,0)' }, to: { transform: 'translate(20px,-40px)' } },
        }} />
      ))}

      {/* Left panel — branding */}
      <Box sx={{
        flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column',
        justifyContent: 'center', alignItems: 'flex-start',
        pl: { md: 8, lg: 14 }, pr: 6, gap: 4,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Analytics sx={{ fontSize: 48, color: '#6c63ff' }} />
          <Box>
            <Typography variant="h4" fontWeight={900} color="white" lineHeight={1.1}>
              STOCK AI
            </Typography>
            <Typography variant="h4" fontWeight={900} sx={{ color: '#6c63ff' }} lineHeight={1.1}>
              ANALYZER
            </Typography>
          </Box>
        </Box>

        <Typography variant="h6" color="rgba(255,255,255,0.7)" fontWeight={400} maxWidth={380}>
          India's most advanced institutional-grade stock screener with real-time AI analysis
          for all NSE &amp; BSE equities.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {features.map((f, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 44, height: 44, borderRadius: 2,
                background: 'linear-gradient(135deg, #6c63ff44, #43cea244)',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#a78bfa',
              }}>
                {f.icon}
              </Box>
              <Typography color="rgba(255,255,255,0.85)" fontWeight={600}>{f.label}</Typography>
            </Box>
          ))}
        </Box>

        <Chip
          label="✅ All Permissions Enabled • Railway + Vercel"
          sx={{ bgcolor: 'rgba(67,206,162,0.15)', color: '#43cea2', border: '1px solid #43cea255', fontWeight: 700 }}
        />
      </Box>

      {/* Right panel — auth form */}
      <Box sx={{
        width: { xs: '100%', md: 460 }, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', p: { xs: 2, sm: 4 },
      }}>
        <Paper elevation={0} sx={{
          width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 }, borderRadius: 4,
          backdropFilter: 'blur(24px)',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}>
          {/* Mobile logo */}
          <Box sx={{ display: { md: 'none' }, textAlign: 'center', mb: 3 }}>
            <Analytics sx={{ fontSize: 40, color: '#6c63ff' }} />
            <Typography variant="h5" fontWeight={900} color="white">STOCK AI ANALYZER</Typography>
          </Box>

          {/* Tabs */}
          <Box sx={{ display: 'flex', mb: 3, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
            {(['login', 'signup'] as const).map(t => (
              <Button key={t} fullWidth onClick={() => { setTab(t); setError(''); }}
                sx={{
                  py: 1.2, borderRadius: 0, fontWeight: 700, fontSize: 14, textTransform: 'uppercase',
                  bgcolor: tab === t ? '#6c63ff' : 'transparent',
                  color: tab === t ? 'white' : 'rgba(255,255,255,0.5)',
                  '&:hover': { bgcolor: tab === t ? '#5a52ee' : 'rgba(255,255,255,0.05)' },
                }}>
                {t === 'login' ? 'Login' : 'Sign Up'}
              </Button>
            ))}
          </Box>

          <Box component="form" onSubmit={e => { e.preventDefault(); handleAuth(); }} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tab === 'signup' && (
              <TextField
                label="Full Name" value={name} onChange={e => setName(e.target.value)}
                fullWidth variant="outlined" size="small"
                InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} /></InputAdornment> }}
                sx={inputSx}
              />
            )}
            <TextField
              label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)}
              fullWidth variant="outlined" size="small" required
              InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} /></InputAdornment> }}
              sx={inputSx}
            />
            <TextField
              label="Password" type={showPw ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)} fullWidth variant="outlined" size="small" required
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPw(!showPw)} edge="end" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                      {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={inputSx}
            />

            {error && <Alert severity="error" sx={{ fontSize: 12, py: 0.5 }}>{error}</Alert>}

            <Button type="submit" variant="contained" fullWidth disabled={loading}
              sx={{
                py: 1.4, fontWeight: 800, fontSize: 15, borderRadius: 2,
                background: 'linear-gradient(135deg, #6c63ff, #43cea2)',
                boxShadow: '0 8px 32px rgba(108,99,255,0.4)',
                '&:hover': { background: 'linear-gradient(135deg, #5a52ee, #38b291)', boxShadow: '0 12px 40px rgba(108,99,255,0.6)' },
                transition: 'all 0.3s ease',
              }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : tab === 'login' ? '🔑 Login to Dashboard' : '🚀 Create Account'}
            </Button>
          </Box>

          <Divider sx={{ my: 2.5, color: 'rgba(255,255,255,0.3)', '&::before,&::after': { borderColor: 'rgba(255,255,255,0.1)' } }}>
            <Typography variant="caption" color="rgba(255,255,255,0.4)" fontWeight={600}>OR CONTINUE WITH</Typography>
          </Divider>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button fullWidth variant="outlined" startIcon={<Google />} onClick={handleGoogle}
              sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: 2, fontWeight: 700,
                    '&:hover': { borderColor: '#ea4335', color: '#ea4335', bgcolor: 'rgba(234,67,53,0.08)' } }}>
              Google
            </Button>
            <Button fullWidth variant="outlined" startIcon={<GitHub />} onClick={handleGithub}
              sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: 2, fontWeight: 700,
                    '&:hover': { borderColor: 'rgba(255,255,255,0.6)', color: 'white', bgcolor: 'rgba(255,255,255,0.08)' } }}>
              GitHub
            </Button>
          </Box>

          <Box sx={{ mt: 3, p: 1.5, borderRadius: 2, bgcolor: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.25)' }}>
            <Typography variant="caption" color="rgba(255,255,255,0.6)" display="block" textAlign="center" fontWeight={600}>
              🔑 Demo Credentials
            </Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.5)" display="block" textAlign="center">
              demo@stockai.com &nbsp;/&nbsp; Demo@123
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: 'white',
    borderRadius: 2,
    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(108,99,255,0.6)' },
    '&.Mui-focused fieldset': { borderColor: '#6c63ff' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#a78bfa' },
};
