import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{mdx,md}"
  ],
  theme: {
    extend: {
      keyframes: {
        "train-glide": {
          "0%": { transform: "translateX(140vw)" },
          "100%": { transform: "translateX(-160vw)" },
        },
      },
      animation: {
        "train-glide": "train-glide 21s linear 1",
      },
    },
  },
  plugins: [],
};

export default config;
