"use client";

import { useEffect } from "react";
import { useProgress } from "@react-three/drei";
import { useLoadingState } from "@/context/LoadingContext";

export default function LoadingBridge() {
  const { progress, active } = useProgress();
  const { setProgress } = useLoadingState();

  useEffect(() => {
    setProgress(progress, active);
  }, [progress, active, setProgress]);

  return null;
}
