import { useMemo, useState } from "react"

import type { AdminProduct, AdminVariant } from "../lib/backoffice-api"

import StockBadge from "./StockBadge"
import StockPanel from "./StockPanel"
import { Check, actionClass, inputClass, Notice, primaryClass } from "./controls"
import {
  matchesInventoryFilter,
  type InventoryFilter,
  variantStockState,
} from "./stock-status"

const filters: { value: InventoryFilter; label: string }[] = [
  { value: "attention", label: "Para atender" },
  { value: "out", label: "Agotadas" },
  { value: "low", label: "Últimas unidades" },
  { value: "all", label: "Todo" },
]

type SelectedVariant = { product: AdminProduct; variant: AdminVariant }

export default function InventoryPage({
  products,
  onUpdated,
  onEdit,
  onRefresh,
  onTogglePublication,
  publicationBusyId,
}: {
  products: AdminProduct[]
  onUpdated: (variant: AdminVariant) => void
  onEdit: (product: AdminProduct) => void
  onRefresh: () => void
  onTogglePublication: (product: AdminProduct) => Promise<void>
  publicationBusyId: number | null
}) {
  const [filter, setFilter] = useState<InventoryFilter>("attention")
  const [query, setQuery] = useState("")
  const [includeDrafts, setIncludeDrafts] = useState(false)
  const [selected, setSelected] = useState<SelectedVariant | null>(null)
  const [error, setError] = useState("")

  const normalizedQuery = query.trim().toLocaleLowerCase("es")
  const visibleProducts = useMemo(
    () =>
      products
        .filter((product) => includeDrafts || product.is_published)
        .map((product) => ({
          product,
          variants: product.variants.filter(
            (variant) =>
              matchesInventoryFilter(variant, filter) &&
              (!normalizedQuery ||
                product.name.toLocaleLowerCase("es").includes(normalizedQuery) ||
                variant.sku.toLocaleLowerCase("es").includes(normalizedQuery)),
          ),
        }))
        .filter(({ variants }) => variants.length),
    [filter, includeDrafts, normalizedQuery, products],
  )

  const counts = useMemo(
    () =>
      Object.fromEntries(
        filters.map(({ value }) => [
          value,
          products
            .filter((product) => includeDrafts || product.is_published)
            .reduce(
              (total, product) =>
                total +
                product.variants.filter((variant) =>
                  matchesInventoryFilter(variant, value),
                ).length,
              0,
            ),
        ]),
      ) as Record<InventoryFilter, number>,
    [includeDrafts, products],
  )

  async function togglePublication(product: AdminProduct) {
    setError("")
    if (
      product.is_published &&
      !window.confirm(
        `¿Ocultar ${product.name}? No se venderá en pedidos nuevos; los pedidos existentes no cambian.`,
      )
    )
      return

    try {
      await onTogglePublication(product)
    } catch (toggleError) {
      setError((toggleError as Error).message)
    }
  }

  function stockAdjusted(variant: AdminVariant) {
    onUpdated(variant)
    setSelected((current) =>
      current && current.variant.id === variant.id
        ? { ...current, variant }
        : current,
    )
  }

  const visibleVariantCount = visibleProducts.reduce(
    (total, item) => total + item.variants.length,
    0,
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-olive-dark">
            Inventario
          </h1>
          <p className="mt-1 text-sm text-charcoal/65">
            Reponé o corregí cada presentación sin entrar al editor completo.
          </p>
        </div>
        <button className={actionClass} onClick={onRefresh}>
          Actualizar
        </button>
      </div>

      <section
        className="space-y-4 rounded-card border border-sand/30 bg-white p-4"
        aria-label="Filtros de inventario"
      >
        <div className="flex flex-wrap gap-2">
          {filters.map(({ value, label }) => (
            <button
              key={value}
              className={filter === value ? primaryClass : actionClass}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
            >
              {label} ({counts[value]})
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-sm font-semibold text-olive-dark">
            <span className="mb-2 block">Buscar nombre o SKU</span>
            <input
              type="search"
              className={inputClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Almendras, MENTA-50…"
            />
          </label>
          <Check
            label="Incluir borradores"
            checked={includeDrafts}
            onChange={setIncludeDrafts}
          />
        </div>
      </section>

      <Notice error message={error} />
      {selected && (
        <StockPanel
          variant={selected.variant}
          onClose={() => setSelected(null)}
          onAdjusted={stockAdjusted}
        />
      )}

      <p className="text-sm text-charcoal/65" role="status">
        {visibleVariantCount} {visibleVariantCount === 1 ? "presentación" : "presentaciones"}
      </p>
      <div className="space-y-4">
        {visibleProducts.map(({ product, variants }) => (
          <article
            key={product.id}
            className="rounded-card border border-sand/30 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sand/25 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                {product.images[0] ? (
                  <img
                    className="size-14 shrink-0 rounded-control bg-cream-soft object-cover"
                    src={product.images[0].image_url}
                    alt={product.images[0].alt_text}
                  />
                ) : (
                  <div className="grid size-14 shrink-0 place-items-center rounded-control bg-cream-soft text-center text-xs">
                    Sin imagen
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="break-words font-display text-xl font-semibold text-olive-dark">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-xs text-charcoal/65">
                    {product.is_published ? "Visible en la tienda" : "Oculto (borrador)"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className={actionClass}
                  onClick={() => void togglePublication(product)}
                  disabled={publicationBusyId === product.id}
                >
                  {publicationBusyId === product.id
                    ? "Guardando…"
                    : product.is_published
                      ? "Ocultar producto"
                      : "Publicar producto"}
                </button>
                <button className={actionClass} onClick={() => onEdit(product)}>
                  Editar producto
                </button>
              </div>
            </div>
            <div className="divide-y divide-sand/25">
              {variants.map((variant) => {
                const state = variantStockState(variant)
                return (
                  <div
                    key={variant.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-bold text-olive-dark">
                        {variant.weight_grams} g
                        <span className="ml-2 text-sm font-normal text-charcoal/65">
                          {variant.sku}
                        </span>
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <StockBadge state={state} />
                        <span className="text-sm text-charcoal/65">
                          Reservado: {variant.stock_reserved} · Físico: {variant.stock_physical}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-right">
                        <strong className="block text-2xl tabular-nums text-olive-dark">
                          {variant.stock_available}
                        </strong>
                        <span className="text-xs text-charcoal/65">disponibles</span>
                      </p>
                      <button
                        className={primaryClass}
                        onClick={() => setSelected({ product, variant })}
                      >
                        Ajustar stock
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </article>
        ))}
      </div>
      {!visibleProducts.length && (
        <div className="rounded-card bg-white p-8 text-center">
          <p>
            {filter === "attention"
              ? "No hay presentaciones publicadas que requieran reposición."
              : "No hay presentaciones para estos filtros."}
          </p>
          {(query || includeDrafts || filter !== "attention") && (
            <button
              className={`${actionClass} mt-4`}
              onClick={() => {
                setFilter("attention")
                setQuery("")
                setIncludeDrafts(false)
              }}
            >
              Restablecer filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}
