"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { extendGltfLoader, getProductModelUrls, getTableModelUrl } from "@/lib/modelAssets";

const DOOR_IMAGES = ["/door_sm.png", "/door_bg.png"] as const;
const PRODUCT_STAGGER_MS = 600;

/** Preload table + door images early; load product GLBs only after shop opens, one at a time. */
export default function ModelPreloader({
  doorsReady,
  shopEntered,
}: {
  doorsReady: boolean;
  shopEntered: boolean;
}) {
  useEffect(() => {
    useGLTF.preload(getTableModelUrl(), false, false, extendGltfLoader);

    for (const src of DOOR_IMAGES) {
      const img = new window.Image();
      img.src = src;
    }
  }, []);

  useEffect(() => {
    if (!doorsReady || !shopEntered) return;

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
  }, [doorsReady, shopEntered]);

  return null;
}
