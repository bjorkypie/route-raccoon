import { Box, Button, Card, CardContent, Chip, Container, IconButton, Stack, Typography } from '@mui/material';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

export default function HomePage() {
  const athleteId = typeof window !== 'undefined' ? localStorage.getItem('athleteId') : null;
  // Derived flag: we will hide export button if expired or server says token invalid
  const expired = (() => {
    if (typeof window === 'undefined') return false;
    const exp = localStorage.getItem('expiresAt');
    if (!exp) return false;
    const expNum = Number(exp);
    return !isNaN(expNum) && Date.now() >= expNum * 1000;
  })();

  // If expired, clear immediately so UI shows login
  if (expired && typeof window !== 'undefined') {
    localStorage.removeItem('athleteId');
    localStorage.removeItem('expiresAt');
  }

  // Optional server validation: if athleteId exists but server no longer has token (dyno restart), clear it.
  if (athleteId && typeof window !== 'undefined' && !expired) {
    // fire and forget; we avoid adding React state complexity here
    fetch(`${API}/api/auth/status?athleteId=${encodeURIComponent(athleteId)}`)
      .then(r => r.json())
      .then(d => {
        if (!d?.authenticated) {
          localStorage.removeItem('athleteId');
          localStorage.removeItem('expiresAt');
          // force repaint by navigating to same route (cheap way w/out state)
          window.requestAnimationFrame(() => window.dispatchEvent(new Event('storage')));
        }
      })
      .catch(() => { /* ignore */ });
  }

  const login = () => (window.location.href = `${API}/api/auth/login`);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Box component="img" src={`/routeraccoon.png`} alt="Route Raccoon logo" sx={{ height: 120, borderRadius:2 }} />
      </Box>
      <Typography variant="h3" sx={{fontFamily: 'Doto'}} align="center" gutterBottom>
        Route Raccoon
        <Chip label="Beta" color="warning" size="small" sx={{marginLeft: 1}} />
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography align="center">
            We rummage through your runs, you download the loot. 🦝
          </Typography>
        </CardContent>
      </Card>
      <Stack spacing={2} alignItems="center">
  {!athleteId ? (
         <IconButton onClick={login} aria-label="Log in with Strava" sx={{ p: 0, borderRadius: 0 }}>
          <img src="/btn_strava_connect_with_orange.png" alt="Strava login"/>
          </IconButton>
        ) : (
          <Button variant="contained" color="primary" href="/export">
            Go to Export
          </Button>
        )}
      </Stack>
    </Container>
  );
}
