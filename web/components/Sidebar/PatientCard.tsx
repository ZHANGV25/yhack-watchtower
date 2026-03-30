"use client";

import { Patient } from "@/types";

const accentColors: Record<Patient["accentColor"], { bg: string; text: string }> = {
  blue: { bg: "#E6F1FB", text: "#3B82C8" },
  teal: { bg: "#E0F5EE", text: "#2d7a5f" },
  amber: { bg: "#FFF3E0", text: "#B87A2B" },
  red: { bg: "#FFE0E8", text: "#D44060" },
};

interface PatientCardProps {
  patient: Patient;
  isSelected: boolean;
  onClick: () => void;
}

export function PatientCard({ patient, isSelected, onClick }: PatientCardProps) {
  const accent = accentColors[patient.accentColor];

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "8px 12px",
        borderRadius: "var(--radius-md)",
        border: "none",
        background: isSelected ? "#E6F1FB" : "transparent",
        borderLeft: patient.status === "alert" ? "3px solid var(--color-alert)" : "3px solid transparent",
        cursor: "pointer",
        transition: "background 0.15s ease",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = "rgba(154,127,130,0.08)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: accent.bg,
          color: accent.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
          border: isSelected ? `1.5px solid ${accent.text}` : "1.5px solid transparent",
        }}
      >
        {patient.initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {patient.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
          Room {patient.room} · Age {patient.age}
        </div>
      </div>

      {/* Status dot */}
      <div
        className={patient.status === "alert" ? "animate-pulse-dot" : ""}
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background:
            patient.status === "ok"
              ? "var(--color-ok)"
              : patient.status === "warn"
                ? "var(--color-warn)"
                : "var(--color-alert)",
          flexShrink: 0,
        }}
      />
    </button>
  );
}
