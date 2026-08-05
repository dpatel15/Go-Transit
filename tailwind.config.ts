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
        ivory: "#FBF8F1",
        cream: "#F3EAD9",
        sand: "#E4D6BC",
        gold: {
          DEFAULT: "#B8912F", // antique, muted — not neon
          light: "#D9B65A",
          dark: "#8A6C1F",
        },
        maroon: {
          DEFAULT: "#6E1E2A",
          dark: "#4A121B",
          light: "#8F3341",
        },
        ink: "#211B16",
        muted: "#6B6157",
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
