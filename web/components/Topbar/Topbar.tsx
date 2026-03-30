"use client";

import { Patient } from "@/types";

const accentColors: Record<Patient["accentColor"], { bg: string; text: string }> = {
  blue: { bg: "#E6F1FB", text: "#3B82C8" },
  teal: { bg: "#E0F5EE", text: "#2d7a5f" },
  amber: { bg: "#FFF3E0", text: "#B87A2B" },
  red: { bg: "#FFE0E8", text: "#D44060" },
};

const badgeStyles: Record<Patient["badge"], { bg: string; color: string }> = {
  Stable: { bg: "var(--color-ok-bg)", color: "var(--color-ok)" },
  Watch: { bg: "var(--color-warn-bg)", color: "var(--color-warn)" },
  Alert: { bg: "var(--color-alert-bg)", color: "var(--color-alert)" },
};

interface TopbarProps {
  patient: Patient;
}

export function Topbar({ patient }: TopbarProps) {
  const accent = accentColors[patient.accentColor];
  const badge = badgeStyles[patient.badge];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px",
        borderBottom: "0.5px solid var(--border-subtle)",
        background: "var(--bg-primary)",
        minHeight: 56,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: accent.bg,
            color: accent.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {patient.initials}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>{patient.name}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: 20,
                background: badge.bg,
                color: badge.color,
              }}
            >
              {patient.badge}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Age {patient.age} · Room {patient.room} · Admitted {patient.admitted}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: "6px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            background: "transparent",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          Export report
        </button>
        <button
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: "6px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-alert)",
            background: "var(--color-alert-bg)",
            color: "var(--color-alert)",
            cursor: "pointer",
          }}
        >
          Alert protocol
        </button>
      </div>
    </div>
  );
}
