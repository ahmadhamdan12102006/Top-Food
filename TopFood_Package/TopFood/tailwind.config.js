/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F2A640',
          main: '#F2A640',
          dark: '#D98A26',
          light: '#F7C378',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1A1D24',
        },
        bg: {
          light: '#F9FAFB',
          dark: '#0D0F14',
        },
        text: {
          light: '#111827',
          dark: '#F9FAFB',
        },
        status: {
          success: '#10B981',
          error: '#EF4444',
        },
        amber: {
          50: '#fef9f3',
          100: '#fcf1e0',
          200: '#f9e0c1',
          300: '#f5cba0',
          400: '#f2a640',
          500: '#e08f2e',
          600: '#ca7924',
          700: '#a75e1f',
          800: '#864a1d',
          900: '#6c3e1b',
          950: '#3e200c',
        },
        yellow: {
          50: '#fef9f3',
          100: '#fcf1e0',
          200: '#f9e0c1',
          300: '#f5cba0',
          400: '#f2a640',
          500: '#e08f2e',
          600: '#ca7924',
          700: '#a75e1f',
          800: '#864a1d',
          900: '#6c3e1b',
          950: '#3e200c',
        },
        gray: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#6c757d',
          700: '#495057',
          800: '#262A34',
          900: '#1A1D24',
          950: '#0D0F14',
        },
        black: '#07090C',
      },
      boxShadow: {
        'glow-primary': '0 0 20px -5px rgba(241, 183, 109, 0.4)',
        'glow-primary-lg': '0 0 40px -10px rgba(241, 183, 109, 0.3)',
        'premium': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        arabic: ['Cairo', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
