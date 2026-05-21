import type { Config } from "tailwindcss";
import { academyConfig } from "./src/config/academy";

/** brand 색상 — academyConfig.primaryColor(#E30613) 기준 red 계열 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          500: "#f87171",
          600: academyConfig.primaryColor,
          700: "#b8050f",
          800: "#8a040c",
          900: "#5c0308",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)",
        "card-hover":
          "0 4px 12px 0 rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
