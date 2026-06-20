"use client";

import Image from "next/image";
import { useEffect } from "react";

interface DoorBackgroundProps {
  fadeProgress?: number;
}

export default function DoorBackground({ fadeProgress = 0 }: DoorBackgroundProps) {
  const opacity = Math.max(0, 1 - fadeProgress * 1.08);

  useEffect(() => {
    const src = window.innerWidth >= 768 ? "/door_bg.png" : "/door_sm.png";
    const img = new window.Image();
    img.src = src;
  }, []);

  return (
    <>
      {/* Mobile only — CSS 100%×100% = exact screen fit, no zoom/crop/gaps */}
      <div
        className="door-bg door-bg--sm pointer-events-none fixed inset-0 z-[2]"
        style={{ opacity, transition: "opacity 0.5s ease-out" }}
        aria-hidden
      />

      <div
        className="door-bg door-bg--lg pointer-events-none fixed inset-0 z-[2]"
        style={{ opacity, transition: "opacity 0.5s ease-out" }}
        aria-hidden
      >
        <Image
          src="/door_bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="door-bg-img door-bg-img--lg"
          draggable={false}
        />
      </div>

      <div
        className="door-bg-vignette pointer-events-none fixed inset-0 z-[3]"
        style={{
          opacity: opacity * 0.32,
          background:
            "radial-gradient(ellipse 80% 74% at 50% 50%, transparent 40%, rgba(26,20,16,0.24) 100%)",
        }}
        aria-hidden
      />
    </>
  );
}
