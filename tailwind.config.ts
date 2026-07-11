import type { Config } from "tailwindcss";

/**
 * ART Asbestos design tokens.
 * Deep navy primary. White cards. Red reserved strictly for
 * expired / blocked / fault states — never decorative.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand navy (primary ~#1a3a5c)
        navy: {
          50: "#eef2f6",
          100: "#d3dde7",
          200: "#a7bbcf",
          300: "#7b98b6",
          400: "#4f759e",
          500: "#2c5680",
          600: "#1a3a5c", // primary
          700: "#152f4a",
          800: "#0f2338",
          900: "#0a1826",
        },
        // Status colours — red used ONLY for expired/blocked/fault
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          500: "#dc2626",
          600: "#c81e1e",
          700: "#a51818",
        },
        warn: {
          50: "#fffbeb",
          100: "#fef3c7",
          500: "#d97706",
          700: "#b45309",
        },
        ok: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#16a34a",
          700: "#15803d",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f5f7fa",
          border: "#e2e8f0",
        },
        ink: {
          DEFAULT: "#0f2338",
          muted: "#5b6b7d",
          faint: "#94a3b8",
        },
      },
      borderRadius: {
        card: "0.875rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,35,56,0.06), 0 1px 3px rgba(15,35,56,0.10)",
        raised: "0 4px 12px rgba(15,35,56,0.12)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      minHeight: {
        tap: "44px", // minimum tap target
      },
    },
  },
  plugins: [],
};

export default config;
