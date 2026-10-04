import { apiRequest, jsonRequest } from "./api"

export type AdminCategory = {
  id: number
  name: string
  slug: string
  is_active: boolean
}
export type AdminVariant = {
  id: number
  sku: string
  weight_grams: number
  price: string
  is_active: boolean
  stock_physical: number
  stock_reserved: number
  stock_available: number
}
export type AdminImage = {
  id: number
  image_url: string
  alt_text: string
  credit: string
  position: number
}
export type ImageMetadata = {
  alt_text: string
  credit: string
}
export type AdminProduct = {
  id: number
  name: string
  slug: string
  category: number
  description: string
  ingredients: string
  allergen_info: string
  storage_instructions: string
  is_published: boolean
  is_featured: boolean
  variants: AdminVariant[]
  images: AdminImage[]
  updated_at: string
}
export type VariantDraft = Omit<AdminVariant, "id"> & { id?: number }
export type ProductDraft = Omit<AdminProduct, "id" | "images" | "updated_at" | "variants"> & {
  variants: VariantDraft[]
}
export type StockMovement = {
  id: number
  delta: number
  previous_stock: number
  resulting_stock: number
  reason: string
  created_at: string
}
export type PendingImage = {
  key: string
  file?: File
  image_url: string
  alt_text: string
  credit: string
}

const base = "/backoffice"
export const listProducts = () =>
  apiRequest<AdminProduct[]>(`${base}/products/`)
export const listCategories = () =>
  apiRequest<AdminCategory[]>(`${base}/categories/`)
export const getProduct = (id: number) =>
  apiRequest<AdminProduct>(`${base}/products/${id}/`)

export const setProductPublication = (id: number, is_published: boolean) =>
  apiRequest<AdminProduct>(
    `${base}/products/${id}/`,
    jsonRequest("PATCH", { is_published }),
  )

export function saveProduct(id: number | undefined, draft: ProductDraft) {
  const variants = draft.variants.map((variant) => ({
    ...(variant.id
      ? { id: variant.id }
      : { stock_physical: variant.stock_physical }),
    sku: variant.sku,
    weight_grams: variant.weight_grams,
    price: variant.price,
    is_active: variant.is_active,
  }))
  return apiRequest<AdminProduct>(
    `${base}/products/${id ? `${id}/` : ""}`,
    jsonRequest(id ? "PATCH" : "POST", { ...draft, variants }),
  )
}

export function saveCategory(
  id: number | undefined,
  data: Omit<AdminCategory, "id">,
) {
  return apiRequest<AdminCategory>(
    `${base}/categories/${id ? `${id}/` : ""}`,
    jsonRequest(id ? "PATCH" : "POST", data),
  )
}

export function uploadImage(id: number, image: PendingImage) {
  const form = new FormData()
  if (image.file) form.append("image", image.file)
  else form.append("image_url", image.image_url)
  form.append("alt_text", image.alt_text)
  form.append("credit", image.credit)
  return apiRequest<AdminImage>(`${base}/products/${id}/images/`, {
    method: "POST",
    body: form,
  })
}
export const editImage = (id: number, data: ImageMetadata) =>
  apiRequest<AdminImage>(`${base}/images/${id}/`, jsonRequest("PATCH", data))
export const deleteImage = (id: number) =>
  apiRequest<void>(`${base}/images/${id}/`, { method: "DELETE" })
export const reorderImages = (id: number, ids: number[]) =>
  apiRequest<AdminImage[]>(
    `${base}/products/${id}/reorder-images/`,
    jsonRequest("POST", { ids }),
  )
export const adjustStock = (
  id: number,
  delta: number,
  reason: string,
  expected_stock: number,
) =>
  apiRequest<AdminVariant>(
    `${base}/variants/${id}/adjust-stock/`,
    jsonRequest("POST", { delta, reason, expected_stock }),
  )
export const getMovements = (id: number) =>
  apiRequest<StockMovement[]>(`${base}/variants/${id}/movements/`)

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
