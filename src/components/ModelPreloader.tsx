"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { extendGltfLoader, getProductModelUrls, getTableModelUrl } from "@/lib/modelAssets";

const IMAGE_ASSETS = [
  "/door_sm.png",
  "/door_bg.png",
  "/background.png",
  "/main_mob_bg.png",
  "/bg.png",
  "/wh_logo.png",
] as const;

/** Start heavy assets as soon as the app mounts — parallel with the loader. */
export default function ModelPreloader() {
  useEffect(() => {
    useGLTF.preload(getTableModelUrl(), false, false, extendGltfLoader);
    getProductModelUrls().forEach((url) => {
      useGLTF.preload(url, false, false, extendGltfLoader);
    });

    for (const src of IMAGE_ASSETS) {
      const img = new window.Image();
      img.src = src;
    }
  }, []);

  return null;
}
