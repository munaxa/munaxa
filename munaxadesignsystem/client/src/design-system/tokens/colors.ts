export const colors = {
  brand: { primary: "#7A3FFF", primaryHover: "#652ED8", primarySoft: "#F5F0FF" },
  neutral: { 0: "#FFFFFF", 50: "#FAFAFB", 100: "#F3F4F6", 200: "#E5E7EB", 500: "#6B7280", 700: "#374151", 900: "#111827", 950: "#0B1020" },
  semantic: { success: "#10B981", warning: "#F59E0B", danger: "#EF4444", info: "#3B82F6" },
  data: ["#BE9AFF", "#A370FF", "#8A4FFF", "#7A3FFF", "#652ED8"],
} as const;

export type ColorToken = typeof colors;
