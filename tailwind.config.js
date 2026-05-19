/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Plim Design System
        primary: {
          50:  '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        energy: {
          50:  '#FFF7ED',
          100: '#FFEDD5',
          300: '#FED7AA',
          500: '#F97316',
          600: '#EA580C',
        },
        calm: {
          50:  '#F0F9FF',
          100: '#E0F2FE',
          300: '#7DD3FC',
          500: '#0EA5E9',
          600: '#0284C7',
        },
        success: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },
        surface: '#FFFFFF',
        background: '#F5F3FF',
        'background-dark': '#0F0A1E',
        'surface-dark': '#1A1033',
        muted: '#94A3B8',
        'muted-dark': '#64748B',
      },
      fontFamily: {
        sans: ['System'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
    },
  },
  plugins: [],
};
