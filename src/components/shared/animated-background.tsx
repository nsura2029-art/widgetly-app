"use client";

import * as React from "react";
import { motion } from "framer-motion";

/**
 * Full-bleed animated background of soft gradient blobs + faint grid.
 * Performance: pure CSS transforms + GPU-friendly blur; capped to a
 * handful of layers so it stays at 60fps on mid-tier mobile.
 */
export function AnimatedBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Faint dot grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.08) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 80%)",
        }}
      />

      {/* Top-right blob */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="bg-primary/25 animate-blob absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full blur-3xl"
      />

      {/* Bottom-left blob */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: "easeOut", delay: 0.2 }}
        className="bg-accent/20 animate-blob absolute -bottom-40 -left-32 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ animationDelay: "2s" }}
      />

      {/* Center wash */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 2, delay: 0.4 }}
        className="bg-secondary/15 animate-blob absolute top-1/3 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ animationDelay: "4s" }}
      />

      {/* Bottom fade to white */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-white" />
    </div>
  );
}
