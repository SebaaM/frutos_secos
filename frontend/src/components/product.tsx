import {
  categoryLabels,
  formatPrice,
  getProductStock,
  getStartingPrice,
  getStockState,
  type Product,
  type ProductVariant,
} from "../data/products"

import { Button, Icon, StockBadge } from "./ui"

export function ProductCard({
  product,

  onOpen,
}: {
  product: Product

  onOpen: () => void
}) {
  const totalStock = getProductStock(product)

  const stockState = getStockState(totalStock)

  const firstAvailable = product.variants.find((variant) => variant.stock > 0)

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-card bg-white shadow-card ring-1 ring-sand/15 transition hover:-translate-y-1 hover:shadow-card-hover">
      <button
        type="button"
        onClick={onOpen}
        className="relative aspect-square overflow-hidden text-left focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-olive"
        aria-label={`Ver ${product.name}`}
      >
        <img
          src={product.image}
          alt={product.imageAlt}
          loading="lazy"
          decoding="async"
          className={`size-full object-cover transition duration-500 group-hover:scale-[1.03] ${
            stockState === "out" ? "grayscale-[35%]" : ""
          }`}
        />
        <span className="absolute top-3 left-3">
          <StockBadge state={stockState} compact />
        </span>
      </button>
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <p className="mb-1 text-[11px] font-bold tracking-[0.12em] text-terracotta uppercase">
          {product.categoryName ||
            categoryLabels[product.category] ||
            product.category}
        </p>
        <h3 className="font-display text-xl leading-tight font-semibold text-olive-dark">
          {product.name}
        </h3>
        <p className="mt-2 text-xs text-charcoal/60">
          {firstAvailable
            ? `Presentaciones desde ${firstAvailable.label}`
            : "Sin presentaciones disponibles"}
        </p>
        <p className="mt-3 mb-4 text-sm font-bold text-charcoal">
          Desde{" "}
          <span className="text-lg text-terracotta-dark">
            {formatPrice(getStartingPrice(product))}
          </span>
        </p>
        <Button
          variant={stockState === "out" ? "secondary" : "secondary"}
          onClick={onOpen}
          className="mt-auto w-full"
        >
          {stockState === "out" ? "Ver producto" : "Ver producto"}
          <Icon name="arrow" className="size-4" />
        </Button>
      </div>
    </article>
  )
}

export function WeightSelector({
  variants,

  selectedId,

  onSelect,
}: {
  variants: ProductVariant[]

  selectedId: string

  onSelect: (variant: ProductVariant) => void
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold text-olive-dark">
        Elegí una presentación
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {variants.map((variant) => {
          const active = variant.id === selectedId

          const disabled = variant.stock <= 0

          return (
            <button
              type="button"
              key={variant.id}
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onSelect(variant)}
              className={`min-h-16 rounded-control border p-2 text-center transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:cursor-not-allowed disabled:opacity-45 ${
                active
                  ? "border-olive bg-olive text-white shadow-sm"
                  : "border-sand/45 bg-white text-charcoal hover:border-olive"
              }`}
            >
              <span className="block text-sm font-bold">{variant.label}</span>
              <span
                className={`mt-0.5 block text-xs ${
                  active ? "text-white/80" : "text-charcoal/60"
                }`}
              >
                {disabled ? "Agotado" : formatPrice(variant.price)}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function QuantityStepper({
  value,

  min = 1,

  max,

  onChange,

  compact = false,
}: {
  value: number

  min?: number

  max: number

  onChange: (value: number) => void

  compact?: boolean
}) {
  return (
    <div
      className={`inline-flex items-center rounded-control border border-sand/45 bg-white ${
        compact ? "" : "p-1"
      }`}
    >
      <button
        type="button"
        aria-label="Restar una unidad"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="grid size-11 place-items-center rounded-lg text-olive-dark transition hover:bg-cream-soft focus-visible:outline-3 focus-visible:outline-olive disabled:opacity-30"
      >
        <Icon name="minus" className="size-4" />
      </button>
      <span
        className="min-w-10 text-center text-sm font-bold"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Sumar una unidad"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="grid size-11 place-items-center rounded-lg text-olive-dark transition hover:bg-cream-soft focus-visible:outline-3 focus-visible:outline-olive disabled:opacity-30"
      >
        <Icon name="plus" className="size-4" />
      </button>
    </div>
  )
}
