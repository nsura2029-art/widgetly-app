/**
 * Shared TypeScript types used across components.
 */

export type Accent = "primary" | "secondary" | "accent";

export type IconName =
  | "Sparkles"
  | "LayoutGrid"
  | "Zap"
  | "Cloud"
  | "Smartphone"
  | "ShieldCheck"
  | "FileText"
  | "Image"
  | "Video"
  | "Calculator"
  | "ArrowLeftRight"
  | "Search"
  | "GraduationCap"
  | "Code2"
  | "Briefcase"
  | "Github"
  | "Twitter"
  | "Linkedin";

export interface NavLink {
  label: string;
  href: string;
}

export interface Feature {
  icon: IconName;
  title: string;
  description: string;
  accent: Accent;
}

export interface Category {
  name: string;
  description: string;
  count: number;
  icon: IconName;
  href: string;
  accent: Accent;
}

export interface SocialLink {
  label: string;
  href: string;
  icon: string;
}

export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export interface WaitlistFormState {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
  email: string;
}
