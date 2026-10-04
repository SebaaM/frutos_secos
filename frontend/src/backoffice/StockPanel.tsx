import { useEffect, useRef, useState, type FormEvent } from "react"

import { ApiError } from "../lib/api"
import {
  adjustStock,
  getMovements,
  type AdminVariant,
  type StockMovement,
} from "../lib/backoffice-api"

import { VariantStockSummary } from "./StockBadge"
import {
  actionClass,
  Field,
  inputClass,
  Notice,
  primaryClass,
} from "./controls"

const adjustmentReasons = ["Reposición", "Corrección de conteo", "Merma"]

export default function StockPanel({
  variant,
  onClose,
  onAdjusted,
}: {
  variant: AdminVariant
  onClose: () => void
  onAdjusted: (variant: AdminVariant) => void
}) {
  const [physical, setPhysical] = useState(String(variant.stock_physical))
  const [reason, setReason] = useState(adjustmentReasons[0])
  const [note, setNote] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const panelRef = useRef<HTMLElement>(null)

  const nextPhysical = Number(physical)
  const validPhysical =
    Number.isInteger(nextPhysical) && nextPhysical >= variant.stock_reserved
  const delta = validPhysical ? nextPhysical - variant.stock_physical : 0
  const nextAvailable = validPhysical
    ? nextPhysical - variant.stock_reserved
    : null

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true })
    panelRef.current?.scrollIntoView({ block: "start" })
    setPhysical(String(variant.stock_physical))
    setReason(adjustmentReasons[0])
    setNote("")
    setError("")
    setShowHistory(false)
  }, [variant.id])

  useEffect(() => {
    if (!showHistory) return

    let cancelled = false
    setLoadingHistory(true)
    void getMovements(variant.id)
      .then((value) => {
        if (!cancelled) setMovements(value)
      })
      .catch((historyError) => {
        if (!cancelled) setError(historyError.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false)
      })

    return () => {
      cancelled = true
    }
  }, [showHistory, variant.id, variant.stock_physical])

  function addPackages(amount: number) {
    const current = Number.isInteger(nextPhysical)
      ? nextPhysical
      : variant.stock_physical
    setPhysical(String(current + amount))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!validPhysical || delta === 0) return

    setBusy(true)
    setError("")
    try {
      const updated = await adjustStock(
        variant.id,
        delta,
        note.trim() ? `${reason}: ${note.trim()}` : reason,
        variant.stock_physical,
      )
      onAdjusted(updated)
      setPhysical(String(updated.stock_physical))
      setNote("")
    } catch (adjustmentError) {
      setError(
        adjustmentError instanceof ApiError && adjustmentError.status === 409
          ? "El stock cambió desde que abriste este ajuste. Actualizá la lista y revisá el conteo antes de confirmar."
          : (adjustmentError as Error).message,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      className="rounded-card border-2 border-olive bg-cream p-5"
      aria-label={`Ajustar stock de ${variant.sku}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold">
            Ajustar stock · {variant.sku}
          </h3>
          <p className="mt-1 text-sm text-charcoal/65">
            Indicá el conteo físico final. El disponible se calcula solo.
          </p>
        </div>
        <button
          type="button"
          className={actionClass}
          onClick={onClose}
          disabled={busy}
        >
          Cerrar
        </button>
      </div>
      <VariantStockSummary variant={variant} />
      <Notice error message={error} />
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          label="Conteo físico final"
          hint={`Mínimo ${variant.stock_reserved}: hay paquetes reservados que no se pueden quitar.`}
        >
          <input
            className={inputClass}
            required
            min={variant.stock_reserved}
            type="number"
            step="1"
            inputMode="numeric"
            value={physical}
            onChange={(event) => setPhysical(event.target.value)}
            disabled={busy}
          />
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-olive-dark">
            Cambio que se registrará
          </p>
          <p className="rounded-control border border-sand/40 bg-white p-3 text-sm">
            {validPhysical ? (
              <>
                <strong className="tabular-nums">
                  {delta > 0 ? "+" : ""}
                  {delta} paquetes
                </strong>
                {nextAvailable !== null && (
                  <span className="text-charcoal/65">
                    {" "}· quedan {nextAvailable} disponibles
                  </span>
                )}
              </>
            ) : (
              "Ingresá un número entero igual o mayor al reservado."
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={actionClass}
              onClick={() => addPackages(1)}
              disabled={busy}
            >
              +1 paquete
            </button>
            <button
              type="button"
              className={actionClass}
              onClick={() => addPackages(5)}
              disabled={busy}
            >
              +5 paquetes
            </button>
          </div>
        </div>
        <Field label="Motivo">
          <select
            className={inputClass}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
          >
            {adjustmentReasons.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Nota (opcional)">
          <input
            className={inputClass}
            maxLength={220}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={busy}
            placeholder="Ej.: ingreso de proveedor"
          />
        </Field>
        <button
          className={primaryClass}
          disabled={busy || !validPhysical || delta === 0}
        >
          {busy ? "Registrando…" : "Confirmar conteo"}
        </button>
      </form>
      <div className="mt-5 border-t border-sand/30 pt-4">
        <button
          type="button"
          className={actionClass}
          onClick={() => setShowHistory((current) => !current)}
          aria-expanded={showHistory}
        >
          {showHistory ? "Ocultar historial" : "Ver historial"}
        </button>
        {showHistory && (
          <div className="mt-3">
            <h4 className="mb-2 text-sm font-bold">
              Últimos movimientos (hasta 100)
            </h4>
            {loadingHistory ? (
              <p role="status">Cargando movimientos…</p>
            ) : !movements.length ? (
              <p className="text-sm text-charcoal/65">
                Todavía no hay ajustes registrados. El stock previo se
                conserva.
              </p>
            ) : (
              <ul className="space-y-2">
                {movements.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-control bg-white p-3 text-sm"
                  >
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
          </div>
        )}
      </div>
    </section>
  )
}
