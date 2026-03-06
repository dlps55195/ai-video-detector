/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['Instrument Sans', 'sans-serif'],
      },
      colors: {
        void: '#080A0F',
        deep: '#0D1117',
        surface: '#131924',
        panel: '#1A2233',
        border: '#1E2D45',
        muted: '#2A3A55',
        amber: {
          glow: '#F59E0B',
          dim: '#B45309',
        },
        signal: {
          real: '#10B981',
          fake: '#EF4444',
          warn: '#F59E0B',
          blue: '#3B82F6',
        },
      },
      animation: {
        'scan': 'scan 2s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-up': 'fadeUp 0.6s ease forwards',
        'slide-in': 'slideIn 0.4s ease forwards',
        'flicker': 'flicker 0.15s ease infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(245,158,11,0.3)' },
          '50%': { boxShadow: '0 0 24px rgba(245,158,11,0.7)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(30,45,69,0.4) 1px, transparent 1px),
          linear-gradient(90deg, rgba(30,45,69,0.4) 1px, transparent 1px)`,
        'radial-glow': 'radial-gradient(ellipse at center, rgba(245,158,11,0.05) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
};