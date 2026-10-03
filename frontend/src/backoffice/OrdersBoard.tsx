import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { formatPrice } from "../data/products"
import { ApiError } from "../lib/api"
import {
  listAdminOrders,
  saveOrderNote,
  transitionOrder,
  type AdminOrder,
  type OrderStatus,
} from "../lib/order-api"
import {
  boardColumns,
  nextStatuses,
  orderDate,
  statusLabels,
} from "../lib/order-status"
import {
  actionClass,
  Field,
  inputClass,
  Notice,
  primaryClass,
} from "./controls"

export default function OrdersBoard({
  onDirty,
  onBusy,
}: {
  onDirty: (dirty: boolean) => void
  onBusy: (busy: boolean) => void
}) {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [delivery, setDelivery] = useState("")
  const [column, setColumn] = useState<string>("confirmar")
  const [selected, setSelected] = useState<AdminOrder | null>(null)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [moreColumns, setMoreColumns] = useState<string[]>([])
  const sequence = useRef(0)

  const reload = useCallback(async () => {
    const current = ++sequence.current
    setLoading(true)
    setError("")
    try {
      const results = await Promise.all(
        boardColumns.map((item) =>
          listAdminOrders(1, query, "", delivery, item.id),
        ),
      )
      if (current !== sequence.current) return
      setOrders(
        results
          .flatMap((result) => result.results)
          .sort((a, b) => a.created_at.localeCompare(b.created_at)),
      )
      setCount(results.reduce((total, result) => total + result.count, 0))
      setPage(1)
      setMoreColumns(
        boardColumns
          .filter((_, index) => results[index].next)
          .map((item) => item.id),
      )
    } catch (error) {
      if (current === sequence.current) setError((error as Error).message)
    } finally {
      if (current === sequence.current) setLoading(false)
    }
  }, [query, delivery])
  useEffect(() => {
    void reload()
    return () => {
      sequence.current++
    }
  }, [reload])

  if (selected)
    return (
      <OrderDetail
        key={selected.id}
        order={selected}
        onDirty={onDirty}
        onBusy={onBusy}
        onClose={() => {
          setSelected(null)
          void reload()
        }}
        onSaved={(order) => {
          setSelected(order)
          setOrders((current) =>
            current.map((item) => (item.id === order.id ? order : item)),
          )
        }}
      />
    )

  return (
    <section className="min-w-0 space-y-5" aria-labelledby="orders-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            id="orders-heading"
            className="font-display text-3xl font-semibold text-olive-dark"
          >
            Gestión de pedidos
          </h1>
          <p className="mt-2 text-sm text-charcoal/65">
            Más antiguos primero. Próximos incluye reservas y preparación, sin
            agenda.
          </p>
        </div>
        <button
          className={actionClass}
          disabled={loading}
          onClick={() => void reload()}
        >
          Actualizar tablero
        </button>
      </div>
      <details className="rounded-control border border-sand/30 bg-white">
        <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold text-olive-dark">
          Buscar y filtrar pedidos
          {query || delivery ? " · filtros activos" : ""}
        </summary>
        <form
          className="grid gap-3 rounded-card bg-white p-4 sm:grid-cols-[1fr_200px_auto] sm:items-end"
          onSubmit={(event: FormEvent) => {
            event.preventDefault()
            setQuery(search.trim())
          }}
        >
          <Field label="Buscar pedido">
            <input
              className={inputClass}
              placeholder="Número de pedido o nombre"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label="Modalidad">
            <select
              className={inputClass}
              value={delivery}
              onChange={(event) => setDelivery(event.target.value)}
            >
              <option value="">Todas</option>
              <option value="retiro_local">Retiro local</option>
              <option value="entrega_local">Reparto local</option>
            </select>
          </Field>
          <button className={primaryClass} disabled={loading}>
            Buscar
          </button>
        </form>
      </details>
      <Notice error message={error} />
      {loading && <p role="status">Cargando pedidos…</p>}
      {error && (
        <button
          className={actionClass}
          disabled={loading}
          onClick={() => void reload()}
        >
          Reintentar
        </button>
      )}
      <div
        className="flex flex-wrap gap-2 md:hidden"
        aria-label="Columnas de pedidos"
      >
        {boardColumns.map((item) => (
          <button
            key={item.id}
            aria-pressed={column === item.id}
            className={column === item.id ? primaryClass : actionClass}
            onClick={() => setColumn(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-charcoal/65">
        Mostrando {orders.length} de {count} pedidos. Los contadores de columnas
        corresponden a los pedidos cargados.
      </p>
      {!error && (
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:overflow-x-auto md:pb-4">
          {boardColumns.map((item) => {
            const visible = orders.filter((order) =>
              (item.statuses as readonly string[]).includes(order.status),
            )
            return (
              <section
                key={item.id}
                aria-label={item.label}
                className={`${
                  column === item.id ? "block" : "hidden"
                } min-w-0 space-y-3 rounded-card bg-cream-soft p-3 md:block md:w-[280px] md:shrink-0`}
              >
                <h2 className="flex items-center justify-between gap-2 px-1 py-2 text-sm font-bold text-olive-dark">
                  {item.label}
                  <span className="rounded-full bg-white px-3 py-1 tabular-nums">
                    {visible.length}
                  </span>
                </h2>
                {!visible.length && (
                  <p className="px-1 py-4 text-sm text-charcoal/65">
                    Sin pedidos cargados en este estado.
                  </p>
                )}
                {visible.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelected(order)}
                    className="block min-h-11 w-full space-y-3 rounded-control border border-sand/30 bg-white p-4 text-left shadow-sm focus-visible:outline-3 focus-visible:outline-olive"
                  >
                    <span className="block font-bold text-olive-dark">
                      {order.reference}
                    </span>
                    <span className="block break-words text-sm">
                      {order.name}
                    </span>
                    <span className="inline-block rounded-full bg-cream-soft px-2 py-1 text-xs font-bold">
                      {order.status_label}
                    </span>
                    <span className="block text-xs text-charcoal/65">
                      {order.delivery === "retiro_local"
                        ? "Retiro local"
                        : "Reparto local"}{" "}
                      · {orderDate(order.created_at)}
                    </span>
                    <span className="block text-sm">
                      {order.lines.reduce(
                        (total, line) => total + line.quantity,
                        0,
                      )}{" "}
                      paquetes · {formatPrice(Number(order.subtotal))}
                    </span>
                    {order.reservation_expires_at && (
                      <span
                        className={`block text-xs font-semibold ${
                          new Date(order.reservation_expires_at).getTime() <
                          Date.now()
                            ? "text-terracotta-dark"
                            : "text-stock-warning"
                        }`}
                      >
                        Reserva hasta {orderDate(order.reservation_expires_at)}
                      </span>
                    )}
                    <span className="block text-xs font-bold text-olive">
                      Ver detalle y actualizar →
                    </span>
                  </button>
                ))}
              </section>
            )
          })}
        </div>
      )}
      {moreColumns.length > 0 && (
        <button
          className={actionClass}
          disabled={loading}
          onClick={async () => {
            const current = ++sequence.current
            setLoading(true)
            setError("")
            try {
              const results = await Promise.all(
                moreColumns.map((bucket) =>
                  listAdminOrders(page + 1, query, "", delivery, bucket),
                ),
              )
              if (current === sequence.current) {
                setOrders((existing) =>
                  [
                    ...new Map(
                      [
                        ...existing,
                        ...results.flatMap((result) => result.results),
                      ].map((order) => [order.id, order]),
                    ).values(),
                  ].sort((a, b) => a.created_at.localeCompare(b.created_at)),
                )
                setPage(page + 1)
                setMoreColumns(
                  moreColumns.filter((_, index) => results[index].next),
                )
              }
            } catch (error) {
              if (current === sequence.current)
                setError((error as Error).message)
            } finally {
              if (current === sequence.current) setLoading(false)
            }
          }}
        >
          Cargar más pedidos
        </button>
      )}
    </section>
  )
}

function OrderDetail({
  order,
  onClose,
  onSaved,
  onDirty,
  onBusy,
}: {
  order: AdminOrder
  onClose: () => void
  onSaved: (order: AdminOrder) => void
  onDirty: (dirty: boolean) => void
  onBusy: (busy: boolean) => void
}) {
  const [note, setNote] = useState(order.internal_note)
  const [publicNote, setPublicNote] = useState("")
  const [target, setTarget] = useState<OrderStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [stale, setStale] = useState(false)
  useEffect(() => {
    onDirty(note !== order.internal_note || Boolean(publicNote.trim()))
  }, [note, order.internal_note, publicNote, onDirty])
  useEffect(() => {
    onBusy(busy)
  }, [busy, onBusy])
  useEffect(
    () => () => {
      onDirty(false)
      onBusy(false)
    },
    [onDirty, onBusy],
  )
  async function run(task: () => Promise<AdminOrder>) {
    if (busy) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const result = await task()
      onSaved(result)
      setTarget(null)
      setPublicNote("")
      setMessage("Pedido actualizado.")
    } catch (error) {
      setError((error as Error).message)
      if (error instanceof ApiError && error.status === 409) setStale(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-5" aria-labelledby="order-detail-title">
      <button
        className={actionClass}
        disabled={busy}
        onClick={() => {
          if (
            (note === order.internal_note && !publicNote.trim()) ||
            window.confirm(
              "¿Volver al tablero y descartar las notas sin guardar?",
            )
          )
            onClose()
        }}
      >
        ← Volver al tablero
      </button>
      <div className="flex flex-wrap justify-between gap-3">
        <h1
          id="order-detail-title"
          className="font-display text-3xl font-semibold text-olive-dark"
        >
          Pedido {order.reference}
        </h1>
        <span className="self-start rounded-full bg-olive px-4 py-2 text-sm font-bold text-white">
          {order.status_label}
        </span>
      </div>
      <Notice error message={error} />
      <Notice message={message} />
      {stale && (
        <Notice message="El pedido o inventario cambió. Volvé al tablero y actualizá antes de reintentar." />
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="min-w-0 space-y-3 rounded-card bg-white p-5">
          <h2 className="font-display text-2xl font-semibold">
            Productos y contacto
          </h2>
          <p className="break-words">
            {order.name} · {order.phone || "Sin teléfono"}
          </p>
          <p className="break-all text-sm">{order.email}</p>
          <p className="text-sm">
            {order.delivery === "retiro_local"
              ? "Retiro local"
              : "Reparto local"}
          </p>
          <p className="break-words text-sm">
            {order.address} {order.address_help}
          </p>
          <ul className="divide-y divide-sand/30">
            {order.lines.map((line) => (
              <li key={line.variant_id} className="space-y-1 py-3 text-sm">
                <strong className="break-words">
                  {line.product_name} · {line.weight_grams} g × {line.quantity}
                </strong>
                <p className="break-all text-xs">SKU: {line.sku}</p>
                <p>
                  {formatPrice(Number(line.unit_price))} / paquete ·{" "}
                  {formatPrice(Number(line.line_total))}
                </p>
              </li>
            ))}
          </ul>
          <p className="font-bold">
            Subtotal: {formatPrice(Number(order.subtotal))}
          </p>
          <p className="text-xs text-charcoal/65">
            Envío y pago coordinados por WhatsApp; el subtotal no incluye
            reparto.
          </p>
          <p className="text-xs">
            Ingresó {orderDate(order.created_at)}. Actualizado{" "}
            {orderDate(order.updated_at)}.
          </p>
          {order.reservation_expires_at && (
            <p className="text-sm font-semibold text-stock-warning">
              Reserva pendiente hasta {orderDate(order.reservation_expires_at)}.
            </p>
          )}
        </section>
        <section className="space-y-4 rounded-card bg-white p-5">
          <h2 className="font-display text-2xl font-semibold">
            Actualizar pedido
          </h2>
          <Field label="Nota del cambio (visible para el cliente)">
            <textarea
              className={inputClass}
              rows={3}
              maxLength={500}
              value={publicNote}
              disabled={busy || stale}
              onChange={(event) => setPublicNote(event.target.value)}
            />
          </Field>
          {!nextStatuses(order).length && (
            <p className="text-sm">
              Pedido cerrado. No admite nuevos cambios de estado.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {nextStatuses(order).map((status) => (
              <button
                key={status}
                className={
                  status === "CANCELADO" || status === "VENCIDO"
                    ? actionClass
                    : primaryClass
                }
                disabled={busy || stale}
                onClick={() => setTarget(status)}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
          {target && (
            <div className="space-y-3 rounded-control border border-sand/50 bg-cream p-4">
              <p className="font-semibold">
                ¿Cambiar a “{statusLabels[target]}”?
              </p>
              <p className="text-sm">
                {target === "RESERVADO"
                  ? "Django comprobará y reservará todos los paquetes. Si falta stock no se guardará el cambio."
                  : target === "TERMINADO"
                    ? "Se consumirá el stock físico y se liberará la reserva. El pedido quedará cerrado."
                    : target === "CANCELADO" || target === "VENCIDO"
                      ? "Se liberarán las unidades reservadas, si las hay. El pedido quedará cerrado."
                      : "Las unidades seguirán reservadas. Al preparar, se cierra el plazo de reserva pendiente."}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={primaryClass}
                  disabled={busy || stale}
                  onClick={() =>
                    void run(() =>
                      transitionOrder(order, target, publicNote.trim()),
                    )
                  }
                >
                  {busy ? "Guardando…" : "Confirmar cambio"}
                </button>
                <button
                  className={actionClass}
                  disabled={busy}
                  onClick={() => setTarget(null)}
                >
                  Volver
                </button>
              </div>
            </div>
          )}
          <div className="space-y-3 border-t border-sand/30 pt-5">
            <Field label="Nota interna (no visible para el cliente)">
              <textarea
                className={inputClass}
                rows={3}
                maxLength={4000}
                value={note}
                disabled={busy}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            <button
              className={actionClass}
              disabled={busy || note === order.internal_note}
              onClick={() => void run(() => saveOrderNote(order, note))}
            >
              Guardar nota interna
            </button>
          </div>
        </section>
      </div>
      <section className="rounded-card bg-white p-5">
        <h2 className="font-display text-2xl font-semibold">Historial</h2>
        <ol className="mt-4 space-y-4">
          {order.events.map((event, index) => (
            <li
              key={`${event.created_at}-${index}`}
              className="border-l-2 border-olive pl-4"
            >
              <p className="font-semibold">{statusLabels[event.to_status]}</p>
              <p className="text-xs text-charcoal/65">
                {orderDate(event.created_at)}
              </p>
              <p className="break-words text-sm">{event.public_note}</p>
            </li>
          ))}
        </ol>
      </section>
    </section>
  )
}
