"use client";

import { Component, useEffect, type ReactNode } from "react";
import { startShopModelLoads } from "@/lib/modelPreload";
import JewelryHome from "./JewelryHome";

interface ShopExperienceProps {
  visible: boolean;
}

class ShopErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[ShopExperience]", error.message);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="shop-experience fixed inset-0 z-[40] overflow-hidden">
          <div className="shop-experience-bg" aria-hidden>
            <div className="shop-experience-bg__zoom" />
          </div>
          <div className="absolute inset-x-0 bottom-24 flex justify-center px-6">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="font-sans text-[10px] uppercase tracking-[0.3em] text-maj-gold"
            >
              Reload boutique view
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ShopExperience({ visible }: ShopExperienceProps) {
  useEffect(() => {
    if (visible) startShopModelLoads();
  }, [visible]);

  if (!visible) return null;

  return (
    <ShopErrorBoundary>
      <div className="shop-experience fixed inset-0 z-[40] overflow-hidden">
        <div className="shop-experience-bg" aria-hidden>
          <div className="shop-experience-bg__zoom" />
        </div>

        <JewelryHome visible={visible} />
      </div>
    </ShopErrorBoundary>
  );
}
