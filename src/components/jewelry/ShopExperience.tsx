"use client";

import ShopUI from "./ShopUI";
import JewelryHome from "./JewelryHome";

interface ShopExperienceProps {
  visible: boolean;
}

export default function ShopExperience({ visible }: ShopExperienceProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[40] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FAF6F1 0%, #F7EFE8 38%, #F0E0D8 100%)",
        animation: "fadeIn 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      }}
    >
      <ShopUI visible={visible} />

      <div className="table-band absolute inset-x-0 bottom-0 z-[10]">
        <JewelryHome visible={visible} />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[15]"
        style={{
          background:
            "radial-gradient(ellipse 88% 78% at 50% 38%, transparent 40%, rgba(61,43,31,0.07) 100%)",
        }}
      />
    </div>
  );
}
