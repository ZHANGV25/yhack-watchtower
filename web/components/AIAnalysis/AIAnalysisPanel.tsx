"use client";

import { useState } from "react";
import { Patient } from "@/types";
import { MetricCard } from "./MetricCard";

interface AIAnalysisPanelProps {
  patient: Patient;
  onAnalysisUpdate: (patientId: string, analysis: string) => void;
}

export function AIAnalysisPanel({ patient, onAnalysisUpdate }: AIAnalysisPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patient.name,
          age: patient.age,
          room: patient.room,
          scene: patient.scene,
          status: patient.status,
          movement: patient.movement,
          posture: patient.posture,
          activity: patient.activity,
          risk: patient.risk,
        }),
      });
      const data = await res.json();
      onAnalysisUpdate(patient.id, data.analysis);
    } catch {
      // keep existing analysis on error
    } finally {
      setAnalyzing(false);
    }
  };

  const riskColor =
    patient.risk <= 3 ? "var(--color-ok)" : patient.risk <= 6 ? "var(--color-warn)" : "var(--color-alert)";

  return (
    <div
      style={{
        background: "var(--bg-primary)",
        borderRadius: "var(--radius-lg)",
        border: "0.5px solid var(--border-subtle)",
        overflow: "hidden",
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
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-info)" }} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>AI scene analysis</span>
        </div>
        {analyzing && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              className="animate-spin-slow"
              style={{
                width: 12,
                height: 12,
                border: "1.5px solid var(--border-default)",
                borderTopColor: "var(--color-coral)",
                borderRadius: "50%",
              }}
            />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Analyzing...</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 14 }}>
        {/* Analysis text */}
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--text-primary)",
            fontStyle: "italic",
            marginBottom: 14,
          }}
        >
          &ldquo;{patient.analysis}&rdquo;
        </p>

        {/* Metric cards grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <MetricCard label="Movement detected" value={patient.movement} sublabel={patient.status === "ok" ? "Normal" : "Elevated"} />
          <MetricCard label="Posture / position" value={patient.posture} sublabel={patient.status === "alert" ? "Unstable" : "Stable"} />
          <MetricCard label="Room activity" value={patient.activity} sublabel={patient.status === "ok" ? "Calm" : "Active"} />
          <div
            style={{
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 500 }}>Risk score</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: riskColor, marginTop: 2 }}>
              {patient.risk}/10
            </div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>{patient.riskLabel}</div>
          </div>
        </div>

        {/* Run analysis button */}
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-coral)",
            background: analyzing ? "var(--color-alert-bg)" : "transparent",
            color: "var(--color-coral)",
            fontSize: 13,
            fontWeight: 500,
            cursor: analyzing ? "not-allowed" : "pointer",
            opacity: analyzing ? 0.6 : 1,
            transition: "background 0.15s",
          }}
        >
          {analyzing ? "Analyzing..." : "Run AI analysis now"}
        </button>
      </div>
    </div>
  );
}
