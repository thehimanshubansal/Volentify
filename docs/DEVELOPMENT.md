# Developing Volentify

Everything a contributor needs: repository layout, running locally, the database, deployment, the ML pipeline and
tests. The product specification is in [`PRD.md`](PRD.md) and the design system in [`DESIGN.md`](DESIGN.md).

## Repository layout

```
Volentify/
├── README.md
├── docs/
│   ├── PRD.md                    Product requirements (v3.5)
│   ├── DESIGN.md                 Design system: tokens, type, map language, components
│   └── design/references/        Earlier Stitch design explorations (reference only)
├── .github/workflows/            CI, APK build & release, weekly model training
├── ml/                           Cyclone model pipeline (IBTrACS → features → XGBoost → API)
├── mesh-android/                 Volentify Mesh: Android BLE store-and-forward relay app
└── frontend/                     The deployable web app (Vercel root directory)
    ├── app/                      Next.js 15 App Router
    │   ├── layout.tsx            Fonts, session, toasts, navigation
    │   ├── map/                  Full-screen tactical map (no footer)
    │   └── (site)/               Every other route, grouped by purpose:
    │       ├── page.tsx          Home
    │       ├── (operations)/     disasters, disasters/[id], alerts, volunteer, volunteers/[id], resources, predictions
    │       ├── (intelligence)/   disaster-intelligence, analytics
    │       ├── (account)/        login, register, onboarding, profile, auth/callback
    │       ├── (console)/        dashboard, agency, admin
    │       └── (about)/          about, research, faqs, ngo-partners, government, safety,
    │                             transparency, contact, knowledge, privacy, terms
    ├── components/
    │   ├── ui/                   Design-system primitives
    │   ├── layout/               Navbar, footer
    │   ├── map/                  Tactical map, detail drawer, God's Eye HUD
    │   └── …                     Feature components (auth, globe, operations, home)
    ├── lib/                      API client, session, types, constants, utilities
    ├── middleware.ts             Role-based route protection (SEC-03)
    ├── prisma/schema.prisma      Database schema (Neon PostgreSQL)
    ├── api/                      FastAPI backend (Vercel Python function)
    │   ├── index.py              App entry point and /api/health
    │   └── _lib/
    │       ├── core/             config, database (Neon Postgres + in-memory fallback), security
    │       ├── engines/          live feeds, dispatch, triage, surge, dedup, briefing, intel, gemini, geo
    │       ├── routers/          auth, entities, mesh, intelligence
    │       ├── data/             schema, migrations, setup script, helpline reference
    │       ├── models/           trained models + model card, written by the ML workflow
    │       └── schemas.py        Request/response contracts
    └── tests/                    API acceptance tests (PRD §14)
```

## Running locally

Requirements: Node 20+, Python 3.12+.

```bash
cd frontend
npm install
pip install -r requirements.txt      # add pytest to run the tests
cp .env.example .env                 # optional — everything works without it
npm run dev                          # Next.js on :3000 and FastAPI on :8000 together
```

Open http://localhost:3000. API docs are at http://localhost:3000/api/docs.

There is no sample data anywhere. Incidents come from live public hazard feeds (GDACS, USGS, NASA EONET), official
warnings from NDMA SACHET, hospitals and shelters from OpenStreetMap, and everything else from real users. Without
`DATABASE_URL` the live feeds still show, but nothing you create is stored — every screen marks this as "Not saved". In local
development, NGO and command roles are verified automatically so every console can be explored.

### Connecting a database

The database is Neon PostgreSQL, created from Vercel → Storage (`neon-volentify`) and connected to the project.

1. For local development copy the Neon connection strings into `frontend/.env`: in Vercel open Storage →
   neon-volentify → `.env.local`, or run `vercel env pull frontend/.env`. Use the pooled string (host contains
   `-pooler`) as `DATABASE_URL` and the unpooled one as `DIRECT_URL`. `DB_URL`, `POSTGRES_URL` and
   `DB_POSTGRES_URL` are read too, so the integration works whatever prefix it was connected with.
2. That's it: on first connection the API creates the schema (`api/_lib/data/schema.sql`, equivalent to
   `prisma/schema.prisma`), applies migrations (`api/_lib/data/migrations.py`) and pulls the live feeds.
   `npm run db:seed` does the same from your machine; `npm run db:push` is the Prisma route. No sample rows are
   inserted — and a database seeded by an earlier version has its demonstration rows removed automatically.
3. Set `NEXTAUTH_SECRET` and, for your own account, `VOLENTIFY_ADMIN_EMAILS` (elevates Google sign-ins only — a
   password sign-up does not prove ownership of the address, so it is never auto-elevated).

### Google sign-in

Create an OAuth client (Web) in Google Cloud Console, add `{NEXTAUTH_URL}/auth/callback` as an
authorised redirect URI and set `GOOGLE_CLIENT_ID`. The ID token is verified server-side against
Google's signing keys, audience, issuer and a one-time nonce.

## Deploying to Vercel

1. Import the repository and set **Root Directory** to `frontend`.
2. Storage → Create Database → Neon (Postgres), connected to the project. This adds `DATABASE_URL`
   (or `DB_URL`, depending on the prefix chosen).
3. Add `NEXTAUTH_SECRET` (any long random string), `NEXTAUTH_URL` (your site address) and
   `VOLENTIFY_ADMIN_EMAILS`. Optional: `GOOGLE_CLIENT_ID`, `GEMINI_API_KEY` (an AI Studio key `AIza…` or a
   Vertex AI express key `AQ.…` — both are supported).
   `/api/health` reports which variables the deployment picked up, and `/api/health?deep=1` makes a live Gemini
   call to confirm the key works.
4. Deploy. Next.js pages and the Python API (`api/index.py`, routed by `vercel.json`) deploy together,
   and the first API request initialises the database.

## What is implemented

| Area | Status |
| :-- | :-- |
| Mesh ingest & read APIs (FR-05…FR-16) | Bearer-token gateways, 100-event / 4 KB validation, idempotent upsert, node liveness, redaction of sensitive reports for unverified readers, review & promotion to missions. Ingest returns **503** instead of a volatile acknowledgement when the database is down, so phones keep their outbox. |
| Sperling dispatch | Lexicographic greedy allocation with urgency weights, skill scarcity, adjacency, the 0.12 squander penalty, distance decay and fatigue; specialist missions never fall back to untrained responders. |
| Laya triage | Three tiers: local `laya` package → hosted Impossibl endpoint → deterministic multilingual lexicon (English, Hindi, Marathi, Bengali, Assamese, Odia, Tamil, Telugu, Malayalam). |
| Cyclone forecasting | XGBoost models trained on NOAA IBTrACS North Indian Ocean best tracks (1980 onward, IMD winds preferred): 24-hour intensity change and the probability of reaching severe cyclonic storm strength. Evaluated on held-out storms against persistence and climatology; metrics shown on `/predictions`. Served with a dependency-free tree evaluator, so the API stays small. |
| Storm surge | Calibrated physical estimator (inverse barometer, saturating wind set-up, coastline distance decay) driven by the forecast peak wind — there is no open surge-observation archive for India to train on. |
| Dedup & briefing | Spatio-temporal clustering (15 km / 2 h) and corroboration analysis; Gemini merges facts and writes the 150-word briefing when `GEMINI_API_KEY` is set. |
| Auth | Credentials (scrypt) and Google OAuth, signed HTTP-only session, compulsory 5-step onboarding, signed digital muster passes, verification for NGO/command roles. |
| Live data | Incidents from GDACS (cyclones, floods, droughts, wildfires, volcanoes), USGS (earthquakes M4.5+) and NASA EONET, refreshed every 15 minutes into Neon with an evidence timeline, closed automatically when a source drops them. Official CAP warnings from NDMA SACHET (expired ones removed), hospitals and shelters from OpenStreetMap near active incidents. `/api/live/status` shows when each feed last answered. |
| Map | MapLibre with CARTO Dark Matter and satellite imagery as a base map (Esri World Imagery, NASA GIBS MODIS/VIIRS daily) under every operational layer, a one-tap Satellite switch, imagery opacity, live precipitation radar, 3D terrain with hillshade, God's Eye orbital HUD, filters, measuring, PNG export. `/map?imagery=esri-imagery` opens straight on imagery. |

## Volentify Mesh (Android)

`mesh-android/` is the offline companion app: Kotlin, Jetpack Compose, Room and WorkManager.

- Every phone advertises and scans for the Volentify BLE service and acts as both GATT server and
  client. Envelopes are framed to fit any MTU, validated, deduplicated by `eventId`, stored with
  `hopCount + 1` / `ttl − 1` and relayed onward while `ttl > 0`.
- Reports live in SQLite, so they survive the app closing and the phone restarting. Each shows
  Saved locally → Relayed → Syncing → Server-confirmed (or Failed).
- Any phone with internet uploads its outbox to `/api/mesh/ingest` in batches of 100 using a
  gateway token from the web dashboard, retrying with exponential backoff until acknowledged.
- Node IDs are random UUIDs, never hardware addresses; locations can be masked by ±500 m.

The **Volentify Mesh APK** workflow builds and tests the app and publishes `volentify-mesh.apk`
as a GitHub release. The website's `/mesh` page offers it for download from the site's own domain
(`/download/android` streams the latest release with the Android package MIME type). To build locally, open
`mesh-android/` in Android Studio.

## ML pipeline

```bash
cd ml
pip install -r requirements.txt
python -m volentify_ml.train --download     # fetch IBTrACS, evaluate, export to frontend/api/_lib/models
```

The **Train cyclone models** workflow runs this weekly and commits the refreshed models.

## Research archive

Live observations and model outputs are archived to the `research_log` table (created automatically) so results
can be reproduced and analysed:

| Kind | What is recorded | When |
| :-- | :-- | :-- |
| `cap_alert` | Each NDMA SACHET CAP alert (title, text, severity, issuer, time), stored once | Every feed pull, plus every 3 h |
| `forecast` | Input and full output of every `/api/predict` call, with model version | On every forecast |
| `dispatch_run` | Tier counts, completeness, latency, scarcity weights, score distribution | On every dispatch cycle |
| `model_version` | The model card (data span, features, held-out metrics) of each trained model | Once per version |
| `platform_snapshot` | Active incidents, task and volunteer status counts, mesh node and hop counts | Every 3 h |

No personal data is archived (no report text, names, phone numbers or exact volunteer locations).
The **Collect research archive** workflow triggers `/api/research/collect` every 3 hours.
`GET /api/research/summary` shows what has been collected; `GET /api/research/export?kind=…&format=csv|jsonl`
downloads it (incident administrators and researchers).

Model training history is also kept in git: each weekly retrain commits the refreshed model and model card.

## Tests

```bash
cd frontend
npm test          # API acceptance tests
cd ../ml && python -m pytest tests -q   # pipeline tests, incl. tree-evaluator parity with XGBoost
npm run typecheck
```


## Platform rules in code

| Rule | Where |
| :-- | :-- |
| PII scrubbing, reserved payload fields, priority cap, mission start limit (45 min), report retention (30 days) | `frontend/api/_lib/engines/rules.py` |
| Audit trail (hash-chained, ≥ 180 days) | `frontend/api/_lib/core/audit.py`, `GET /api/admin/audit`, `GET /api/admin/audit/verify` |
| Regulator accounts (reserved `@volentify.com` domain) | `frontend/api/_lib/data/regulators.py`, `schema.sql`, migration `2026-11-regulators` |
| Automated advisories (never "official") | `frontend/api/_lib/engines/advisories.py` |
| Phone downlink (official alerts and nearby reports back into the mesh) | `GET /api/mesh/downlink` in `routers/mesh.py` |
| Public accountability figures | `frontend/api/_lib/engines/transparency.py`, `GET /api/transparency` |
| Android: duplicate-SOS guard, PII filter, official-badge rule, battery saver | `mesh-android/app/src/main/java/org/volentify/mesh/` |

The user-facing version of these rules is the `/safety` page.

### Regulator accounts

Four incident-administrator accounts for regulation and monitoring (`gurpreet@`, `gyanvir@`, `himanshu@` and
`rajveer@volentify.com`) are created by `schema.sql` on a fresh database and by the `2026-11-regulators` migration on an
existing one. Only scrypt hashes are in the repository; the passwords are handed over separately and must be changed after
the first sign-in (Administration → Your account). Nobody can register a new account on the `volentify.com` domain, and
only a regulator can change a regulator account. To rotate a provisioned password in an emergency, generate a new hash
with `python -c "from api._lib.core.security import hash_password; print(hash_password('…'))"` (run from `frontend/`)
and update the row directly.

## Abuse protection

| Layer | What it does | Where |
| --- | --- | --- |
| robots.txt and sitemap | Search engines may index public pages; AI-training crawlers and bulk SEO scrapers are asked to stay out entirely; private pages are disallowed | `frontend/app/robots.ts`, `frontend/app/sitemap.ts`, `frontend/lib/crawlers.ts` |
| Page middleware | Refuses scanners, AI crawlers, scrapers and empty user agents (403); answers attack probes such as `/.env` or `/wp-login.php` with a bare 404; then applies the role rules | `frontend/middleware.ts` |
| Browser headers | Content Security Policy (code only from this site; connections only to the map, routing and lookup services), HSTS, no framing, no sniffing, Permissions-Policy, `noindex` on personal and console pages | `frontend/next.config.mjs` |
| API guard | Same agent filter, 1 MB body cap, 600 requests a minute per address (60 for heavy endpoints), cross-site write refusal, strict headers, `/api/docs` hidden on the live site except for administrators | `request_guard` in `frontend/api/index.py` |
| Sign-in | 8 wrong passwords lock an account for 15 minutes; 40 sign-in attempts and 10 sign-ups per address per 15 minutes; counters live in Postgres (`rate_limits`) so they hold across serverless instances | `frontend/api/_lib/routers/auth.py`, `core/security.py` |
| Forms | Hidden honeypot field (`website`) on sign-up and public reports: bot submissions are dropped | `frontend/components/ui/Honeypot.tsx` |
| Privacy | Signed-out visitors see volunteer initials only; positions are coarsened | `routers/entities.py` |
| Android | HTTPS only (plain http just for `localhost` / `10.0.2.2`), system CAs only, no cloud backup or device transfer, server address validated | `res/xml/network_security_config.xml`, `res/xml/data_extraction_rules.xml`, `Rules.isSecureServer` |
| Disclosure | `/.well-known/security.txt` points researchers to a private contact | `frontend/public/.well-known/security.txt` |

On top of this, Vercel's own firewall and Bot Protection (Project → Firewall) can be switched on without code changes.
When adding a new external service to the website, add its host to `connect-src` in `next.config.mjs`, or the browser will
block it.
