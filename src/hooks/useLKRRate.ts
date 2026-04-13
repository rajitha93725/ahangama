"use client";

import { useState, useEffect } from "react";

// Module-level cache — single fetch shared across all components
let cachedRate: number | null = null;
let fetchPromise: Promise<number | null> | null = null;

export function useLKRRate(): number | null {
  const [rate, setRate] = useState<number | null>(cachedRate);

  useEffect(() => {
    if (cachedRate !== null) {
      setRate(cachedRate);
      return;
    }
    if (!fetchPromise) {
      fetchPromise = fetch("https://open.er-api.com/v6/latest/USD")
        .then((r) => r.json())
        .then((d) => {
          cachedRate = d?.rates?.LKR ?? null;
          return cachedRate;
        })
        .catch(() => null);
    }
    fetchPromise.then((r) => setRate(r));
  }, []);

  return rate;
}
