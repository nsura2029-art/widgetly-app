"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const AUDIENCES = [
  "Students",
  "Professionals",
  "Businesses",
  "Creators",
  "YouTubers",
  "Developers",
];

export default function RemotionPage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % AUDIENCES.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface">
      <div className="prose prose-invert text-center">
        <h1 className="text-3xl font-semibold">
          Designed for
          <span className="ml-3 inline-block h-8 align-middle">
            <AnimatePresence mode="wait">
              <motion.span
                key={AUDIENCES[index]}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45 }}
                className="inline-block px-2 py-1 rounded-md bg-muted/20 text-foreground font-medium"
              >
                {AUDIENCES[index]}
              </motion.span>
            </AnimatePresence>
          </span>
        </h1>

        <p className="mt-4 text-muted">
          One audience at a time — animated for emphasis. Use this route to
          preview an animated banner or export a short clip.
        </p>
      </div>
    </main>
  );
}
