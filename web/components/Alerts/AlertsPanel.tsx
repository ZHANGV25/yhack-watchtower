"use client";

import { Patient } from "@/types";
import { AlertItem } from "./AlertItem";

interface AlertsPanelProps {
  patients: Patient[];
}

interface AlertData {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  time: string;
  source: string;
}

function getAlerts(patients: Patient[]): AlertData[] {
  const alerts: AlertData[] = [];

  for (const p of patients) {
    if (p.status === "alert") {
      alerts.push({
        severity: "critical",
        title: `Fall risk — Room ${p.room}`,
        description: `${p.name.split(" ")[0]} ${p.name.split(" ")[1]?.[0]}. showing unsteady gait near bathroom`,
        time: "2 min ago",
        source: `Camera ${p.room.charAt(0)}A`,
      });
    }

    for (const med of p.medications) {
      if (med.overdue && !med.taken) {
        alerts.push({
          severity: "warning",
          title: `Medication overdue — Room ${p.room}`,
          description: `${p.name.split(" ")[0]} ${p.name.split(" ")[1]?.[0]}. — ${med.name}`,
          time: "45 min ago",
          source: "Scheduled dose",
        });
      }
    }

    // Inactivity for resting patients
    if (p.scene === "resting" && p.movement === "None") {
      alerts.push({
        severity: "info",
        title: `Inactivity — Room ${p.room}`,
        description: `${p.name.split(" ")[0]} ${p.name.split(" ")[1]?.[0]}. — No movement 40 min`,
        time: "18 min ago",
        source: "Resolved",
      });
    }
  }

  return alerts;
}

export function AlertsPanel({ patients }: AlertsPanelProps) {
  const alerts = getAlerts(patients);
  const activeCount = alerts.filter((a) => a.severity !== "info").length;

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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "0.5px solid var(--border-subtle)",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 500 }}>Active alerts</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            padding: "2px 8px",
            borderRadius: 20,
            background: "#FCEBEB",
            color: "#A32D2D",
          }}
        >
          {activeCount} active
        </span>
      </div>

      <div style={{ padding: "0 14px", maxHeight: 280, overflow: "auto" }}>
        {alerts.map((alert, i) => (
          <AlertItem key={i} {...alert} />
        ))}
      </div>
    </div>
  );
}
