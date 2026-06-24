/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          dark: 'var(--surface-dark)',
          card: 'var(--surface-card)',
          muted: 'var(--surface-muted)',
          border: 'var(--surface-border)',
        },
        brand: {
          violet: '#A855F7',
          pink: '#EC4899',
          indigo: '#6366F1',
        },
      },
      fontFamily: {
        display: ['Sora', 'DM Sans', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        brand: '0 8px 24px -8px rgba(168, 85, 247, 0.45)',
      },
    },
  },
  plugins: [],
};
