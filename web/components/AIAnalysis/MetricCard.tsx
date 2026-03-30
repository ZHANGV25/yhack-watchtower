"use client";

interface MetricCardProps {
  label: string;
  value: string;
  sublabel: string;
}

export function MetricCard({ label, value, sublabel }: MetricCardProps) {
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        borderRadius: "var(--radius-md)",
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 500, color: "var(--text-primary)", marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>{sublabel}</div>
    </div>
  );
}
