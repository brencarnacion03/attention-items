import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // App theme: hunter green + beige ("sand") on near-black ("ink").
        ink: {
          950: "#070d09",
          900: "#0f1c13",
          800: "#182a1e",
          700: "#233a29",
          600: "#324f39",
        },
        hunter: {
          400: "#74ab7e",
          500: "#568a5d",
          600: "#3c6b43",
          700: "#2d5233",
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
