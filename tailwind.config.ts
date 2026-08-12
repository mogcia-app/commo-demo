import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        commo: {
          main: "#A66BE8",
          hover: "#9257D9",
          soft: "#F4EEFD",
          ink: "#2F2540",
          blush: "#FFF2F6",
          mint: "#EAFBF4",
          sky: "#EEF7FF",
          honey: "#FFF7DF",
          line: "#E8DDF3",
        },
      },
      boxShadow: {
        soft: "0 16px 40px rgba(67, 45, 93, 0.10)",
        pretty: "0 18px 48px rgba(98, 70, 128, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
