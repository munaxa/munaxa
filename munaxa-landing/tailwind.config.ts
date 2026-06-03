/**
 * MUNAXA DESIGN SYSTEM - TAILWIND CONFIGURATION
 * 
 * This configuration file extends Tailwind CSS with the exact design tokens
 * extracted from the Munaxa Design System HTML template.
 * 
 * Color Palette:
 * - Background: Deep midnight purple (#0B0518) with elevated surfaces
 * - Brand: Primary purple (#7A3FFF) with gradient to lighter purple and coral
 * - Accents: Neon aqua (#4DF4E1) for success, Coral (#FF8E6E) for warnings
 * - Text: White-purple (#F4F0FF) for headings, muted purple for body
 * 
 * Typography:
 * - Display: Sora (headlines, prices, stats)
 * - Body: Inter (paragraphs, buttons, form fields)
 * - Mono: JetBrains Mono (labels, captions, data)
 * 
 * Vibe: Premium, futuristic, calm darkness with vibrant neon accents.
 * Glassmorphism effects, soft glows, and subtle gradients throughout.
 */

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ===== COLOR PALETTE =====
      colors: {
        munaxa: {
          // Surfaces (dark mode base)
          bg: "#0B0518",         // Deep midnight purple - main background
          bgElev: "#140A2E",     // Elevated surface layer
          bgCard: "#1A0F38",     // Card gradient start
          bgCard2: "#221547",    // Card gradient end
          
          // Borders (subtle purple-tinted)
          border: "rgba(184,164,255,0.10)",
          borderStrong: "rgba(184,164,255,0.18)",
          
          // Text hierarchy
          fg: "#F4F0FF",         // Primary text / headlines
          fgMuted: "#B5ACD4",    // Body paragraphs
          fgDim: "#8B83A8",      // Captions / meta / labels
          
          // Brand colors
          primary: "#7A3FFF",    // Main brand purple
          primary2: "#B97BFF",   // Lighter purple for gradients/hover
          primaryGlow: "rgba(122,63,255,0.26)",
          aqua: "#4DF4E1",       // Neon aqua - success/live states
          aquaSoft: "rgba(77,244,225,0.18)",
          coral: "#FF8E6E",      // Coral - warnings/accents
          coralSoft: "rgba(255,142,110,0.18)",
        },
      },
      
      // ===== TYPOGRAPHY =====
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      
      // ===== FONT SIZES (responsive clamp functions) =====
      fontSize: {
        display: ["clamp(48px, 7.2vw, 96px)", { lineHeight: "0.98", letterSpacing: "-0.035em" }],
        h1: ["clamp(36px, 4.5vw, 64px)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        h2: ["clamp(28px, 3vw, 44px)", { lineHeight: "1.05" }],
        h3: ["clamp(20px, 1.6vw, 26px)", { lineHeight: "1.05" }],
        lead: ["clamp(17px, 1.3vw, 20px)", { lineHeight: "1.55" }],
      },
      
      // ===== BORDER RADIUS =====
      borderRadius: {
        "munaxa-sm": "8px",    // Chips, mini calendar days
        "munaxa": "14px",      // Default inner card radius
        "munaxa-lg": "22px",   // Standard top-level cards
        "munaxa-xl": "32px",   // Hero sections, final CTAs
      },
      
      // ===== SHADOWS (soft, long drops with negative spread) =====
      boxShadow: {
        "munaxa-card": "0 30px 60px -30px rgba(0,0,0,0.6), 0 0 0 1px rgba(184,164,255,0.10) inset",
        "munaxa-glow": "0 20px 60px -20px rgba(122,63,255,0.26), 0 0 0 1px rgba(255,255,255,0.04) inset",
      },
      
      // ===== GRADIENT BACKGROUNDS =====
      backgroundImage: {
        "munaxa-primary": "linear-gradient(135deg, #7A3FFF 0%, #B97BFF 60%, #FF8E6E 120%)",
        "munaxa-hero": `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(122,63,255,0.18) 0%, rgba(122,63,255,0) 62%),
                        radial-gradient(ellipse 60% 50% at 100% 30%, rgba(77,244,225,0.09) 0%, rgba(77,244,225,0) 62%),
                        radial-gradient(ellipse 50% 40% at 0% 50%, rgba(255,142,110,0.06) 0%, rgba(255,142,110,0) 62%)`,
        "munaxa-card": "linear-gradient(180deg, #1A0F38 0%, #221547 100%)",
        "munaxa-final-cta": `radial-gradient(ellipse 60% 100% at 50% 0%, rgba(122,63,255,0.24), transparent 60%), 
                             linear-gradient(180deg, #1B1040 0%, #0B0518 100%)`,
      },
      
      // ===== LAYOUT =====
      maxWidth: {
        "munaxa-container": "1240px",
      },
      
      // ===== ANIMATION =====
      animation: {
        "fade-up": "fadeUp 0.8s ease-out forwards",
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.8s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(32px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
