import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-brand-gradient text-white shadow-glow-sm hover:shadow-glow hover:brightness-110",
        secondary:
          "bg-white text-foreground border border-border shadow-soft hover:border-primary/40 hover:shadow-soft-lg hover:-translate-y-0.5",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted/5 hover:border-primary/40",
        ghost: "bg-transparent text-foreground hover:bg-muted/5",
        link: "text-primary underline-offset-4 hover:underline bg-transparent px-0",
        dark: "bg-dark text-white hover:bg-dark/90 shadow-soft hover:shadow-soft-lg",
        // "success" — high-contrast green CTA used for the Submit-Idea
        // page's primary action ("Submit Idea & Start Earning Wits").
        // The emerald-500 → emerald-600 gradient matches the rewards
        // card's "Goes Live" tier so the user clicks a button in the
        // same colour as the payout they were just shown.
        success:
          "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_8px_24px_-6px_rgba(16,185,129,0.55)] hover:from-emerald-600 hover:to-emerald-700 hover:shadow-[0_10px_28px_-6px_rgba(16,185,129,0.7)] hover:brightness-110",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3.5 text-xs rounded-lg",
        lg: "h-12 px-7 text-base rounded-xl",
        xl: "h-14 px-8 text-base rounded-2xl",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
