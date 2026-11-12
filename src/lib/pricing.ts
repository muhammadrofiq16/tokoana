export interface PriceTierData {
  priceRetail: number | string | { toString(): string } | any;
  priceWholesale: number | string | { toString(): string } | any;
  minWholesaleQty?: number | null | any;
}

export interface ProductUnitData {
  id: number;
  unitName: string;
  conversionFactor: number;
  sortOrder: number;
  priceTier?: PriceTierData | null;
}

/**
 * Calculate the effective unit price based on sale mode, quantity, and customer type.
 * Exactly replicates Laravel's ProductUnit::getPriceFor().
 */
export function getPriceFor(
  tier: PriceTierData | null | undefined,
  mode: "eceran" | "grosir" = "eceran",
  qty = 1,
  customerType: string | null = null
): number {
  if (!tier) return 0;

  const retailPrice = Number(tier.priceRetail) || 0;
  const wholesalePriceRaw = Number(tier.priceWholesale) || 0;
  const wholesalePrice = wholesalePriceRaw > 0 ? wholesalePriceRaw : retailPrice;

  // Condition 1: Wholesale Mode OR Reseller Customer gets wholesale price regardless of quantity
  if (mode === "grosir" || customerType === "reseller") {
    return wholesalePrice;
  }

  // Condition 2: Retail mode with volume-based threshold (min_wholesale_qty > 1)
  const minQty = Number(tier.minWholesaleQty) || 0;
  if (minQty > 1 && qty >= minQty && wholesalePriceRaw > 0) {
    return wholesalePriceRaw;
  }

  // Default: Retail price
  return retailPrice;
}
