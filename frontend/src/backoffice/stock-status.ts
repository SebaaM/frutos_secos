import type { AdminVariant } from "../lib/backoffice-api"

export const LOW_STOCK_LIMIT = 5
export type StockState = "available" | "low" | "out" | "partial" | "inactive"
type StockVariant = Pick<AdminVariant, "is_active" | "stock_available">

export function variantStockState(variant: StockVariant): StockState {
  if (!variant.is_active) return "inactive"
  if (variant.stock_available <= 0) return "out"
  return variant.stock_available <= LOW_STOCK_LIMIT ? "low" : "available"
}

export function productStock(variants: readonly StockVariant[]) {
  const active = variants.filter((variant) => variant.is_active)
  const out = active.filter(
    (variant) => variantStockState(variant) === "out",
  ).length
  const low = active.filter(
    (variant) => variantStockState(variant) === "low",
  ).length
  const state: StockState = !active.length
    ? "inactive"
    : out === active.length
      ? "out"
      : out > 0
        ? "partial"
        : low > 0
          ? "low"
          : "available"
  return {
    state,
    out,
    low,
    active: active.length,
    available: active.reduce(
      (total, variant) => total + variant.stock_available,
      0,
    ),
    needsAttention: out > 0 || low > 0,
  }
}

export function matchesStockFilter(
  variants: readonly StockVariant[],
  filter: string,
) {
  const stock = productStock(variants)
  switch (filter) {
    case "attention":
      return stock.needsAttention
    case "out":
      return stock.state === "out"
    case "partial":
      return stock.state === "partial"
    case "low":
      return stock.low > 0
    case "available":
      return stock.available > 0
    default:
      return true
  }
}
