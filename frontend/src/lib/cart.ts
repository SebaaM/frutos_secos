import type { Product, ProductVariant } from "../data/products"

export type CartLine = {
  productId: string
  variantId: string
  quantity: number
  priceAtAdd: number
}

export type ResolvedCartLine = CartLine & {
  product: Product
  variant: ProductVariant
  subtotal: number
  priceChanged: boolean
  unavailable: boolean
  quantityUnavailable: boolean
}

export type CheckoutDraft = {
  delivery: "retiro_local" | "entrega_local"
  name: string
  phone: string
  email: string
  address: string
  addressHelp: string
  additionalContact: string
}

export const emptyCheckoutDraft: CheckoutDraft = {
  delivery: "retiro_local",
  name: "",
  phone: "",
  email: "",
  address: "",
  addressHelp: "",
  additionalContact: "",
}

export function cartLineNeedsReview(line: ResolvedCartLine) {
  return line.unavailable || line.quantityUnavailable || line.priceChanged
}
