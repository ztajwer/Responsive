/**
 * Screen alignment targets derived from shop background PNGs.
 * mobile: main_mob_bg.png (background-position center 58%)
 * desktop: background.png (background-position center)
 *
 * NDC: y = -1 bottom edge, y = 0 center, y = +1 top edge.
 */
export const SHOP_LAYOUT_CALIB = {
  mobile: {
    /** Slightly above bottom */
    counterBottomNdc: -0.75,
    productLift: 0.004,
    productRowSpanFactor: 0.76,
    productHeightFactor: 0.13,
    viewOffsetMax: 0.92,
  },
  tablet: {
    counterBottomNdc: -0.74,
    productLift: 0.004,
    productRowSpanFactor: 0.76,
    productHeightFactor: 0.12,
    viewOffsetMax: 0.88,
  },
  desktop: {
    counterBottomNdc: -0.73,
    productLift: 0.005,
    productRowSpanFactor: 0.74,
    productHeightFactor: 0.11,
    viewOffsetMax: 0.85,
  },
} as const;

export type ShopLayoutCalib = (typeof SHOP_LAYOUT_CALIB)[keyof typeof SHOP_LAYOUT_CALIB];

export function getShopLayoutCalib(width: number): ShopLayoutCalib {
  if (width < 768) return SHOP_LAYOUT_CALIB.mobile;
  if (width < 1024) return SHOP_LAYOUT_CALIB.tablet;
  return SHOP_LAYOUT_CALIB.desktop;
}
