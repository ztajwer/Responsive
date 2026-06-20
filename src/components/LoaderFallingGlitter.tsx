"use client";

import type { CSSProperties } from "react";

const DOT_COUNT = 52;

const FALLING_DOTS = Array.from({ length: DOT_COUNT }, (_, i) => ({
  left: `${((i * 17.3 + 2) % 99) + 0.5}%`,
  delay: (i * 0.035) % 4.5,
  duration: 3.2 + (i % 7) * 0.45,
  drift: ((i * 11.7) % 50) - 25,
  opacity: 0.55 + (i % 5) * 0.1,
  size: 3 + (i % 4),
  kind: i % 3 === 0 ? "spark" : "dot",
}));

interface LoaderFallingGlitterProps {
  progress: number;
}

export default function LoaderFallingGlitter({ progress }: LoaderFallingGlitterProps) {
  const intensity = Math.min(1, progress / 100);
  const visible = Math.max(18, Math.round(DOT_COUNT * (0.35 + intensity * 0.65)));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {FALLING_DOTS.slice(0, visible).map((dot, i) => (
        <span
          key={i}
          className={`loader-falling-dot absolute top-0 ${
            dot.kind === "spark" ? "loader-falling-spark" : ""
          }`}
          style={
            {
              left: dot.left,
              width: dot.size,
              height: dot.size,
              "--dot-drift": `${dot.drift}px`,
              "--dot-opacity": dot.opacity * (0.65 + intensity * 0.35),
              "--dot-fall-duration": `${dot.duration}s`,
              animationDelay: `${dot.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
