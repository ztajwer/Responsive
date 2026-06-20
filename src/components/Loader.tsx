"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import LoaderFallingGlitter from "./LoaderFallingGlitter";
import { preloadDoorImages, preloadNextProductModel, preloadShopImages, preloadTableModel, warmShopExperienceModule } from "@/lib/modelPreload";

interface LoaderProps {
  onComplete: () => void;
}

const LOADER_DURATION_MS = 2800;
const FADE_DURATION_MS = 400;

export default function Loader({ onComplete }: LoaderProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    preloadTableModel();
    preloadDoorImages();
    preloadShopImages();
    preloadNextProductModel(0);
    warmShopExperienceModule();
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setDisplayProgress(100);
    setFadeOut(true);
    setTimeout(() => {
      setVisible(false);
      onComplete();
    }, FADE_DURATION_MS);
  }, [onComplete]);

  useEffect(() => {
    const startedAt = Date.now();
    const progressWindow = LOADER_DURATION_MS - FADE_DURATION_MS;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const t = Math.min(1, elapsed / progressWindow);
      const eased = t * t * (3 - 2 * t);
      setDisplayProgress(eased * 100);

      if (elapsed >= LOADER_DURATION_MS) {
        clearInterval(interval);
        finish();
      }
    }, 30);

    return () => clearInterval(interval);
  }, [finish]);

  if (!visible) return null;

  const shownProgress = Math.min(100, Math.round(displayProgress));

  return (
    <div
      className={`loader-screen fixed inset-0 z-50 transition-opacity duration-[400ms] ease-out ${
        fadeOut ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <Image
        src="/bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="loader-bg"
        aria-hidden
      />

      <LoaderFallingGlitter progress={displayProgress} />

      <div className="loader-frame pointer-events-none absolute border border-maj-gold/15" />

      <div className="loader-shell relative z-10 flex flex-col justify-center">
        <div className="loader-stack animate-fade-up">
          <div className="loader-logo-wrap">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full bg-maj-gold/14 blur-3xl sm:-inset-12" />
              <div className="loader-logo-size relative">
                <Image
                  src="/logo_outline.png"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 640px) 80vw, (max-width: 768px) 52vw, 360px"
                  className="loader-logo-outline object-contain object-center"
                  aria-hidden
                />
                <Image
                  src="/wh_logo-removebg-preview.png"
                  alt="MAJ Boutique"
                  fill
                  priority
                  sizes="(max-width: 640px) 72vw, (max-width: 768px) 48vw, 320px"
                  className="loader-logo-front relative z-10 object-contain object-center drop-shadow-[0_8px_28px_rgba(212,175,55,0.28)]"
                />
              </div>
            </div>
          </div>

          <div className="loader-progress">
            <div className="mb-2 flex items-center justify-between sm:mb-3">
              <span className="font-sans text-[9px] uppercase tracking-[0.28em] text-maj-brown/55 sm:text-[10px] sm:tracking-[0.36em]">
                Preparing
              </span>
              <span className="font-sans text-[9px] tabular-nums tracking-wider text-maj-brown-mid sm:text-[10px]">
                {shownProgress}%
              </span>
            </div>

            <div className="relative h-1 w-full overflow-visible rounded-full bg-maj-brown/12">
              <div
                className="loader-bar-fill relative h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${shownProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
