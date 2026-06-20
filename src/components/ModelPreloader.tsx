"use client";

import { useEffect } from "react";
import {
  bootShopModels,
  preloadDoorImages,
  preloadNextProductModel,
  preloadShopImages,
  staggerRemainingProductPreloads,
  warmShopExperienceModule,
} from "@/lib/modelPreload";

export default function ModelPreloader({ doorsReady }: { doorsReady: boolean }) {
  useEffect(() => {
    bootShopModels();
    preloadDoorImages();
    preloadShopImages();
    warmShopExperienceModule();
  }, []);

  useEffect(() => {
    if (!doorsReady) return;
    preloadNextProductModel(1);
    staggerRemainingProductPreloads(2, 400);
  }, [doorsReady]);

  return null;
}
