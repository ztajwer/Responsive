"use client";

import { useEffect } from "react";
import {
  bootShopModels,
  preloadDoorImages,
  preloadShopImages,
  warmShopExperienceModule,
} from "@/lib/modelPreload";

/** Fires on first paint — parallel GLB fetch + shop chunk warm. */
export default function ModelPreloader({ doorsReady: _doorsReady }: { doorsReady: boolean }) {
  useEffect(() => {
    bootShopModels();
    preloadDoorImages();
    preloadShopImages();
    warmShopExperienceModule();
  }, []);

  return null;
}
