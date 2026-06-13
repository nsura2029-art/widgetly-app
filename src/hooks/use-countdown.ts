"use client";

import { useEffect, useState } from "react";
import { padTwo } from "@/lib/utils";
import type { CountdownTime } from "@/types";

/**
 * Countdown timer to a target ISO date. Updates every second, pauses cleanly
 * on the server, and exposes an `isExpired` flag for end-of-countdown UI.
 */
export function useCountdown(targetDate: string | Date): CountdownTime {
  const target =
    typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  const compute = (): CountdownTime => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds, isExpired: false };
  };

  const [time, setTime] = useState<CountdownTime>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    setTime(compute());
    const id = window.setInterval(() => setTime(compute()), 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate]);

  return time;
}

export { padTwo };
