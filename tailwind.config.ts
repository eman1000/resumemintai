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
        surface: '#f8fbfc',
        'text-primary': '#1d1d20',
        'text-muted': '#52525a',
        'text-subtle': '#a1a1aa',
        'accent-green': '#00b67a',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
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
