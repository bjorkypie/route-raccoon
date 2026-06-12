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
import { alpha, useTheme } from '@mui/material/styles';
import Loading from './Loading';
import ExpandCircleDownIcon from '@mui/icons-material/ExpandCircleDown';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8787';
const today = new Date().toISOString().slice(0, 10);
const BRAND = {
    tangelo: '#fb5012',
    smokyBlack: '#0f0a0a',
    isabelline: '#f5efed',
    blueMunsell: '#2292a4',
    citrine: '#bdbf09',
} as const;

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

const svgToPngBlob = async (svg: string) => {
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Unable to render summary image.'));
            img.src = svgUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;

        const context = canvas.getContext('2d');
        if (!context) throw new Error('Unable to prepare PNG canvas.');

        context.drawImage(image, 0, 0);

        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Unable to export PNG image.'));
            }, 'image/png');
        });
    } finally {
        URL.revokeObjectURL(svgUrl);
    }
};

function buildSummarySvg(
    summaryData: SummaryResponse,
    selectedActivityTypes: string[],
    includeOnlyMileage: boolean,
    commuteOnly: boolean,
    isDarkMode: boolean
) {
    const selectedLabels = activityTypeOptions
        .filter(option => selectedActivityTypes.includes(option.value))
        .map(option => option.label);
    const filterLabel = selectedLabels.length > 0 ? selectedLabels.join(', ') : 'All activity types';
    const mileageLabel = includeOnlyMileage ? 'Only activities with mileage' : 'All activities';
    const commuteLabel = commuteOnly ? 'Commutes only' : 'Commutes and non-commutes';
    const rows = summaryData.summary.totalsByType.slice(0, 10);
    const sectionTop = 322;
    const columnHeaderY = sectionTop + 24;
    const firstRowY = columnHeaderY + 30;
    const rowHeight = 30;
    const sectionBottom = firstRowY + rows.length * rowHeight + 24;
    const height = Math.max(420, sectionBottom);
    const background = isDarkMode ? BRAND.smokyBlack : BRAND.isabelline;
    const panel = isDarkMode ? '#141010' : '#ffffff';
    const panelBorder = isDarkMode ? alpha(BRAND.tangelo, 0.4) : alpha(BRAND.blueMunsell, 0.35);
    const heading = isDarkMode ? BRAND.isabelline : BRAND.smokyBlack;
    const accent = isDarkMode ? BRAND.tangelo : BRAND.blueMunsell;
    const secondary = isDarkMode ? '#c9c9c9' : '#5b5b5b';
    const rule = isDarkMode ? alpha(BRAND.isabelline, 0.18) : alpha(BRAND.blueMunsell, 0.18);
    const rowMarkup = rows
        .map(
            (row, index) => `
                <text x="40" y="${firstRowY + index * rowHeight}" font-family="Roboto Mono, Arial, sans-serif" font-size="15" fill="${heading}">${xmlEscape(row.type)}</text>
                <text x="360" y="${firstRowY + index * rowHeight}" text-anchor="end" font-family="Roboto Mono, Arial, sans-serif" font-size="15" fill="${secondary}">${row.activityCount} activities</text>
                <text x="580" y="${firstRowY + index * rowHeight}" text-anchor="end" font-family="Roboto Mono, Arial, sans-serif" font-size="15" fill="${secondary}">${row.totalDistanceMiles.toFixed(2)} mi</text>
            `
        )
        .join('');

    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="640" height="${height}" viewBox="0 0 640 ${height}">
            <rect width="640" height="${height}" rx="24" fill="${background}" />
            <rect x="20" y="20" width="600" height="${height - 40}" rx="18" fill="${panel}" stroke="${panelBorder}" stroke-width="2" />
            <text x="40" y="68" font-family="Doto, Arial, sans-serif" font-size="36" font-weight="700" fill="${accent}">Route Raccoon</text>
            <text x="40" y="92" font-family="Roboto Mono, Arial, sans-serif" font-size="15" font-weight="700" fill="${secondary}">SUMMARY SNAPSHOT</text>
            <text x="40" y="126" font-family="DM Serif Display, Georgia, serif" font-size="30" font-weight="700" fill="${heading}">${xmlEscape(summaryData.startDate)} to ${xmlEscape(summaryData.endDate)}</text>
            <text x="40" y="154" font-family="Roboto Mono, Arial, sans-serif" font-size="14" fill="${secondary}">${xmlEscape(filterLabel)}</text>
            <text x="40" y="174" font-family="Roboto Mono, Arial, sans-serif" font-size="14" fill="${secondary}">${xmlEscape(mileageLabel)}</text>
            <text x="40" y="194" font-family="Roboto Mono, Arial, sans-serif" font-size="14" fill="${secondary}">${xmlEscape(commuteLabel)}</text>
            <text x="40" y="238" font-family="DM Serif Display, Georgia, serif" font-size="42" font-weight="700" fill="${accent}">${summaryData.summary.totalDistanceMiles.toFixed(2)} mi</text>
            <text x="40" y="266" font-family="Roboto Mono, Arial, sans-serif" font-size="16" fill="${secondary}">${summaryData.summary.activityCount} activities</text>
            <text x="40" y="288" font-family="Roboto Mono, Arial, sans-serif" font-size="16" fill="${secondary}">Moving time ${formatDuration(summaryData.summary.totalMovingTimeSeconds)}</text>
            <line x1="40" y1="300" x2="600" y2="300" stroke="${rule}" stroke-width="1" />
            <text x="40" y="${sectionTop}" font-family="Roboto Mono, Arial, sans-serif" font-size="18" font-weight="700" fill="${accent}">By sport type</text>
            <text x="40" y="${columnHeaderY}" font-family="Roboto Mono, Arial, sans-serif" font-size="12" font-weight="700" fill="${secondary}">TYPE</text>
            <text x="360" y="${columnHeaderY}" text-anchor="end" font-family="Roboto Mono, Arial, sans-serif" font-size="12" font-weight="700" fill="${secondary}">COUNT</text>
            <text x="580" y="${columnHeaderY}" text-anchor="end" font-family="Roboto Mono, Arial, sans-serif" font-size="12" font-weight="700" fill="${secondary}">DISTANCE</text>
            <line x1="40" y1="${columnHeaderY + 10}" x2="600" y2="${columnHeaderY + 10}" stroke="${rule}" stroke-width="1" />
            ${rowMarkup}
        </svg>
    `.trim();
}

export default function ExportPage() {
    const { athleteId, login, clearAuth } = useAthleteAuth();
    const theme = useTheme();
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
            const svg = buildSummarySvg(summaryData, selectedActivityTypes, includeOnlyMileage, commuteOnly, theme.palette.mode === 'dark');
            const pngBlob = await svgToPngBlob(svg);
            downloadBlob(pngBlob, `strava_summary_${start}_${end}.png`);
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
                        <Card
                            sx={{
                                overflow: 'hidden',
                                background: theme.palette.mode === 'dark'
                                    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.16)}, ${alpha(BRAND.smokyBlack, 0.92)})`
                                    : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.secondary.main, 0.08)})`,
                                borderColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.38 : 0.24),
                            }}
                        >
                            <CardContent>
                                <Stack spacing={2.5}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                                        <Box>
                                            <Typography
                                                variant="overline"
                                                sx={{ color: 'primary.main', letterSpacing: '0.16em', fontWeight: 700, fontFamily: 'Roboto Mono' }}
                                            >
                                                Summary Snapshot
                                            </Typography>
                                            <Typography variant="h3" sx={{ fontFamily: 'Doto', fontWeight: 700, color: 'primary.main', lineHeight: 1 }}>
                                                Route Raccoon
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {summaryData.startDate} to {summaryData.endDate}
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                px: 2.5,
                                                py: 1.75,
                                                borderRadius: 3,
                                                bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.3 : 0.75),
                                                border: '1px solid',
                                                borderColor: alpha(theme.palette.primary.main, 0.18),
                                                minWidth: { sm: 200 },
                                            }}
                                        >
                                            <Typography variant="overline" sx={{ color: 'primary.main', lineHeight: 1.2 }}>
                                                Total Miles
                                            </Typography>
                                            <Typography variant="h4" sx={{ color: 'secondary.main', lineHeight: 1.05 }}>
                                                {summaryData.summary.totalDistanceMiles.toFixed(2)}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} flexWrap="wrap">
                                        <Chip label={`${summaryData.summary.activityCount} activities`} color="primary" />
                                        <Chip label={`Moving time ${formatDuration(summaryData.summary.totalMovingTimeSeconds)}`} color="secondary" />
                                        <Chip
                                            label={commuteOnly ? 'Commutes only' : 'All commute tags'}
                                            sx={{
                                                bgcolor: alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.24 : 0.12),
                                                color: theme.palette.text.primary,
                                                border: '1px solid',
                                                borderColor: alpha(theme.palette.info.main, 0.28),
                                            }}
                                        />
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedActivityTypes.length > 0
                                            ? `Filtered to ${selectedActivityTypes.length} selected activity types.`
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
                                                        px: 1.5,
                                                        py: 1.25,
                                                        borderRadius: 2,
                                                        bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.24 : 0.7),
                                                        border: '1px solid',
                                                        borderColor: alpha(theme.palette.primary.main, 0.12),
                                                        flexWrap: 'wrap',
                                                    }}
                                                >
                                                    <Typography fontWeight={700} sx={{ color: 'primary.main' }}>{item.type}</Typography>
                                                    <Typography color="text.secondary" sx={{ fontFamily: 'Roboto Mono, monospace' }}>
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
