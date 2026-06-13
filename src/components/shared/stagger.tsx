"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StaggerProps extends React.HTMLAttributes<HTMLDivElement> {
  stagger?: number;
  initialDelay?: number;
  children: React.ReactNode;
}

/**
 * Stagger container — children that use motion props will animate
 * in sequence. Pair with `<StaggerItem>` for the children.
 */
export function Stagger({
  children,
  className,
  stagger = 0.08,
  initialDelay = 0,
  ...rest
}: StaggerProps) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: stagger,
            delayChildren: initialDelay,
          },
        },
      }}
      {...(rest as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      className={cn(className)}
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      {...(rest as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}
