"use client";

import { useState, useEffect } from "react";

export function useClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return { time, date };
}
