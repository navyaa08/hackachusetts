/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0a0e1a',
        panel: '#121829',
        panel2: '#1a2238',
        accent: '#38bdf8',
        warn: '#f59e0b',
        danger: '#ef4444',
        safe: '#22c55e',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
