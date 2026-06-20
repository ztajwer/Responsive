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
      <header className="absolute left-0 right-0 top-0 flex flex-col items-center px-6 pt-[clamp(1.5rem,6vh,3.5rem)]">
        <div className="text-center">
          <p className="mb-2 font-sans text-[9px] uppercase tracking-[0.55em] text-maj-gold/80 sm:text-[10px]">
            Welcome
          </p>
          <h1
            className="font-display text-[clamp(2rem,9vw,4.5rem)] font-light leading-none tracking-[0.18em] text-white"
            style={{ textShadow: "0 2px 24px rgba(0,0,0,0.35)" }}
          >
            MAJ
          </h1>
          <div className="my-3 flex items-center justify-center gap-3 sm:my-4 sm:gap-4">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-maj-gold/55 sm:w-14" />
            <div className="h-1 w-1 rotate-45 border border-maj-gold/65" />
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-maj-gold/55 sm:w-14" />
          </div>
          <p
            className="font-display text-[clamp(0.7rem,1.6vw,1rem)] font-light italic tracking-[0.42em] text-maj-gold/95"
            style={{ textShadow: "0 1px 12px rgba(0,0,0,0.3)" }}
          >
            Boutique
          </p>
        </div>
      </header>

      <p
        className="absolute bottom-4 left-0 right-0 text-center font-sans text-[8px] uppercase tracking-[0.4em] text-white/45 sm:bottom-5 sm:text-[9px]"
        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}
      >
        Drag to rotate
      </p>
    </div>
  );
}
