import { variantStockState, type StockState } from "./stock-status"
import type { VariantDraft } from "../lib/backoffice-api"

const styles: Record<StockState, string> = {
  available: "border-olive/25 bg-cream-soft text-olive-dark",
  low: "border-stock-warning/40 bg-stock-warning-soft text-stock-warning",
  out: "border-terracotta/40 bg-terracotta-soft text-terracotta-dark",
  partial: "border-terracotta/40 bg-terracotta-soft text-terracotta-dark",
  inactive: "border-sand/40 bg-cream text-charcoal/70",
}
const labels: Record<StockState, string> = {
  available: "Disponible",
  low: "Últimas unidades",
  out: "Sin stock",
  partial: "Presentaciones agotadas",
  inactive: "Sin presentaciones activas",
}

export default function StockBadge({
  state,
  label,
}: {
  state: StockState
  label?: string
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold ${styles[state]}`}
    >
      <span aria-hidden="true">
        {state === "out" || state === "partial"
          ? "!"
          : state === "low"
            ? "↓"
            : state === "available"
              ? "✓"
              : "—"}
      </span>
      {label || labels[state]}
    </span>
  )
}

export function VariantStockSummary({ variant }: { variant: VariantDraft }) {
  const state = variantStockState(variant)
  return (
    <div className={`space-y-3 rounded-control border p-4 ${styles[state]}`}>
      <StockBadge
        state={state}
        label={state === "inactive" ? "Presentación inactiva" : undefined}
      />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-xs font-semibold">Disponible</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">
            {variant.stock_available}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold">Reservado</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {variant.stock_reserved}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold">Físico</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {variant.stock_physical}
          </dd>
        </div>
      </dl>
      <p className="text-xs leading-relaxed">
        {state === "out"
          ? variant.stock_reserved > 0
            ? "Sin paquetes disponibles para vender. El stock físico está reservado; revisá las reservas antes de reponer."
            : "Presentación agotada. Reponé stock para volver a vender este peso."
          : state === "low"
            ? "Quedan pocos paquetes disponibles. Conviene planificar la reposición."
            : state === "inactive"
              ? "No está a la venta y no genera alertas de reposición."
              : "Stock en paquetes de esta presentación, no en gramos."}
        {!variant.id && " Stock inicial pendiente de guardar."}
      </p>
    </div>
  )
}
