import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-12 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm",
          "shadow-soft transition-all duration-200",
          "placeholder:text-muted/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-red-500 focus-visible:ring-red-500/40 focus-visible:border-red-500",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
