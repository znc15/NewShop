/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#b87333',
        cream: {
          50: '#fdfcfb',
          100: '#faf8f5',
          200: '#f5f2ed',
          300: '#ebe6dd',
          DEFAULT: '#faf8f5',
        },
        forest: {
          50: '#f0f5f3',
          100: '#dce8e2',
          200: '#b8d4c7',
          300: '#8fbca5',
          400: '#5fa07f',
          500: '#3d7a5f',
          600: '#2d5a47',
          700: '#1a3a2f',
          800: '#163027',
          900: '#12231c',
          DEFAULT: '#1a3a2f',
        },
        charcoal: '#2c2c2c',
        copper: {
          500: '#b87333',
          600: '#a66529',
          DEFAULT: '#b87333',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"Songti SC"', 'serif'],
        body: ['Outfit', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
