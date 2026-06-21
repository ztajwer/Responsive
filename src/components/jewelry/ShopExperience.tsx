"use client";

import { useCallback, useEffect, useState } from "react";
import { startShopModelLoads } from "@/lib/modelPreload";
import JewelryHome from "./JewelryHome";

interface ShopExperienceProps {
  visible: boolean;
}

export default function ShopExperience({ visible }: ShopExperienceProps) {
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    if (visible) startShopModelLoads();
    else setSceneReady(false);
  }, [visible]);

  const handleTableReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="shop-experience fixed inset-0 z-[40] overflow-hidden">
      <div
        className="shop-experience-bg"
        aria-hidden
        style={{
          opacity: sceneReady ? 0 : 1,
          transition: "opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
          pointerEvents: "none",
        }}
      >
        <div className="shop-experience-bg__zoom" />
      </div>

      <JewelryHome visible={visible} onTableReady={handleTableReady} />
    </div>
  );
}
