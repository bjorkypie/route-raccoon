import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Loading from './Loading';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

export default function ExportPage() {
    const [athleteId, setAthleteId] = useState<string | null>(null);
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [includeOnlyMileage, setIncludeOnlyMileage] = useState(false);

    useEffect(() => {
        const exp = localStorage.getItem('expiresAt');
        if (exp) {
        const expNum = Number(exp);
        if (!isNaN(expNum)) {
            if (Date.now() >= expNum * 1000) {
            setAthleteId(null);
            localStorage.removeItem('athleteId');
            localStorage.removeItem('expiresAt');
            }
        }
        }
    }, []);
 
    useEffect(() => setAthleteId(localStorage.getItem('athleteId')), []);
    useEffect(() => {if(error){console.log(error)}}, [error])
    useEffect(() => {
        if(!busy && !error){
            const id = setTimeout(() => setSuccess(false), 30000);
            return () => clearTimeout(id);
        } else {
            setSuccess(false);
        }
    }, [busy])
    
    const login = () => (window.location.href = `${API}/api/auth/login`);
    const exportOptions = {
        gpx: {
            path:`${API}/api/export/gpx`,

        },
        csv: {
            path:`${API}/api/export/csv`
        }
    }
    const doExport = async (exportType:'gpx'|'csv') => {
        if (!athleteId || !start || !end) return;
        setBusy(true);
        setError(null);
        try {
        const r = await fetch(exportOptions[exportType].path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ athleteId, startDate: start, endDate: end, includeOnlyMileage }),
        });
        if (!r.ok) throw new Error(await r.text());
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `strava_export_${start}_${end}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        } catch (e: unknown) {
        setError(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setSuccess(true)
            setBusy(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
            Strava Export
        </Typography>
        {!athleteId ? (
            <Card>
            <CardContent>
                <Stack spacing={2} alignItems="flex-start">
                <Typography>
                    Sign in to connect your Strava account and export activities.
                </Typography>
                <Button variant="contained" color="primary" onClick={login}>
                    Sign in with Strava
                </Button>
                </Stack>
            </CardContent>
            </Card>
        ) : (
            <Card>
            <CardContent>
                <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary" sx={{pl:1}}>
                    Signed in as athlete <Box component="span" sx={{ fontFamily: 'monospace' }}>{athleteId}</Box>

                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                {error && <Button variant="contained" color="warning" sx={{color: 'text.secondary'}} onClick={login}>Try logging in again?</Button>}
                <TextField
                    label="Start date"
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    slotProps={{ inputLabel: {shrink: true }}}
                    error={start > new Date().toISOString().slice(0, 10)}
                />
                <TextField
                    label="End date"
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    slotProps={{ inputLabel: {shrink: true }}}
                    disabled={!start}
                    error={end > new Date().toISOString().slice(0, 10) || end < start}
                />
                <Box sx={{gap: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center'}}>
                    <FormControlLabel 
                        control={<Checkbox checked={includeOnlyMileage} size="small" color="secondary"/>}
                        onChange={() => setIncludeOnlyMileage(!includeOnlyMileage)}
                        label="Include only activities with mileage data"
                        slotProps={{typography: {fontSize: '0.75rem'}}}
                        sx={{pl:1}}
                    />
                    <Button
                    variant="contained"
                    onClick={() => doExport('csv')}
                    disabled={busy || !start || !end || start > end || end > new Date().toISOString().slice(0, 10)}
                    >
                    {busy ? 'Exporting…' : 'Download CSV ZIP'}
                    </Button>
                    {busy ? (
                    <Loading />
                    ) : (
                        <Stack sx={{pl:1}}>
                        <Typography variant="body2" color="text.secondary" sx={{fontStyle:'italic'}}>
                        Exports may take a few minutes depending on the date range and the data source's API limits. Please be patient and avoid navigating away from this page.
                        </Typography>
                        </Stack>
                    )}
                    {success && <Alert severity="success">Export successful!</Alert>}
                </Box>
                </Stack>
            </CardContent>
            </Card>
        )}
        
        </Container>
    );
}
