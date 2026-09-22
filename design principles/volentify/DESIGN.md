---
name: Volentify
colors:
  surface: '#09151a'
  surface-dim: '#09151a'
  surface-bright: '#2f3b41'
  surface-container-lowest: '#041015'
  surface-container-low: '#111d23'
  surface-container: '#152127'
  surface-container-high: '#202c32'
  surface-container-highest: '#2a363d'
  on-surface: '#d7e4ec'
  on-surface-variant: '#e2bfb0'
  inverse-surface: '#d7e4ec'
  inverse-on-surface: '#263238'
  outline: '#a98a7d'
  outline-variant: '#5a4136'
  surface-tint: '#ffb693'
  primary: '#ffb693'
  on-primary: '#561f00'
  primary-container: '#ff6b00'
  on-primary-container: '#572000'
  inverse-primary: '#a04100'
  secondary: '#bdc2ff'
  on-secondary: '#1b247f'
  secondary-container: '#343d96'
  on-secondary-container: '#a8afff'
  tertiary: '#ffb3ac'
  on-tertiary: '#680008'
  tertiary-container: '#ff675e'
  on-tertiary-container: '#6a0008'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb693'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7a3000'
  secondary-fixed: '#e0e0ff'
  secondary-fixed-dim: '#bdc2ff'
  on-secondary-fixed: '#000767'
  on-secondary-fixed-variant: '#343d96'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb3ac'
  on-tertiary-fixed: '#410003'
  on-tertiary-fixed-variant: '#930010'
  background: '#09151a'
  on-background: '#d7e4ec'
  surface-variant: '#2a363d'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-tabular:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
  container-max: 1440px
---

## Brand & Style
The design system is engineered for high-stakes environments where split-second decision-making is critical. The brand personality is **authoritative, resilient, and hyper-functional**. It balances the urgency of emergency response with the analytical precision required for disaster mitigation.

The visual style is **Corporate / Modern** with a **Tactical** edge. It utilizes a modular, grid-based dashboard approach that prioritizes data density and situational awareness. Every UI element is designed to minimize cognitive load, using high-contrast boundaries and a clear visual hierarchy to guide the user through complex information maps and real-time telemetry.

## Colors
This design system utilizes a high-visibility palette optimized for both tactical dark environments (field use) and data-centric light environments (command centers).

- **Primary (Safety Orange):** Reserved for active interaction states and critical navigation. It provides maximum visibility against both dark and light backgrounds.
- **Secondary (Deep Navy):** Used for structural elements like sidebars and headers to evoke stability and institutional trust.
- **Emergency Red:** Strictly reserved for active alerts, danger zones on maps, and destructive actions.
- **Surface Strategy:** In dark mode, surfaces use 'Slate Grey' variants to reduce eye strain while maintaining contrast. In light mode, surfaces remain stark white with soft grey borders to define modular zones.

## Typography
The typography system prioritizes legibility under duress. **Inter** is the workhorse font, selected for its neutral tone and exceptional performance in data-heavy interfaces. 

A secondary monospaced font, **JetBrains Mono**, is introduced for telemetry data, coordinates, and timestamps. This ensures that numerical values align perfectly in tables and map overlays, allowing for quicker scanning of changing variables. Use `label-caps` for categorical metadata and `data-tabular` for all sensor readings and GPS coordinates.

## Layout & Spacing
The layout follows a **Fluid Grid** model designed for modular "widgets" or "cards." 

- **Grid:** A 12-column system is used for the desktop dashboard, collapsing to a 4-column system for mobile.
- **Rhythm:** A strict 4px baseline grid ensures alignment across dense data tables.
- **Modular Dashboard:** Components should be housed in containers that can be reordered. Use 16px gutters between modules to maintain a "technical" and organized feel. 
- **Map Focus:** In map-heavy views, UI panels should be docked to the sides or floating with clear margins (24px) from the screen edge to maximize the visible geographic area.

## Elevation & Depth
Elevation in this design system is primarily conveyed through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows. This maintains a flat, technical aesthetic that feels integrated with digital maps.

- **Level 0 (Base):** The primary background color.
- **Level 1 (Card/Module):** A slightly lighter (in dark mode) or darker (in light mode) surface with a 1px solid border.
- **Level 2 (Modals/Overlays):** These use a subtle ambient shadow (8% opacity) to provide separation from the map or dashboard without appearing "soft." 
- **Active State:** Elements being hovered or interacted with should use a primary-colored glow or border-thickening rather than an increase in shadow depth.

## Shapes
The shape language is **Soft (0.25rem)**. This slight rounding provides a professional, modern feel while maintaining the structural rigidity required for a "tactical" tool. 

- **Interactive Elements:** Buttons and input fields use the standard `rounded` (0.25rem) setting.
- **Structural Elements:** Dashboard widgets and map overlays should use `rounded-lg` (0.5rem) to distinguish them as distinct containers.
- **Data Tags:** Status indicators or "pills" may use `rounded-xl` (0.75rem) to contrast against the more rectangular data tables.

## Components
- **Buttons:** Primary buttons use a solid Safety Orange fill with white text. "Emergency" buttons (e.g., *Broadcast Alert*) use Emergency Red with a subtle pulse animation.
- **Input Fields:** Use high-contrast borders (1px solid). In focus states, the border thickens to 2px using the Primary color.
- **Chips/Status:** Use "Traffic Light" logic. Status chips must include both a color-coded background (at 15% opacity) and a solid leading icon for accessibility.
- **Data Tables:** Use zebra-striping with very low-contrast neutrals. Headers must be `label-caps`. 
- **Map Markers:** Geometric shapes (diamonds for hazards, circles for assets) with high-contrast strokes to ensure visibility against varied satellite imagery.
- **Alert Banners:** Full-width pinned components at the top of the viewport using the Tertiary (Red) or Warning (Amber) colors, featuring bold, centered text.