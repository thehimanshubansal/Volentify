/** Volentify design tokens — see docs/DESIGN.md. Colours resolve to CSS variables in app/globals.css. */
/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: token('ink'), 900: token('ink-900'), 800: token('ink-800'), 700: token('ink-700') },
        ivory: token('ivory'),
        sand: token('sand'),
        stone: token('stone'),
        ash: token('ash'),
        line: 'rgb(var(--ivory) / 0.08)',
        'line-strong': 'rgb(var(--ivory) / 0.16)',
        signal: { DEFAULT: token('signal'), soft: token('signal-soft') },
        gold: token('gold'),
        critical: token('critical'),
        high: token('high'),
        moderate: token('moderate'),
        low: token('low'),
        info: token('info'),
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        eyebrow: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.16em' }],
      },
      borderRadius: { '4xl': '2rem' },
      maxWidth: { page: '78rem' },
      boxShadow: {
        float: '0 24px 60px -24px rgb(0 0 0 / 0.65), 0 0 0 1px rgb(var(--ivory) / 0.06)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'none' } },
        pulse_ring: { '0%': { transform: 'scale(0.8)', opacity: 0.7 }, '100%': { transform: 'scale(2.4)', opacity: 0 } },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in': 'slide-in 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'pulse-ring': 'pulse_ring 2.2s cubic-bezier(0.16,1,0.3,1) infinite',
      },
    },
  },
  plugins: [],
};
