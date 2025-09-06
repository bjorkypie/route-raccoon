import { useEffect, useState } from 'react';
import {
    Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Loading from './Loading';
import ExpandCircleDownIcon from '@mui/icons-material/ExpandCircleDown';


const API = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

export default function ExportPage() {
    const [athleteId, setAthleteId] = useState<string | null>(null);
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [includeOnlyMileage, setIncludeOnlyMileage] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
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
            Strava Stash 🦝
        </Typography>
        {!athleteId ? (
            <Card>
            <CardContent>
                <Stack spacing={2} alignItems="flex-start">
                <Typography>
                    Sign in to connect your Strava account and export activities.
                </Typography>
                 <IconButton onClick={login} aria-label="Log in with Strava" sx={{ p: 0, borderRadius: 0 }}>
                    <img src="/btn_strava_connect_with_orange.png" alt="Strava login"/>
                </IconButton>
                </Stack>
            </CardContent>
            </Card>
        ) : (
            <Card>
            <CardContent>
                <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary" sx={{pl:1}}>
                    Signed in as athlete <Box component="span" sx={{ fontFamily: 'monospace' }}>{athleteId}</Box> 🐾

                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                {error && <Button variant="contained" color="warning" sx={{color: 'text.secondary'}} onClick={login}>Try logging in again?</Button>}
                <TextField
                    label="Start digging from"
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    slotProps={{ inputLabel: {shrink: true }}}
                    error={start > new Date().toISOString().slice(0, 10)}
                />
                <TextField
                    label="Stop digging at"
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
                        label="Include only activities with mileage (no strength, yoga, etc.)"
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
                        When rummaging through the data bins, big date ranges may take a few minutes — hold tight, and don’t wander off while we work.
                        </Typography>
                        </Stack>
                    )}
                    {success && <Alert severity="success">Export successful!</Alert>}
                </Box>
                </Stack>
            </CardContent>
            </Card>
        )}
         <Typography variant="h4" component="h1" gutterBottom sx={{mt:4}}>
            Waymaker Challenge Upload
        </Typography>
        <Card>
            <CardContent>
            <Typography variant="body1" color="text.secondary" sx={{mb: 2}}>
                We're doing the <a href="https://runsignup.com/Race/IL/Chicago/Waymakers" target="_blank">Waymaker Virtual Mileage Challenge</a>, and our mileage csv downloads are packed just how they like them. Join the challenge and upload your miles here!
            </Typography>
            <Accordion sx={{mt:2}}>
                <AccordionSummary expandIcon={<ExpandCircleDownIcon />  }>
                    <Typography component="span" color="text.secondary" sx={{fontStyle:'italic', pl:1}}>
                    (Optional) Enter your name to go straight to your registration lookup
                </Typography>
                </AccordionSummary>
                <AccordionDetails>
            <Stack spacing={2} sx={{mt:2}}>
                
           <TextField 
                label="First name"
                size="small"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                
            />
            <TextField 
                label="Last name"
                size="small"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                />
            </Stack>
            </AccordionDetails>
            </Accordion>
            <Button variant="contained" color="primary" 
                href={`https://runsignup.com/Race/RegistrationLookup/?raceId=132916${firstName && `&firstName=${firstName}`}${lastName && `&lastName=${lastName}`}${firstName !== "" && lastName !== "" ? "&q=": ""}`}
                sx={{mt:2}} 
                target="_blank"
                size="large"
            >
            Log your Miles 🏃‍♀️🚶🚴
            </Button>
            </CardContent>
        </Card>
        </Container>
    );
}
