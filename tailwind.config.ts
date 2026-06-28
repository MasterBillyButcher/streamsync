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
        surface: {
          DEFAULT: "rgba(15, 15, 20, 1)",
          elevated: "rgba(22, 22, 30, 1)",
          card: "rgba(28, 28, 38, 1)",
          hover: "rgba(35, 35, 48, 1)",
        },
        accent: {
          DEFAULT: "#7c6af7",
          dim: "rgba(124, 106, 247, 0.15)",
          bright: "#9b8eff",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.06)",
          bright: "rgba(255, 255, 255, 0.12)",
          accent: "rgba(124, 106, 247, 0.3)",
        },
        text: {
          primary: "rgba(255, 255, 255, 0.95)",
          secondary: "rgba(255, 255, 255, 0.55)",
          muted: "rgba(255, 255, 255, 0.3)",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "slide-up": "slideUp 0.3s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
      boxShadow: {
        glass: "0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glass-lg": "0 8px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
        accent: "0 0 24px rgba(124,106,247,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
