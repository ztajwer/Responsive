"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { extendGltfLoader, getTableModelUrl } from "@/lib/modelAssets";

const DOOR_IMAGES = ["/door_sm.png", "/door_bg.png"] as const;

/** Preload table + door images early; products load on demand in shop (keeps memory under ~1GB). */
export default function ModelPreloader({ doorsReady: _doorsReady }: { doorsReady: boolean }) {
  useEffect(() => {
    useGLTF.preload(getTableModelUrl(), false, false, extendGltfLoader);

    for (const src of DOOR_IMAGES) {
      const img = new window.Image();
      img.src = src;
    }
  }, []);

  return null;
}
