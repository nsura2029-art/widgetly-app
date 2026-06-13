"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right" | "none";

interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
  duration?: number;
  direction?: Direction;
  distance?: number;
  once?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
}

const offsetFor = (direction: Direction, distance: number) => {
  switch (direction) {
    case "up":
      return { x: 0, y: distance };
    case "down":
      return { x: 0, y: -distance };
    case "left":
      return { x: distance, y: 0 };
    case "right":
      return { x: -distance, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
};

/**
 * Drop-in motion wrapper that fades + slides into view on scroll.
 * Respects `prefers-reduced-motion` by snapping to final state.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.6,
  direction = "up",
  distance = 24,
  once = true,
  as = "div",
  ...rest
}: FadeInProps) {
  const prefersReduced = useReducedMotion();
  const offset = offsetFor(direction, distance);
  const MotionComp = motion[as as keyof typeof motion] as typeof motion.div;

  if (prefersReduced) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <MotionComp
      className={cn(className)}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      {...(rest as React.ComponentProps<typeof MotionComp>)}
    >
      {children}
    </MotionComp>
  );
}
