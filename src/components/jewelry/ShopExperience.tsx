"use client";

import { useEffect } from "react";
import JewelryHome from "./JewelryHome";

interface ShopExperienceProps {
  visible: boolean;
}

export default function ShopExperience({ visible }: ShopExperienceProps) {
  useEffect(() => {
    if (!visible) return;
    void import("@/lib/modelPreload").then((mod) => mod.startShopModelLoads());
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="shop-experience fixed inset-0 z-[40] overflow-hidden">
      <div className="shop-experience-bg" aria-hidden style={{ pointerEvents: "none" }}>
        <div className="shop-experience-bg__zoom" />
      </div>

      <JewelryHome visible={visible} />
    </div>
  );
}
