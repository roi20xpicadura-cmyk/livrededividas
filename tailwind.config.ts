import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "SF Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": "11px",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        success: "hsl(var(--success))",
        gold: "hsl(var(--gold))",
        fin: {
          green: "hsl(var(--green))",
          "green-light": "hsl(var(--green-light))",
          "green-pale": "hsl(var(--green-pale))",
          "green-border": "hsl(var(--green-border))",
          "green-dark": "hsl(var(--green-dark))",
          red: "hsl(var(--red))",
          "red-pale": "hsl(var(--red-pale))",
          "red-border": "hsl(var(--red-border))",
          amber: "hsl(var(--amber))",
          "amber-pale": "hsl(var(--amber-pale))",
          "amber-border": "hsl(var(--amber-border))",
          blue: "hsl(var(--blue))",
          "blue-pale": "hsl(var(--blue-pale))",
          "blue-border": "hsl(var(--blue-border))",
          purple: "hsl(var(--purple))",
          "purple-pale": "hsl(var(--purple-pale))",
          "purple-border": "hsl(var(--purple-border))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "premium-sm": "0 2px 6px rgba(109,40,217,0.08), 0 1px 2px rgba(109,40,217,0.05)",
        "premium-md": "0 4px 16px rgba(109,40,217,0.10), 0 2px 6px rgba(109,40,217,0.06)",
        "premium-lg": "0 8px 32px rgba(109,40,217,0.12), 0 4px 12px rgba(109,40,217,0.07)",
        "green-glow": "0 4px 14px rgba(124,58,237,0.35)",
        "brand-glow": "0 4px 14px rgba(124,58,237,0.35)",
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
        "progress-fill": {
          from: { width: "0%" },
          to: { width: "var(--progress-width)" },
        },
        "shimmer-sweep": {
          "0%": { transform: "translateX(-120%) skewX(-20deg)" },
          "100%": { transform: "translateX(220%) skewX(-20deg)" },
        },
        "balance-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(74,222,128,0)" },
          "50%": { boxShadow: "0 0 24px 2px rgba(74,222,128,0.35)" },
        },
        "tx-marquee": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
        "bar-rise": {
          "0%, 100%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(1.15)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "progress-fill": "progress-fill 1s ease-out forwards",
        "shimmer-sweep": "shimmer-sweep 3.5s ease-in-out infinite",
        "balance-glow": "balance-glow 3.5s ease-in-out infinite",
        "tx-marquee": "tx-marquee 14s linear infinite",
        "bar-rise": "bar-rise 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
