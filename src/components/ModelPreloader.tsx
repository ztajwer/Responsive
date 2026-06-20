"use client";

import { useEffect } from "react";
import {
  preloadDoorImages,
  preloadProductModels,
  preloadShopImages,
  preloadTableModel,
  scheduleIdle,
  warmShopExperienceModule,
} from "@/lib/modelPreload";

/** Warm CDN models + images early; products + shop chunk load during door interaction. */
export default function ModelPreloader({ doorsReady }: { doorsReady: boolean }) {
  useEffect(() => {
    preloadTableModel();
    preloadDoorImages();
    preloadShopImages();
  }, []);

  useEffect(() => {
    if (!doorsReady) return;

    scheduleIdle(() => {
      warmShopExperienceModule();
    });
  }, [doorsReady]);

  return null;
}
