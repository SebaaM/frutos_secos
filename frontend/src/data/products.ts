export type Category = "frutos-secos" | "mixes" | "hierbas"

export type ProductVariant = {
  id: string
  label: string
  grams: number
  price: number
  stock: number
}

export type Product = {
  id: string
  slug: string
  category: Category
  name: string
  description: string
  image: string
  imageAlt: string
  imageCredit: string
  ingredients: string
  allergens: string
  storage: string
  featured: boolean
  variants: ProductVariant[]
}

export const LOW_STOCK_THRESHOLD = 5

export const categoryLabels: Record<Category, string> = {
  "frutos-secos": "Frutos secos",
  mixes: "Mixes",
  hierbas: "Hierbas naturales",
}

const images = {
  cashews:
    "https://images.unsplash.com/photo-1573555657105-47a0bb37c3ea?auto=format&fit=crop&w=1200&q=85",
  cashewsRed:
    "https://images.unsplash.com/photo-1729514256038-c489695f4d79?auto=format&fit=crop&w=1200&q=85",
  nutsRed:
    "https://images.unsplash.com/photo-1729796350013-ebb27f079c76?auto=format&fit=crop&w=1200&q=85",
  cashewsLight:
    "https://images.unsplash.com/photo-1686721635333-d71af2f1084b?auto=format&fit=crop&w=1200&q=85",
  almonds:
    "https://images.unsplash.com/photo-1629880301999-7220a3513359?auto=format&fit=crop&w=1200&q=85",
  herbs:
    "https://images.unsplash.com/photo-1516715043227-1cdf27bcd09a?auto=format&fit=crop&w=1200&q=85",
  leaves:
    "https://images.unsplash.com/photo-1566792505656-e82d93abac30?auto=format&fit=crop&w=1200&q=85",
  driedFlowers:
    "https://images.unsplash.com/photo-1740250136478-de138c6b9f41?auto=format&fit=crop&w=1200&q=85",
}

export const products: Product[] = [
  {
    id: "almendras",
    slug: "almendras-naturales",
    category: "frutos-secos",
    name: "Almendras naturales",
    description:
      "Crocantes, suaves y sin agregados. Una opción simple para todos los días.",
    image: images.almonds,
    imageAlt: "Almendras naturales sobre una superficie mate azul claro",
    imageCredit: "Kostas Bosinas · Unsplash",
    ingredients: "Almendras naturales.",
    allergens:
      "Contiene almendras. Puede contener trazas de maní y otros frutos secos.",
    storage: "Conservar en lugar fresco, seco y protegido de la luz.",
    featured: true,
    variants: [
      { id: "100", label: "100 g", grams: 100, price: 2800, stock: 18 },
      { id: "250", label: "250 g", grams: 250, price: 6300, stock: 8 },
      { id: "500", label: "500 g", grams: 500, price: 11800, stock: 3 },
    ],
  },
  {
    id: "castanas",
    slug: "castanas-de-caju",
    category: "frutos-secos",
    name: "Castañas de cajú",
    description:
      "Mantecosas y delicadas, seleccionadas para picadas, granolas o un snack.",
    image: images.cashews,
    imageAlt: "Castañas de cajú naturales en primer plano sobre fondo neutro",
    imageCredit: "Maja Vujic · Unsplash",
    ingredients: "Castañas de cajú.",
    allergens:
      "Contiene castañas de cajú. Puede contener trazas de maní y otros frutos secos.",
    storage: "Mantener el envase cerrado en un ambiente fresco y seco.",
    featured: true,
    variants: [
      { id: "100", label: "100 g", grams: 100, price: 3200, stock: 12 },
      { id: "250", label: "250 g", grams: 250, price: 7200, stock: 4 },
      { id: "500", label: "500 g", grams: 500, price: 13500, stock: 0 },
    ],
  },
  {
    id: "nueces",
    slug: "nueces-mariposa",
    category: "frutos-secos",
    name: "Nueces mariposa",
    description:
      "Mitades enteras, de sabor profundo y textura tierna. Ideales para cocinar.",
    image: images.cashewsLight,
    imageAlt:
      "Frutos secos claros sobre una mesa blanca iluminada naturalmente",
    imageCredit: "Vasanth Kedige · Unsplash",
    ingredients: "Nueces.",
    allergens:
      "Contiene nueces. Puede contener trazas de maní y otros frutos secos.",
    storage: "Conservar bien cerrado. En verano, se recomienda refrigerar.",
    featured: false,
    variants: [
      { id: "100", label: "100 g", grams: 100, price: 3000, stock: 0 },
      { id: "250", label: "250 g", grams: 250, price: 6900, stock: 0 },
    ],
  },
  {
    id: "mix-clasico",
    slug: "mix-clasico",
    category: "mixes",
    name: "Mix clásico",
    description:
      "Una mezcla equilibrada de texturas para tener siempre a mano.",
    image: images.nutsRed,
    imageAlt: "Bowl con una mezcla de frutos secos sobre fondo terracota",
    imageCredit: "Kischmisch · Unsplash",
    ingredients: "Almendras, maní sin sal, pasas de uva y semillas de zapallo.",
    allergens:
      "Contiene almendras y maní. Puede contener trazas de otros frutos secos.",
    storage: "Conservar cerrado, lejos de fuentes de calor y humedad.",
    featured: true,
    variants: [
      { id: "100", label: "100 g", grams: 100, price: 2200, stock: 20 },
      { id: "250", label: "250 g", grams: 250, price: 4900, stock: 10 },
      { id: "500", label: "500 g", grams: 500, price: 9200, stock: 5 },
    ],
  },
  {
    id: "mix-energia",
    slug: "mix-energia",
    category: "mixes",
    name: "Mix energía",
    description:
      "Frutos secos y frutas para acompañar caminatas, trabajo o estudio.",
    image: images.cashewsRed,
    imageAlt: "Bolsa de frutos secos sobre un fondo rojo mate",
    imageCredit: "Kischmisch · Unsplash",
    ingredients: "Castañas de cajú, maní, pasas rubias y arándanos.",
    allergens:
      "Contiene castañas de cajú y maní. Puede contener trazas de otros frutos secos.",
    storage:
      "Guardar en lugar fresco y consumir dentro de los 30 días de abierto.",
    featured: false,
    variants: [
      { id: "100", label: "100 g", grams: 100, price: 2500, stock: 9 },
      { id: "250", label: "250 g", grams: 250, price: 5600, stock: 2 },
    ],
  },
  {
    id: "manzanilla",
    slug: "manzanilla-en-flores",
    category: "hierbas",
    name: "Manzanilla en flores",
    description:
      "Flores secas aromáticas, suaves y livianas para preparar en infusión.",
    image: images.driedFlowers,
    imageAlt: "Bowl de flores y hojas secas para infusión sobre fondo claro",
    imageCredit: "Pavel Avakumov · Unsplash",
    ingredients: "Flores secas de manzanilla.",
    allergens:
      "Envasado en un ambiente donde también se manipulan frutos secos y maní.",
    storage: "Conservar herméticamente cerrada y protegida de la humedad.",
    featured: true,
    variants: [
      { id: "50", label: "50 g", grams: 50, price: 1800, stock: 15 },
      { id: "100", label: "100 g", grams: 100, price: 3300, stock: 6 },
    ],
  },
  {
    id: "cedron",
    slug: "cedron-natural",
    category: "hierbas",
    name: "Cedrón natural",
    description:
      "Hojas seleccionadas con un perfume cítrico fresco y reconfortante.",
    image: images.leaves,
    imageAlt: "Hojas verdes y violetas en luz natural suave",
    imageCredit: "Anne Nygård · Unsplash",
    ingredients: "Hojas secas de cedrón.",
    allergens:
      "Envasado en un ambiente donde también se manipulan frutos secos y maní.",
    storage: "Guardar en envase cerrado, en un lugar oscuro y seco.",
    featured: false,
    variants: [
      { id: "50", label: "50 g", grams: 50, price: 1700, stock: 4 },
      { id: "100", label: "100 g", grams: 100, price: 3100, stock: 0 },
    ],
  },
  {
    id: "chai",
    slug: "blend-chai",
    category: "hierbas",
    name: "Blend chai",
    description:
      "Una mezcla especiada y fragante para infusionar con agua o leche.",
    image: images.herbs,
    imageAlt: "Especias molidas para infusión en un cuenco de madera",
    imageCredit: "Nathan Dumlao · Unsplash",
    ingredients: "Canela, jengibre, cardamomo, clavo de olor y té negro.",
    allergens:
      "Envasado en un ambiente donde también se manipulan frutos secos y maní.",
    storage: "Conservar cerrado para proteger su aroma.",
    featured: false,
    variants: [
      { id: "50", label: "50 g", grams: 50, price: 2100, stock: 11 },
      { id: "100", label: "100 g", grams: 100, price: 3900, stock: 7 },
    ],
  },
]

export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value)
}

export function getProductStock(product: Product) {
  return product.variants.reduce((total, variant) => total + variant.stock, 0)
}

export function getStockState(stock: number) {
  if (stock <= 0) return "out" as const
  if (stock <= LOW_STOCK_THRESHOLD) return "low" as const
  return "available" as const
}

export function getStartingPrice(product: Product) {
  const available = product.variants.filter((variant) => variant.stock > 0)
  const variants = available.length ? available : product.variants
  return Math.min(...variants.map((variant) => variant.price))
}
