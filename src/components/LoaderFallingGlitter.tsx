"use client";

import type { CSSProperties } from "react";

const DOT_COUNT = 72;

const FALLING_DOTS = Array.from({ length: DOT_COUNT }, (_, i) => ({
  left: `${((i * 13.7 + 4) % 98) + 1}%`,
  delay: (i * 0.028) % 3.8,
  duration: 2.6 + (i % 9) * 0.38,
  drift: ((i * 9.3) % 44) - 22,
  opacity: 0.5 + (i % 6) * 0.08,
  size: 2 + (i % 5),
  kind: i % 4 === 0 ? "spark" : i % 3 === 0 ? "shard" : "dot",
}));

interface LoaderFallingGlitterProps {
  progress: number;
}

export default function LoaderFallingGlitter({ progress }: LoaderFallingGlitterProps) {
  const intensity = Math.min(1, progress / 100);
  const visible = Math.max(24, Math.round(DOT_COUNT * (0.4 + intensity * 0.6)));

  return (
    <div className="loader-glitter-field pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {FALLING_DOTS.slice(0, visible).map((dot, i) => (
        <span
          key={i}
          className={`loader-falling-dot absolute top-0 ${
            dot.kind === "spark"
              ? "loader-falling-spark"
              : dot.kind === "shard"
                ? "loader-falling-shard"
                : ""
          }`}
          style={
            {
              left: dot.left,
              width: dot.size,
              height: dot.size,
              "--dot-drift": `${dot.drift}px`,
              "--dot-opacity": dot.opacity * (0.6 + intensity * 0.4),
              "--dot-fall-duration": `${dot.duration}s`,
              animationDelay: `${dot.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
