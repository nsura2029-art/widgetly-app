import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1280px",
        lg: "1024px",
        md: "768px",
        sm: "640px",
        xl: "1120px",
      },
    },
    extend: {
      colors: {
        border: "#E5E7EB",
        input: "#E5E7EB",
        ring: "#5B6CFF",
        background: "#FFFFFF",
        foreground: "#111827",
        primary: {
          DEFAULT: "#5B6CFF",
          foreground: "#FFFFFF",
          50: "#EEF0FF",
          100: "#DDE1FF",
          200: "#BBC3FF",
          300: "#99A5FF",
          400: "#7787FF",
          500: "#5B6CFF",
          600: "#4A5AE5",
          700: "#3A48CC",
          800: "#2936B3",
          900: "#192499",
        },
        secondary: {
          DEFAULT: "#7B61FF",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#A855F7",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#6B7280",
          foreground: "#6B7280",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#111827",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#111827",
        },
        dark: {
          DEFAULT: "#0F172A",
          foreground: "#F8FAFC",
        },
      },
      borderRadius: {
        lg: "0.875rem",
        md: "0.625rem",
        sm: "0.5rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "display-2xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.04em" }],
        "display-xl": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.035em" }],
        "display-lg": ["3rem", { lineHeight: "1.15", letterSpacing: "-0.03em" }],
        "display-md": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.025em" }],
        "display-sm": ["1.875rem", { lineHeight: "1.25", letterSpacing: "-0.02em" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "blob": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gradient": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "slide-up": "slide-up 0.7s ease-out forwards",
        "blob": "blob 20s ease-in-out infinite",
        "shimmer": "shimmer 3s linear infinite",
        "gradient": "gradient 8s ease infinite",
        "float": "float 4s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "brand-gradient":
          "linear-gradient(135deg, #5B6CFF 0%, #7B61FF 50%, #A855F7 100%)",
        "shimmer-gradient":
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
      },
      boxShadow: {
        "glow-sm": "0 0 20px -5px rgba(91, 108, 255, 0.3)",
        "glow": "0 0 40px -10px rgba(91, 108, 255, 0.4)",
        "glow-lg": "0 0 60px -15px rgba(91, 108, 255, 0.5)",
        "soft": "0 4px 20px -2px rgba(15, 23, 42, 0.06)",
        "soft-lg": "0 10px 40px -10px rgba(15, 23, 42, 0.1)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
