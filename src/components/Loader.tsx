"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import LoaderStars from "./LoaderStars";

interface LoaderProps {
  onComplete: () => void;
}

const LOADER_DURATION_MS = 3500;
const FADE_DURATION_MS = 450;

export default function Loader({ onComplete }: LoaderProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const finishedRef = useRef(false);

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
    let rafId = 0;

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const t = Math.min(1, elapsed / progressWindow);
      const eased = t * t * (3 - 2 * t);
      setDisplayProgress(eased * 100);

      if (elapsed >= LOADER_DURATION_MS) {
        finish();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [finish]);

  if (!visible) return null;

  const shownProgress = Math.min(100, Math.round(displayProgress));

  return (
    <div
      className={`loader-screen fixed inset-0 z-50 transition-opacity duration-[450ms] ease-out ${
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

      <LoaderStars />

      <div className="loader-frame pointer-events-none absolute border border-maj-gold/15" />

      <div className="loader-shell relative z-10 flex flex-col justify-center">
        <div className="loader-stack animate-fade-up">
          <div className="loader-logo-wrap">
            <div className="relative">
              <div className="absolute -inset-6 rounded-full bg-maj-gold/20 blur-3xl sm:-inset-10 md:-inset-12" />
              <div className="loader-logo-size relative">
                <Image
                  src="/logo_outline.png"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 640px) 72vw, (max-width: 768px) 48vw, 320px"
                  className="loader-logo-outline object-contain"
                  aria-hidden
                />
                <div className="loader-logo-inner overflow-hidden rounded-full bg-[#f8f8f8] shadow-[0_0_56px_rgba(212,175,55,0.38)]">
                  <Image
                    src="/wh_logo.png"
                    alt="MAJ Boutique"
                    fill
                    priority
                    sizes="(max-width: 640px) 52vw, (max-width: 768px) 34vw, 220px"
                    className="object-contain object-center p-[9%] sm:p-4"
                  />
                </div>
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
