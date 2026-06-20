"use client";

interface ShopUIProps {
  visible: boolean;
}

export default function ShopUI({ visible }: ShopUIProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[20]"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 1.4s cubic-bezier(0.22, 1, 0.36, 1) 0.2s",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[42%]"
        style={{
          background:
            "radial-gradient(ellipse 82% 92% at 50% 0%, rgba(255,252,248,0.55) 0%, rgba(232,196,184,0.1) 52%, transparent 82%)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 48% 40% at 50% 26%, rgba(232,196,184,0.12) 0%, transparent 70%)",
        }}
      />

      <header className="absolute left-0 right-0 top-0 flex flex-col items-center px-6 pt-[clamp(1.75rem,7vh,4rem)]">
        <div className="text-center">
          <p className="mb-2 font-sans text-[9px] uppercase tracking-[0.55em] text-maj-gold/65 sm:text-[10px]">
            Welcome
          </p>
          <h1 className="font-display text-[clamp(2.25rem,10vw,5rem)] font-light leading-none tracking-[0.18em] text-maj-brown">
            MAJ
          </h1>
          <div className="my-3 flex items-center justify-center gap-3 sm:my-4 sm:gap-4">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-maj-gold/45 sm:w-14" />
            <div className="h-1 w-1 rotate-45 border border-maj-gold/55" />
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-maj-gold/45 sm:w-14" />
          </div>
          <p className="font-display text-[clamp(0.75rem,1.8vw,1.1rem)] font-light italic tracking-[0.42em] text-maj-gold/90">
            Boutique
          </p>
        </div>
      </header>

      <div
        className="absolute inset-x-[12%] h-px sm:inset-x-[16%]"
        style={{
          bottom: "var(--table-band-height)",
          background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.28), transparent)",
        }}
      />

      <div
        className="table-band absolute inset-x-0 bottom-0"
        style={{
          background:
            "radial-gradient(ellipse 72% 48% at 50% 88%, rgba(232,196,184,0.14) 0%, rgba(245,235,228,0.38) 42%, transparent 78%)",
        }}
      />

      <div
        className="table-band absolute inset-x-[8%] bottom-0 border-t border-maj-gold/[0.08] sm:inset-x-[12%]"
        style={{
          background: "linear-gradient(180deg, rgba(255,251,247,0.15) 0%, rgba(245,235,228,0.55) 100%)",
        }}
      />

      <p className="absolute bottom-4 left-0 right-0 text-center font-sans text-[8px] uppercase tracking-[0.4em] text-maj-brown-mid/35 sm:bottom-5 sm:text-[9px]">
        Drag to rotate
      </p>
    </div>
  );
}
