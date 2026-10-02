import { ProductCard } from "../components/product"
import { CategoryChip, Eyebrow } from "../components/ui"
import { categoryLabels, products, type Category } from "../data/products"
import type { Navigate } from "../components/layout"

type Filter = "all" | Category

export default function CatalogPage({
  navigate,
  search,
}: {
  navigate: Navigate
  search: string
}) {
  const requested = new URLSearchParams(search).get("categoria")
  const active: Filter =
    requested && Object.keys(categoryLabels).includes(requested)
      ? requested as Category
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
          {(Object.keys(categoryLabels) as Category[]).map((category) => (
            <CategoryChip
              key={category}
              active={active === category}
              onClick={() => setFilter(category)}
            >
              {categoryLabels[category]}
            </CategoryChip>
          ))}
        </div>
      </div>

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
