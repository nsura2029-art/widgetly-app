"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "./header";

export default function ClientHeader() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch the suggest route for faster navigation
    try {
      router.prefetch("/suggest");
    } catch {
      // noop if prefetch isn't available
    }
  }, [router]);

  return <Header />;
}
