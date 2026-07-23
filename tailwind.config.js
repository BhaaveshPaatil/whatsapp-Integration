/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      /* ── Fonts ─────────────────────────────────────────────────── */
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },

      /* ── Design Token Colors (all via CSS vars) ─────────────────── */
      colors: {
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",

        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50:  "hsl(239 100% 97%)",
          100: "hsl(239 100% 92%)",
          200: "hsl(239 85% 82%)",
          300: "hsl(239 78% 72%)",
          400: "hsl(239 72% 62%)",
          500: "hsl(239 68% 56%)",
          600: "hsl(239 65% 48%)",
          700: "hsl(239 65% 40%)",
          800: "hsl(239 65% 32%)",
          900: "hsl(239 65% 22%)",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:    "hsl(var(--sidebar))",
          border:     "hsl(var(--sidebar-border))",
        },

        /* Chart tokens */
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },

        /* ── Static Brand Palette (for direct use) ──────────────── */
        harbor: {
          /* Dark mode surfaces */
          bg:           "#0C0E18",
          surface:      "#121520",
          surfaceAlt:   "#171B26",
          card:         "#191D2C",
          border:       "#232836",
          /* Light mode surfaces */
          lightBg:      "#F4F5F7",
          lightCard:    "#FFFFFF",
          lightBorder:  "#E2E4EC",
          /* Status */
          success:  "#13C9AA",
          warning:  "#F89A00",
          danger:   "#D63031",
          info:     "#4F52D8",
        },
      },

      /* ── Border Radius ─────────────────────────────────────────── */
      borderRadius: {
        sm:   "calc(var(--radius) - 2px)",   /* 6px */
        md:   "var(--radius)",               /* 8px */
        lg:   "calc(var(--radius) + 4px)",   /* 12px */
        xl:   "calc(var(--radius) + 8px)",   /* 16px */
        "2xl":"calc(var(--radius) + 12px)",  /* 20px */
      },

      /* ── Box Shadows ───────────────────────────────────────────── */
      boxShadow: {
        /* Light mode — subtle, natural */
        "card":       "0 1px 2px hsl(220 14% 12% / 0.04), 0 2px 8px hsl(220 14% 12% / 0.06)",
        "card-hover": "0 2px 4px hsl(220 14% 12% / 0.06), 0 6px 20px hsl(220 14% 12% / 0.08)",
        "popover":    "0 4px 6px hsl(220 14% 12% / 0.04), 0 12px 40px hsl(220 14% 12% / 0.12)",
        "header":     "0 1px 0 hsl(220 16% 90%)",
        /* Dark mode — stronger depth */
        "card-dark":       "0 1px 2px hsl(0 0% 0% / 0.3), 0 4px 12px hsl(0 0% 0% / 0.25)",
        "card-hover-dark": "0 2px 8px hsl(0 0% 0% / 0.4), 0 8px 24px hsl(0 0% 0% / 0.3)",
        "popover-dark":    "0 4px 6px hsl(0 0% 0% / 0.3), 0 16px 48px hsl(0 0% 0% / 0.5)",
        /* Glow effects */
        "glow-primary": "0 0 0 3px hsl(var(--primary) / 0.15)",
        "glow-sm":      "0 0 12px hsl(var(--primary) / 0.25)",
      },

      /* ── Typography ────────────────────────────────────────────── */
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],  /* 10px */
      },
      lineHeight: {
        tight:  "1.25",
        snug:   "1.375",
        normal: "1.5",
        relaxed:"1.625",
      },
      letterSpacing: {
        tighter: "-0.04em",
        tight:   "-0.025em",
        normal:  "0em",
        wide:    "0.02em",
        wider:   "0.05em",
      },

      /* ── Spacing extras ────────────────────────────────────────── */
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "18": "4.5rem",
      },

      /* ── Keyframes & Animations ────────────────────────────────── */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "slide-from-left": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.35)" },
          "50%":      { boxShadow: "0 0 0 6px hsl(var(--primary) / 0)" },
        },
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in":         "fade-in 0.2s ease both",
        "fade-in-up":      "fade-in-up 0.25s ease both",
        "scale-in":        "scale-in 0.2s ease both",
        "slide-from-left": "slide-from-left 0.25s ease both",
        shimmer:           "shimmer 1.8s linear infinite",
        "pulse-glow":      "pulse-glow 2.5s ease-in-out infinite",
      },

      /* ── Transitions ───────────────────────────────────────────── */
      transitionDuration: {
        "150": "150ms",
        "200": "200ms",
        "250": "250ms",
        "300": "300ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
