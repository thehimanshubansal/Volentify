/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#07080a',
        'surface-lowest': '#041015',
        'surface-low': '#111d23',
        'surface-container': '#152127',
        'surface-high': '#202c32',
        'surface-highest': '#2a363d',
        'tactical-text': '#d7e4ec',
        'tactical-muted': '#94a3b8',
        emergency: '#ff675e',
        surface: {
          DEFAULT: '#0f1115',
          card: '#14171d',
          subtle: '#1a1e26',
        },
        primary: {
          DEFAULT: '#ff6b00',
          hover: '#ff7d1a',
          tint: '#ffb693',
        },
        slate: {
          950: '#07080a',
          900: '#0f1115',
          800: '#1e232d',
          700: '#333b4d',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
        },
      },
      boxShadow: {
        tactical: '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        telemetry: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '1.25rem', // 20px
        '3xl': '1.75rem', // 28px
        '4xl': '2.5rem',  // 40px
      },
    },
  },
  plugins: [],
};
