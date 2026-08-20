/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F0F9FF',
        surface: '#FFFFFF',
        border: '#CBD5E1',
        ink: {
          DEFAULT: '#0B1A2E',
          soft: '#475569',
        },
        brand: {
          DEFAULT: '#1E64EA',
          mid: '#2090F0',
          cyan: '#14C9FE',
          dark: '#0F44AC',
          light: '#E0F2FE',
          navy: '#001428',
        },
        role: {
          doctor: '#1E64EA',
          doctorSoft: '#E0F2FE',
          reception: '#2090F0',
          receptionSoft: '#F0F9FF',
          admin: '#0B1A2E',
          adminSoft: '#E2E8F0',
        },
        state: {
          success: '#10B981',
          successSoft: '#ECFDF5',
          warning: '#F59E0B',
          warningSoft: '#FFFBEB',
          danger: '#EF4444',
          dangerSoft: '#FEF2F2',
          info: '#2090F0',
          infoSoft: '#F0F9FF',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #1E64EA 0%, #2090F0 50%, #14C9FE 100%)',
        'brand-gradient-hover': 'linear-gradient(135deg, #1852C2 0%, #1A7BD0 50%, #0FB4E4 100%)',
      },
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(11, 26, 46, 0.05), 0 4px 16px rgba(30, 100, 234, 0.06)',
      },
    },
  },
  plugins: [],
};
