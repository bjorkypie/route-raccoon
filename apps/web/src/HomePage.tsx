import { Box, Button, Card, CardContent, Chip, Container, IconButton, Stack, Typography } from '@mui/material';
import { useAthleteAuth } from './hooks/useAthleteAuth';

export default function HomePage() {
  const { athleteId, login, clearAuth } = useAthleteAuth();

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
          <Stack direction="row" spacing={2}>
            <Button variant="contained" color="primary" href="/export">
              Go to Export
            </Button>
            <Button variant="outlined" color="secondary" onClick={clearAuth}>
              Logout
            </Button>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
