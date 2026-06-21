"use client";

import { useEffect } from "react";
import { bootFastPipeline } from "@/lib/modelPreload";

/** Starts GLB download/parse before Experience hydrates — earliest possible client hook. */
export default function EarlyModelPreload() {
  useEffect(() => {
    bootFastPipeline();
  }, []);

  return null;
}
