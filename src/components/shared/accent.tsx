import { cn } from "@/lib/utils";
import type { Accent } from "@/types";

/**
 * Centralised colour helpers keyed by the three brand accents.
 * Use these in components instead of hard-coding hex values.
 */
export const ACCENT_STYLES: Record<
  Accent,
  {
    text: string;
    bg: string;
    border: string;
    ring: string;
    iconBg: string;
  }
> = {
  primary: {
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    ring: "ring-primary/30",
    iconBg:
      "bg-gradient-to-br from-primary/20 to-primary/5 text-primary",
  },
  secondary: {
    text: "text-secondary",
    bg: "bg-secondary/10",
    border: "border-secondary/20",
    ring: "ring-secondary/30",
    iconBg:
      "bg-gradient-to-br from-secondary/20 to-secondary/5 text-secondary",
  },
  accent: {
    text: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
    ring: "ring-accent/30",
    iconBg: "bg-gradient-to-br from-accent/20 to-accent/5 text-accent",
  },
};

export function accentClasses(accent: Accent, base: keyof typeof ACCENT_STYLES["primary"]): string {
  return ACCENT_STYLES[accent][base];
}

export { cn };
