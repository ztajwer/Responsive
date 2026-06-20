"use client";

interface ScrollOpenModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ScrollOpenModal({ open, onClose }: ScrollOpenModalProps) {
  if (!open) return null;

  return (
    <div
      className="scroll-open-modal-backdrop fixed inset-0 z-[35] flex items-center justify-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="scroll-open-modal-circle relative flex flex-col items-center justify-center text-center animate-fade-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scroll-open-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="scroll-open-modal-close absolute flex items-center justify-center"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M1 1L11 11M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="mb-3 flex animate-gentle-pulse flex-col items-center text-maj-gold/80">
          <svg width="16" height="22" viewBox="0 0 16 22" fill="none" aria-hidden>
            <path
              d="M8 1V17M8 17L3 12M8 17L13 12"
              stroke="currentColor"
              strokeWidth="0.85"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="mb-3 flex items-center gap-2.5">
          <div className="h-px w-7 bg-maj-gold/35" />
          <div className="h-1 w-1 rotate-45 border border-maj-gold/55" />
          <div className="h-px w-7 bg-maj-gold/35" />
        </div>

        <p
          id="scroll-open-modal-title"
          className="font-sans text-[9px] font-light uppercase leading-relaxed tracking-[0.38em] text-maj-brown-mid/75 sm:text-[10px] sm:tracking-[0.42em]"
        >
          Scroll to
          <br />
          open
        </p>
      </div>
    </div>
  );
}
