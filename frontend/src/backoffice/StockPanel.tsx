import { useEffect, useState, type FormEvent } from "react"
import {
  adjustStock,
  getMovements,
  type AdminVariant,
  type StockMovement,
} from "../lib/backoffice-api"
import {
  actionClass,
  Field,
  inputClass,
  Notice,
  primaryClass,
} from "./controls"

export default function StockPanel({
  variant,
  onClose,
  onAdjusted,
}: {
  variant: AdminVariant
  onClose: () => void
  onAdjusted: (variant: AdminVariant) => void
}) {
  const [delta, setDelta] = useState("")
  const [reason, setReason] = useState("")
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getMovements(variant.id)
      .then((value) => {
        if (!cancelled) setMovements(value)
      })
      .catch((error) => {
        if (!cancelled) setError(error.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [variant.id, variant.stock_physical])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const updated = await adjustStock(
        variant.id,
        Number(delta),
        reason.trim(),
        variant.stock_physical,
      )
      onAdjusted(updated)
      setDelta("")
      setReason("")
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="rounded-card border-2 border-olive bg-cream p-5"
      aria-label={`Stock de ${variant.sku}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl font-semibold">
          Ajustar stock · {variant.sku}
        </h3>
        <button
          type="button"
          className={actionClass}
          onClick={onClose}
          disabled={busy}
        >
          Cerrar
        </button>
      </div>
      <p className="mb-4 text-sm">
        Físico: <strong>{variant.stock_physical}</strong> · Reservado:{" "}
        <strong>{variant.stock_reserved}</strong> · Disponible:{" "}
        <strong>{variant.stock_available}</strong>
      </p>
      <Notice error message={error} />
      <form onSubmit={submit} className="my-4 grid gap-4 sm:grid-cols-2">
        <Field
          label="Unidades a agregar o quitar"
          hint="Ej.: 10 para reposición; -2 para merma. Son paquetes, no gramos."
        >
          <input
            className={inputClass}
            required
            type="number"
            step="1"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            disabled={busy}
          />
        </Field>
        <Field label="Motivo del ajuste">
          <input
            className={inputClass}
            required
            maxLength={255}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
            placeholder="Reposición, merma, corrección de conteo…"
          />
        </Field>
        <button
          className={primaryClass}
          disabled={busy || !delta || Number(delta) === 0}
        >
          {busy ? "Registrando…" : "Registrar ajuste"}
        </button>
      </form>
      <h4 className="mb-2 text-sm font-bold">
        Últimos movimientos (hasta 100)
      </h4>
      {loading ? (
        <p role="status">Cargando movimientos…</p>
      ) : !movements.length ? (
        <p className="text-sm text-charcoal/65">
          Todavía no hay ajustes registrados. El stock previo se conserva.
        </p>
      ) : (
        <ul className="space-y-2">
          {movements.map((item) => (
            <li key={item.id} className="rounded-control bg-white p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>
                  {item.delta > 0 ? "+" : ""}
                  {item.delta} · {item.reason}
                </strong>
                <span>
                  {item.previous_stock} → {item.resulting_stock}
                </span>
              </div>
              <time className="text-xs text-charcoal/65">
                {new Date(item.created_at).toLocaleString("es-AR")}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
