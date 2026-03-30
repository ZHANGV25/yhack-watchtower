"use client";

import { TimelineEvent } from "@/types";

interface ActivityTimelineProps {
  events: TimelineEvent[];
}

const dotColors = {
  activity: "var(--color-ok)",
  neutral: "var(--color-info)",
  alert: "var(--color-alert)",
};

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <div
      style={{
        background: "var(--bg-primary)",
        borderRadius: "var(--radius-lg)",
        border: "0.5px solid var(--border-subtle)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "0.5px solid var(--border-subtle)",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 500 }}>Today&apos;s activity</span>
      </div>

      <div style={{ padding: "8px 14px 14px" }}>
        {events.map((event, i) => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            {/* Dot + connector */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 8,
                paddingTop: 4,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: dotColors[event.type],
                  flexShrink: 0,
                }}
              />
              {i < events.length - 1 && (
                <div
                  style={{
                    width: 1,
                    flex: 1,
                    background: "var(--border-subtle)",
                    minHeight: 20,
                  }}
                />
              )}
            </div>

            {/* Text */}
            <div style={{ paddingBottom: 12 }}>
              <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{event.description}</div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>{event.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
