import { useState, type FormEvent } from "react"
import type { Navigate } from "../components/layout"
import { Button, Eyebrow, FormField, Icon } from "../components/ui"
import { formatPrice } from "../data/products"
import type { Order } from "./CartPage"
import { buildWhatsAppMessage } from "./OrderPage"

function normalizeOrderNumber(value: string) {
  return value.trim().replace(/^#/, "").toUpperCase()
}

export default function OrdersPage({
  orders,
  navigate,
  onRepeat,
}: {
  orders: Order[]
  navigate: Navigate
  onRepeat: (order: Order) => void
}) {
  const [orderNumber, setOrderNumber] = useState("")
  const [email, setEmail] = useState("")
  const [accountEmail, setAccountEmail] = useState("")
  const [error, setError] = useState("")

  const visibleOrders = accountEmail
    ? orders.filter(
        (order) => order.email.toLowerCase() === accountEmail.toLowerCase(),
      )
    : []

  const handleLogin = (event: FormEvent) => {
    event.preventDefault()
    const normalizedNumber = normalizeOrderNumber(orderNumber)
    const normalizedEmail = email.trim().toLowerCase()
    const match = orders.find(
      (order) =>
        order.id.toUpperCase() === normalizedNumber &&
        order.email.toLowerCase() === normalizedEmail,
    )
    if (!match) {
      setError("No encontramos un pedido con ese número y email.")
      return
    }
    setError("")
    setAccountEmail(match.email)
  }

  const resend = (order: Order) => {
    const number =
      import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, "") || "2901528149"
    const resentAt = new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date())
    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppMessage(order, resentAt))}`,
      "_blank",
      "noopener,noreferrer",
    )
  }

  if (!accountEmail) {
    return (
      <div className="page-container py-12 md:py-20">
        <div className="mx-auto max-w-lg">
          <div className="text-center">
            <Eyebrow>Acceso temporal</Eyebrow>
            <h1 className="font-display text-5xl font-semibold text-olive-dark">
              Mis pedidos
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-charcoal/65">
              Ingresá el número de pedido y el email utilizado para consultar
              el estado, revisar el historial o repetir una compra.
            </p>
            <p className="mt-2 text-xs text-charcoal/50">
              En este prototipo, el acceso y el historial se guardan únicamente
              en este dispositivo.
            </p>
          </div>
          <form
            onSubmit={handleLogin}
            className="mt-8 space-y-5 rounded-[24px] bg-white p-6 shadow-card ring-1 ring-sand/15 md:p-8"
          >
            <FormField
              id="order-number"
              label="Número de pedido"
              value={orderNumber}
              onChange={(value) => {
                setOrderNumber(value)
                setError("")
              }}
              placeholder="Ej. RF-123456"
            />
            <FormField
              id="account-email"
              label="Email"
              value={email}
              onChange={(value) => {
                setEmail(value)
                setError("")
              }}
              placeholder="nombre@ejemplo.com"
              type="email"
              autoComplete="email"
              error={error}
            />
            <Button type="submit" className="w-full">
              Ver mis pedidos
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container py-10 md:py-16">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Cuenta temporal</Eyebrow>
          <h1 className="font-display text-5xl font-semibold text-olive-dark">
            Historial de pedidos
          </h1>
          <p className="mt-3 text-sm text-charcoal/60">{accountEmail}</p>
        </div>
        <Button variant="secondary" onClick={() => setAccountEmail("")}>
          Cerrar sesión
        </Button>
      </div>

      <div className="mt-9 space-y-5">
        {visibleOrders.map((order) => (
          <article
            key={order.id}
            className="rounded-card bg-white p-5 shadow-card ring-1 ring-sand/15 md:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sand/20 pb-5">
              <div>
                <p className="text-xs font-bold tracking-widest text-terracotta uppercase">
                  Pedido #{order.id}
                </p>
                <p className="mt-2 text-sm text-charcoal/55">
                  {new Intl.DateTimeFormat("es-AR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(order.createdAt))}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-terracotta-soft px-3 py-1.5 text-xs font-bold text-terracotta-dark">
                <span className="size-1.5 rounded-full bg-terracotta" />
                Pendiente de confirmación
              </span>
            </div>
            <div className="py-5">
              {order.lines.map((line) => (
                <div
                  key={`${line.product.id}-${line.variant.id}`}
                  className="flex justify-between gap-4 py-1.5 text-sm"
                >
                  <span className="text-charcoal/70">
                    {line.quantity} × {line.product.name} · {line.variant.label}
                  </span>
                  <strong>{formatPrice(line.subtotal)}</strong>
                </div>
              ))}
              <div className="mt-4 flex justify-between border-t border-sand/20 pt-4">
                <strong>Subtotal</strong>
                <strong className="font-display text-xl text-olive-dark">
                  {formatPrice(order.subtotal)}
                </strong>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button icon="whatsapp" onClick={() => resend(order)}>
                Reenviar mensaje
              </Button>
              <Button variant="secondary" icon="bag" onClick={() => onRepeat(order)}>
                Repetir pedido
              </Button>
              <Button
                variant="text"
                onClick={() => navigate(`/pedido/${order.id}`)}
              >
                Ver resumen <Icon name="arrow" className="size-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
