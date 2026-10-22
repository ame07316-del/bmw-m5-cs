/** @type {import('tailwindcss').Config} */
/** @import 'tailwindcss-animate' */
import tailwindAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  important: true,
  theme: {
    extend: {
      colors: {
        nova: {
          primary: '#0EA5E9',
          'primary-dark': '#0C4A6E',
          'primary-light': '#BAE6FD',
          secondary: '#38BDF8',
          accent: '#FBBF24',
          'accent-dark': '#B45309',
          bg: '#F0F9FF',
          background: '#F0F9FF',
          surface: '#FFFFFF',
          'surface-alt': '#F8FAFC',
          muted: '#E8F2F8',
          border: '#BAE6FD',
          text: '#0C4A6E',
          'text-secondary': '#475569',
          'text-muted': '#94A3B8',
          success: '#16A34A',
          warning: '#D97706',
          error: '#DC2626',
          info: '#0284C7',
          tooth: {
            white: '#FFFBF0',
            dentine: '#C4956A',
          },
        },
        dark: {
          bg: '#0C1628',
          surface: '#1E293B',
          'surface-alt': '#253347',
          text: '#F0F9FF',
          'text-secondary': '#94A3B8',
          'text-muted': '#64748B',
          border: '#334155',
        },
      },
      fontFamily: {
        // var(--font-arabic) / var(--font-inter) يأتيان من next/font (layout.tsx)
        // وتحمل الخطوط المحمّلة فعليًا؛ الباقي fallback لو المتغيرات غير موجودة.
        arabic: ['var(--font-arabic)', 'Noto Naskh Arabic', 'Noto Sans Arabic', 'system-ui'],
        arabicHeading: ['var(--font-arabic)', 'Noto Naskh Arabic', 'serif'],
        arabicBody: ['var(--font-arabic)', 'Noto Naskh Arabic', 'Noto Sans Arabic', 'sans-serif'],
        // Inter covers Latin; Arabic glyphs (not shipped in Inter) fall back to
        // the self-hosted Noto Naskh Arabic instead of the OS default font.
        display: ['var(--font-inter)', 'Inter', 'var(--font-arabic)', 'Noto Naskh Arabic', 'system-ui'],
        body: ['var(--font-inter)', 'Inter', 'var(--font-arabic)', 'Noto Naskh Arabic', 'system-ui'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
        label: ['var(--font-inter)', 'Plus Jakarta Sans', 'system-ui'],
        trust: ['var(--font-inter)', 'Lexend', 'Source Sans 3', 'sans-serif'],
      },
      fontSize: {
        'ar-display': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'ar-h1': ['36px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'ar-h2': ['28px', { lineHeight: '1.3', letterSpacing: '0' }],
        'ar-h3': ['22px', { lineHeight: '1.4', letterSpacing: '0' }],
        'ar-body': ['18px', { lineHeight: '1.8', letterSpacing: '0' }],
        'en-display': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'en-h1': ['36px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'en-h2': ['28px', { lineHeight: '1.3', letterSpacing: '0' }],
        'en-body': ['16px', { lineHeight: '1.6', letterSpacing: '0' }],
      },
      borderRadius: {
        btn: '8px',
        card: '12px',
        modal: '16px',
        avatar: '50%',
        badge: '9999px',
        chip: '6px',
        input: '8px',
        event: '6px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
      boxShadow: {
        flat: '0 1px 2px rgba(12, 74, 110, 0.05)',
        soft: '0 1px 3px rgba(12, 74, 110, 0.06), 0 1px 2px rgba(12, 74, 110, 0.04)',
        elevated: '0 4px 6px rgba(12, 74, 110, 0.07), 0 2px 4px rgba(12, 74, 110, 0.05)',
        floating: '0 10px 15px rgba(12, 74, 110, 0.1), 0 4px 6px rgba(12, 74, 110, 0.05)',
        prominent: '0 20px 25px rgba(12, 74, 110, 0.1), 0 8px 10px rgba(12, 74, 110, 0.06)',
        neumorph: '-3px -3px 8px rgba(255, 255, 255, 0.6), 3px 3px 8px rgba(12, 74, 110, 0.08)',
        inner: 'inset 0 2px 4px rgba(12, 74, 110, 0.06)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'skeleton-shimmer 1.5s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 300ms ease-out',
        'slide-in-left': 'slide-in-left 300ms ease-out',
        'slide-up': 'slide-up 300ms ease-out',
        'fade-in': 'fade-in 200ms ease-out',
        'fade-out': 'fade-out 200ms ease-out',
        'timer-pulse': 'timer-pulse 2s ease-in-out infinite',
        'timer-blink': 'timer-blink 1s ease-in-out infinite',
      },
      keyframes: {
        'skeleton-shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'timer-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'timer-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      transitionTimingFunction: {
        'ease-out': 'ease-out',
        'ease-in': 'ease-in',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [tailwindAnimate],
};

module.exports = config;
