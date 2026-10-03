import { useCallback, useEffect, useState } from "react"
import type { Navigate } from "../components/layout"
import { Button, Eyebrow } from "../components/ui"
import { formatPrice } from "../data/products"
import { ApiError } from "../lib/api"
import { getOrder, type ApiOrder } from "../lib/order-api"
import { orderDate, statusLabels } from "../lib/order-status"
import { buildWhatsAppMessage } from "../lib/order-message"

export default function OrderPage({
  id,
  initialOrder,
  navigate,
}: {
  id: string
  initialOrder: ApiOrder | null
  navigate: Navigate
}) {
  const [order, setOrder] = useState<ApiOrder | null>(
    initialOrder?.id === id ? initialOrder : null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const reload = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setOrder(await getOrder(id))
    } catch (error) {
      if (
        !(
          error instanceof ApiError &&
          error.status === 403 &&
          initialOrder?.id === id
        )
      ) {
        setOrder(null)
        setError(
          error instanceof ApiError && error.status === 403
            ? "Accedé desde tu email para consultar este pedido."
            : (error as Error).message,
        )
      } else {
        setOrder(initialOrder)
      }
    } finally {
      setLoading(false)
    }
  }, [id, initialOrder])
  useEffect(() => {
    void reload()
  }, [reload])
  const number = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, "")

  return (
    <div className="page-container space-y-6 py-9 md:py-14">
      <Eyebrow>Tu pedido</Eyebrow>
      <h1 className="break-words font-display text-4xl font-semibold text-olive-dark">
        {order?.reference || "Seguimiento del pedido"}
      </h1>
      {loading && <p role="status">Consultando pedido…</p>}
      {error && (
        <p
          role="alert"
          className="rounded-control bg-terracotta-soft p-4 text-terracotta-dark"
        >
          {error}
        </p>
      )}
      {!order ? (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/mis-pedidos")}>
            Acceder por email
          </Button>
          <Button variant="secondary" onClick={() => void reload()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          <section className="space-y-4 rounded-card bg-cream-soft p-5 md:p-7">
            <span className="inline-block rounded-full bg-olive px-4 py-2 text-sm font-bold text-white">
              {order.status_label}
            </span>
            <p className="text-sm">
              {order.status === "A_CONFIRMAR"
                ? "Guardamos tu solicitud. No hay stock reservado todavía. Enviá el resumen a WhatsApp para coordinar stock, pago y entrega."
                : "Este es el estado registrado por Rosana. Consultá las actualizaciones o coordiná por WhatsApp."}
            </p>
            <p className="text-xs text-charcoal/65">
              Creado: {orderDate(order.created_at)} · Actualizado:{" "}
              {orderDate(order.updated_at)}
            </p>
            {order.reservation_expires_at && (
              <p className="text-sm font-semibold">
                Reserva pendiente hasta{" "}
                {orderDate(order.reservation_expires_at)}.
              </p>
            )}
            <Button
              variant="secondary"
              disabled={loading}
              onClick={() => void reload()}
            >
              Actualizar estado
            </Button>
          </section>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-card bg-white p-5 shadow-card md:p-7">
              <h2 className="font-display text-2xl font-semibold text-olive-dark">
                Resumen
              </h2>
              <ul className="mt-4 divide-y divide-sand/25">
                {order.lines.map((line) => (
                  <li
                    key={line.variant_id}
                    className="flex flex-wrap justify-between gap-3 py-4 text-sm"
                  >
                    <span className="min-w-0 break-words">
                      {line.product_name}
                      <br />
                      <span className="text-charcoal/60">
                        {line.weight_grams} g × {line.quantity}
                      </span>
                    </span>
                    <strong>{formatPrice(Number(line.line_total))}</strong>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex flex-wrap justify-between gap-3 font-bold">
                Subtotal <span>{formatPrice(Number(order.subtotal))}</span>
              </p>
              <p className="mt-3 text-xs text-charcoal/65">
                Costo de reparto y medios de pago a coordinar. No incluye un
                costo de entrega confirmado.
              </p>
            </section>
            <section className="space-y-3 rounded-card bg-white p-5 shadow-card md:p-7">
              <h2 className="font-display text-2xl font-semibold text-olive-dark">
                Entrega y contacto
              </h2>
              <p>
                {order.delivery === "retiro_local"
                  ? "Retiro local"
                  : "Reparto local"}
              </p>
              <p className="break-words">
                {order.address}
                {order.address_help && ` · ${order.address_help}`}
              </p>
              <p className="break-words">
                {order.name} · {order.phone || "Sin teléfono"}
              </p>
              <p className="break-all text-sm">{order.email}</p>
              <div className="flex flex-wrap gap-3 pt-3">
                {number ? (
                  <a
                    className="inline-flex min-h-11 items-center justify-center rounded-control bg-terracotta px-5 py-3 text-sm font-bold text-white focus-visible:outline-3 focus-visible:outline-olive"
                    href={`https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppMessage(order))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Enviar resumen a WhatsApp
                  </a>
                ) : (
                  <p className="text-sm">
                    WhatsApp aún no está configurado. Podés copiar el resumen.
                  </p>
                )}
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        buildWhatsAppMessage(order),
                      )
                      setMessage("Resumen copiado.")
                    } catch {
                      setMessage(
                        "No pudimos copiar. Seleccioná el resumen de abajo para copiarlo manualmente.",
                      )
                    }
                  }}
                >
                  Copiar resumen
                </Button>
              </div>
              {message && (
                <p role="status" className="text-sm">
                  {message}
                </p>
              )}
              <details>
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
                  Ver mensaje de WhatsApp
                </summary>
                <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                  {buildWhatsAppMessage(order)}
                </pre>
              </details>
            </section>
          </div>
          <section className="rounded-card bg-white p-5 md:p-7">
            <h2 className="font-display text-2xl font-semibold text-olive-dark">
              Historial del pedido
            </h2>
            <ol className="mt-4 space-y-4">
              {order.events.map((event, index) => (
                <li
                  key={`${event.created_at}-${index}`}
                  className="border-l-2 border-olive pl-4"
                >
                  <strong>{statusLabels[event.to_status]}</strong>
                  <p className="mt-1 text-xs text-charcoal/65">
                    {orderDate(event.created_at)}
                  </p>
                  {event.public_note && (
                    <p className="mt-1 break-words text-sm">
                      {event.public_note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
          <p className="text-sm text-charcoal/65">
            Para volver a consultar después, verificá tu email. El número de
            pedido no permite acceder a datos privados.
          </p>
          <Button onClick={() => navigate("/mis-pedidos")}>
            Ver mis pedidos / acceder por email
          </Button>
        </>
      )}
    </div>
  )
}
