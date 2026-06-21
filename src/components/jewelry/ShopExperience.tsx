"use client";

import { useEffect, useState } from "react";
import JewelryHome from "./JewelryHome";

interface ShopExperienceProps {
  visible: boolean;
}

export default function ShopExperience({ visible }: ShopExperienceProps) {
  const [bgZoomLive, setBgZoomLive] = useState(false);
  const [revealLive, setRevealLive] = useState(false);

  useEffect(() => {
    if (!visible) {
      setBgZoomLive(false);
      setRevealLive(false);
      return;
    }
    void import("@/lib/modelPreload").then((mod) => mod.startShopModelLoads());
    const id = window.requestAnimationFrame(() => {
      setBgZoomLive(true);
      setRevealLive(true);
    });
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

      <div
        className={`shop-reveal-overlay${revealLive ? " shop-reveal-overlay--live" : ""}`}
        aria-hidden
      >
        <div className="shop-reveal-overlay__dark" />
        <div className="shop-reveal-overlay__light" />
      </div>

      <JewelryHome visible={visible} />
    </div>
  );
}
