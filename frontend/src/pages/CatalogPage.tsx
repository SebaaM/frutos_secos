import { ProductCard } from "../components/product"
import { CategoryChip, Eyebrow } from "../components/ui"
import type { Product } from "../data/products"
import type { CatalogCategory } from "../lib/catalog-api"
import type { Navigate } from "../components/layout"

type Filter = "all" | string

export default function CatalogPage({
  navigate,
  search,
  products,
  categories,
  catalogError,
}: {
  navigate: Navigate
  search: string
  products: Product[]
  categories: CatalogCategory[]
  catalogError: string
}) {
  const requested = new URLSearchParams(search).get("categoria")
  const active: Filter =
    requested && categories.some((category) => category.slug === requested)
      ? requested
      : "all"
  const filtered =
    active === "all"
      ? products
      : products.filter((product) => product.category === active)

  const setFilter = (filter: Filter) => {
    navigate(filter === "all" ? "/catalogo" : `/catalogo?categoria=${filter}`)
  }

  return (
    <div className="page-container py-10 md:py-16">
      <div className="mb-9 max-w-2xl">
        <Eyebrow>Nuestra selección</Eyebrow>
        <h1 className="font-display text-5xl font-semibold text-olive-dark md:text-6xl">
          Catálogo
        </h1>
        <p className="mt-4 text-base leading-relaxed text-charcoal/65">
          Elegí por categoría, mirá las presentaciones disponibles y armá tu
          pedido a tu ritmo.
        </p>
      </div>

      <div className="mb-8 border-y border-sand/25 py-5">
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          <CategoryChip
            active={active === "all"}
            onClick={() => setFilter("all")}
          >
            Todos
          </CategoryChip>
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              active={active === category.slug}
              onClick={() => setFilter(category.slug)}
            >
              {category.name}
            </CategoryChip>
          ))}
        </div>
      </div>

      {catalogError ? (
        <p
          role="status"
          className="mb-6 rounded-control bg-terracotta-soft px-4 py-3 text-sm font-semibold text-charcoal/75"
        >
          {catalogError}
        </p>
      ) : null}

      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm font-semibold text-charcoal/65">
          {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
        </p>
        <p className="hidden text-xs text-charcoal/50 sm:block">
          Stock orientativo · Confirmamos por WhatsApp
        </p>
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpen={() => navigate(`/producto/${product.slug}`)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-card bg-cream-soft px-6 py-16 text-center">
          <p className="font-display text-3xl font-semibold text-olive-dark">
            No encontramos productos en esta categoría
          </p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="mt-5 min-h-11 rounded-control bg-olive px-5 text-sm font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            Volver a Todos
          </button>
        </div>
      )}
    </div>
  )
}
