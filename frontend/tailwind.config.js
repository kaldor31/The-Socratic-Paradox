/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        // Atelier of Socrates: stone, ink, bronze, gold
        marble: {
          midnight: 'rgb(var(--marble-midnight))',
          900: 'rgb(var(--marble-900))',
          800: 'rgb(var(--marble-800))',
          700: 'rgb(var(--marble-700))',
          600: 'rgb(var(--marble-600))',
        },
        accent: {
          gold: 'rgb(var(--accent-gold))',
          rust: 'rgb(var(--accent-rust))',
          patina: 'rgb(var(--accent-patina))',
          bronze: 'rgb(var(--accent-bronze))',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink))',
          muted: 'rgb(var(--ink-muted))',
          dim: 'rgb(var(--ink-dim))',
        },
        parchment: {
          DEFAULT: 'rgb(var(--parchment))',
          dark: 'rgb(var(--parchment-dark))',
        },
      },
      fontFamily: {
        serif: ['"Cinzel"', '"Cinzel Decorative"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ['"Cormorant Garamond"', 'Georgia', 'Cambria', 'serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'glow-rust': '0 0 18px rgba(168, 92, 50, 0.35)',
        'glow-gold': '0 0 18px rgba(199, 166, 99, 0.35)',
        'glow-patina': '0 0 18px rgba(91, 138, 130, 0.35)',
        'glow-bronze': '0 0 18px rgba(140, 123, 94, 0.35)',
        'panel': '0 4px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at top, var(--tw-gradient-stops))',
        'vellum': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.07'/%3E%3C/svg%3E\")",
        'stain': 'radial-gradient(ellipse at 20% 30%, rgba(199, 166, 99, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(91, 138, 130, 0.05) 0%, transparent 45%)',
      },
      animation: {
        'pulse-slow': 'pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.7s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};
