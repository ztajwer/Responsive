"use client";

import { useEffect } from "react";
import {
  preloadDoorImages,
  preloadNextProductModel,
  preloadShopImages,
  preloadTableModel,
  scheduleIdle,
  warmShopExperienceModule,
} from "@/lib/modelPreload";

/** Warm critical assets immediately — stagger heavy GLBs during loader + door. */
export default function ModelPreloader({ doorsReady }: { doorsReady: boolean }) {
  useEffect(() => {
    preloadTableModel();
    preloadDoorImages();
    preloadShopImages();
    warmShopExperienceModule();
    preloadNextProductModel(0);
  }, []);

  useEffect(() => {
    if (!doorsReady) return;
    preloadNextProductModel(1);
    scheduleIdle(() => {
      preloadNextProductModel(2);
    });
  }, [doorsReady]);

  return null;
}
