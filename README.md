<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="frontend/public/brand/volentify-logo.svg">
    <img src="frontend/public/brand/volentify-logo-light.svg" alt="Volentify" width="360">
  </picture>
</p>

<p align="center"><strong>Disaster intelligence, offline mesh reporting and volunteer dispatch for India.</strong></p>

<p align="center">
  <a href="https://volentify.vercel.app">Open Volentify</a> ·
  <a href="https://volentify.vercel.app/map">Live map</a> ·
  <a href="https://github.com/Gyanvir/Volentify/releases/latest/download/volentify-mesh.apk">Android app (APK)</a> ·
  <a href="https://volentify.vercel.app/api/docs">API</a>
</p>

---

> **In an emergency, call 112.** Ambulance 108 · Fire 101 · Police 100 · NDMA 1078. Volentify helps responders
> coordinate; it is not an emergency service and not a government service.

Volentify gives citizens, volunteers, NGOs and incident commanders one shared picture of an emergency. It maps
incidents as they unfold from public hazard feeds, carries field reports phone-to-phone over Bluetooth when the mobile
network is down, and sends the right volunteer to the right mission first.

## What you can do

| | Live link |
| :-- | :-- |
| See every active hazard in and around India on a 2D/3D map with satellite imagery, field reports, missions, hospitals and shelters | [volentify.vercel.app/map](https://volentify.vercel.app/map) |
| Read alerts from incident command, automated safety advice for each live incident, and official NDMA SACHET warnings | [/alerts](https://volentify.vercel.app/alerts) |
| Report an incident from the browser — it is triaged in any major Indian language and reaches responders | [/contact](https://volentify.vercel.app/contact) |
| Find the nearest hospital or shelter to you or to a specific disaster, plus helplines, guidelines and research | [/resources](https://volentify.vercel.app/resources) |
| Volunteer: get missions matched to your skills and location, start one and follow the route on the map | [/volunteer](https://volentify.vercel.app/volunteer) |
| Report and relay with **no signal** using the Volentify Mesh Android app | [/mesh](https://volentify.vercel.app/mesh) · [download APK](https://github.com/Gyanvir/Volentify/releases/latest/download/volentify-mesh.apk) |
| See the response in numbers: live operations, volunteer impact and past disasters | [/analytics](https://volentify.vercel.app/analytics) |
| Check how Volentify is accountable: figures, data held, how decisions are made | [/transparency](https://volentify.vercel.app/transparency) |
| Prepare your household for cyclones, floods, earthquakes and heatwaves | [/knowledge](https://volentify.vercel.app/knowledge) |

## Who it is for

- **Citizens** — follow alerts for your area, report what you see, find help nearby.
- **Volunteers** — list your skills and equipment, accept recommended missions, build a public profile with your
  mission history and reviews from other members.
- **NGOs and relief agencies** — create missions, see the full field picture, review reports. Accounts are verified
  before they get these permissions.
- **Incident command (NDRF, SDRF, district EOCs)** — broadcast official alerts, review and convert field reports, run
  dispatch, and read situation briefings. Accounts are verified before they get these permissions.

Sign up at [volentify.vercel.app/register](https://volentify.vercel.app/register). Agencies and NGOs that want their
teams verified, write to the address below.

## Volentify Mesh — reporting without a network

Install the [APK](https://github.com/Gyanvir/Volentify/releases/latest/download/volentify-mesh.apk) on an Android phone
(Android 8 or later with Bluetooth LE) and leave the relay switched on. A report is saved on the phone, handed to nearby
phones over Bluetooth (roughly 30–50 m, up to five hops), and uploaded by the first phone that gets mobile data or Wi-Fi.
That phone also brings official messages from incident command back into the offline mesh. Every report shows where it
is: saved locally → relayed → server-confirmed.

## Rules everyone follows

The full rules, role-by-role caveats, permissions and security notes are at
[/safety](https://volentify.vercel.app/safety). In short:

1. **Call 112 first** if anyone is in danger. The mesh is best-effort.
2. **Report only what you see.** False alarms are an offence under Section 54 of the Disaster Management Act, 2005.
3. **Send one report per situation** — repeats crowd the mesh. The app refuses duplicates within a minute.
4. **Field reports are unverified** until command reviews them. Only messages marked *Official · Volentify command*
   come from verified command; *Automated* advisories are guidance, not warnings.
5. **Keep identities out.** No Aadhaar, PAN, bank or phone numbers in reports — they are removed automatically.
6. **Don't take risks to file a report.** Never enter flood water, damaged buildings or closed zones.

## Where the data comes from

| Data | Source |
| :-- | :-- |
| Cyclones, floods, droughts, wildfires, volcanoes | [GDACS](https://www.gdacs.org) (EC Joint Research Centre & UN OCHA) |
| Earthquakes (M4.5+) | [USGS Earthquake Hazards Program](https://earthquake.usgs.gov) |
| Other natural events | [NASA EONET](https://eonet.gsfc.nasa.gov) |
| Official warnings (CAP) | [NDMA SACHET](https://sachet.ndma.gov.in) |
| Hospitals and shelters | [OpenStreetMap](https://www.openstreetmap.org) contributors |
| Satellite imagery and radar | NASA GIBS, Esri World Imagery, RainViewer |
| Field reports, missions, volunteers | People using Volentify |

Live feeds refresh every 15 minutes. Nothing on the platform is sample or invented data.

## Privacy

Volentify collects only what a response needs. People-related reports are shown in full only to verified command and
NGO accounts; volunteer profiles never show contact details; report free text and exact coordinates are minimised 30
days after an incident closes; no data is sold or used for advertising. Read the
[privacy notice](https://volentify.vercel.app/privacy).

## For developers

Volentify is open source (MIT). Setup, architecture, deployment, the ML pipeline and tests are in
[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md); the product specification is in [`docs/PRD.md`](docs/PRD.md) and the
design system in [`docs/DESIGN.md`](docs/DESIGN.md). The public REST API is documented at
[volentify.vercel.app/api/docs](https://volentify.vercel.app/api/docs).

## Contact

Questions, partnerships, data requests or a security problem: **[gyanvirsingh09@gmail.com](mailto:gyanvirsingh09@gmail.com)**.

## Licence

[MIT](https://opensource.org/license/mit)
