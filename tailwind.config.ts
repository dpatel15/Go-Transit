import type { Config } from "tailwindcss";

/**
 * Kankotri Studio design tokens.
 *
 * The palette leans "premium and restrained" by default (deep maroon, muted
 * antique gold, warm ivory) rather than flashy. Brighter festive accents are
 * available for the higher-intensity moods.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light, cool, "standard" palette. Token names are kept stable so the
        // whole app re-colours from this one place; the accent (historically
        // named "maroon") is now a clean, friendly blue.
        ivory: "#F8FAFC", // page ground — cool near-white (slate-50)
        cream: "#F1F5F9", // subtle surfaces / placeholders (slate-100)
        sand: "#E2E8F0", // hairline fills (slate-200)
        gold: {
          DEFAULT: "#2563EB",
          light: "#3B82F6",
          dark: "#1D4ED8",
        },
        maroon: {
          // accent — blue
          DEFAULT: "#2563EB", // blue-600
          dark: "#1D4ED8", // blue-700 (hover / pressed)
          light: "#3B82F6", // blue-500
        },
        ink: "#0F172A", // slate-900 — headings & primary text
        muted: "#64748B", // slate-500 — secondary text
      },
      fontFamily: {
        // Elegant serif for display; system serif fallback keeps builds offline-safe.
        display: ['"Cormorant Garamond"', '"Playfair Display"', "Georgia", "serif"],
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        premium: "0 20px 60px -20px rgba(33, 27, 22, 0.35)",
        card: "0 10px 40px -12px rgba(33, 27, 22, 0.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
