import assert from "node:assert/strict"
import test from "node:test"
import {
  matchesInventoryFilter,
  matchesStockFilter,
  productStock,
  variantStockState,
} from "../src/backoffice/stock-status.ts"

const variant = (available, active = true) => ({
  stock_available: available,
  is_active: active,
})

test("availability boundaries are 0, 1–5 and 6+ packages", () => {
  for (const [units, expected] of [
    [0, "out"],
    [1, "low"],
    [5, "low"],
    [6, "available"],
  ]) {
    assert.equal(variantStockState(variant(units)), expected)
  }
})

test("use API availability, not physical stock, when all units are reserved", () => {
  const reserved = { ...variant(0), stock_physical: 12, stock_reserved: 12 }
  assert.equal(variantStockState(reserved), "out")
  assert.equal(productStock([reserved]).available, 0)
})

test("inactive and missing variants never create false restocking alerts", () => {
  for (const variants of [[], [variant(0, false)], [variant(3, false)]]) {
    assert.equal(productStock(variants).state, "inactive")
    assert.equal(productStock(variants).needsAttention, false)
    assert.equal(matchesStockFilter(variants, "out"), false)
    assert.equal(matchesStockFilter(variants, "attention"), false)
  }
})

test("all active presentations exhausted means whole product out of stock", () => {
  const variants = [variant(0), variant(0), variant(20, false)]
  assert.equal(productStock(variants).state, "out")
  assert.equal(productStock(variants).out, 2)
  assert.equal(matchesStockFilter(variants, "out"), true)
  assert.equal(matchesStockFilter(variants, "partial"), false)
})

test("available total must not hide an exhausted presentation", () => {
  const variants = [variant(0), variant(30)]
  assert.equal(productStock(variants).state, "partial")
  assert.equal(productStock(variants).available, 30)
  assert.equal(matchesStockFilter(variants, "attention"), true)
  assert.equal(matchesStockFilter(variants, "partial"), true)
  assert.equal(matchesStockFilter(variants, "out"), false)
})

test("low stock is per presentation, not combined stock", () => {
  const variants = [variant(5), variant(50), variant(0, false)]
  assert.equal(productStock(variants).state, "low")
  assert.equal(productStock(variants).low, 1)
  assert.equal(productStock(variants).out, 0)
  assert.equal(matchesStockFilter(variants, "low"), true)
})

test("mixed low and exhausted presentations remain visible in both relevant filters", () => {
  const variants = [variant(0), variant(2), variant(8)]
  const stock = productStock(variants)
  assert.equal(stock.state, "partial")
  assert.equal(stock.out, 1)
  assert.equal(stock.low, 1)
  assert.equal(matchesStockFilter(variants, "partial"), true)
  assert.equal(matchesStockFilter(variants, "low"), true)
  assert.equal(matchesStockFilter(variants, "available"), true)
})

test("healthy stock has no restocking alert and clearing filter restores all products", () => {
  const variants = [variant(6), variant(10)]
  assert.equal(productStock(variants).state, "available")
  assert.equal(productStock(variants).needsAttention, false)
  assert.equal(matchesStockFilter(variants, "available"), true)
  assert.equal(matchesStockFilter(variants, "attention"), false)
  assert.equal(matchesStockFilter([], ""), true)
})

test("inventory works per active presentation and prioritizes only low or exhausted stock", () => {
  assert.equal(matchesInventoryFilter(variant(0), "attention"), true)
  assert.equal(matchesInventoryFilter(variant(5), "attention"), true)
  assert.equal(matchesInventoryFilter(variant(6), "attention"), false)
  assert.equal(matchesInventoryFilter(variant(0), "out"), true)
  assert.equal(matchesInventoryFilter(variant(5), "low"), true)
  assert.equal(matchesInventoryFilter(variant(6), "all"), true)
  assert.equal(matchesInventoryFilter(variant(0, false), "all"), false)
})
