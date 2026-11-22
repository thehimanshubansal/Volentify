# Volentify design system

Volentify is used in two very different moments: a calm, considered read of the situation (incident
dossiers, forecasts, the public site) and fast operation under pressure (the tactical map, dispatch,
review queues). The system pairs an editorial serif with a quiet, high-contrast operating surface.

## Principles

1. **Quiet surfaces, loud signals.** Near-black ink and warm ivory carry everything; colour is spent
   only on meaning — severity, live state, the action you can take.
2. **Serif for judgement, sans for operation.** Instrument Serif sets titles, numerals and anything
   a commander reads as a conclusion. Inter runs every control, label and paragraph.
3. **Provenance is always visible.** Every data view shows whether it is live, cached or demo data,
   and every field report shows whether it is unverified, reviewed or promoted.
4. **One precious object.** The digital muster pass is the only place champagne gold appears in
   quantity. It is a credential and should feel like one.
5. **Works when it matters.** Keyboard focus is always visible, motion respects reduced-motion,
   every async action has loading, success and readable error states, layouts hold at 360 px.

## Tokens

Defined once as CSS variables in `frontend/app/globals.css`, exposed to Tailwind in `tailwind.config.js`.

| Token | Value | Use |
| :-- | :-- | :-- |
| `ink` | `#07080A` | Page background |
| `ink-900` / `800` / `700` | `#0C0D10` / `#121418` / `#1B1E23` | Panels, raised surfaces, inputs |
| `ivory` | `#F4F1EA` | Headings, primary text on controls |
| `sand` | `#C9C4B8` | Body text |
| `stone` / `ash` | `#8D887E` / `#5F5B54` | Secondary text, placeholders |
| `signal` | `#FF6B00` | Primary action, live state (safety orange) |
| `gold` | `#D4B483` | Credentials, verified marks, promoted reports |
| `critical` / `high` / `moderate` / `low` | `#FF5A4E` / `#FF9A3C` / `#E9C46A` / `#7FB69A` | Severity only |
| `info` | `#8FB3D9` | Shelters, informational state |

Hairlines are ivory at 8 % (`border-line`) and 16 % (`border-line-strong`).

## Type

| Role | Face | Notes |
| :-- | :-- | :-- |
| Display, headings, numerals | Instrument Serif 400 | `display` class: −0.025em tracking, 1.02 leading |
| Body and UI | Inter 300–600 | 15–17 px body, sentence-case labels at 13 px |
| Codes, coordinates, timestamps | IBM Plex Mono 400–500 | `code` / `data` classes, tabular figures |

Labels are sentence case. No all-caps label rows, no arrow glyphs in button text.

## Shape and depth

Radius encodes hierarchy: panels 16 px, controls 10 px, chips and pills fully round. Elevation comes
from tone (`ink-900` → `ink-800`) and hairlines; the only shadow is `shadow-float` for menus and
map overlays. Map overlays use `.glass` (90 % ink with blur) so geography stays readable beneath.

## Map language

Hazards are diamonds, assets are circles (from the original tactical brief). Incident zones are
dashed outlines in the category colour. Mesh reports are rings in their priority colour: dashed
while unverified (OD-07), solid once reviewed, gold once promoted to a mission.

## Components

`frontend/components/ui`: `Button`/`ButtonLink`, `Field`/`Input`/`Select`/`Textarea`/`ChipGroup`/
`Segmented`, `PageHeader`/`Section`/`Panel`/`Stat`, `SeverityBadge`/`Pill`/`LiveDot`,
`Skeleton`/`LoadingRows`/`ErrorState`/`EmptyState`/`SourceTag`, `ToastProvider`/`useToast`.

The earlier Stitch explorations that preceded this system are kept for reference in
`docs/design/references/`.
