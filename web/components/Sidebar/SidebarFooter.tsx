"use client";

import { useClock } from "@/hooks/useClock";

export function SidebarFooter() {
  const { time, date } = useClock();

  return (
    <div style={{ padding: "16px 20px", borderTop: "0.5px solid var(--border-subtle)" }}>
      <div style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
        {time}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
        {date}
      </div>
    </div>
  );
}
