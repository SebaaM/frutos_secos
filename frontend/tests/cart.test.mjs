import assert from "node:assert/strict"
import test from "node:test"

import { cartLineNeedsReview } from "../src/lib/cart.ts"

test("el carrito exige revisión por precio o disponibilidad cambiados", () => {
  const base = {
    unavailable: false,
    quantityUnavailable: false,
    priceChanged: false,
  }
  assert.equal(cartLineNeedsReview(base), false)
  assert.equal(cartLineNeedsReview({ ...base, priceChanged: true }), true)
  assert.equal(cartLineNeedsReview({ ...base, quantityUnavailable: true }), true)
  assert.equal(cartLineNeedsReview({ ...base, unavailable: true }), true)
})
