"use client";

import { Patient } from "@/types";

interface MedicationsPanelProps {
  patient: Patient;
  onToggle: (patientId: string, index: number) => void;
}

export function MedicationsPanel({ patient, onToggle }: MedicationsPanelProps) {
  const firstName = patient.name.split(" ")[0];
  const lastInitial = patient.name.split(" ")[1]?.[0];

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
        <span style={{ fontSize: 12, fontWeight: 500 }}>
          Medications — {firstName} {lastInitial}.
        </span>
      </div>

      <div style={{ padding: "4px 14px 8px" }}>
        {patient.medications.map((med, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
              borderBottom: i < patient.medications.length - 1 ? "0.5px solid var(--border-subtle)" : "none",
            }}
          >
            {/* Checkbox */}
            <button
              onClick={() => onToggle(patient.id, i)}
              style={{
                width: 16,
                height: 16,
                borderRadius: "var(--radius-sm)",
                border: med.taken ? "1px solid #5DCAA5" : "0.5px solid var(--border-default)",
                background: med.taken ? "#E1F5EE" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                padding: 0,
              }}
            >
              {med.taken && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {/* Med info */}
            <span
              style={{
                flex: 1,
                fontSize: 12,
                color: med.taken ? "var(--text-secondary)" : "var(--text-primary)",
                textDecoration: med.taken ? "line-through" : "none",
              }}
            >
              {med.name}
            </span>

            {/* Time */}
            <span
              style={{
                fontSize: 11,
                fontWeight: med.overdue && !med.taken ? 500 : 400,
                color: med.overdue && !med.taken ? "#A32D2D" : "var(--text-tertiary)",
              }}
            >
              {med.scheduledTime}
              {med.overdue && !med.taken && " !"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
