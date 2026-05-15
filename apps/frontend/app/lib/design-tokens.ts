/**
 * Outflo - Premium Design System
 * Inspired by Linear, Notion, Clay, Framer
 * Dark-first, glassmorphism, futuristic AI SaaS aesthetic
 */

export const designTokens = {
  colors: {
    // Primary palette - Deep Graphite
    background: {
      primary: "#0a0a0b",
      secondary: "#111113",
      tertiary: "#18181b",
      quaternary: "#1f1f23",
      elevated: "#26262b",
    },
    
    // Surface colors
    surface: {
      base: "#18181b",
      glass: "rgba(255, 255, 255, 0.03)",
      glassHover: "rgba(255, 255, 255, 0.06)",
      border: "rgba(255, 255, 255, 0.06)",
      borderHover: "rgba(255, 255, 255, 0.12)",
    },
    
    // Text colors
    text: {
      primary: "#fafafa",
      secondary: "#a1a1aa",
      tertiary: "#71717a",
      muted: "#52525b",
      inverse: "#09090b",
    },
    
    // Muted Purple accent
    purple: {
      DEFAULT: "#a78bfa",
      muted: "#7c3aed",
      dim: "rgba(167, 139, 250, 0.15)",
      glow: "rgba(167, 139, 250, 0.4)",
    },
    
    // Soft Neon Green accent
    green: {
      DEFAULT: "#4ade80",
      muted: "#22c55e",
      dim: "rgba(74, 222, 128, 0.15)",
      glow: "rgba(74, 222, 128, 0.4)",
    },
    
    // Status colors
    status: {
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#f87171",
      info: "#60a5fa",
    },
    
    // Gradient definitions
    gradients: {
      primary: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
      glow: "radial-gradient(circle at center, rgba(167, 139, 250, 0.3) 0%, transparent 70%)",
      mesh: "radial-gradient(at 40% 20%, hsla(280, 39%, 60%, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(120, 40%, 60%, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(300, 40%, 60%, 0.12) 0px, transparent 50%), radial-gradient(at 80% 50%, hsla(240, 30%, 50%, 0.08) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(200, 40%, 60%, 0.1) 0px, transparent 50%)",
      noise: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
    },
  },
  
  typography: {
    fontFamily: {
      sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
      "6xl": "3.75rem",
      "7xl": "4.5rem",
      "8xl": "6rem",
    },
    
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    
    lineHeight: {
      tight: 1.1,
      snug: 1.25,
      normal: 1.5,
      relaxed: 1.625,
    },
    
    letterSpacing: {
      tighter: "-0.05em",
      tight: "-0.025em",
      normal: "0em",
      wide: "0.025em",
      wider: "0.05em",
    },
  },
  
  spacing: {
    px: "1px",
    0: "0",
    0.5: "0.125rem",
    1: "0.25rem",
    1.5: "0.375rem",
    2: "0.5rem",
    2.5: "0.625rem",
    3: "0.75rem",
    3.5: "0.875rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    7: "1.75rem",
    8: "2rem",
    9: "2.25rem",
    10: "2.5rem",
    11: "2.75rem",
    12: "3rem",
    14: "3.5rem",
    16: "4rem",
    20: "5rem",
    24: "6rem",
    28: "7rem",
    32: "8rem",
    36: "9rem",
    40: "10rem",
    44: "11rem",
    48: "12rem",
    52: "13rem",
    56: "14rem",
    60: "15rem",
    64: "16rem",
    72: "18rem",
    80: "20rem",
    96: "24rem",
  },
  
  borderRadius: {
    none: "0",
    sm: "0.25rem",
    DEFAULT: "0.5rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    "2xl": "1.5rem",
    "3xl": "2rem",
    full: "9999px",
  },
  
  boxShadow: {
    none: "none",
    sm: "0 1px 2px rgba(0, 0, 0, 0.3)",
    DEFAULT: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
    md: "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)",
    lg: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)",
    xl: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    glow: {
      purple: "0 0 40px rgba(167, 139, 250, 0.3)",
      green: "0 0 40px rgba(74, 222, 128, 0.3)",
      sm: "0 0 20px rgba(167, 139, 250, 0.2)",
    },
    glass: {
      light: "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 40px rgba(255, 255, 255, 0.03)",
      medium: "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 60px rgba(255, 255, 255, 0.05)",
    },
  },
  
  animation: {
    duration: {
      faster: "150ms",
      fast: "200ms",
      normal: "300ms",
      slow: "500ms",
      slower: "700ms",
    },
    easing: {
      DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    },
  },
  
  backdrop: {
    blur: {
      xs: "2px",
      sm: "4px",
      DEFAULT: "8px",
      md: "12px",
      lg: "16px",
      xl: "24px",
      "2xl": "40px",
      "3xl": "64px",
    },
  },
  
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },
};

export type DesignTokens = typeof designTokens;