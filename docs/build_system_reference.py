"""Build docs/Volentify-System-Reference.pdf.

    python docs/build_system_reference.py

Measured figures (cyclone model metrics, dispatch benchmark) are read from frontend/api/_lib/models, so rerunning this
after the weekly retrain keeps the document in step with the code. Live-site figures (record counts, incidents) are
passed in LIVE below and should be refreshed by hand from /api/health, /api/research/summary and /api/disasters.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "Volentify-System-Reference.pdf"
MODELS = ROOT / "frontend" / "api" / "_lib" / "models"
DATE = "4 November 2026"
LIVE = {  # read from the live site at the time of writing
    "incidents": 10, "cap_alert": 134, "forecast": 21, "dispatch_run": 18, "model_version": 3, "platform_snapshot": 4,
    "apk": "mesh-v1.0.6",
}

INK, SAND, STONE, SIGNAL, LINE = (colors.HexColor(c) for c in ("#111214", "#5b5650", "#7a756e", "#d9622b", "#d8d4cc"))
GOOD, WARN, BAD = colors.HexColor("#2e7d5b"), colors.HexColor("#b7791f"), colors.HexColor("#b23b30")

base = ParagraphStyle("base", fontName="Helvetica", fontSize=9, leading=12.5, textColor=INK, alignment=TA_LEFT)
small = ParagraphStyle("small", parent=base, fontSize=7.8, leading=10.2)
cell = ParagraphStyle("cell", parent=base, fontSize=7.8, leading=10)
cellb = ParagraphStyle("cellb", parent=cell, fontName="Helvetica-Bold")
mono = ParagraphStyle("mono", parent=base, fontName="Courier", fontSize=7.6, leading=9.6)
h1 = ParagraphStyle("h1", parent=base, fontName="Times-Roman", fontSize=21, leading=25, spaceBefore=4, spaceAfter=8)
h2 = ParagraphStyle("h2", parent=base, fontName="Times-Roman", fontSize=13.5, leading=17, spaceBefore=10, spaceAfter=4)
title = ParagraphStyle("title", parent=base, fontName="Times-Roman", fontSize=40, leading=44)
lede = ParagraphStyle("lede", parent=base, fontName="Times-Roman", fontSize=17, leading=21, textColor=SAND)
bullet = ParagraphStyle("bullet", parent=base, leftIndent=10, bulletIndent=2)

STATE_COLOUR = {"LIVE": GOOD, "DONE": GOOD, "ONLINE": GOOD, "MEASURED": GOOD, "NEW": SIGNAL, "PARTIAL": WARN,
                "ACTION": WARN, "OPTIONAL": STONE, "TARGET": WARN, "NOT BUILT": BAD, "FIXED": GOOD}


def P(text, style=base):
    return Paragraph(text, style)


def state(s):
    c = STATE_COLOUR.get(s, STONE).hexval()[2:]
    return P(f'<font color="#{c}"><b>{s}</b></font>', cell)


def table(rows, widths, header=True, states_col=None):
    data = []
    for r, row in enumerate(rows):
        out = []
        for c, v in enumerate(row):
            if isinstance(v, str):
                if states_col is not None and c == states_col and r > 0:
                    out.append(state(v))
                else:
                    out.append(P(v, cellb if (header and r == 0) else cell))
            else:
                out.append(v)
        data.append(out)
    t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1 if header else 0)
    style = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
             ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
             ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]
    if header:
        style += [("LINEBELOW", (0, 0), (-1, 0), 0.9, INK), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f1ec"))]
    t.setStyle(TableStyle(style))
    return t


def bullets(items):
    return [Paragraph(i, bullet, bulletText="•") for i in items]


def milp_note(bench) -> str:
    out = [r for r in bench["results"] if (r["methods"].get("milp_lex") or {}).get("timeout_rate", 0) >= 1]
    big = bench["results"][-1]
    sp = big["methods"]["sperling"]["latency_ms_median"]
    if out:
        return (f"Exact priority optimisation does not scale: from {out[0]['responders']} responders the MILP hit its time limit "
                f"in every run, while Sperling took {sp / 1000:.1f} s at {big['responders']} responders.")
    return f"The exact priority MILP finished at every size; Sperling took {sp / 1000:.1f} s at {big['responders']} responders."


def commit() -> str:
    try:
        return subprocess.check_output(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"], text=True).strip()
    except Exception:  # noqa: BLE001
        return "unknown"


# ─── Architecture diagram ───────────────────────────────────────────────────

def architecture() -> Drawing:
    d = Drawing(180 * mm, 112 * mm)

    def box(x, y, w, h, head, lines, fill="#ffffff", stroke=INK):
        d.add(Rect(x * mm, y * mm, w * mm, h * mm, fillColor=colors.HexColor(fill), strokeColor=stroke, strokeWidth=0.6, rx=4, ry=4))
        d.add(String((x + 2.5) * mm, (y + h - 5) * mm, head, fontName="Helvetica-Bold", fontSize=7.4, fillColor=INK))
        for i, line in enumerate(lines):
            d.add(String((x + 2.5) * mm, (y + h - 9.2 - i * 3.6) * mm, line, fontName="Helvetica", fontSize=6.3, fillColor=SAND))

    def arrow(x1, y1, x2, y2, label=None, at=None):
        d.add(Line(x1 * mm, y1 * mm, x2 * mm, y2 * mm, strokeColor=STONE, strokeWidth=0.7))
        import math
        a = math.atan2(y2 - y1, x2 - x1)
        p = [x2 * mm, y2 * mm, (x2 - 2.2 * math.cos(a - 0.4)) * mm, (y2 - 2.2 * math.sin(a - 0.4)) * mm,
             (x2 - 2.2 * math.cos(a + 0.4)) * mm, (y2 - 2.2 * math.sin(a + 0.4)) * mm]
        d.add(Polygon(p, fillColor=STONE, strokeColor=STONE))
        if label:
            lx, ly = at if at else ((x1 + x2) / 2 + 1.2, (y1 + y2) / 2)
            d.add(String(lx * mm, ly * mm, label, fontName="Helvetica-Oblique", fontSize=5.8, fillColor=STONE))

    box(0, 86, 42, 24, "People in a browser", ["citizens, volunteers, NGOs,", "incident command, researchers", "Vercel Web Analytics (page views)"])
    box(0, 50, 42, 30, "Volentify Mesh (Android)", ["Kotlin app on each phone", "BLE relay phone-to-phone", "SQLite outbox (Room)", "auto-uploads on mobile data", "or Wi-Fi (token optional)"])
    box(0, 16, 42, 26, "Other phones nearby", ["same app, no network needed", "receive, store, relay (TTL 5)", "'already have' digest"])
    box(52, 80, 70, 30, "Vercel — Next.js 15 web app", ["28 pages + APK download route", "React 19 · Tailwind · MapLibre · three.js", "tactical map with satellite imagery", "middleware.ts guards role-only pages"], fill="#faf8f4")
    box(52, 38, 70, 36, "Vercel — FastAPI Python function", ["api/index.py ← every /api/* request", "routers: auth, entities, mesh, intelligence,", "research · engines: live feeds, dispatch,", "triage, surge, cyclone ML, dedup, briefing", "migrations run once per database"], fill="#faf8f4")
    box(52, 2, 70, 30, "Neon PostgreSQL", ["users, disasters (+source), tasks, alerts,", "evidence, volunteer profiles, mesh nodes", "& events, research_log, feed_state,", "feed_cache, volentify_migrations"], fill="#f3f1ec")
    box(132, 84, 48, 26, "Live hazard feeds (server)", ["GDACS · USGS · NASA EONET", "every 15 min → disasters", "NDMA SACHET CAP warnings", "OpenStreetMap Overpass"], fill="#fff7f1", stroke=SIGNAL)
    box(132, 54, 48, 24, "Other services", ["Google OAuth (sign-in)", "Google Gemini (briefings)", "map tiles in the browser: CARTO,", "Esri, NASA GIBS, RainViewer, AWS"])
    box(132, 2, 48, 46, "GitHub Actions", ["CI: tests, type-check, build", "APK build → GitHub release", "weekly: IBTrACS → retrain →", "  dispatch benchmark → commit", "every 15 min: /api/live/refresh", "every 3 h: research collect", "Vercel redeploys on push to main"])
    arrow(42, 96, 52, 96, "HTTPS", at=(42.6, 97.4))
    arrow(87, 80, 87, 74, "/api/*")
    arrow(42, 60, 52, 60, "upload", at=(42.8, 61.4))
    arrow(21, 42, 21, 50, "BLE")
    arrow(87, 38, 87, 32, "psycopg (pooled)")
    arrow(132, 96, 122, 62)
    arrow(132, 64, 122, 56)
    arrow(132, 40, 122, 44, "models", at=(124, 39))
    return d


# ─── Content ────────────────────────────────────────────────────────────────

def build() -> None:
    card = json.loads((MODELS / "model_card.json").read_text())
    bench = json.loads((MODELS / "dispatch_benchmark.json").read_text())
    m_int, m_sev = card["metrics"]["intensity_24h"], card["metrics"]["severe_24h"]
    sha = commit()
    story: list = []
    S = story.append

    # Cover
    S(Spacer(1, 18 * mm))
    S(P("Volentify", title))
    S(Spacer(1, 4 * mm))
    S(P("System reference: what is built, how it works, and where every piece of data comes from", lede))
    S(Spacer(1, 10 * mm))
    S(table([
        ["Component", f"State on {DATE}", "Detail"],
        ["Website", "LIVE", "https://volentify.vercel.app · Vercel Web Analytics enabled"],
        ["API", "LIVE", "FastAPI on Vercel · /api/health reports ONLINE"],
        ["Database", "ONLINE", "Neon PostgreSQL (read from DB_POSTGRES_URL) · Supabase fully removed"],
        ["Live hazard feeds", "LIVE", f"GDACS, USGS, NASA EONET every 15 min · {LIVE['incidents']} active incidents at the time of writing"],
        ["Sample data", "FIXED", "None shipped; the old demonstration rows were purged from Neon by migration"],
        ["Android app", "LIVE", f"Volentify Mesh {LIVE['apk']} (built and unit-tested by CI) · download at /mesh"],
        ["Cyclone models", "MEASURED", f"{card['name']}@{card['version']} · trained {card['trained_at'][:10]}"],
        ["Dispatch benchmark", "MEASURED", f"generated {bench['generated_at'][:10]} · reruns weekly"],
        ["Research archive", "LIVE", f"{sum(LIVE[k] for k in ('cap_alert', 'forecast', 'dispatch_run', 'model_version', 'platform_snapshot'))} records so far · collected every 3 h"],
        ["Google sign-in · Gemini", "LIVE", "client configured · gemini-3.5-flash briefings"],
    ], [42, 32, 96], states_col=1))
    S(Spacer(1, 8 * mm))
    S(P(f"Repository: github.com/Gyanvir/Volentify (public) · version 3.5.0 · commit {sha}. Figures are read from the "
        "repository's model card and benchmark files and from the live site at the time of writing. Where something is a "
        "target rather than a measurement, it says so. This edition supersedes the 2 November 2026 reference.", small))
    S(PageBreak())

    # Contents
    S(P("Contents", h1))
    for i, t in enumerate(["What Volentify is", "Architecture", "Technology used", "Where the code lives",
                           "The website, page by page", "The API, endpoint by endpoint",
                           "Where ML and AI are, and where they are not", "The cyclone ML pipeline",
                           "Dispatch engine and its benchmark", "Where every piece of data comes from",
                           "Storage, migrations and the research archive", "Volentify Mesh: the Android relay app",
                           "Security, privacy, testing and operations", "What changed in this edition", "Where we are"], 1):
        S(P(f"{i}. {t}", ParagraphStyle("toc", parent=base, fontSize=10.5, leading=17)))
    S(PageBreak())

    # 1
    S(P("1. What Volentify is", h1))
    S(P("Volentify is a disaster-intelligence and volunteer-coordination platform for India. It gives incident commanders, "
        "NGOs, volunteers and citizens one shared picture of an emergency, built only from real, current data, and keeps "
        "field reporting working when mobile networks fail."))
    S(Spacer(1, 3 * mm))
    S(P("It is built around four loops, and every feature belongs to one of them:"))
    S(table([
        ["Loop", "What happens", "Built with"],
        ["See", "Live incidents from public hazard feeds, hazard zones, satellite imagery on the tactical map, radar, official warnings in force, hospitals and shelters near incidents.",
         "Tactical map (MapLibre), live feeds (GDACS, USGS, NASA EONET), NDMA SACHET, OpenStreetMap"],
        ["Report", "Citizens report from the web; volunteers report from phones, even with no network, through Bluetooth relaying. Phones upload automatically whenever they get mobile data or Wi-Fi.",
         "Report form, Volentify Mesh Android app, mesh ingest API"],
        ["Decide", "Reports are linked to the incident they fall inside, triaged by language and urgency, duplicates merged, briefings written, cyclones forecast.",
         "Incident linking, Laya triage, dedup, briefing, cyclone ML models, storm-surge estimator"],
        ["Act", "Missions are created and the right responders dispatched; specialists are protected from routine work.",
         "Sperling dispatch engine, command hub, volunteer dispatch board, alerts"],
    ], [18, 86, 66]))
    S(P("Who uses it", h2))
    S(table([
        ["Role", "What they can do", "Verification"],
        ["Citizen", "See incidents, alerts and resources; submit reports; hold a civilian SOS pass.", "None"],
        ["Volunteer", "Everything a citizen can, plus accept missions, review and promote mesh reports, set availability, get an optional gateway token, hold a responder muster pass.", "None"],
        ["NGO member", "Command hub: review mesh reports, create missions, run dispatch, broadcast advisories.", "Admin verifies"],
        ["Incident admin", "Everything, plus the admin console (users, roles, verification, system health) and research export.", "Admin verifies (or listed in VOLENTIFY_ADMIN_EMAILS)"],
        ["Researcher", "Read-only analysis plus research archive export.", "None"],
    ], [26, 108, 36]))
    S(P("Every account completes a five-step onboarding (mobile number, role, role details, safety profile, review) and receives a signed digital muster pass.", small))
    S(PageBreak())

    # 2
    S(P("2. Architecture", h1))
    S(P("One Vercel project serves both the website and the API from the same domain, so there is no CORS, one deployment and "
        "one set of environment variables. The Android app is the only other runtime."))
    S(Spacer(1, 3 * mm))
    S(architecture())
    S(P("How a request flows", h2))
    S(KeepTogether(bullets([
        "A browser loads a Next.js page from Vercel. Pages fetch data from /api/… on the same domain and poll it (mesh reports every 10 s; unchanged responses do not redraw).",
        "vercel.json rewrites every /api/* request to one Python function, api/index.py (FastAPI). It answers from PostgreSQL, calls the engines, or fetches an outside source.",
        "Incident lists refresh the live hazard feeds when they are more than 15 minutes old. A feed_state row in the database ensures only one serverless instance refreshes at a time; a GitHub workflow calls /api/live/refresh every 15 minutes so visitors rarely wait.",
        "If the database is unreachable, reads fall back to an in-memory mirror of the live feeds (never invented data) and every response carries an X-Data-Source header (database / fallback / memory) so screens can say \"Database offline\" or \"Not saved\". Writes that must not be lost (mesh ingest) return 503 instead, so phones keep their outbox and retry.",
        "On first connection the API creates the schema and applies pending migrations once, under an advisory lock so parallel serverless instances cannot race.",
        "Phones relay reports to each other over Bluetooth; whichever phone gets mobile data or Wi-Fi uploads its whole outbox to /api/mesh/ingest, with or without a gateway token.",
        "GitHub Actions does all scheduled work: feed refresh, retraining, benchmarking, building the APK and collecting the research archive. Vercel redeploys on every push to main.",
    ])))
    S(PageBreak())

    # 3
    S(P("3. Technology used", h1))
    S(table([
        ["Layer", "Technology", "Version", "Used for"],
        ["Web framework", "Next.js (App Router)", "15.5", "Pages, routing, server rendering, middleware"],
        ["UI library · language", "React · TypeScript", "19.1 · 5.7", "All interface components, type-checked"],
        ["Styling · type", "Tailwind CSS tokens · Instrument Serif, Inter, IBM Plex Mono", "3.4", "Design system (docs/DESIGN.md)"],
        ["Maps", "MapLibre GL JS", "4.7", "2D/3D tactical map, satellite base maps, terrain, measuring, export"],
        ["3D · charts · icons", "three.js · Recharts · lucide-react · qrcode", "0.171 · 3.2 · 0.469 · 1.5", "Globe and HUD · analytics · icons · APK QR code"],
        ["Analytics", "Vercel Web Analytics (@vercel/analytics)", "2.0", "Privacy-friendly page-view counts"],
        ["Route protection", "jose (JWT verify at the edge)", "5.9", "middleware.ts role checks"],
        ["API", "FastAPI + Pydantic on Vercel Python", "≥0.115 · ≥2.10 · 3.12", "All /api endpoints and request validation"],
        ["Database driver", "psycopg 3 (binary)", "≥3.2", "Neon pooled endpoint (PgBouncer, transaction mode)"],
        ["Auth", "PyJWT[crypto] · stdlib scrypt", "≥2.9", "Sessions, Google ID-token checks, passwords"],
        ["HTTP client", "httpx", "≥0.27", "GDACS, USGS, EONET, SACHET, Overpass, Gemini"],
        ["Database", "PostgreSQL on Neon (via Vercel Storage)", "15+", "All durable data and the research archive"],
        ["Schema", "schema.sql + migrations.py (auto-applied) · Prisma schema", "Prisma 6.19", "Same schema two ways; Prisma optional"],
        ["ML training", "XGBoost · scikit-learn · pandas · NumPy · SciPy", card.get("xgboost", "3.x") + " · …", "Cyclone models, cross-validation, exact dispatch baselines"],
        ["ML serving", "treeinfer.py (pure Python)", "—", "Runs XGBoost trees without installing XGBoost"],
        ["LLM", "Google Gemini 3.5 Flash (auto-updating)", "AI Studio or Vertex key", "Briefing text and report merging"],
        ["Android", "Kotlin · Jetpack Compose · Room · WorkManager · OkHttp · BLE GATT", "2.0 · BOM 2024.09 · 2.6 · 2.9 · 4.12", "Volentify Mesh app"],
        ["Hosting · automation", "Vercel · GitHub Actions", "—", "Web + API · CI, APK releases, training, feeds, archive"],
        ["Tests", "pytest · JUnit", "—", "API, ML pipeline and Android unit tests (section 13)"],
    ], [30, 62, 32, 46]))
    S(PageBreak())

    # 4
    S(P("4. Where the code lives", h1))
    tree = """Volentify/
├── README.md                  setup, deployment, live data, research archive
├── docs/PRD.md · DESIGN.md    product requirements v3.5 · design system
├── docs/build_system_reference.py   builds this PDF from the model files
├── .github/workflows/
│   ├── ci.yml                 tests + type-check + production build on every push
│   ├── android.yml            builds, tests and releases the Mesh APK
│   ├── ml-train.yml           weekly: IBTrACS, retrain, benchmark dispatch, commit
│   ├── live-feeds.yml         every 15 min: GET /api/live/refresh
│   └── research-collect.yml   every 3 h: POST /api/research/collect
├── ml/volentify_ml/           data.py · features.py · train.py · dispatch_bench.py
├── mesh-android/              Volentify Mesh: data, mesh (BLE, digest, framing), sync, location, ui
└── frontend/                  the deployable app (Vercel root directory)
    ├── app/                   Next.js pages grouped by purpose; map; mesh; download
    ├── components/            ui, layout, map (TacticalMap, DetailDrawer), operations, globe, auth
    ├── lib/                   API client, session, types, constants, release lookup
    ├── middleware.ts          role-based page protection
    ├── prisma/schema.prisma   database schema (Prisma form)
    ├── api/index.py           FastAPI entry point and /api/health
    ├── api/_lib/core/         config, database (Neon + in-memory), security, research archive
    ├── api/_lib/engines/      live (feeds), intel (SACHET, OSM, imagery), dispatch, triage, surge, cyclone …
    ├── api/_lib/routers/      auth, entities, mesh, intelligence, research
    ├── api/_lib/data/         schema.sql, migrations.py, seed (setup script), reference (helplines)
    ├── api/_lib/models/       trained models, model card, dispatch benchmark (written by CI)
    └── tests/                 test_api.py and fixtures.py (fictional test-only dataset)"""
    S(Table([[P(tree.replace(" ", "&nbsp;").replace("\n", "<br/>"), mono)]], colWidths=[170 * mm],
            style=[("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f7f5f1")), ("LEFTPADDING", (0, 0), (-1, -1), 6),
                   ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    S(PageBreak())

    # 5
    S(P("5. The website, page by page", h1))
    S(P("Access is enforced twice: by middleware.ts before the page loads, and again by the API for every action."))
    S(Spacer(1, 2 * mm))
    S(table([
        ["Route", "Page", "What it does", "Access"],
        ["/", "Home", "Live incident count from the hazard feeds, God's Eye globe, entry points, app download.", "Anyone"],
        ["/map", "Tactical map", "Full-screen 2D/3D map: live incidents, hazard zones, mesh reports, missions, responders, nodes, hospitals, shelters; Satellite switch and base-map switcher (Esri, MODIS, VIIRS SNPP, VIIRS NOAA-20) with opacity, rain radar, terrain, filters, measuring, PNG export. /map?imagery=…&radar=1 opens a preset.", "Anyone"],
        ["/disasters", "Active incidents", "Incidents from GDACS, USGS and NASA EONET, ordered by severity, with their source.", "Anyone"],
        ["/disasters/[id]", "Incident dossier", "Evidence timeline (source accounts and mesh reports), source link, missions, briefing, forecast.", "Anyone"],
        ["/alerts", "Alerts", "Volentify advisories, plus official CAP warnings in force from NDMA SACHET (agency attribution and modal detail).", "Anyone"],
        ["/volunteer", "Volunteer dispatch", "Open missions, accept, set availability, run dispatch, inspect mesh telemetry and promote reports.", "Anyone (actions need sign-in)"],
        ["/resources", "Emergency resources", "National helplines; hospitals, shelters and assembly points mapped in OpenStreetMap near active incidents.", "Anyone"],
        ["/predictions", "Forecasts", "Storm-surge sandbox, cyclone model performance, dispatch benchmark, incident forecasts, triage playground.", "Anyone"],
        ["/disaster-intelligence", "Satellite & bulletins", "Imagery list that drives the live tactical map (operational layers stay on top), official bulletins, report corroboration on real warnings.", "Anyone"],
        ["/analytics", "Analytics", "Charts computed live from incidents, missions, responders and mesh reports.", "Anyone"],
        ["/mesh · /download/android", "Mesh app", "Download button, QR code, install steps; streams the latest APK release with the Android MIME type.", "Anyone"],
        ["/login · /register · /auth/callback", "Accounts", "Email + password or Google (nonce + state checked).", "Anyone"],
        ["/onboarding · /dashboard", "Muster pass · desk", "Five-step wizard and signed pass; role desk with missions, alerts and optional gateway token.", "Signed in"],
        ["/agency", "Command hub", "Mesh review queue (10 s refresh), mission form, dispatch run, advisory broadcast.", "Verified NGO / admin"],
        ["/admin", "Administration", "Users, roles, verification, database and system status.", "Verified admin"],
        ["/contact · /research · /about · /faqs · /news · /knowledge · /government · /ngo-partners · /privacy · /terms", "Information", "Report form, methods, questions, situation reports, preparedness, partners (organisations verified on the platform), legal.", "Anyone"],
    ], [34, 26, 86, 24]))
    S(PageBreak())

    # 6
    S(P("6. The API, endpoint by endpoint", h1))
    S(P("46 endpoints under /api on the same domain; interactive documentation at /api/docs. Requests are validated by Pydantic; errors come back as one readable sentence."))
    S(Spacer(1, 2 * mm))
    S(table([
        ["Method · path", "Purpose", "Auth"],
        ["GET /api/health", "Status, database state (with a sanitised reason when DEGRADED), last live-feed refresh, configuration in use; ?deep=1 tests Gemini.", "—"],
        ["GET /api/live/status · /api/live/refresh", "NEW. When each hazard feed last answered; refresh feeds older than 2 min and warm the facility cache (called every 15 min).", "— (30/hour)"],
        ["POST /api/auth/register · /login · /logout · Google start/callback", "Email accounts (scrypt) and Google OpenID Connect; session cookie.", "—"],
        ["GET /api/auth/me · POST /api/auth/onboard", "Current user; complete onboarding and issue the muster pass.", "Session"],
        ["GET · PATCH /api/admin/users", "List users; change role or verification.", "Admin"],
        ["GET /api/disasters (?include_closed) · /disasters/{id} · /briefing", "Live incidents; dossier with evidence, missions and alerts; situation briefing.", "—"],
        ["/api/tasks · /tasks/{id}/accept · PATCH /tasks/{id}", "Missions: list, create, accept, update.", "Varies"],
        ["GET · POST /api/alerts", "Volentify advisories: list; broadcast (command roles).", "Varies"],
        ["/api/volunteers · /volunteers/me · /volunteer/availability", "Responders and availability.", "Varies"],
        ["GET /api/organizations · /api/resources", "Organisations verified on the platform; helplines plus OSM hospitals and shelters near active incidents (cached 6 h).", "—"],
        ["POST /api/reports", "Citizen report: triaged and linked to the nearest active incident.", "— (6/min)"],
        ["POST /api/predict · GET /api/ml/models", "Storm surge + hazard probability with the trained cyclone models; model card and benchmark.", "—"],
        ["POST /api/triage/laya · /events/ingest · /briefing/generate", "Triage; de-duplicate raw reports; corroborated briefing.", "—"],
        ["POST /api/match · /match/dispatch-batch", "Rank responders for one mission; run a full dispatch cycle.", "—"],
        ["POST /api/infrastructure/nearby", "Facilities near a point (Overpass); empty with mode OFFLINE when Overpass is unreachable.", "—"],
        ["GET /api/bhuvan/layers · /bhuvan/bulletins (?limit)", "Imagery catalogue; CAP warnings in force (LIVE, CACHED from archive, or OFFLINE).", "—"],
        ["POST /api/mesh/token", "Optional short-lived gateway token for a phone (240 min).", "Volunteer / NGO / admin"],
        ["POST /api/mesh/ingest", "Phones upload reports and messages (≤100 per batch, ≤4 KB each, idempotent). Each report is linked to the active incident it falls inside and added to its evidence timeline.", "Token optional (20/min without, 60/min with)"],
        ["GET /api/mesh/events · /nodes · /incidents", "Field reports (redacted for unverified readers), phones seen, incident areas to cache offline.", "—"],
        ["PATCH /api/mesh/events/{id}", "Mark a report reviewed, or promote to mission (smart skill mapping, auto-links active incident).", "Volunteer / NGO / admin"],
        ["POST /api/research/collect · GET /summary · /export", "Archive CAP alerts, feed refresh, model version, platform snapshot; summary; CSV/JSONL export.", "— (4/hour) · admin / researcher"],
    ], [54, 86, 30]))
    S(PageBreak())

    # 7
    S(P("7. Where ML and AI are, and where they are not", h1))
    S(P("Only two components are trained machine-learning models. Everything else is an analytical model, an optimisation "
        "heuristic or a rule system, sometimes with an optional language model on top."))
    S(Spacer(1, 2 * mm))
    S(table([
        ["Component", "Kind", "Learns from data?", "Where it runs", "State"],
        ["Cyclone 24-hour intensity change", "Trained ML (XGBoost regression)", "Yes: IBTrACS, 1980 to now", "API, every forecast", "MEASURED"],
        ["Severe-storm probability (≥48 kt in 24 h)", "Trained ML (XGBoost classifier)", "Yes: IBTrACS", "API, every forecast", "MEASURED"],
        ["Storm-surge height", "Physical estimator", "No (calibrated formula)", "API, /api/predict", "TARGET"],
        ["Hazard probability", "Logistic combination, fixed weights", "No; combines the ML probability with rain and surge", "API, /api/predict", "PARTIAL"],
        ["Live incident severity", "Published scales (GDACS alert level, IMD cyclone classes, USGS magnitude/PAGER)", "No", "API, every feed refresh", "LIVE"],
        ["Sperling dispatch", "Optimisation heuristic", "No (scoring rules)", "API, every dispatch", "MEASURED"],
        ["Laya triage, tier 3", "Multilingual lexicon + rules", "No", "API, every report", "LIVE"],
        ["Laya triage, tiers 1–2", "Local router package / hosted model", "External", "Only if installed / key set", "OPTIONAL"],
        ["Report de-duplication · incident linking", "Spatio-temporal clustering · nearest incident within 1.5× radius", "No", "API", "LIVE"],
        ["Fact merging & briefing text", "LLM (Gemini 3.5 Flash)", "Pre-trained by Google", "API, on request", "LIVE"],
        ["SitRep DistilBERT model", "Planned trained ML", "—", "—", "NOT BUILT"],
    ], [38, 44, 34, 32, 22], states_col=4))
    S(P("How the trained models reach users", h2))
    S(KeepTogether(bullets([
        "The weekly workflow trains with XGBoost and exports each model as a JSON tree dump; treeinfer.py evaluates them in pure Python so the Vercel function stays small. A parity test checks it matches XGBoost (inputs and thresholds rounded to 32-bit floats).",
        f"/api/predict converts the request to the 14 features, runs both models, feeds the forecast peak wind into the surge estimator and the severe-storm probability into the hazard probability, and names the model, e.g. {card['name']}@{card['version']} + surge-analytic-v1.",
        "If the model files are missing, the API falls back to the analytical surge model alone and says so in the model name.",
    ])))
    S(PageBreak())

    # 8
    S(P("8. The cyclone ML pipeline", h1))
    data = card["data"]
    S(table([
        ["Step", "What happens"],
        ["1 · Download", "NOAA NCEI IBTrACS v04r01, North Indian Ocean CSV, fetched fresh each week by ml/volentify_ml/data.py; the raw file is not kept."],
        ["2 · Clean", f"Wind from RSMC New Delhi (IMD) where reported, otherwise WMO, otherwise US agencies; six-hourly fixes; storms since 1980. This build: {data['storms']} storms, {data['fixes']:,} fixes, {data['first']} to {data['last']}."],
        ["3 · Features", "14 features per fix (wind, pressure, position, distance to land, speed, heading sin/cos, season sin/cos, 6/12/24-hour wind change, Arabian Sea flag). Their order is a contract with the API."],
        ["4 · Targets", f"intensity_24h: {card['targets']['intensity_24h']}. severe_24h: {card['targets']['severe_24h']}."],
        ["5 · Augment", "History masking: each fix is also trained with its history hidden, so the model works from a single report."],
        ["6 · Evaluate", f"{card['metrics']['folds']}-fold storm-grouped cross-validation (GroupKFold): every storm held out whole. Compared with persistence and climatology."],
        ["7 · Export · ship", "Final models trained on all storms, written with model_card.json; tests run; the bot commits; Vercel redeploys. Every Sunday night IST and on pipeline changes."],
    ], [26, 144]))
    S(P("Held-out results (this build)", h2))
    S(table([
        ["Model", "Metric", "Model", "Baseline", "What it means"],
        ["Intensity, 24 h", "Mean absolute error", f"{m_int['mae_kt_with_history']} kt", f"{m_int['mae_kt_persistence']} kt (persistence)", f"{round(m_int['skill_vs_persistence'] * 100)}% lower error than assuming no change"],
        ["Intensity, 24 h", "MAE from one report only", f"{m_int['mae_kt_single_report']} kt", "—", "still works with no history"],
        ["Severe within 24 h", "ROC AUC", f"{m_sev['auc_with_history']}", "0.5 (chance)", "ranks storms that will turn severe very well"],
        ["Severe within 24 h", "AUC, storms still below 48 kt", f"{m_sev['auc_below_threshold']}", "0.5", "the hard, useful case: not yet severe"],
        ["Severe within 24 h", "Brier score", f"{m_sev['brier_with_history']}", f"{m_sev['brier_climatology']} (climatology)", f"Brier skill {m_sev['brier_skill_score']}; base rate {round(m_sev['base_rate'] * 100)}%"],
        ["Severe within 24 h", "Accuracy at 0.5", f"{m_sev['accuracy_at_0_5'] * 100:.1f}%", f"{(1 - m_sev['base_rate']) * 100:.1f}% (always \"no\")", "accuracy alone flatters; prefer AUC and Brier"],
    ], [28, 38, 22, 34, 48]))
    S(P(f"Samples: {m_int['n']:,} intensity cases and {m_sev['n']:,} severe-storm cases. Trained with XGBoost {card.get('xgboost', '')}.", small))
    S(PageBreak())

    # 9
    S(P("9. Dispatch engine and its benchmark", h1))
    k = bench["engine_constants"]
    S(P("The Sperling engine assigns open missions to available responders in strict priority order (critical, then high, "
        "moderate, low). Within a tier, each slot goes to the eligible responder with the best score:"))
    S(P("<b>C(i,j) = W_urgency · S_k · Sim · Π_squander × 1/(1 + d/d0) × 1/(1 + β·H_work)</b>"))
    S(table([
        ["Term", "Value in code", "Meaning"],
        ["W_urgency", " / ".join(str(int(v)) for v in k["urgency_weight"].values()), "critical / high / moderate / low"],
        ["S_k", "1/√N_k", "scarcity: the fewer responders hold skill k, the higher the weight"],
        ["Sim", f"{k['similarity']['exact']:.2f} / {k['similarity']['adjacent']:.2f} / {k['similarity']['generic']:.2f}", "exact / adjacent skill / generic"],
        ["Π_squander", str(k["squander_penalty"]), f"a rare specialist (skill held by ≤{k['rare_pool_size']} responders) sent to generic work"],
        ["d0 · β", f"{k['d0_km']} km · {k['beta_fatigue']}", "distance at which the score halves · fatigue per active mission"],
    ], [28, 40, 102]))
    S(P(f"Benchmark ({bench['generated_at'][:10]}, reruns weekly)", h2))
    S(P(f"ml/volentify_ml/dispatch_bench.py calls the production engine unchanged and compares it with a nearest-responder baseline, "
        f"the Hungarian optimum (ignores urgency order) and an exact priority MILP (HiGHS, {bench['design']['milp_time_limit_s']:.0f} s limit), "
        f"{bench['design']['seeds_per_size']} scenarios per size.", small))
    names = {"sperling": "Volentify (Sperling)", "nearest": "Nearest responder", "optimum": "Exact optimum", "milp_lex": "Exact priority MILP"}
    rows = [["Scale", "Method", "Time / cycle", "Critical filled", "Weighted fill", "Score vs optimum", "Specialists on generic", "Timed out"]]

    def fmt_ms(v):
        return "—" if v is None else (f"{v / 1000:.1f} s" if v >= 1000 else f"{v:.1f} ms" if v < 100 else f"{v:.0f} ms")

    def pct(v):
        return "—" if v is None else f"{round(v * 100)}%"

    for r in bench["results"]:
        first = True
        for key, label in names.items():
            m = r["methods"].get(key)
            if not m:
                continue
            timed_out = m.get("timeout_rate", 0) >= 1
            rows.append([f"{r['responders']} responders · {r['slots']} slots" if first else "", label, fmt_ms(m.get("latency_ms_median")),
                         "—" if timed_out else pct(m.get("critical_fill")), "—" if timed_out else pct(m.get("weighted_fill")),
                         "—" if timed_out else pct(m.get("score_vs_optimum")), "—" if timed_out else pct(m.get("specialists_on_generic")),
                         pct(m.get("timeout_rate"))])
            first = False
    S(table(rows, [28, 30, 18, 18, 18, 20, 22, 16]))
    S(Spacer(1, 2 * mm))
    S(KeepTogether(bullets([
        "Sperling fills critical missions as well as the exact priority MILP wherever the MILP finishes, and far better than the nearest-responder baseline.",
        milp_note(bench),
        "Sperling gives up some total match score against the Hungarian optimum because it deliberately serves urgent missions first.",
        "Supersedes the PRD figures (0.32 ms, 64.2% MILP timeouts, 100% efficiency), which no benchmark in the code produced.",
    ])))
    S(PageBreak())

    # 10
    S(P("10. Where every piece of data comes from", h1))
    S(P("Nothing shown on the platform is invented. \"Live\" means fetched from the source; \"archived\" means also written to the research archive."))
    S(Spacer(1, 2 * mm))
    S(table([
        ["Source", "What we take", "How and when", "Stored?"],
        ["GDACS (EC Joint Research Centre / UN OCHA)", "Tropical cyclones, floods, droughts, wildfires, volcanoes in and around India (lat 4–38, lng 65–100): name, alert level, wind, countries, report link", "Server, one request per hazard type, every ≤15 min", "disasters (source=GDACS) + evidence"],
        ["USGS Earthquake Hazards Program", "Earthquakes M4.5+ in the last 7 days in the region: magnitude, depth, place, PAGER alert, tsunami flag", "Server, every ≤15 min", "disasters (source=USGS) + evidence"],
        ["NASA EONET", "Open natural events (severe storms with wind, wildfires, floods, landslides…); duplicates of GDACS cyclones merged", "Server, every ≤15 min", "disasters (source=NASA EONET) + evidence"],
        ["NDMA SACHET", "Official CAP warnings: English headline, CAP severity, event, area, instruction, issuing agency, expiry (each CAP read)", "Server, cached 5 min; expired warnings removed", "Yes: research_log (cap_alert), each alert once"],
        ["OpenStreetMap (Overpass + mirrors)", "Hospitals, shelters, assembly points near the six most severe active land incidents; facilities near any point", "Server, cached 6 h in feed_cache", "feed_cache"],
        ["NOAA NCEI IBTrACS v04r01", "North Indian Ocean cyclone best tracks since 1980", "Weekly training workflow", "Trained models + model card (git)"],
        ["Esri · NASA GIBS · RainViewer · CARTO · AWS Terrain", "Satellite base maps (static mosaic, MODIS/VIIRS daily), radar, dark base map, elevation", "Tiles loaded by the browser", "No"],
        ["Google · Gemini · Impossibl (optional)", "Sign-in identity · generated briefing text · hosted triage", "On sign-in · on request · if key set", "users · no · no"],
        ["Citizens (web)", "Incident reports with location", "Report form → /api/reports", "evidence"],
        ["Volunteers' phones", "Mesh reports and messages, phone battery and position", "Bluetooth relay → automatic upload on mobile data or Wi-Fi", "mesh_events, mesh_nodes, evidence (linked incident)"],
        ["Responders and organisations", "Profiles, skills, availability, missions", "Onboarding, dashboards, command hub", "users, volunteer_profiles, tasks, organizations"],
        ["Helplines", "National emergency numbers (112, 108, 101, 100, 1078, 1070, 1077, NDRF, 1091, 1098)", "Static reference (data/reference.py)", "Code"],
    ], [36, 60, 40, 34]))
    S(P("Severity of live incidents follows published scales: GDACS alert level (Red → critical, Orange → high); IMD cyclone classes by "
        "sustained wind (≥118 km/h critical, ≥89 high, ≥62 moderate); USGS PAGER alert or magnitude (≥7 critical, ≥6 high, ≥5 moderate). "
        "Incidents a source stops listing are closed automatically; only incidents with recent activity are kept.", small))
    S(PageBreak())

    # 11
    S(P("11. Storage, migrations and the research archive", h1))
    S(table([
        ["Where", "What is kept", "How long"],
        ["Neon PostgreSQL", "organizations, users, volunteer_profiles, disasters (with source, source_url, external_id), tasks, evidence, alerts, mesh_nodes, mesh_events, research_log, feed_state, feed_cache, volentify_migrations", "Until deleted; live incidents closed when dropped by their source"],
        ["Git (GitHub)", "Code, trained models, model card, dispatch benchmark; every weekly retrain is a commit", "Permanent"],
        ["GitHub releases", f"Every Mesh APK build (latest {LIVE['apk']})", "Permanent"],
        ["Each phone (SQLite via Room)", "Reports and messages created or relayed; settings; cached incident areas; confirmed reports kept 72 h", "Until uninstalled"],
        ["Browser", "Session cookie (HTTP-only, 72 h); OAuth nonce/state cookies (10 min)", "Short-lived"],
    ], [34, 100, 36]))
    S(P("Migrations (api/_lib/data/migrations.py)", h2))
    S(table([
        ["Migration", "What it does"],
        ["2026-11-live-feeds", "Adds source, source_url and external_id to disasters, plus the feed_state and feed_cache tables."],
        ["2026-11-purge-demo", "Removes the demonstration rows the earlier seed inserted (Cyclone \"Remal\", Brahmaputra, Wayanad, Chamoli and Delhi incidents, nine sample volunteers, sample missions, alerts, mesh nodes and reports, five organisation records). Real users' rows are kept; alerts and mesh reports that pointed at demo incidents are unlinked."],
    ], [36, 134]))
    S(P("Each runs once per database, inside a transaction with an advisory lock, and is recorded in volentify_migrations.", small))
    S(P("Research archive (research_log)", h2))
    S(P("Live observations and model outputs are archived with timestamps so results can be reproduced. Writes are best-effort and never slow the request that triggered them. No personal data is archived."))
    S(Spacer(1, 2 * mm))
    S(table([
        ["Kind", "What is recorded", "When", "Records so far"],
        ["cap_alert", "Each NDMA SACHET warning, once", "every feed pull and every 3 h", str(LIVE["cap_alert"])],
        ["forecast", "Inputs and output of every /api/predict call, with model version", "every forecast", str(LIVE["forecast"])],
        ["dispatch_run", "Tier counts, completeness, latency, scarcity weights, score distribution", "every dispatch cycle", str(LIVE["dispatch_run"])],
        ["model_version", "Model card of each trained version", "once per version", str(LIVE["model_version"])],
        ["platform_snapshot", "Active incidents, task and responder counts, mesh nodes, hop counts", "every 3 h", str(LIVE["platform_snapshot"])],
    ], [28, 80, 36, 26]))
    S(P("Snapshots taken before 2 November 2026 counted the demonstration incidents; filter by recorded_at when analysing.", small))
    S(PageBreak())

    # 12
    S(P("12. Volentify Mesh: the Android relay app", h1))
    S(P("The core offline feature. Phones pass reports and messages to each other over Bluetooth Low Energy with no mobile network "
        "or Wi-Fi, and any phone that gets mobile data or Wi-Fi uploads everything it holds to the website, where it becomes incident data."))
    S(Spacer(1, 2 * mm))
    S(table([
        ["Aspect", "How it works"],
        ["Discovery", "Every phone advertises and scans (low-latency mode) for the Volentify BLE service 7f3c0001-6a1e-4c2b-9b8e-5d1f0c7a9e10 and is both GATT server and client. Scans restart every 25 min (Android downgrades long scans)."],
        ["Relay timing", "Event-driven: a new or newly received report is offered at once to every phone seen in the last minute. No per-peer cool-down; a failed peer backs off 3 s doubling to 30 s. Two peers served in parallel, never two sessions to one phone."],
        ["'Already have' digest", "Characteristic 7f3c0003-…: 4-byte prefixes of the ~120 newest report ids a phone holds. Peers read it first and send only what is missing (older app versions get everything)."],
        ["Transfer", "Inbox characteristic 7f3c0002-…; frames with a 6-byte header, capped at 512 bytes per write (ATT maximum); high connection priority and 2M PHY when supported; one retry on GATT error 133; up to 50 reports per session, 15 s session limit."],
        ["Envelope · relaying", "event id, origin node, type, priority, payload ≤4 KB, location, observed time, hop count, TTL (max 5). Duplicates dropped by id; each relay stores hop+1, TTL−1; never echoed to the sender."],
        ["Upload", "Automatic whenever the phone has validated internet (mobile data or Wi-Fi): an app-level network watcher and the relay service upload at once; WorkManager with a network constraint covers the app being closed. Batches of 100 to /api/mesh/ingest; a gateway token is optional, an expired one is dropped and uploads continue."],
        ["On the website", "Each uploaded report is linked to the active incident it falls inside (within 1.5× its radius), appears on the tactical map and the incident's evidence timeline. Reports about people show only type and a 1–5 / 6+ headcount publicly."],
        ["Location", "Fine/approx location together; instant fallback to last known fix (<2 min, ≤30 m) across fused/GPS/network/passive providers prevents blocked reports; live status (±m, permission needed, location off, retry). Messages attach fresh/cached fix immediately. Optional ±500 m masking."],
        ["Screens", "Home (status, Sync now), Report (with location row), Messages, Settings (name, server, optional token, mask location)."],
        ["Build", f"Kotlin 2.0, Compose, minSdk 26, targetSdk 34. GitHub Actions builds, unit-tests and publishes each release; latest {LIVE['apk']}. Install from /mesh."],
    ], [30, 140]))
    S(PageBreak())

    # 13
    S(P("13. Security, privacy, testing and operations", h1))
    S(KeepTogether(bullets([
        "Sessions are HS256 JWTs in an HTTP-only, SameSite=Lax cookie (Secure in production), valid 72 hours; key from NEXTAUTH_SECRET or derived from the database URL.",
        "Passwords hashed with scrypt; Google sign-in verifies signature, audience, issuer and a one-time nonce.",
        "Elevated pages protected in middleware.ts and every action re-checked in the API; NGO, admin and volunteer promotion roles authenticated.",
        "Rate limits per instance: login 10/min, citizen reports 6/min, mesh ingest 60/min with a token and 20/min without, live refresh 30/hour, research collection 4/hour.",
        "Field reports about people are redacted for anyone who is not a verified NGO member or admin, and never put free text into public incident timelines.",
        "/api/health shows why the database is degraded with host names and credentials stripped. Secrets live only in Vercel environment variables and the local .env (git-ignored).",
    ])))
    S(P("Tests", h2))
    S(table([
        ["Suite", "Covers", "Runs"],
        ["frontend/tests (45 tests)", "API contracts, auth, roles, mesh ingest (token-less uploads, incident linking, redaction), live-feed parsers and sync/close, CAP parsing, no-sample-data, degraded health, research archive", "CI on every push; weekly after retraining"],
        ["ml/tests (6 tests)", "Data cleaning, features, training, tree-evaluator parity, dispatch benchmark sanity", "CI on every push; weekly"],
        ["mesh-android unit tests (11)", "Envelope validation, framing and reassembly, 'already have' digest", "APK workflow"],
        ["Type-check + production build", "Whole web app", "CI on every push"],
    ], [40, 96, 34]))
    S(P("Environment variables and workflows", h2))
    S(table([
        ["Name", "Needed for", "Now"],
        ["DATABASE_URL / DB_URL / DB_POSTGRES_URL / POSTGRES_URL", "Neon database (any one; the Vercel integration sets these)", "LIVE"],
        ["NEXTAUTH_SECRET · NEXTAUTH_URL", "Session key · public address for OAuth", "LIVE"],
        ["GOOGLE_CLIENT_ID · GEMINI_API_KEY", "Google sign-in · Gemini briefings", "LIVE"],
        ["VOLENTIFY_ADMIN_EMAILS · IMPOSSIBL_API_KEY · MESH_RELEASE_REPO", "Auto-verified admins · hosted triage · APK repo (default Gyanvir/Volentify)", "OPTIONAL"],
        ["VOLENTIFY_OFFLINE", "Set to 1 to stop all outbound feed calls (tests)", "OPTIONAL"],
        ["Workflow: CI · Volentify Mesh APK", "every push · changes under mesh-android/", "LIVE"],
        ["Workflow: Live feeds", "every 15 min → /api/live/refresh (repo variable VOLENTIFY_URL, default volentify.vercel.app)", "LIVE"],
        ["Workflow: Train cyclone models · Collect research archive", "weekly · every 3 hours", "LIVE"],
    ], [64, 84, 22], states_col=2))
    S(PageBreak())

    # 14
    S(P("14. What changed in this edition", h1))
    S(table([
        ["Area", "Change", "State"],
        ["Event promotion", "Field report review and promotion expanded to VOLUNTEER role (previously NGO/admin only). Smart skill mapping infers required responder skills (Boat Rescue, Paramedic, First Aid, Logistics, Drone) from report needs; auto-calculates crew size and drafts titles.", "DONE"],
        ["Auto-linking", "Promoting a field report without a linked disaster now automatically discovers and attaches the primary active incident instead of failing with HTTP 422.", "DONE"],
        ["Mesh telemetry", "Added live mesh network health metrics (active nodes, peer connections, hop counts, delivery rates) and an interactive report promotion drawer to the volunteer dispatch board.", "NEW"],
        ["Instant GPS fallback", "Android LocationProvider instantly falls back to freshest cached fix across fused, GPS, network, and passive providers (<2 min, ≤30 m returns immediately). Prevents stalled report submissions and ensures offline peer messages carry coordinates.", "DONE"],
        ["Warnings detail modal", "Enhanced OfficialWarnings and NewsFeed with interactive WarningDetailModal displaying full CAP response instructions, affected areas, and copyable alerts.", "NEW"],
        ["Warning search & filters", "Added multi-facet filtering (by severity, issuing source agency, and auto-extracted Indian states/regions) plus free-text search across official bulletins.", "NEW"],
        ["Agency attribution", "CAP warning enrichment now extracts and preserves the specific issuing source agency (e.g. IMD, CWC, State DMAs) across the API and UI.", "DONE"],
    ], [32, 116, 22], states_col=2))
    S(PageBreak())

    # 15
    S(P("15. Where we are", h1))
    S(table([
        ["Area", "State"],
        ["Website (28 pages), design system, tactical map with satellite imagery, radar and 3D terrain", "DONE"],
        ["API (46 endpoints) with Neon, migrations, live feeds and durability rules", "DONE"],
        ["Real data only: live hazard feeds, official warnings, OpenStreetMap facilities", "DONE"],
        ["Accounts, roles, onboarding, muster passes, admin verification", "DONE"],
        ["Cyclone ML models trained on real data, evaluated on held-out storms, retrained weekly", "DONE"],
        ["Dispatch engine with weekly benchmark against exact optimisation", "DONE"],
        ["Mesh Android app: fast BLE relay, messages, offline storage, automatic sync, GPS, releases", "DONE"],
    ], [148, 22], states_col=1))
    S(Spacer(1, 3 * mm))
    S(table([
        ["Item", "What is needed", "State"],
        ["Mesh field test", "Two or three phones on the new APK with mobile data off; confirm hop time, then turn data on and watch reports reach the incident timeline", "ACTION"],
        ["Old app installs", "Phones on builds before the latency fix still wait 45 s per peer; update every phone", "ACTION"],
        ["Stable APK signing", "Add the four signing secrets (mesh-android/signing/HOW-TO-USE.txt); uninstall the old build once", "ACTION"],
        ["Hospitals & shelters", "Depends on Overpass answering Vercel; mirrors added — confirm /resources fills", "PARTIAL"],
        ["Android 10–11 background scanning", "Needs a location foreground-service type to scan while backgrounded", "PARTIAL"],
        ["Storm-surge accuracy", "No open surge observations for India; needs tide-gauge data (e.g. INCOIS)", "PARTIAL"],
        ["SitRep DistilBERT · trained surge model · iOS app · push/SMS alerts", "Not built yet", "NOT BUILT"],
    ], [44, 104, 22], states_col=2))
    S(P("For the research paper", h2))
    S(KeepTogether(bullets([
        "Cite the data: IBTrACS version and date span from the model card; GDACS, USGS and NASA EONET for incidents; NDMA SACHET for alerts; OpenStreetMap (ODbL) for facilities.",
        "Use only measured figures: cyclone metrics (section 8) and the dispatch benchmark (section 9). Treat PRD performance numbers as targets.",
        "The research archive has run since 1 November 2026; exclude snapshots taken before the 2 November demo purge.",
        "Check every reference before citing it. \"Sperling (2026)\" is used as a name in the code and PRD but has not been verified as a published source.",
    ])))

    def page(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(STONE)
        if doc.page > 1:
            canvas.drawString(18 * mm, A4[1] - 12 * mm, "Volentify")
            canvas.drawRightString(A4[0] - 18 * mm, A4[1] - 12 * mm, f"System reference · {DATE}")
            canvas.drawString(18 * mm, 10 * mm, f"v3.5.0 · commit {sha}")
            canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, str(doc.page))
        canvas.restoreState()

    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm,
                            bottomMargin=16 * mm, title="Volentify — System Reference", author="Volentify",
                            subject=f"System reference, {DATE}")
    doc.build(story, onFirstPage=page, onLaterPages=page)
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    build()
