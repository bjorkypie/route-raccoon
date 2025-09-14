
import { useContext, useEffect, useState } from 'react';
import HomePage from './HomePage';
import ExportPage from './ExportPage';
import PrivacyPolicy from './PrivacyPolicy';
import { AppBar, Box, Button, Chip, Container, Toolbar, Typography } from '@mui/material';
import { ColorModeContext } from './theme';
import dayjs from 'dayjs'


function App() {
  // Capture athleteId returned as a hash from OAuth callback
  useEffect(() => {
    const m = window.location.hash.match(/athleteId=([^&]+)/);
    const exp = window.location.hash.match(/expiresAt=([^&]+)/);
    if (exp) {
      localStorage.setItem('expiresAt', decodeURIComponent(exp[1]));
    }
    if (m) {
      localStorage.setItem('athleteId', decodeURIComponent(m[1]));
      window.location.replace('/');
    }
  }, []);

  const [path, setPath] = useState<string>(() => window.location.pathname || '/');
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string) => {
    if (to !== path) {
      window.history.pushState(null, '', to);
      setPath(to);
    }
  };

  const colorMode = useContext(ColorModeContext);
  const currentYear = dayjs().format('YYYY');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column'}}>
      <AppBar position="sticky" color="primary" elevation={1}>
        <Toolbar>
          <Typography variant="h3" sx={{ flexGrow: 1, fontFamily: 'Doto', fontWeight: 700, gap:2 }} component="h1" color="inherit">
            Route Raccoon
          <Chip label="Beta" color="warning" size="small" sx={{marginLeft: 1}} />
          </Typography>
          <Button
            color="inherit"
            onClick={() => navigate('/')}
            aria-current={path === '/' ? 'page' : undefined}
            sx={(theme) => ({
              borderRadius: 0,
              borderBottom: path === '/' ? `2px solid ${theme.palette.primary.contrastText}` : '2px solid transparent',
            })}
          >
            Home
          </Button>
          <Button
            color="inherit"
            onClick={() => navigate('/export')}
            aria-current={path === '/export' ? 'page' : undefined}
            sx={(theme) => ({
              borderRadius: 0,
              borderBottom: path === '/export' ? `2px solid ${theme.palette.primary.contrastText}` : '2px solid transparent',
            })}
          >
            Export
          </Button>
          <Button
            color="inherit"
            onClick={() => navigate('/privacy')}
            aria-current={path === '/privacy' ? 'page' : undefined}
            sx={(theme) => ({
              borderRadius: 0,
              borderBottom: path === '/privacy' ? `2px solid ${theme.palette.primary.contrastText}` : '2px solid transparent',
            })}
          >
            Privacy
          </Button>
          <Button onClick={colorMode.toggle} sx={{ ml: 1 }} color="inherit">
            {colorMode.mode === 'dark' ? '🌞 Light' : '🌙 Dark'}
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1, width: '100%' }}>
  {path === '/export' ? <ExportPage /> : path === '/privacy' ? <PrivacyPolicy /> : <HomePage />}
      </Container>
      <AppBar component="footer" position="static" color="primary" sx={{ mt: 4, py: 2, top: 'auto', bottom: 0 }}>
        <Container maxWidth="xl" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <img src="/api_logo_pwrdBy_strava_horiz_white.png" alt="Powered by Strava" style={{ width: 300, marginLeft: 10 }}/>
          <Typography variant="body2" color="inherit" align="right">
            &copy; {currentYear} by <a href="https://madelinehassett.com" style={{color: 'inherit', textDecoration: 'underline'}}>Madeline H</a> 🦝  <a href="/privacy" style={{color: 'inherit', textDecoration: 'underline'}}>Privacy</a> · Source code on{' '}
            <a href="https://github.com/bjorkypie/" style={{color: 'inherit', textDecoration: 'underline'}}>GitHub</a>.
          </Typography>
        </Container>
      </AppBar>
    </Box>
  );
}

export default App
