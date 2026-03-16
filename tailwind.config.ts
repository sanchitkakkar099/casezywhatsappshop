import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
        display: ["Archivo", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#FEFEF0",
          100: "#FDFDE0",
          200: "#F5F4A8",
          300: "#F0EF7A",
          400: "#EAE742",
          500: "#EAE742",
          600: "#D4CC1A",
          700: "#A89F14",
          800: "#7C750F",
          900: "#504C0A",
        },
      },
    },
  },
  plugins: [],
};

export default config;
