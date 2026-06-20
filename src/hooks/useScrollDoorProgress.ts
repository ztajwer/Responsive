"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getDoorOpenDistance, getDoorScrollContentHeight } from "@/lib/doorFraming";

const AUTO_NAV_AT = 0.96;

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useScrollDoorProgress(active: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [doorProgress, setDoorProgress] = useState(0);
  const [entered, setEntered] = useState(false);
  const autoNavDone = useRef(false);

  const getOpenDistance = useCallback(() => getDoorOpenDistance(), []);

  useEffect(() => {
    if (!active || !prefersReducedMotion()) return;
    progressRef.current = 1;
    setDoorProgress(1);
    autoNavDone.current = true;
    setEntered(true);
  }, [active]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !active) return;

    const update = () => {
      const openDist = getOpenDistance();
      const p = Math.min(1, Math.max(0, el.scrollTop / openDist));
      progressRef.current = p;
      setDoorProgress(p);

      if (p >= AUTO_NAV_AT && !autoNavDone.current) {
        autoNavDone.current = true;
        setEntered(true);
      }
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [active, getOpenDistance]);

  const brightness = Math.min(1, Math.max(0, (doorProgress - 0.2) / 0.75));
  const canvasOpacity = Math.min(1, Math.max(0, 1 - (doorProgress - 0.55) / 0.45));

  return {
    scrollRef,
    progressRef,
    doorProgress,
    entered,
    brightness,
    canvasOpacity,
    scrollHeight: getDoorScrollContentHeight(),
    getOpenDistance,
  };
}
