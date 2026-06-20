"use client";

interface BrightnessWashProps {
  intensity: number;
}

export default function BrightnessWash({ intensity }: BrightnessWashProps) {
  if (intensity <= 0.01) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[15]"
      style={{
        opacity: intensity * 0.92,
        transition: "opacity 0.2s ease-out",
        background:
          "radial-gradient(ellipse 92% 82% at 50% 50%, rgba(255,252,248,0.92) 0%, rgba(255,245,230,0.65) 38%, rgba(250,240,220,0.3) 68%, transparent 100%)",
      }}
    />
  );
}
