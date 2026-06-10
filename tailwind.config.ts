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
        },
      },
      boxShadow: {
        soft: "0 16px 40px rgba(67, 45, 93, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
