"use client";

import { useEffect, useState } from "react";
import JewelryHome from "./JewelryHome";

interface ShopExperienceProps {
  visible: boolean;
}

export default function ShopExperience({ visible }: ShopExperienceProps) {
  const [bgZoomLive, setBgZoomLive] = useState(false);

  useEffect(() => {
    if (!visible) {
      setBgZoomLive(false);
      return;
    }
    void import("@/lib/modelPreload").then((mod) => mod.startShopModelLoads());
    const id = window.requestAnimationFrame(() => setBgZoomLive(true));
    return () => window.cancelAnimationFrame(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="shop-experience fixed inset-0 z-[40] overflow-hidden">
      <div className="shop-experience-bg" aria-hidden style={{ pointerEvents: "none" }}>
        <div
          className={`shop-experience-bg__zoom${bgZoomLive ? " shop-experience-bg__zoom--live" : ""}`}
        />
      </div>

      <JewelryHome visible={visible} />
    </div>
  );
}
