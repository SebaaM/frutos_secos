import { useCallback, useEffect, useState, type FormEvent } from "react"
import type { Navigate } from "../components/layout"
import { Button, Eyebrow, FormField } from "../components/ui"
import { formatPrice } from "../data/products"
import { ApiError } from "../lib/api"
import {
  customerLogout,
  getSession,
  listCustomerOrders,
  requestAccess,
  verifyAccess,
  type ApiOrder,
} from "../lib/order-api"
import { orderDate } from "../lib/order-status"

export default function OrdersPage({
  navigate,
  onRepeat,
  onLogout,
}: {
  navigate: Navigate
  onRepeat: (order: ApiOrder) => void
  onLogout: () => void
}) {
  const [token, setToken] = useState(() => {
    const token =
      new URLSearchParams(window.location.hash.slice(1)).get("token") || ""
    return token
  })
  const [email, setEmail] = useState("")
  const [customer, setCustomer] = useState<string | null>(null)
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const reload = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const session = await getSession()
      setCustomer(session.customer?.email || null)
      if (session.customer) {
        const result = await listCustomerOrders()
        setOrders(result.results)
        setPage(1)
        setHasMore(Boolean(result.next))
      } else {
        setOrders([])
      }
    } catch (error) {
      setError((error as Error).message)
      if (error instanceof ApiError && error.status === 403) {
        setCustomer(null)
        setOrders([])
      }
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void reload()
  }, [reload])
  useEffect(() => {
    if (window.location.hash.includes("token="))
      window.history.replaceState(
        {},
        "",
        window.location.pathname + window.location.search,
      )
  }, [])

  async function act(task: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await task()
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function request(event: FormEvent) {
    event.preventDefault()
    await act(async () => {
      const result = await requestAccess(email.trim())
      setMessage(result.detail)
    })
  }

  return (
    <div className="page-container space-y-6 py-9 md:py-14">
      <Eyebrow>Seguimiento seguro</Eyebrow>
      <h1 className="font-display text-4xl font-semibold text-olive-dark md:text-5xl">
        Mis pedidos
      </h1>
      {loading && <p role="status">Consultando tu sesión…</p>}
      {error && (
        <p
          role="alert"
          className="rounded-control bg-terracotta-soft p-4 text-terracotta-dark"
        >
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-control bg-cream-soft p-4">
          {message}
        </p>
      )}
      {token && (
        <section className="max-w-xl space-y-4 rounded-card bg-cream-soft p-5 md:p-7">
          <h2 className="font-display text-2xl font-semibold text-olive-dark">
            Confirmá tu acceso
          </h2>
          <p className="text-sm">
            El enlace se usa una sola vez. Continuá solo si solicitaste este
            email.
          </p>
          <Button
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await verifyAccess(token)
                setToken("")
                await reload()
              })
            }
          >
            {busy ? "Verificando…" : "Confirmar acceso"}
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setToken("")}
          >
            Pedir otro enlace
          </Button>
        </section>
      )}
      {!loading && !customer && !token && (
        <form
          onSubmit={request}
          className="max-w-xl space-y-5 rounded-card bg-white p-5 shadow-card md:p-7"
        >
          <h2 className="font-display text-2xl font-semibold text-olive-dark">
            Accedé sin contraseña
          </h2>
          <p className="text-sm text-charcoal/70">
            Ingresá el email usado en tu pedido. Te enviaremos un enlace que
            vence en unos minutos. El número de pedido no es una contraseña.
          </p>
          <FormField
            id="access-email"
            label="Email de tus pedidos"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            placeholder="nombre@ejemplo.com"
          />
          <Button type="submit" disabled={busy || !email.trim()}>
            {busy ? "Solicitando enlace…" : "Enviarme un enlace"}
          </Button>
        </form>
      )}
      {customer && !token && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 break-all text-sm">
              Acceso verificado: {customer}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                disabled={loading || busy}
                onClick={() => void reload()}
              >
                Actualizar
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await customerLogout()
                    setOrders([])
                    setCustomer(null)
                    onLogout()
                  })
                }
              >
                Cerrar sesión
              </Button>
            </div>
          </div>
          {!orders.length && !loading && (
            <p className="rounded-card bg-cream-soft p-6">
              Todavía no hay pedidos para esta cuenta.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {orders.map((order) => (
              <article
                key={order.id}
                className="min-w-0 space-y-4 rounded-card bg-white p-5 shadow-card"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <h2 className="font-display text-2xl font-semibold text-olive-dark">
                    {order.reference}
                  </h2>
                  <span className="rounded-full bg-cream-soft px-3 py-2 text-xs font-bold text-olive-dark">
                    {order.status_label}
                  </span>
                </div>
                <p className="text-xs text-charcoal/65">
                  {orderDate(order.created_at)} ·{" "}
                  {order.delivery === "retiro_local" ? "Retiro" : "Reparto"}
                </p>
                <p className="break-words text-sm">
                  {order.lines
                    .map(
                      (line) =>
                        `${line.product_name} ${line.weight_grams} g × ${line.quantity}`,
                    )
                    .join(" · ")}
                </p>
                <p className="font-bold">
                  {formatPrice(Number(order.subtotal))}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => navigate(`/pedido/${order.id}`)}>
                    Ver estado y detalle
                  </Button>
                  <Button variant="secondary" onClick={() => onRepeat(order)}>
                    Repetir selección
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {hasMore && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const result = await listCustomerOrders(page + 1)
                  setOrders((current) => [...current, ...result.results])
                  setPage((current) => current + 1)
                  setHasMore(Boolean(result.next))
                })
              }
            >
              Cargar más pedidos
            </Button>
          )}
        </>
      )}
      {!loading && error && (
        <Button variant="secondary" onClick={() => void reload()}>
          Reintentar conexión
        </Button>
      )}
      <p className="text-xs text-charcoal/65">
        Solo se muestran pedidos guardados en el servidor y asociados a tu email
        verificado. El historial del prototipo no da acceso a pedidos.
      </p>
    </div>
  )
}
