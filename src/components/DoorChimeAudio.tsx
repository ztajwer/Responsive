"use client";

import { useEffect } from "react";
import { preloadBoutiqueAudio, syncDoorChimeAudio } from "@/lib/boutiqueAudio";

interface DoorChimeAudioProps {
  active: boolean;
  doorProgress: number;
  /** True while still on the door screen (before shop). */
  doorScreenActive: boolean;
}

export default function DoorChimeAudio({ active, doorProgress, doorScreenActive }: DoorChimeAudioProps) {
  useEffect(() => {
    if (active) preloadBoutiqueAudio();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    syncDoorChimeAudio(doorProgress, doorScreenActive);
  }, [active, doorProgress, doorScreenActive]);

  return null;
}
