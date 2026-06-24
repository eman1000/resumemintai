import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2a72d7',
          50: '#eaf3fc',
          100: '#d0e3f8',
          200: '#a1c7f1',
          300: '#6da8e8',
          400: '#3d8be0',
          500: '#2a72d7',
          600: '#2a72d7',
          700: '#165b9c',
          800: '#0f4275',
          900: '#0a2d50',
        },
        // Recruiter accent — the logo green. Differentiates the "hiring" side
        // from the blue candidate brand.
        mint: {
          DEFAULT: '#00b67a',
          50: '#e9f9f2',
          100: '#c8f0e0',
          200: '#92e3c7',
          300: '#54d0a9',
          400: '#1fbd8d',
          500: '#00b67a',
          600: '#00a06b',
          700: '#00855a',
          800: '#076a49',
          900: '#08573d',
        },
        surface: '#f8fbfc',
        'text-primary': '#1d1d20',
        'text-muted': '#52525a',
        'text-subtle': '#a1a1aa',
        'accent-green': '#00b67a',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        brand: ['var(--font-brand)', 'Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        pill: '50px',
      },
      maxWidth: {
        site: '1150px',
      },
    },
  },
  plugins: [],
} satisfies Config;
