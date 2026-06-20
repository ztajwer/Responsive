"use client";

import { useEffect } from "react";
import { bootFastPipeline } from "@/lib/modelPreload";

/** Runs once on first paint — parallel asset warm-up. */
export default function ModelPreloader(_props: { doorsReady: boolean }) {
  useEffect(() => {
    bootFastPipeline();
  }, []);

  return null;
}
