"use client";

import JewelryHome from "./JewelryHome";

interface ShopExperienceProps {
  visible: boolean;
}

export default function ShopExperience({ visible }: ShopExperienceProps) {
  if (!visible) return null;

  return (
    <div className="shop-experience fixed inset-0 z-[40] overflow-hidden">
      <div className="shop-experience-bg" aria-hidden>
        <div className="shop-experience-bg__zoom" />
      </div>

      <JewelryHome visible={visible} />
    </div>
  );
}
