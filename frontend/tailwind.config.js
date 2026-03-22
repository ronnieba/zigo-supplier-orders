/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'zigo-bg': 'var(--zigo-bg)',
        'zigo-header': 'var(--zigo-header)',
        'zigo-card': 'var(--zigo-card)',
        'zigo-border': 'var(--zigo-border)',
        'zigo-text': 'var(--zigo-text)',
        'zigo-muted': 'var(--zigo-muted)',
        'zigo-green': 'var(--zigo-green)',
      },
    },
  },
  plugins: [],
}
