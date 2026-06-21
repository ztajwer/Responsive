"use client";

import { Component, type ReactNode } from "react";
import Experience from "@/components/Experience";

class HomeErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("[HomeClient]", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-maj-cream">
          <p className="font-serif text-lg tracking-wide text-maj-brown">MAJ Boutique</p>
          <p className="max-w-xs px-6 text-center font-sans text-[10px] leading-relaxed tracking-wide text-maj-brown/60">
            Something went wrong loading the experience. Try a hard refresh.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ failed: false });
              window.location.reload();
            }}
            className="font-sans text-[10px] uppercase tracking-[0.3em] text-maj-gold"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function HomeClient() {
  return (
    <HomeErrorBoundary>
      <div className="fixed inset-0 h-[100dvh] w-screen bg-maj-cream">
        <Experience />
      </div>
    </HomeErrorBoundary>
  );
}
