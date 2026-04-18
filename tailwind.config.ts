import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        paper: "#f5f5f0",
        desktop: "#c6c6c6",
        accent: "#c84646",
        go: "#3ca05a",
        link: "#3c5ab4",
      },
      fontFamily: {
        mono: ["ui-monospace", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        chunky: "3px 3px 0 #0a0a0a",
        chunkyLg: "5px 5px 0 #0a0a0a",
      },
    },
  },
  plugins: [],
};
export default config;
