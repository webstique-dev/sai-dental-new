/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F7F8FA',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        ink: {
          DEFAULT: '#1C2833',
          soft: '#64748B',
        },
        brand: {
          DEFAULT: '#0E7C7B',
          dark: '#0B5F5E',
          light: '#E4F3F2',
        },
        role: {
          doctor: '#0E7C7B',
          doctorSoft: '#E4F3F2',
          reception: '#C8811A',
          receptionSoft: '#FBF0DF',
          admin: '#4C5B76',
          adminSoft: '#EAECF2',
        },
        state: {
          success: '#2F9E44',
          successSoft: '#E7F6EA',
          warning: '#E8A33D',
          warningSoft: '#FDF3E3',
          danger: '#D64545',
          dangerSoft: '#FBEAEA',
          info: '#3B82C4',
          infoSoft: '#E9F2FA',
        },
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
        card: '0 1px 2px rgba(28, 40, 51, 0.04), 0 1px 12px rgba(28, 40, 51, 0.05)',
      },
    },
  },
  plugins: [],
};
