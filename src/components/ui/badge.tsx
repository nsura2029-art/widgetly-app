import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    variant?: "default" | "secondary" | "outline" | "success";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-brand-gradient text-white border-transparent shadow-glow-sm",
    secondary: "bg-primary/10 text-primary border-primary/20",
    outline: "bg-transparent text-foreground border-border",
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  } as const;
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };
