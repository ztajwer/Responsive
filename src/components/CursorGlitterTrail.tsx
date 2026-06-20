"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  kind: "dot" | "star";
  rotation: number;
  rotationSpeed: number;
}

const MAX_PARTICLES = 40;

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  const r = size / 2;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i - Math.PI / 4;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    const innerAngle = angle + Math.PI / 4;
    ctx.lineTo(Math.cos(innerAngle) * r * 0.35, Math.sin(innerAngle) * r * 0.35);
  }
  ctx.closePath();
  ctx.fill();
}

export default function CursorGlitterTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const runningRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const spawn = (x: number, y: number) => {
      const dx = x - lastRef.current.x;
      const dy = y - lastRef.current.y;
      if (dx * dx + dy * dy < 25) return;
      lastRef.current = { x, y };

      const burst = Math.random() > 0.7 ? 2 : 1;
      for (let i = 0; i < burst; i++) {
        if (particlesRef.current.length >= MAX_PARTICLES) {
          particlesRef.current.shift();
        }
        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * 5,
          y: y + (Math.random() - 0.5) * 5,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          life: 0,
          maxLife: 10 + Math.random() * 12,
          size: Math.random() > 0.75 ? 3 + Math.random() * 2 : 1.2 + Math.random() * 1.5,
          kind: Math.random() > 0.65 ? "star" : "dot",
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.12,
        });
      }

      if (!runningRef.current) {
        runningRef.current = true;
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        const t = 1 - p.life / p.maxLife;
        const alpha = Math.min(1, t * t * 1.15);

        if (p.kind === "dot") {
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
          gradient.addColorStop(0.3, `rgba(255, 252, 240, ${alpha * 0.95})`);
          gradient.addColorStop(0.7, `rgba(255, 235, 200, ${alpha * 0.4})`);
          gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
          ctx.fillStyle = gradient;
          ctx.shadowColor = `rgba(255, 255, 255, ${alpha * 0.85})`;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.shadowColor = `rgba(255, 255, 255, ${alpha * 0.9})`;
          ctx.shadowBlur = 8;
          drawStar(ctx, p.size);
          ctx.restore();
        }

        return p.life < p.maxLife;
      });

      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        runningRef.current = false;
      }
    };

    const onMove = (e: MouseEvent) => spawn(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) spawn(touch.clientX, touch.clientY);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[55]"
      aria-hidden
    />
  );
}
