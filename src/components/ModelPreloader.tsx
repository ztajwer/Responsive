"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { extendGltfLoader, getProductModelUrls, getTableModelUrl } from "@/lib/modelAssets";

const DOOR_IMAGES = ["/door_sm.png", "/door_bg.png"] as const;
const PRODUCT_STAGGER_MS = 450;

/** Preload table + door images early; stagger product GLBs to stay under ~1GB initial load. */
export default function ModelPreloader({ doorsReady }: { doorsReady: boolean }) {
  useEffect(() => {
    useGLTF.preload(getTableModelUrl(), false, false, extendGltfLoader);

    for (const src of DOOR_IMAGES) {
      const img = new window.Image();
      img.src = src;
    }
  }, []);

  useEffect(() => {
    if (!doorsReady) return;

    const urls = getProductModelUrls();
    let index = 0;
    let timer = 0;

    const preloadNext = () => {
      if (index >= urls.length) return;
      useGLTF.preload(urls[index], false, false, extendGltfLoader);
      index += 1;
      timer = window.setTimeout(preloadNext, PRODUCT_STAGGER_MS);
    };

    preloadNext();

    return () => window.clearTimeout(timer);
  }, [doorsReady]);

  return null;
}
