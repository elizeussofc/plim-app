/** @type {import('tailwindcss').Config} */
// Identidade "massinha" (nov/2026). As telas internas usam as classes do Tailwind
// (bg-violet-50, text-slate-800...), então as escalas abaixo foram redesenhadas para
// a paleta nova: "slate" virou ameixa/creme e "violet-50" virou o papel creme do fundo.
// Os valores espelham lib/theme.ts.
module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        violet: {
          50:  '#FBF6EE', // fundo das telas (papel creme)
          100: '#F3ECFF',
          200: '#E7DBFF',
          300: '#D9C8FB',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#2B1D4E', // títulos: ameixa escura
          900: '#221640',
        },
        slate: {
          50:  '#F7F1E7',
          100: '#F4EDE1',
          200: '#EADFCF',
          300: '#DCCDB6',
          400: '#8A7FA3',
          500: '#64577F',
          600: '#51456C',
          700: '#3C2F5E',
          800: '#2B1D4E',
          900: '#221640',
        },
        orange: {
          50:  '#FFF4EA',
          100: '#FFE9D6',
          200: '#FDD3AE',
          500: '#EA580C',
          600: '#C2410C',
        },
        emerald: {
          50:  '#EAFAF2',
          100: '#DDF6EA',
          400: '#34D399',
          500: '#0E9F6E',
          600: '#0B7C56',
        },
        // O Plim não usa vermelho de bronca: "red" é um rosa-ameixa suave.
        red: {
          50:  '#FDF0F4',
          100: '#FDE4EB',
          400: '#D9466A',
          500: '#C2355A',
        },
        primary: {
          50:  '#F3ECFF',
          100: '#E7DBFF',
          200: '#D9C8FB',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        energy: { 50: '#FFF4EA', 100: '#FFE9D6', 300: '#FDD3AE', 500: '#EA580C', 600: '#C2410C' },
        calm:   { 50: '#F0F7FF', 100: '#DDECFF', 300: '#93C5FD', 500: '#2F7FE6', 600: '#1E5FB8' },
        success:{ 50: '#EAFAF2', 100: '#DDF6EA', 400: '#34D399', 500: '#0E9F6E', 600: '#0B7C56' },
        surface: '#FFFFFF',
        background: '#FBF6EE',
        muted: '#8A7FA3',
      },
      fontFamily: {
        sans: ['AtkinsonHyperlegible_400Regular', 'System'],
        display: ['Fredoka_600SemiBold', 'System'],
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
    },
  },
  plugins: [],
};
