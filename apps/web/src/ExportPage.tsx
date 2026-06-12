import { useEffect, useState } from 'react';
import { useAthleteAuth } from './hooks/useAthleteAuth';
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
    Chip,
    Container,
    FormControlLabel,
    FormGroup,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import Loading from './Loading';
import ExpandCircleDownIcon from '@mui/icons-material/ExpandCircleDown';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8787';
const today = new Date().toISOString().slice(0, 10);

const activityTypeOptions = [
    { label: 'Run', value: 'Run' },
    { label: 'Ride', value: 'Ride' },
    { label: 'Walk', value: 'Walk' },
    { label: 'Hike', value: 'Hike' },
    { label: 'Swim', value: 'Swim' },
    { label: 'Rowing', value: 'Rowing' },
    { label: 'Kayaking', value: 'Kayaking' },
    { label: 'Canoeing', value: 'Canoeing' },
    { label: 'Stand Up Paddleboarding', value: 'StandUpPaddling' },
    { label: 'Surfing', value: 'Surfing' },
    { label: 'Windsurfing', value: 'Windsurfing' },
    { label: 'Kitesurfing', value: 'Kitesurfing' },
    { label: 'Snowboard', value: 'Snowboard' },
    { label: 'Skateboard', value: 'Skateboard' },
    { label: 'Inline Skate', value: 'InlineSkate' },
    { label: 'Elliptical', value: 'Elliptical' },
    { label: 'Ice Skating', value: 'IceSkate' },
    { label: 'Skiing', value: 'Ski' },
    { label: 'Snowshoeing', value: 'Snowshoe' },
    { label: 'Wheelchair', value: 'Wheelchair' },
    { label: 'Virtual Run', value: 'VirtualRun' },
    { label: 'Virtual Ride', value: 'VirtualRide' },
    { label: 'E-Bike Ride', value: 'EBikeRide' },
] as const;

type SummaryResponse = {
    startDate: string;
    endDate: string;
    summary: {
        activityCount: number;
        totalDistanceMiles: number;
        totalMovingTimeSeconds: number;
        totalsByType: Array<{
            type: string;
            activityCount: number;
            totalDistanceMiles: number;
            totalMovingTimeSeconds: number;
        }>;
    };
};

const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map(value => value.toString().padStart(2, '0')).join(':');
};

const xmlEscape = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
};

function buildSummarySvg(
    summaryData: SummaryResponse,
    selectedActivityTypes: string[],
    includeOnlyMileage: boolean,
    commuteOnly: boolean
) {
    const selectedLabels = activityTypeOptions
        .filter(option => selectedActivityTypes.includes(option.value))
        .map(option => option.label);
    const filterLabel = selectedLabels.length > 0 ? selectedLabels.join(', ') : 'All activity types';
    const mileageLabel = includeOnlyMileage ? 'Only activities with mileage' : 'All activities';
    const commuteLabel = commuteOnly ? 'Commutes only' : 'Commutes and non-commutes';
    const rows = summaryData.summary.totalsByType.slice(0, 10);
    const sectionTop = 308;
    const columnHeaderY = sectionTop + 24;
    const firstRowY = columnHeaderY + 30;
    const rowHeight = 30;
    const sectionBottom = firstRowY + rows.length * rowHeight + 24;
    const height = Math.max(420, sectionBottom);

    const rowMarkup = rows
        .map(
            (row, index) => `
                <text x="40" y="${firstRowY + index * rowHeight}" font-family="Arial, sans-serif" font-size="15" fill="#3b322c">${xmlEscape(row.type)}</text>
                <text x="360" y="${firstRowY + index * rowHeight}" text-anchor="end" font-family="Arial, sans-serif" font-size="15" fill="#3b322c">${row.activityCount} activities</text>
                <text x="580" y="${firstRowY + index * rowHeight}" text-anchor="end" font-family="Arial, sans-serif" font-size="15" fill="#3b322c">${row.totalDistanceMiles.toFixed(2)} mi</text>
            `
        )
        .join('');

    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="640" height="${height}" viewBox="0 0 640 ${height}">
            <rect width="640" height="${height}" rx="24" fill="#f6efe7" />
            <rect x="20" y="20" width="600" height="${height - 40}" rx="18" fill="#fffaf4" stroke="#d4b483" stroke-width="2" />
            <text x="40" y="64" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#6d4c2f">Route Raccoon Summary</text>
            <text x="40" y="92" font-family="Arial, sans-serif" font-size="16" fill="#7b685a">${xmlEscape(summaryData.startDate)} to ${xmlEscape(summaryData.endDate)}</text>
            <text x="40" y="118" font-family="Arial, sans-serif" font-size="14" fill="#7b685a">${xmlEscape(filterLabel)}</text>
            <text x="40" y="138" font-family="Arial, sans-serif" font-size="14" fill="#7b685a">${xmlEscape(mileageLabel)}</text>
            <text x="40" y="158" font-family="Arial, sans-serif" font-size="14" fill="#7b685a">${xmlEscape(commuteLabel)}</text>
            <text x="40" y="198" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#2c241f">${summaryData.summary.totalDistanceMiles.toFixed(2)} mi</text>
            <text x="40" y="226" font-family="Arial, sans-serif" font-size="16" fill="#7b685a">${summaryData.summary.activityCount} activities</text>
            <text x="40" y="248" font-family="Arial, sans-serif" font-size="16" fill="#7b685a">Moving time ${formatDuration(summaryData.summary.totalMovingTimeSeconds)}</text>
            <line x1="40" y1="270" x2="600" y2="270" stroke="#d9c4aa" stroke-width="1" />
            <text x="40" y="${sectionTop}" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#6d4c2f">By Strava activity type</text>
            <text x="40" y="${columnHeaderY}" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#7b685a">TYPE</text>
            <text x="360" y="${columnHeaderY}" text-anchor="end" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#7b685a">COUNT</text>
            <text x="580" y="${columnHeaderY}" text-anchor="end" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#7b685a">DISTANCE</text>
            <line x1="40" y1="${columnHeaderY + 10}" x2="600" y2="${columnHeaderY + 10}" stroke="#d9c4aa" stroke-width="1" />
            ${rowMarkup}
        </svg>
    `.trim();
}

export default function ExportPage() {
    const { athleteId, login, clearAuth } = useAthleteAuth();
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [busy, setBusy] = useState(false);
    const [summaryBusy, setSummaryBusy] = useState(false);
    const [imageBusy, setImageBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [includeOnlyMileage, setIncludeOnlyMileage] = useState(false);
    const [includeTotalsRow, setIncludeTotalsRow] = useState(false);
    const [commuteOnly, setCommuteOnly] = useState(false);
    const [selectedActivityTypes, setSelectedActivityTypes] = useState<string[]>([]);
    const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);

    useEffect(() => {
        if (!success) return;
        const id = window.setTimeout(() => setSuccess(false), 5000);
        return () => window.clearTimeout(id);
    }, [success]);

    useEffect(() => {
        setSummaryData(null);
    }, [start, end, includeOnlyMileage, includeTotalsRow, commuteOnly, selectedActivityTypes]);

    const canSubmit = Boolean(
        athleteId && start && end && start <= end && start <= today && end <= today
    );

    const requestBody = {
        athleteId,
        startDate: start,
        endDate: end,
        includeOnlyMileage,
        includeTotalsRow,
        commuteOnly,
        activityTypes: selectedActivityTypes,
    };

    const toggleActivityType = (value: string) => {
        setSelectedActivityTypes(current =>
            current.includes(value) ? current.filter(type => type !== value) : [...current, value]
        );
    };

    const doExport = async () => {
        if (!canSubmit) return;
        setBusy(true);
        setError(null);
        try {
            const response = await fetch(`${API}/api/export/csv`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) throw new Error(await response.text());
            const blob = await response.blob();
            downloadBlob(blob, `strava_export_${start}_${end}.zip`);
            setSuccess(true);
        } catch (e: unknown) {
            setError(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setBusy(false);
        }
    };

    const fetchSummary = async () => {
        if (!canSubmit) return;
        setSummaryBusy(true);
        setError(null);
        try {
            const response = await fetch(`${API}/api/export/summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) throw new Error(await response.text());
            const data = (await response.json()) as SummaryResponse;
            setSummaryData(data);
        } catch (e: unknown) {
            setError(`Summary failed: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setSummaryBusy(false);
        }
    };

    const downloadSummaryImage = async () => {
        if (!summaryData) return;
        setImageBusy(true);
        setError(null);
        try {
            const svg = buildSummarySvg(summaryData, selectedActivityTypes, includeOnlyMileage, commuteOnly);
            downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `strava_summary_${start}_${end}.svg`);
        } catch (e: unknown) {
            setError(`Summary image failed: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setImageBusy(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
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
                                <img src="/btn_strava_connect_with_orange.png" alt="Strava login" />
                            </IconButton>
                        </Stack>
                    </CardContent>
                </Card>
            ) : (
                <Stack spacing={3}>
                    <Card>
                        <CardContent>
                            <Stack spacing={2.5}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 1, flexWrap: 'wrap' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Signed in as <Box component="span" sx={{ fontFamily: 'monospace' }}>{athleteId}</Box> 🐾
                                    </Typography>
                                    <Button size="small" variant="contained" color="warning" onClick={clearAuth}>Logout</Button>
                                </Stack>
                                {error && <Alert severity="error">{error}</Alert>}
                                {success && <Alert severity="success">Export successful!</Alert>}
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <TextField
                                        fullWidth
                                        label="Start digging from"
                                        type="date"
                                        value={start}
                                        onChange={event => setStart(event.target.value)}
                                        slotProps={{ inputLabel: { shrink: true } }}
                                        error={start > today}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Stop digging at"
                                        type="date"
                                        value={end}
                                        onChange={event => setEnd(event.target.value)}
                                        slotProps={{ inputLabel: { shrink: true } }}
                                        disabled={!start}
                                        error={end > today || end < start}
                                    />
                                </Stack>
                                <Stack spacing={0.5}>
                                    <FormControlLabel
                                        control={<Checkbox checked={includeOnlyMileage} size="small" color="secondary" />}
                                        onChange={() => setIncludeOnlyMileage(current => !current)}
                                        label="Include only activities with mileage"
                                        slotProps={{ typography: { fontSize: '0.9rem' } }}
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={commuteOnly} size="small" color="secondary" />}
                                        onChange={() => setCommuteOnly(current => !current)}
                                        label="Only include activities marked as commutes"
                                        slotProps={{ typography: { fontSize: '0.9rem' } }}
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={includeTotalsRow} size="small" color="secondary" />}
                                        onChange={() => setIncludeTotalsRow(current => !current)}
                                        label="Add a totals row at the end of the CSV"
                                        slotProps={{ typography: { fontSize: '0.9rem' } }}
                                    />
                                </Stack>
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandCircleDownIcon />}>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                                            <Typography component="span">Activity type filter</Typography>
                                            <Chip
                                                size="small"
                                                label={selectedActivityTypes.length > 0 ? `${selectedActivityTypes.length} selected` : 'All types'}
                                                color={selectedActivityTypes.length > 0 ? 'secondary' : 'default'}
                                            />
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Stack spacing={1.5}>
                                            <Typography variant="body2" color="text.secondary">
                                                Leave everything unchecked to include every activity type.
                                            </Typography>
                                            <Stack direction="row" spacing={1}>
                                                <Button size="small" onClick={() => setSelectedActivityTypes(activityTypeOptions.map(option => option.value))}>Select all</Button>
                                                <Button size="small" onClick={() => setSelectedActivityTypes([])}>Clear</Button>
                                            </Stack>
                                            <FormGroup>
                                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2 }}>
                                                    {activityTypeOptions.map(option => (
                                                        <FormControlLabel
                                                            key={option.value}
                                                            control={<Checkbox checked={selectedActivityTypes.includes(option.value)} size="small" color="secondary" />}
                                                            onChange={() => toggleActivityType(option.value)}
                                                            label={option.label}
                                                        />
                                                    ))}
                                                </Box>
                                            </FormGroup>
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
                                    <Button variant="contained" onClick={doExport} disabled={busy || !canSubmit}>
                                        {busy ? 'Exporting…' : 'Download CSV ZIP'}
                                    </Button>
                                    <Button variant="outlined" onClick={fetchSummary} disabled={summaryBusy || !canSubmit}>
                                        {summaryBusy ? 'Building summary…' : 'Preview summary'}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        onClick={downloadSummaryImage}
                                        disabled={imageBusy || !summaryData}
                                    >
                                        {imageBusy ? 'Preparing image…' : 'Download summary image'}
                                    </Button>
                                </Stack>
                                {(busy || summaryBusy) && <Loading />}
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    Big date ranges may take a few minutes. Summary and CSV use the same filters so the numbers stay aligned.
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>

                    {summaryData && (
                        <Card>
                            <CardContent>
                                <Stack spacing={2}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                                        <Box>
                                            <Typography variant="h5">Summary snapshot</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {summaryData.startDate} to {summaryData.endDate}
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            <Chip label={`${summaryData.summary.activityCount} activities`} color="primary" />
                                            <Chip label={`${summaryData.summary.totalDistanceMiles.toFixed(2)} miles`} color="secondary" />
                                            <Chip label={formatDuration(summaryData.summary.totalMovingTimeSeconds)} />
                                        </Stack>
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedActivityTypes.length > 0
                                            ? `Filtered to ${selectedActivityTypes.length} selected Strava activity types.`
                                            : 'Showing every activity type in the selected date range.'}
                                        {commuteOnly ? ' Commute filter is on.' : ''}
                                    </Typography>
                                    <Stack spacing={1}>
                                        {summaryData.summary.totalsByType.length > 0 ? (
                                            summaryData.summary.totalsByType.map(item => (
                                                <Box
                                                    key={item.type}
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        gap: 2,
                                                        py: 1,
                                                        borderBottom: '1px solid',
                                                        borderColor: 'divider',
                                                        flexWrap: 'wrap',
                                                    }}
                                                >
                                                    <Typography fontWeight={600}>{item.type}</Typography>
                                                    <Typography color="text.secondary">
                                                        {item.activityCount} activities · {item.totalDistanceMiles.toFixed(2)} miles · {formatDuration(item.totalMovingTimeSeconds)}
                                                    </Typography>
                                                </Box>
                                            ))
                                        ) : (
                                            <Alert severity="info">No activities matched these filters.</Alert>
                                        )}
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}
                </Stack>
            )}

        </Container>
    );
}
