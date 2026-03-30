export interface Medication {
  name: string;
  scheduledTime: string;
  taken: boolean;
  overdue: boolean;
}

export interface TimelineEvent {
  description: string;
  time: string;
  type: "activity" | "neutral" | "alert";
}

export interface Patient {
  id: string;
  name: string;
  initials: string;
  accentColor: "blue" | "teal" | "amber" | "red";
  age: number;
  room: string;
  admitted: string;
  status: "ok" | "warn" | "alert";
  badge: "Stable" | "Watch" | "Alert";
  scene: "seated" | "standing" | "resting" | "seated-tv";
  analysis: string;
  movement: string;
  posture: string;
  activity: string;
  risk: number;
  riskLabel: string;
  medications: Medication[];
  events: TimelineEvent[];
}
