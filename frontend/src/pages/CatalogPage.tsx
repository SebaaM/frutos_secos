import { useEffect, useMemo, useState } from "react"

import type { Navigate } from "../components/layout"
import { ProductCard } from "../components/product"
import { CategoryChip, Eyebrow, Icon } from "../components/ui"
import {
  getProductStock,
  getStartingPrice,
  type Product,
} from "../data/products"
import type { CatalogCategory } from "../lib/catalog-api"

type Filter = "all" | string
type Sort = "featured" | "price" | "availability"

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
  const params = new URLSearchParams(search)
  const requested = params.get("categoria")
  const active: Filter =
    requested && categories.some((category) => category.slug === requested)
      ? requested
      : "all"
  const sort = (params.get("orden") || "featured") as Sort
  const queryFromUrl = params.get("buscar") || ""
  const [query, setQuery] = useState(queryFromUrl)

  useEffect(() => setQuery(queryFromUrl), [queryFromUrl])

  const setParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(search)
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    const queryString = next.toString()
    navigate(`/catalogo${queryString ? `?${queryString}` : ""}`, true)
  }

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es")
    const result = products.filter(
      (product) =>
        (active === "all" || product.category === active) &&
        (!normalizedQuery ||
          product.name.toLocaleLowerCase("es").includes(normalizedQuery)),
    )
    return result.sort((left, right) => {
      if (sort === "price")
        return getStartingPrice(left) - getStartingPrice(right)
      if (sort === "availability")
        return getProductStock(right) - getProductStock(left)
      return (
        Number(right.featured) - Number(left.featured) ||
        left.name.localeCompare(right.name, "es")
      )
    })
  }, [active, products, query, sort])

  const setFilter = (filter: Filter) =>
    setParams({ categoria: filter === "all" ? "" : filter })

  return (
    <div className="page-container py-10 md:py-16">
      <div className="mb-9 max-w-2xl">
        <Eyebrow>Nuestra selección</Eyebrow>
        <h1 className="font-display text-5xl font-semibold text-olive-dark md:text-6xl">
          Catálogo
        </h1>
        <p className="mt-4 text-base leading-relaxed text-charcoal/65">
          Elegí una presentación y armá tu pedido a tu ritmo.
        </p>
      </div>

      <div className="mb-7 grid gap-3 border-y border-sand/25 py-5 md:grid-cols-[1fr_auto]">
        <label className="relative block">
          <span className="sr-only">Buscar producto</span>
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-charcoal/55"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              const value = event.target.value
              setQuery(value)
              setParams({ buscar: value.trim() })
            }}
            placeholder="Buscar producto"
            className="min-h-12 w-full rounded-control border border-sand/45 bg-white py-3 pr-11 pl-12 text-base outline-none transition placeholder:text-sand focus:border-olive focus:ring-3 focus:ring-olive/12"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setParams({ buscar: "" })
              }}
              className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-full text-olive-dark hover:bg-cream-soft focus-visible:outline-3 focus-visible:outline-olive"
              aria-label="Limpiar búsqueda"
            >
              <Icon name="x" className="size-4" />
            </button>
          ) : null}
        </label>
        <label className="flex min-h-12 items-center gap-2 text-sm font-bold text-olive-dark">
          <span className="shrink-0">Ordenar</span>
          <select
            value={sort}
            onChange={(event) =>
              setParams({
                orden:
                  event.target.value === "featured" ? "" : event.target.value,
              })
            }
            className="min-h-12 min-w-0 flex-1 rounded-control border border-sand/45 bg-white px-3 text-sm outline-none focus:border-olive focus:ring-3 focus:ring-olive/12"
          >
            <option value="featured">Destacados</option>
            <option value="price">Menor precio</option>
            <option value="availability">Con más stock</option>
          </select>
        </label>
      </div>

      <div className="mb-8">
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

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-charcoal/65">
          {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
        </p>
        <p className="text-xs text-charcoal/50">
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
            No encontramos productos con esos criterios
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("")
              navigate("/catalogo")
            }}
            className="mt-5 min-h-11 rounded-control bg-olive px-5 text-sm font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            Ver todo el catálogo
          </button>
        </div>
      )}
    </div>
  )
}
