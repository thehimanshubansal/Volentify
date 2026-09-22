# Volentify — India's Disaster Intelligence & Volunteer Response Platform

**Volentify** is the digital identity and crisis response platform for India's premier humanitarian technology organization. It unifies real-time GIS telemetry, satellite observation, machine learning hazard forecasting, and rapid volunteer dispatch into an elegant, restrained web experience inspired by Apple, Stripe, Linear, Vercel, and NASA Earth.

---

## 🌐 Live Platform Overview & Current Features (26 Routes)

The platform is fully built using **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Three.js**, **MapLibre GL**, and **FastAPI Python Serverless (Vercel)**.

### Deployed Pages & Modules
1. **10-Section Editorial Homepage (`/`)**:
   - Ambient 3D Particle Earth Globe backdrop (*Stripe/GitHub style*).
   - Display typography in `Instrument Serif` (*"Intelligence for every disaster. Humanity for every response."*).
   - Live National GIS Telemetry canvas.
   - Purpose & Mission section with documentary humanitarian photography.
   - Apple-style alternating feature breakdown (Satellite Engine, Volunteer Dispatch).
   - Machine Learning 48-hour forecasting overview.
   - Ground volunteer corps stories (Search & Rescue, Medical Camps, Food Logistics).
   - 3-step Agency & NDRF coordination workflow.
   - Minimal restrained statistics.
   - Peer-reviewed open science research section (IEEE Disaster GIS 2026).
   - High-impact humanitarian Call-to-Action.
2. **Live GIS Map Platform (`/map`)**:
   - Full-viewport MapLibre GL GIS canvas with CartoDB dark tiles.
   - 7 Layer Toggles: Satellite, Doppler Weather Radar, Cyclone Track, Flood Inundation, Hospitals, Relief Shelters, Volunteer Teams.
   - Interactive Time Slider (-24h Past -> LIVE -> +48h Forecast).
   - GIS Search, Distance Measurement, PDF/PNG Map Frame Exporter.
   - Slide-out tactical node telemetry drawer for clicked hazards, hospitals, and shelters.
3. **Disaster Details View (`/disasters/[id]`)**:
   - Severity risk score meter (e.g. 9.4/10), official NDMA/IMD situation report, chronological incident timeline, affected districts grid, nearby hospitals with ICU bed counts, and rapid volunteer request trigger.
4. **Active Alerts System (`/alerts`)**:
   - Category filters (Cyclone, Flood, Wildfire, Landslide), emergency advisories, and interactive Emergency Broadcast Dispatch form.
5. **Disaster Intelligence (`/disaster-intelligence`)**:
   - Multi-spectral INSAT-3DR telemetry, Sentinel-2 thermal infrared fire hotspots, CWC river basin hydrograph monitoring.
6. **ML Hazard Risk Predictions (`/predictions`)**:
   - XGBoost storm surge probability forecasting (94.8% confidence) and DistilBERT NLP situation classifier (98.1% precision).
7. **Historical Analytics Dashboard (`/analytics`)**:
   - Recharts annual disaster frequency (2020–2025), category pie distribution, and average dispatch speed metrics (22 mins avg).
8. **Volunteer Portal (`/volunteer`)**:
   - Skill registration form (Rescue, Medical, Logistics, Transport, Blood), active field dispatch board, and verification badge system.
9. **Agency Command Portal (`/agency`)**:
   - NDRF/SDRF shelter manager, broadcast trigger console, and volunteer requisition tools.
10. **Emergency Resources Directory (`/resources`)**:
    - Searchable hospital ICU beds, cyclone relief shelter occupancy, and national emergency hotline numbers (112, 011-24363260, 108).
11. **Knowledge Centre (`/knowledge`)**: Preparedness guidelines for cyclones, floods, and forest fires.
12. **News & Situation Reports (`/news`)**: Official NDMA bulletins and press releases.
13. **NGO Partners Directory (`/ngo-partners`)**: Indian Red Cross, Goonj, Oxfam directory.
14. **Government Agencies (`/government`)**: NDMA, IMD, INCOIS, NDRF, SDRF directory.
15. **About (`/about`)**, **Research (`/research`)**, **Contact (`/contact`)**, **FAQs (`/faqs`)**, **Privacy (`/privacy`)**, **Terms (`/terms`)**.
16. **Authentication & Dashboards**: Login (`/login`), Register (`/register`), User Profile Dashboard (`/dashboard`), Admin Command Panel (`/admin`).
17. **Integrated Vercel FastAPI Backend (`frontend/api/index.py`)**: Python serverless endpoints for `/api/health`, `/api/disasters`, `/api/predict`.

---

## ⚡ What is Working

- ✅ **Next.js 15 App Router Build**: All 26 static/dynamic routes compile with zero TypeScript errors.
- ✅ **Editorial Typography**: `Instrument Serif` for headlines, `Inter` for body paragraphs, and `IBM Plex Mono` for coordinates/telemetry.
- ✅ **Ambient 3D Particle Earth Globe**: Three.js WebGL canvas rendering 2,400 particle coordinate points forming continent shapes, cyan atmosphere glow, directional lighting, and smooth rotation.
- ✅ **MapLibre GL GIS Engine**: Layer selection state, timeline slider playback, map marker popups, distance measurement UI state.
- ✅ **Vercel Serverless FastAPI Endpoints**: Python backend endpoints running seamlessly on Vercel at `/api/*`.
- ✅ **Hydration & Responsiveness**: 100% hydration-safe (using `suppressHydrationWarning` & `dynamic(..., { ssr: false })`) with full mobile/desktop responsive layouts.

---

## 📌 What is Currently Hardcoded / Mocked

For demonstration and prototype presentation, the following elements use static/mock data:

| Feature | Current Hardcoded State | Production Source (Future) |
| :--- | :--- | :--- |
| **Disaster Hotspots** | Mock coordinates for Cyclone Remal (Puri), Brahmaputra Flood (Guwahati), Wayanad Landslide (Kerala), Chamoli Fire. | Live IMD / CWC Open Data APIs |
| **Telemetry Counters** | Hardcoded constants (12,480 Volunteers, 482 Shelters, 720 Districts, 14 Active Alerts). | MongoDB Atlas Live Aggregation |
| **ML Model Inference** | `/api/predict` uses a mathematical formula simulating XGBoost probability scores. | Deployed `.joblib` / PyTorch Model Weights |
| **Emergency Broadcasts** | Form submissions trigger interactive UI toasts/alerts. | Twilio SMS & WhatsApp API payloads |
| **User Authentication** | Form accepts credentials and redirects to dashboard without JWT tokens. | NextAuth.js / JWT Auth with MongoDB |
| **GIS Raster Overlays** | Uses CartoDB dark basemap tiles with custom Canvas GeoJSON polygons. | Real INSAT-3DR / Sentinel WMS Tiles |

---

## 🔮 Future Additions in the Pipeline

1. **Twilio SMS & WhatsApp Gateway Integration**: Real-time geofenced SMS emergency broadcast dispatching to registered citizens and volunteers.
2. **IMD & CWC Live Data Pipeline**: Automatic ingestion of live India Meteorological Department Doppler radar feeds and Central Water Commission river level sensors.
3. **MongoDB Atlas & Motor Async Driver**: Live database persistence for volunteer registrations, agency approvals, and shelter occupancy tracking.
4. **Dedicated GPU Container for ML Models**: Hosting trained Scikit-learn, XGBoost, and HuggingFace Transformers NLP models on Railway/AWS.
5. **WebSocket Live GPS Tracking**: Real-time 24/7 tracking of active volunteer positions on the MapLibre GIS canvas.

---

## 🚀 How to Run & Deploy

### Local Development
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:3000** in your browser.

### 1-Click Vercel Deployment
1. Push repository to GitHub.
2. Import project on **[Vercel Dashboard](https://vercel.com/new)**.
3. Set **Root Directory** to `frontend`.
4. Click **Deploy**! Vercel will build both Next.js 15 pages and FastAPI Python serverless functions (`api/index.py`) automatically.
