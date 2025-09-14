import { Box, Container, Link, List, ListItem, Typography } from '@mui/material';
import dayjs from 'dayjs';

// Route Raccoon Privacy Policy
// This document is intentionally concise and tailored to the current functionality (activity export)
// while disclosing anticipated data use for roadmap features (Dashboard, Training, Maps, Challenges)
// to satisfy advance transparency expectations and Strava API Agreement obligations.

export default function PrivacyPolicy() {
	const effectiveDate = '2024-11-11'; // Aligns with stated effective date requirement
	const currentYear = dayjs().format('YYYY');
	return (
		<Container maxWidth="md" sx={{ py: 4 }}>
			<Typography variant="h3" component="h1" gutterBottom sx={{ fontFamily: 'Doto', fontWeight: 700 }}>
				Privacy Policy
			</Typography>
			<Typography variant="subtitle2" color="text.secondary" gutterBottom>
				Effective Date: {effectiveDate}
			</Typography>

			<Section title="1. Who We Are">
				<Typography>
					Route Raccoon ("we", "us", "our") is a personal utility that lets you authenticate with Strava and export
					your own activity data for personal use. The project is in beta and operated by an individual developer.
				</Typography>
			</Section>

			<Section title="2. Scope">
				<Typography>
					This Policy explains what data we access via the Strava API, what (little) we store, how we use it now, and how
					future planned features (Dashboard, Training, Maps, Challenges) may process your data. We only ever process data
					for the authenticated athlete. We never display or disclose another athlete&apos;s data to you, even if it is
					public on Strava.
				</Typography>
			</Section>

			<Section title="3. Summary (TL;DR)">
				<List sx={{ listStyle: 'disc', pl: 4 }}>
					<ListItem sx={{ display: 'list-item', py: 0 }}>You log in with Strava; we receive an athlete identifier and scoped access token.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>We request only the minimum scopes required to list and export your activities.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>We generate a ZIP containing CSV file client‑side (after server fetch) and immediately stream it to you.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>We do not sell, rent, or monetize your data. No ads. No third‑party analytics.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>We retain only transient processing logs and a short‑lived athlete session reference (in your browser localStorage).</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Delete your data by revoking the app in Strava or clearing your browser storage; exports are not kept server‑side.</ListItem>
				</List>
			</Section>

			<Section title="4. Data We Receive From Strava">
				<Typography gutterBottom>
					Depending on the scopes you approve, we may access the following activity fields strictly for your account:
				</Typography>
				<List sx={{ listStyle: 'disc', pl: 4 }}>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Activity metadata: id, name, type, start date/time, timezone.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Metrics: distance, moving/elapsed time, pace/speed, elevation gain.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Optional: average/max heart rate, cadence, power (if in your Strava activity and scope granted).</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Geospatial stream (lat/long points) only when needed to generate GPX exports.</ListItem>
				</List>
				<Typography variant="body2" color="text.secondary">
					We do NOT request or store: your Strava password, other athletes&apos; data, segments leaderboards, clubs, messages.
				</Typography>
			</Section>

			<Section title="5. Local Storage & Sessions">
				<Typography>
					In your browser we store: (a) athleteId (opaque identifier) and (b) an expiration timestamp. These are used only
					to keep you signed in during the valid OAuth period. Clearing your browser storage removes them. No tracking cookies
					or cross‑site identifiers are set; we do not use third‑party advertising or analytics scripts.
				</Typography>
			</Section>

			<Section title="6. How We Use Data Today (Export Feature)">
				<List sx={{ listStyle: 'disc', pl: 4 }}>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Fetch your activities from Strava for the date range you choose.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Filter by activity types with distance if you select that option.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Assemble export files (CSV) and deliver them to your browser.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Immediately discard fetched activity payloads after the HTTP response completes (only transient in memory / short-lived buffers).</ListItem>
				</List>
			</Section>

			<Section title="7. Planned Feature Data Use" subtitle="Advance transparency for upcoming roadmap">
				<Typography gutterBottom>
					We outline expected processing so you can make an informed decision before those features launch. Changes will be
					updated here and may require renewed consent if scope changes.
				</Typography>
				<List sx={{ listStyle: 'disc', pl: 4 }}>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Dashboard: Aggregate YOUR activities into weekly/monthly totals rendered in your browser. No server persistence beyond cached rollups in memory during a session.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Training: Derive training load (e.g., distance trends) from your own metrics; calculations performed on demand.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Maps: Render route polylines for your selected activities. Coordinates are not stored; tiles come from map providers with only necessary requests (we will document provider if added).</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Challenges: Local, client-side comparison of your cumulative stats against challenge targets. No leaderboard of other users unless/until explicit separate consent and compliant redesign.</ListItem>
				</List>
				<Typography variant="body2" color="text.secondary">
					If a future feature requires persistent storage or multi-user interaction, we will revise this Policy before enabling it.
				</Typography>
			</Section>

			<Section title="8. Legal Bases (EEA / UK)">
				<List sx={{ listStyle: 'disc', pl: 4 }}>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Consent: You grant OAuth access; you may revoke at any time in Strava settings.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Contract / Pre‑contractual steps: Delivering exports you request.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Legitimate Interest: Minimal security logging (request success/failure) to prevent abuse—balanced, non‑intrusive.</ListItem>
				</List>
			</Section>

			<Section title="9. Retention">
				<Typography>
					We keep no long‑term database of your activities. In‑process data lives only in volatile memory while preparing your
					export. Minimal server logs (HTTP method, route, timestamp, success/error code, anonymized athlete hash) are retained
					for ≤ 7 days for operational integrity and then purged. We never retain raw GPS streams once the response is sent.
				</Typography>
			</Section>

			<Section title="10. Deletion & Revocation">
				<List sx={{ listStyle: 'disc', pl: 4 }}>
					  <ListItem sx={{ display: 'list-item', py: 0 }}>Revoke in Strava: Visit your Strava account &gt; Settings &gt; My Apps to revoke access.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Local Data: Clear browser storage to remove the athleteId and expiration.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Exports: Files you download reside only on your device; we cannot recall or delete them.</ListItem>
					<ListItem sx={{ display: 'list-item', py: 0 }}>Request: You can email the contact below; we will confirm within 30 days (usually far sooner) once any residual logs are purged.</ListItem>
				</List>
			</Section>

			<Section title="11. Security">
				<Typography gutterBottom>
					We use HTTPS for all API endpoints. Access tokens are kept server-side only as needed for the outbound Strava call
					and are not stored long-term. We apply least-scope requests and avoid writing raw activity bodies to disk. No model
					training or AI profiling is performed on your data.
				</Typography>
				<Typography variant="body2" color="text.secondary">
					No Internet transmission is perfectly secure; you acknowledge inherent risk when transmitting data.
				</Typography>
			</Section>

			<Section title="12. Children">
				<Typography>
					Route Raccoon is not directed to children under 16. If you believe a minor&apos;s data was provided, contact us to
					request deletion.
				</Typography>
			</Section>

			<Section title="13. International Transfers">
				<Typography>
					Processing currently occurs in the region where hosting infrastructure (U.S.) is provisioned. Given the extremely
					limited retention, standard contractual safeguards are proportionate. If this changes we will update this section.
				</Typography>
			</Section>

			<Section title="14. Your Rights (EEA / UK / Similar Jurisdictions)">
				<Typography gutterBottom>
					Subject to local law you may have rights to access, rectify, erase, restrict, port, or object to processing. Given
					the minimal data we hold, exercising these rights typically equates to revoking access and clearing local storage.
				</Typography>
				<Typography variant="body2" color="text.secondary">
					If we cannot verify your request we may ask for limited additional information solely for verification, then delete it.
				</Typography>
			</Section>

			<Section title="15. Third Parties">
				<Typography>
					We do not embed third‑party analytics, social sharing widgets, or ad networks. If a map tile provider is added for
					the Maps feature, only the necessary tile requests (IP, user agent) will reach that provider—no activity identifiers.
					Provider details and privacy links will be added before launch.
				</Typography>
			</Section>

			<Section title="16. No Data Sales">
				<Typography>
					We do not sell personal data or provide it to data brokers. We do not disclose Strava Data to other users or third
					parties except as required by law (rare) or to comply with Strava API policies.
				</Typography>
			</Section>

			<Section title="17. Changes">
				<Typography>
					We may update this Policy for clarity, legal, or feature reasons. Material changes will be highlighted in the app
					and take effect upon posting. Continued use after the Effective Date of a revision indicates acceptance.
				</Typography>
			</Section>

			<Section title="18. Contact">
				<Typography>
					Questions or requests: <Link href="https://forms.gle/udF45VU8ZWgjTZD18">support form</Link>
				</Typography>
			</Section>

			<Typography variant="caption" color="text.secondary" sx={{ mt: 6, display: 'block' }}>
				© {currentYear} Route Raccoon. This privacy notice is offered as an open example and may be reused with attribution.
			</Typography>
		</Container>
	);
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
	return (
		<Box component="section" sx={{ mb: 4 }}>
			<Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2 }}>
				{title}
			</Typography>
			{subtitle && (
				<Typography variant="subtitle2" color="text.secondary" gutterBottom>
					{subtitle}
				</Typography>
			)}
			<Box>{children}</Box>
		</Box>
	);
}

