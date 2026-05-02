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
          DEFAULT: '#F59E0B',
          main: '#F59E0B',
          dark: '#D97706',
          light: '#FBBF24',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#121214',
        },
        bg: {
          light: '#F9F9FB',
          dark: '#09090B',
        },
        text: {
          light: '#18181B',
          dark: '#FAFAFA',
        },
        status: {
          success: '#10B981',
          error: '#EF4444',
        }
      },
      boxShadow: {
        'glow-primary': '0 0 20px -5px rgba(245, 158, 11, 0.4)',
        'glow-primary-lg': '0 0 40px -10px rgba(245, 158, 11, 0.3)',
        'premium': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        arabic: ['Cairo', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
