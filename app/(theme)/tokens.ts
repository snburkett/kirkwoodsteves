export const brand = {
  primary: "#007AFF",
  secondary: "#34C759",
  accent: "#FF3B30",
  neutrals: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#0F172A",
  },
} as const;

export const wheelColors = [
  brand.accent,
  brand.secondary,
  brand.primary,
  "#FFCC00",
] as const;

export const motion = {
  idleSpeed: 360 / 8,
  hoverAcceleration: 45,
  maxHoverSpeed: 360 / 1.4,
} as const;
