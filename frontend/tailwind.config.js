/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4fb',
          100: '#d7e4f5',
          500: '#2b6cb0',
          600: '#1f4e79',
          700: '#193f62',
        },
      },
    },
  },
  plugins: [],
};
