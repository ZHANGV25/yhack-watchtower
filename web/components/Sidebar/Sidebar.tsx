"use client";

import { Patient } from "@/types";
import { PatientCard } from "./PatientCard";
import { SidebarFooter } from "./SidebarFooter";

interface SidebarProps {
  patients: Patient[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function Sidebar({ patients, selectedId, onSelect }: SidebarProps) {
  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        background: "var(--bg-primary)",
        borderRight: "0.5px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {/* Header */}
      <div style={{ padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--radius-sm)",
              background: "#0C447C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>
              CareWatch AI
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, paddingLeft: 38 }}>
          Sunrise Elder Care · Ward B
        </div>
      </div>

      {/* Patient list */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 8px" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            padding: "12px 12px 8px",
          }}
        >
          Patients — {patients.length} monitored
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {patients.map((p) => (
            <PatientCard
              key={p.id}
              patient={p}
              isSelected={p.id === selectedId}
              onClick={() => onSelect(p.id)}
            />
          ))}
        </div>
      </div>

      <SidebarFooter />
    </div>
  );
}
