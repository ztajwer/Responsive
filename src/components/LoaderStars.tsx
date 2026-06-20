"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const STAR_SRC = "/star.png";
const SPEED_MULTIPLIER = 9;

interface StarConfig {
  starsPerSecond: number;
  maxStars: number;
  starSize: number;
}

interface StarParticle {
  id: number;
  startX: string;
  startY: string;
  w1x: string;
  w1y: string;
  w2x: string;
  w2y: string;
  w3x: string;
  w3y: string;
  endX: string;
  endY: string;
  duration: number;
  flipDuration: number;
  flipDirection: 1 | -1;
}

function getStarConfig(): StarConfig {
  if (typeof window === "undefined") {
    return { starsPerSecond: 5, maxStars: 40, starSize: 40 };
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const isLandscapeShort = h < 500 && w > h;

  if (w < 640 || isLandscapeShort) {
    return { starsPerSecond: 4, maxStars: 28, starSize: 32 };
  }
  if (w < 1024) {
    return { starsPerSecond: 5, maxStars: 40, starSize: 40 };
  }
  return { starsPerSecond: 7, maxStars: 56, starSize: 50 };
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createStar(id: number): StarParticle {
  const baseDuration = rand(2.6, 3.4) / SPEED_MULTIPLIER;

  return {
    id,
    startX: `${rand(2, 94)}%`,
    startY: `${rand(-12, 88)}%`,
    w1x: `${rand(-28, 28)}vw`,
    w1y: `${rand(-18, 22)}vh`,
    w2x: `${rand(-32, 32)}vw`,
    w2y: `${rand(-12, 28)}vh`,
    w3x: `${rand(-24, 24)}vw`,
    w3y: `${rand(8, 36)}vh`,
    endX: `${rand(-38, 38)}vw`,
    endY: `${rand(28, 105)}vh`,
    duration: baseDuration,
    flipDuration: rand(0.22, 0.55) / SPEED_MULTIPLIER,
    flipDirection: Math.random() > 0.5 ? 1 : -1,
  };
}

export default function LoaderStars() {
  const [stars, setStars] = useState<StarParticle[]>([]);
  const [config, setConfig] = useState<StarConfig>(() => getStarConfig());
  const idRef = useRef(0);

  const spawn = useCallback(() => {
    setStars((prev) => {
      const next = [...prev, createStar(idRef.current++)];
      return next.length > config.maxStars
        ? next.slice(next.length - config.maxStars)
        : next;
    });
  }, [config.maxStars]);

  const removeStar = useCallback((id: number) => {
    setStars((prev) => prev.filter((star) => star.id !== id));
  }, []);

  useEffect(() => {
    const preload = new window.Image();
    preload.src = STAR_SRC;
  }, []);

  useEffect(() => {
    const updateConfig = () => setConfig(getStarConfig());
    updateConfig();
    window.addEventListener("resize", updateConfig, { passive: true });
    window.addEventListener("orientationchange", updateConfig);
    return () => {
      window.removeEventListener("resize", updateConfig);
      window.removeEventListener("orientationchange", updateConfig);
    };
  }, []);

  useEffect(() => {
    spawn();
    const spawnMs = 1000 / config.starsPerSecond;
    const interval = window.setInterval(spawn, spawnMs);
    return () => window.clearInterval(interval);
  }, [spawn, config.starsPerSecond]);

  return (
    <div className="loader-stars-field pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {stars.map((star) => (
        <div
          key={star.id}
          className="loader-star absolute"
          style={
            {
              left: star.startX,
              top: star.startY,
              "--w1x": star.w1x,
              "--w1y": star.w1y,
              "--w2x": star.w2x,
              "--w2y": star.w2y,
              "--w3x": star.w3x,
              "--w3y": star.w3y,
              "--end-x": star.endX,
              "--end-y": star.endY,
              "--star-fall-duration": `${star.duration}s`,
              "--star-flip-duration": `${star.flipDuration}s`,
              "--star-flip-direction": star.flipDirection,
            } as CSSProperties
          }
          onAnimationEnd={() => removeStar(star.id)}
        >
          <div className="loader-star-flip">
            <img
              src={STAR_SRC}
              alt=""
              width={config.starSize}
              height={config.starSize}
              className="loader-star-sprite"
              draggable={false}
              decoding="async"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
