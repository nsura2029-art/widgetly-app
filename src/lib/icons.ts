import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  LayoutGrid,
  Zap,
  Cloud,
  Smartphone,
  ShieldCheck,
  FileText,
  Image,
  Video,
  Calculator,
  ArrowLeftRight,
  Search,
  GraduationCap,
  Code2,
  Briefcase,
  Github,
  Twitter,
  Linkedin,
} from "lucide-react";

/**
 * Map a string identifier from `constants.ts` to a real Lucide icon component.
 * Decouples data (which is plain JSON-safe) from view (icon library).
 */
const ICON_MAP = {
  Sparkles,
  LayoutGrid,
  Zap,
  Cloud,
  Smartphone,
  ShieldCheck,
  FileText,
  Image,
  Video,
  Calculator,
  ArrowLeftRight,
  Search,
  GraduationCap,
  Code2,
  Briefcase,
  Github,
  Twitter,
  Linkedin,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_MAP;

export function getIcon(name: string): LucideIcon {
  return (ICON_MAP as Record<string, LucideIcon>)[name] ?? Sparkles;
}

export type { LucideIcon };
