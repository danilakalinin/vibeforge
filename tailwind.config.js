/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
      colors: {
        // Driven by CSS variables in src/index.css so the whole UI follows the
        // selected theme (see src/lib/themes.ts). Channels are "r g b" triples.
        // surface carries a theme-level alpha (--surface-a) so the glass themes
        // can be translucent over the native macOS window vibrancy.
        surface: {
          900: "rgb(var(--surface-900) / var(--surface-a, 1))",
          800: "rgb(var(--surface-800) / var(--surface-a, 1))",
          700: "rgb(var(--surface-700) / var(--surface-a, 1))",
          600: "rgb(var(--surface-600) / var(--surface-a, 1))",
          500: "rgb(var(--surface-500) / var(--surface-a, 1))",
        },
        brand: {
          300: "rgb(var(--brand-300) / <alpha-value>)",
          400: "rgb(var(--brand-400) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          900: "rgb(var(--brand-900) / <alpha-value>)",
        },
        // Overrides Tailwind's default gray scale with theme-aware text ramp
        // (gray-200 = brightest text … gray-600 = faintest). Other shades keep
        // their Tailwind defaults.
        gray: {
          100: "rgb(var(--tx-100) / <alpha-value>)",
          200: "rgb(var(--tx-200) / <alpha-value>)",
          300: "rgb(var(--tx-300) / <alpha-value>)",
          400: "rgb(var(--tx-400) / <alpha-value>)",
          500: "rgb(var(--tx-500) / <alpha-value>)",
          600: "rgb(var(--tx-600) / <alpha-value>)",
          900: "rgb(var(--tx-900) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
