import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Bright, light-mode theme: vivid hunter-green brand accent, warm
        // white "paper" surfaces/borders, a dark "ink" text scale, and
        // "sand" kept as the light cream tone used specifically for form
        // field chrome (it was already light - it just didn't need to change).
        paper: {
          50: "#fdfbf5",
          100: "#f7f2e6",
          200: "#efe6d1",
          300: "#ddd0ac",
          400: "#c7b78d",
        },
        ink: {
          950: "#1c1a14",
          700: "#4a463c",
          500: "#7d7768",
          400: "#a39980",
        },
        hunter: {
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        sand: {
          50: "#f6f1e4",
          100: "#ede4cd",
          200: "#e2d5b3",
          300: "#c9bb95",
          400: "#a89873",
          500: "#8a7c5f",
        },
      },
    },
  },
  plugins: [],
};
export default config;
