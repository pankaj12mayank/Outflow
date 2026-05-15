/**
 * Outflo - Premium Theme System
 * CSS variables with dark-first glassmorphism design
 */

export const theme = {
  colors: {
    background: {
      primary: "var(--color-bg-primary)",
      secondary: "var(--color-bg-secondary)",
      tertiary: "var(--color-bg-tertiary)",
    },
    surface: {
      base: "var(--color-surface)",
      glass: "var(--color-surface-glass)",
      border: "var(--color-border)",
    },
    text: {
      primary: "var(--color-text-primary)",
      secondary: "var(--color-text-secondary)",
      tertiary: "var(--color-text-tertiary)",
    },
    accent: {
      purple: "var(--color-purple)",
      green: "var(--color-green)",
    },
  },
  borderRadius: {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    xl: "var(--radius-xl)",
  },
};

export const cssVariables = `
:root {
  /* Background Colors */
  --color-bg-primary: #0a0a0b;
  --color-bg-secondary: #111113;
  --color-bg-tertiary: #18181b;
  --color-bg-elevated: #1f1f23;
  
  /* Surface Colors */
  --color-surface: #18181b;
  --color-surface-glass: rgba(255, 255, 255, 0.03);
  --color-surface-glass-hover: rgba(255, 255, 255, 0.06);
  
  /* Border Colors */
  --color-border: rgba(255, 255, 255, 0.06);
  --color-border-hover: rgba(255, 255, 255, 0.12);
  --color-border-strong: rgba(255, 255, 255, 0.15);
  
  /* Text Colors */
  --color-text-primary: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-text-tertiary: #71717a;
  --color-text-muted: #52525b;
  
  /* Accent Colors - Purple */
  --color-purple: #a78bfa;
  --color-purple-muted: #7c3aed;
  --color-purple-dim: rgba(167, 139, 250, 0.15);
  --color-purple-glow: rgba(167, 139, 250, 0.4);
  
  /* Accent Colors - Green */
  --color-green: #4ade80;
  --color-green-muted: #22c55e;
  --color-green-dim: rgba(74, 222, 128, 0.15);
  --color-green-glow: rgba(74, 222, 128, 0.4);
  
  /* Status Colors */
  --color-success: #4ade80;
  --color-warning: #fbbf24;
  --color-error: #f87171;
  --color-info: #60a5fa;
  
  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
  --shadow-glow-purple: 0 0 40px rgba(167, 139, 250, 0.3);
  --shadow-glow-green: 0 0 40px rgba(74, 222, 128, 0.3);
  --shadow-glow-sm: 0 0 20px rgba(167, 139, 250, 0.2);
  
  /* Glass Effect */
  --glass-border: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  --glass-blur: blur(12px);
  
  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  
  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Z-index */
  --z-dropdown: 1000;
  --z-sticky: 1100;
  --z-fixed: 1200;
  --z-modal-backdrop: 1300;
  --z-modal: 1400;
  --z-popover: 1500;
  --z-tooltip: 1600;
}
`;

export const componentStyles = {
  // Glass card effect
  glassCard: {
    background: "rgba(24, 24, 27, 0.8)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--glass-border), 0 0 40px rgba(0, 0, 0, 0.3)",
  },
  
  // Glass button
  glassButton: {
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "var(--radius-md)",
    transition: "all var(--transition-fast)",
    "&:hover": {
      background: "rgba(255, 255, 255, 0.08)",
      borderColor: "rgba(255, 255, 255, 0.12)",
    },
  },
  
  // Glowing accent button
  glowingButton: {
    background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
    boxShadow: "0 0 30px rgba(167, 139, 250, 0.4)",
    transition: "all var(--transition-base)",
    "&:hover": {
      boxShadow: "0 0 50px rgba(167, 139, 250, 0.5)",
      transform: "translateY(-2px)",
    },
    "&:active": {
      transform: "translateY(0)",
      boxShadow: "0 0 20px rgba(167, 139, 250, 0.3)",
    },
  },
  
  // Input field
  input: {
    background: "rgba(0, 0, 0, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: "var(--radius-md)",
    transition: "all var(--transition-fast)",
    "&:focus": {
      borderColor: "var(--color-purple)",
      boxShadow: "0 0 0 3px var(--color-purple-dim), var(--shadow-glow-sm)",
      outline: "none",
    },
  },
  
  // Floating card
  floatingCard: {
    background: "linear-gradient(135deg, rgba(24, 24, 27, 0.9) 0%, rgba(31, 31, 35, 0.95) 100%)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "var(--radius-xl)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), var(--glass-border)",
  },
  
  // Table row hover
  tableRow: {
    transition: "all var(--transition-fast)",
    "&:hover": {
      background: "rgba(255, 255, 255, 0.02)",
    },
  },
  
  // Badge
  badge: {
    background: "rgba(167, 139, 250, 0.1)",
    color: "var(--color-purple)",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    borderRadius: "var(--radius-full)",
    fontSize: "0.75rem",
    fontWeight: 500,
    padding: "0.25rem 0.75rem",
  },
  
  // Loading skeleton
  skeleton: {
    background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  },
};

export default { theme, cssVariables, componentStyles };