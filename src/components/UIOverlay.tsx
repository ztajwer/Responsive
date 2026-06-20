"use client";

interface UIOverlayProps {
  doorProgress: number;
  showHint: boolean;
}

export default function UIOverlay({ doorProgress, showHint }: UIOverlayProps) {
  const hintOpacity = Math.max(0, 1 - doorProgress * 2.4);

  return (
    <>
      {showHint && (
        <div
          className="door-scroll-hint pointer-events-none fixed left-1/2 z-20 flex -translate-x-1/2 flex-col items-center"
          style={{
            opacity: hintOpacity,
            transition: "opacity 0.4s ease",
          }}
        >
          <div className="mb-2.5 flex animate-gentle-pulse flex-col items-center gap-1 text-maj-gold/75">
            <svg width="14" height="20" viewBox="0 0 16 22" fill="none" aria-hidden>
              <path
                d="M8 1V17M8 17L3 12M8 17L13 12"
                stroke="currentColor"
                strokeWidth="0.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="mb-2.5 flex items-center gap-3 sm:gap-4">
            <div className="h-px w-8 bg-maj-gold/35 sm:w-12" />
            <div className="h-1 w-1 rotate-45 border border-maj-gold/55" />
            <div className="h-px w-8 bg-maj-gold/35 sm:w-12" />
          </div>
          <p className="font-sans text-[9px] font-light uppercase tracking-[0.48em] text-maj-brown-mid/65 sm:text-[10px]">
            Scroll to enter
          </p>
        </div>
      )}
    </>
  );
}
