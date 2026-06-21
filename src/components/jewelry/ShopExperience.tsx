"use client";

import { useEffect, useRef, useState } from "react";
import JewelryHome from "./JewelryHome";

interface ShopExperienceProps {
  visible: boolean;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

export default function ShopExperience({ visible }: ShopExperienceProps) {
  const bgRef = useRef<HTMLDivElement>(null);
  const zoomFrameRef = useRef(0);
  const [revealLive, setRevealLive] = useState(false);

  useEffect(() => {
    cancelAnimationFrame(zoomFrameRef.current);

    if (!visible) {
      setRevealLive(false);
      const el = bgRef.current;
      if (el) {
        const mobile = window.innerWidth < 768;
        el.style.transformOrigin = mobile ? "center center" : "50% 86%";
        el.style.transform = `scale(${mobile ? 0.82 : 0.84}) translateZ(0)`;
      }
      return;
    }

    void import("@/lib/modelPreload").then((mod) => mod.startShopModelLoads());
    const revealId = window.requestAnimationFrame(() => setRevealLive(true));

    const mobile = window.innerWidth < 768;
    const from = mobile ? 0.82 : 0.84;
    const to = mobile ? 1.06 : 1.03;
    const durationMs = 16000;
    const transformOrigin = mobile ? "center center" : "50% 86%";

    const startZoom = () => {
      const el = bgRef.current;
      if (!el) return;

      el.style.transformOrigin = transformOrigin;
      el.style.transform = `scale(${from}) translateZ(0)`;
      let startedAt: number | null = null;

      const tick = (now: number) => {
        if (startedAt === null) startedAt = now;
        const t = Math.min(1, (now - startedAt) / durationMs);
        const scale = from + (to - from) * easeOutCubic(t);
        el.style.transform = `scale(${scale}) translateZ(0)`;
        if (t < 1) {
          zoomFrameRef.current = window.requestAnimationFrame(tick);
        }
      };

      zoomFrameRef.current = window.requestAnimationFrame(tick);
    };

    const zoomDelay = window.setTimeout(startZoom, 400);

    return () => {
      window.cancelAnimationFrame(revealId);
      window.clearTimeout(zoomDelay);
      cancelAnimationFrame(zoomFrameRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="shop-experience fixed inset-0 z-[40] overflow-hidden">
      <div className="shop-experience-bg" aria-hidden style={{ pointerEvents: "none" }}>
        <div ref={bgRef} className="shop-experience-bg__zoom" />
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
