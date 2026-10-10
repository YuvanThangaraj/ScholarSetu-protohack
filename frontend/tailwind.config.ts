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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Existing utility names are retained so the application architecture stays unchanged.
        slate: {
          50: "#F8F3E8", 100: "#F2E8D6", 200: "#E6D5B8", 300: "#D2BFA1", 400: "#A4AD8A",
          500: "#756755", 600: "#5A4A3D", 700: "#46352B", 800: "#382A22", 900: "#2E241E", 950: "#221914",
        },
        emerald: {
          50: "#F1F3EA", 100: "#E3E8D8", 200: "#CBD5BC", 300: "#A4AD8A", 400: "#769477",
          500: "#52745A", 600: "#355B43", 700: "#254735", 800: "#1F3A2C", 900: "#193024", 950: "#10221A",
        },
        teal: { 400: "#769477", 500: "#52745A" },
        red: {
          50: "#FBEEE8", 100: "#F5DCCF", 200: "#E9B8A5", 300: "#D88C72", 400: "#C86F4D",
          500: "#B85C38", 600: "#9E4A2C", 700: "#843D26", 800: "#6C321F", 900: "#54271B",
        },
        amber: {
          50: "#FBF5E7", 100: "#F5E8C7", 200: "#E9D49C", 300: "#DDBB68", 400: "#C69236",
          500: "#AA7725", 600: "#8F631D", 700: "#765018", 800: "#5D3F13", 900: "#49300F",
        },
        blue: {
          50: "#F1F3EA", 100: "#E3E8D8", 200: "#CBD5BC", 600: "#355B43", 700: "#254735", 800: "#1F3A2C", 900: "#193024",
        },
        indigo: { 600: "#355B43" },
        primary: { DEFAULT: "#254735", foreground: "#F8F3E8" },
        secondary: { DEFAULT: "#B85C38", foreground: "#F8F3E8" },
        risk: { low: "#355B43", medium: "#C69236", high: "#B85C38" },
        muted: { DEFAULT: "#756755", foreground: "#A4AD8A" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "0.65rem",
        md: "calc(0.65rem - 2px)",
        sm: "calc(0.65rem - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
