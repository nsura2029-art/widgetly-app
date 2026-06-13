"use client";

import { useEffect, useState } from "react";

/**
 * Returns true once the component has mounted on the client. Useful for
 * gating animations or anything that touches `window` / `matchMedia`.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  return mounted;
}
