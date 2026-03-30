"use client";

interface AlertItemProps {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  time: string;
  source: string;
}

const severityStyles = {
  critical: { bg: "#FCEBEB", color: "#A32D2D", icon: "!" },
  warning: { bg: "#FFF3E0", color: "#BA7517", icon: "!" },
  info: { bg: "#E6F1FB", color: "#3B82C8", icon: "i" },
};

export function AlertItem({ severity, title, description, time, source }: AlertItemProps) {
  const s = severityStyles[severity];

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 0",
        borderBottom: "0.5px solid var(--border-subtle)",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "var(--radius-md)",
          background: s.bg,
          color: s.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {s.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{description}</div>
        <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 3 }}>
          {time} · {source}
        </div>
      </div>
    </div>
  );
}
