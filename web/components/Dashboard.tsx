"use client";

import { usePatient } from "@/hooks/usePatient";
import { Sidebar } from "./Sidebar/Sidebar";
import { Topbar } from "./Topbar/Topbar";
import { CameraPanel } from "./Camera/CameraPanel";
import { AIAnalysisPanel } from "./AIAnalysis/AIAnalysisPanel";
import { AlertsPanel } from "./Alerts/AlertsPanel";
import { MedicationsPanel } from "./Medications/MedicationsPanel";
import { ActivityTimeline } from "./Timeline/ActivityTimeline";

export function Dashboard() {
  const { patients, selected, selectedId, selectPatient, toggleMedication, updateAnalysis } =
    usePatient();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar patients={patients} selectedId={selectedId} onSelect={selectPatient} />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        <Topbar patient={selected} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 14,
            padding: 16,
            flex: 1,
            overflow: "auto",
            background: "var(--bg-tertiary)",
          }}
        >
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <CameraPanel patient={selected} />
            <AIAnalysisPanel patient={selected} onAnalysisUpdate={updateAnalysis} />
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <AlertsPanel patients={patients} />
            <MedicationsPanel patient={selected} onToggle={toggleMedication} />
            <ActivityTimeline events={selected.events} />
          </div>
        </div>
      </div>
    </div>
  );
}
