"use client";

import { Patient } from "@/types";

interface RoomSceneProps {
  scene: Patient["scene"];
  status: Patient["status"];
}

export function RoomScene({ scene, status }: RoomSceneProps) {
  const boxColor = status === "ok" ? "#1D9E75" : status === "warn" ? "#BA7517" : "#E24B4A";

  return (
    <svg
      viewBox="0 0 640 280"
      style={{ width: "100%", height: "100%", display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Room background */}
      <rect width="640" height="280" fill="#0d1520" />

      {/* Floor */}
      <rect x="0" y="200" width="640" height="80" fill="#141e2e" />
      <line x1="0" y1="200" x2="640" y2="200" stroke="#1a2940" strokeWidth="1" />

      {/* Window */}
      <rect x="60" y="30" width="120" height="140" rx="2" fill="#0a1525" stroke="#1a2940" strokeWidth="1" />
      <line x1="120" y1="30" x2="120" y2="170" stroke="#1a2940" strokeWidth="0.5" />
      <line x1="60" y1="100" x2="180" y2="100" stroke="#1a2940" strokeWidth="0.5" />
      <rect x="70" y="40" width="40" height="55" fill="#0e1a2e" />
      <rect x="130" y="40" width="40" height="55" fill="#0e1a2e" />

      {scene === "seated" && (
        <>
          {/* Chair */}
          <rect x="250" y="130" width="80" height="70" rx="4" fill="#1e2d42" stroke="#2a3d55" strokeWidth="1" />
          <rect x="245" y="120" width="10" height="80" rx="2" fill="#1e2d42" stroke="#2a3d55" strokeWidth="1" />
          {/* Person seated */}
          <circle cx="290" cy="105" r="16" fill="#2a4060" stroke="#3a5575" strokeWidth="1" />
          <rect x="270" y="122" width="40" height="45" rx="4" fill="#2a4060" stroke="#3a5575" strokeWidth="1" />
          {/* Book */}
          <rect x="310" y="140" width="20" height="15" rx="1" fill="#3a5575" transform="rotate(-15 320 147)" />
          {/* Bounding box */}
          <rect x="238" y="85" width="100" height="120" fill="none" stroke={boxColor} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.8" />
          <text x="240" y="82" fill={boxColor} fontSize="9" fontFamily="monospace">Person</text>
        </>
      )}

      {scene === "standing" && (
        <>
          {/* Door frame */}
          <rect x="450" y="50" width="80" height="150" fill="#0a1525" stroke="#1a2940" strokeWidth="1" />
          {/* Person standing */}
          <circle cx="470" cy="80" r="14" fill="#2a4060" stroke="#3a5575" strokeWidth="1" />
          <rect x="457" y="95" width="26" height="50" rx="3" fill="#2a4060" stroke="#3a5575" strokeWidth="1" />
          <rect x="459" y="145" width="10" height="40" rx="2" fill="#2a4060" />
          <rect x="471" y="145" width="10" height="40" rx="2" fill="#2a4060" />
          {/* Hand on wall */}
          <rect x="450" y="110" width="8" height="5" rx="1" fill="#3a5575" />
          {/* Bounding box */}
          <rect x="445" y="62" width="50" height="130" fill="none" stroke={boxColor} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.8" />
          <text x="447" y="58" fill={boxColor} fontSize="9" fontFamily="monospace">Person</text>
        </>
      )}

      {scene === "resting" && (
        <>
          {/* Bed */}
          <rect x="200" y="150" width="240" height="50" rx="4" fill="#1e2d42" stroke="#2a3d55" strokeWidth="1" />
          <rect x="195" y="145" width="30" height="60" rx="4" fill="#1e2d42" stroke="#2a3d55" strokeWidth="1" />
          {/* Person lying */}
          <circle cx="245" cy="145" r="12" fill="#2a4060" stroke="#3a5575" strokeWidth="1" />
          <rect x="260" y="140" width="150" height="20" rx="4" fill="#2a4060" stroke="#3a5575" strokeWidth="1" />
          {/* Blanket */}
          <rect x="280" y="148" width="130" height="16" rx="3" fill="#1a3050" opacity="0.6" />
          {/* Bounding box */}
          <rect x="228" y="128" width="200" height="80" fill="none" stroke={boxColor} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.8" />
          <text x="230" y="125" fill={boxColor} fontSize="9" fontFamily="monospace">Person</text>
        </>
      )}

      {scene === "seated-tv" && (
        <>
          {/* TV */}
          <rect x="400" y="50" width="140" height="85" rx="3" fill="#0a1525" stroke="#1a2940" strokeWidth="1" />
          <rect x="410" y="55" width="120" height="70" rx="1" fill="#101e30" />
          <rect x="455" y="135" width="30" height="5" fill="#1a2940" />
          {/* Recliner */}
          <rect x="220" y="130" width="90" height="70" rx="6" fill="#1e2d42" stroke="#2a3d55" strokeWidth="1" />
          <rect x="210" y="110" width="20" height="90" rx="4" fill="#1e2d42" stroke="#2a3d55" strokeWidth="1" />
          {/* Person in recliner */}
          <circle cx="265" cy="110" r="15" fill="#2a4060" stroke="#3a5575" strokeWidth="1" />
          <rect x="245" y="126" width="40" height="40" rx="4" fill="#2a4060" stroke="#3a5575" strokeWidth="1" />
          {/* Bounding box */}
          <rect x="205" y="90" width="110" height="115" fill="none" stroke={boxColor} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.8" />
          <text x="207" y="87" fill={boxColor} fontSize="9" fontFamily="monospace">Person</text>
        </>
      )}

      {/* Subtle grid overlay */}
      <line x1="320" y1="0" x2="320" y2="280" stroke="#1a2940" strokeWidth="0.3" opacity="0.3" />
      <line x1="0" y1="140" x2="640" y2="140" stroke="#1a2940" strokeWidth="0.3" opacity="0.3" />
    </svg>
  );
}
