"use client";

import { useEffect } from "react";
import { bootImagePipeline } from "@/lib/modelPreload";

/** Warm images early — GLB models load after loader (see Loader.tsx). */
export default function EarlyModelPreload() {
  useEffect(() => {
    bootImagePipeline();
  }, []);

  return null;
}
