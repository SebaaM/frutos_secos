import {
  categoryLabels,
  type Category,
  type Product,
  type ProductImage,
  type ProductVariant,
} from "../data/products"

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "")

export type CatalogCategory = {
  id: string
  slug: string
  name: string
}

type ApiVariant = {
  id: number
  sku: string
  weight_grams: number
  price: string
  stock_available: number
}

type ApiImage = {
  id: number
  image_url: string
  alt_text: string
  credit: string
  position: number
}

type ApiProduct = {
  id: number
  name: string
  slug: string
  description: string
  ingredients: string
  allergen_info: string
  image_url: string
  is_featured: boolean
  category: { id: number; slug: string; name: string }
  variants: ApiVariant[]
  images: ApiImage[]
}

function toFrontendVariant(variant: ApiVariant): ProductVariant {
  return {
    id: String(variant.id),
    label: `${variant.weight_grams} g`,
    grams: variant.weight_grams,
    price: Number(variant.price),
    stock: variant.stock_available,
  }
}

function toFrontendImage(image: ApiImage): ProductImage {
  return {
    id: String(image.id),
    url: image.image_url,
    alt: image.alt_text,
    credit: image.credit,
    position: image.position,
  }
}

function toFrontendProduct(product: ApiProduct): Product {
  const images = product.images
    .map(toFrontendImage)
    .sort((left, right) => left.position - right.position)
  const cover = images[0]

  return {
    id: String(product.id),
    slug: product.slug,
    category: product.category.slug as Category,
    name: product.name,
    description: product.description,
    image: cover?.url || product.image_url,
    imageAlt: cover?.alt || product.name,
    imageCredit: cover?.credit || "",
    images,
    ingredients: product.ingredients,
    allergens: product.allergen_info,
    storage: "Conservar en un lugar fresco, seco y protegido de la luz.",
    featured: product.is_featured,
    variants: product.variants.map(toFrontendVariant),
  }
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  })
  if (!response.ok) {
    throw new Error(`La API respondió con ${response.status}.`)
  }
  return response.json() as Promise<T>
}

export async function fetchCatalog(): Promise<{
  products: Product[]
  categories: CatalogCategory[]
}> {
  const [products, categories] = await Promise.all([
    getJson<ApiProduct[]>("/catalog/products/"),
    getJson<CatalogCategory[]>("/catalog/categories/"),
  ])

  return {
    products: products.map(toFrontendProduct),
    categories: categories.map((category) => ({
      ...category,
      id: String(category.id),
      name:
        categoryLabels[category.slug as Category] || category.name,
    })),
  }
}
