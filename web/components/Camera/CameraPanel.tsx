"use client";

import { Patient } from "@/types";
import { RoomScene } from "./RoomScene";

interface CameraPanelProps {
  patient: Patient;
}

export function CameraPanel({ patient }: CameraPanelProps) {
  const statusBadge = {
    ok: { label: "Normal", bg: "rgba(29,158,117,0.15)", color: "#1D9E75" },
    warn: { label: "Watch", bg: "rgba(186,117,23,0.15)", color: "#BA7517" },
    alert: { label: "ALERT", bg: "rgba(226,75,74,0.15)", color: "#E24B4A" },
  }[patient.status];

  return (
    <div
      style={{
        background: "var(--bg-primary)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "0.5px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            className="animate-pulse-recording"
            style={{ width: 7, height: 7, borderRadius: "50%", background: "#E24B4A" }}
          />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Live feed — Room {patient.room}</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          Camera {patient.room.charAt(0)}A · HD
        </span>
      </div>

      {/* Camera view */}
      <div style={{ position: "relative", background: "#0a0f1a" }}>
        <RoomScene scene={patient.scene} status={patient.status} />

        {/* Room label */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 12,
            fontSize: 9,
            fontFamily: "monospace",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          Room {patient.room} · Primary
        </div>

        {/* Status badge */}
        <div
          className={patient.status === "alert" ? "animate-pulse-dot" : ""}
          style={{
            position: "absolute",
            top: 10,
            right: 12,
            fontSize: 9,
            fontWeight: 500,
            padding: "2px 8px",
            borderRadius: 20,
            background: statusBadge.bg,
            color: statusBadge.color,
          }}
        >
          {statusBadge.label}
        </div>
      </div>
    </div>
  );
}
