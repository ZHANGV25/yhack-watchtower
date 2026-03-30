"use client";

import { useState, useCallback } from "react";
import { Patient } from "@/types";
import { PATIENTS } from "@/data/patients";

export function usePatient() {
  const [patients, setPatients] = useState<Patient[]>(PATIENTS);
  const [selectedId, setSelectedId] = useState<string>(PATIENTS[0].id);

  const selected = patients.find((p) => p.id === selectedId) ?? patients[0];

  const selectPatient = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const toggleMedication = useCallback((patientId: string, medIndex: number) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        const meds = [...p.medications];
        meds[medIndex] = { ...meds[medIndex], taken: !meds[medIndex].taken };
        return { ...p, medications: meds };
      })
    );
  }, []);

  const updateAnalysis = useCallback((patientId: string, analysis: string) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        return {
          ...p,
          analysis,
          events: [
            ...p.events,
            { description: "AI analysis updated", time, type: "neutral" as const },
          ],
        };
      })
    );
  }, []);

  return {
    patients,
    selected,
    selectedId,
    selectPatient,
    toggleMedication,
    updateAnalysis,
  };
}
