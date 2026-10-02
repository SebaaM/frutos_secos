import { useState } from "react"
import type { Navigate } from "../components/layout"
import { Button, Eyebrow, Icon } from "../components/ui"
import { formatPrice } from "../data/products"
import type { Order } from "./CartPage"

export function buildWhatsAppMessage(order: Order, resentAt?: string) {
  const lines = order.lines
    .map(
      (line) =>
        `${line.quantity} × ${line.product.name} · ${line.variant.label} — ${formatPrice(line.subtotal)}`,
    )
    .join("\n")
  const modality =
    order.delivery === "retiro_local" ? "retiro local" : "entrega local"
  const addressHelp = order.addressHelp
    ? `Indicaciones / contacto adicional: ${order.addressHelp}\n`
    : ""
  const phone = order.phone ? `Teléfono: ${order.phone}\n` : ""
  const email = order.email ? `Email: ${order.email}\n` : ""
  const webAccess = order.email
    ? `
Podés volver a ver tu pedido en la web ingresando:
Email: ${order.email}
Número de pedido: #${order.id}
Acceso: ${window.location.origin}/mis-pedidos
`
    : ""
  return `Hola, quiero consultar este pedido de Rosana Frutos Secos.

${resentAt ? `Reenviado: ${resentAt}\n` : ""}Pedido: #${order.id}
${lines}

Subtotal: ${formatPrice(order.subtotal)}
Modalidad: ${modality}
Dirección: ${order.address}
${addressHelp}Nombre: ${order.name}
${phone}${email}${webAccess}

Entiendo que el pedido queda pendiente de confirmación de stock y coordinación por WhatsApp.`
}

export default function OrderPage({
  order,
  navigate,
}: {
  order: Order | null
  navigate: Navigate
}) {
  const [copied, setCopied] = useState(false)

  if (!order) {
    return (
      <div className="page-container py-16">
        <div className="mx-auto max-w-xl rounded-[28px] bg-cream-soft px-6 py-14 text-center">
          <Icon
            name="warning"
            className="mx-auto size-10 text-terracotta-dark"
          />
          <h1 className="mt-5 font-display text-4xl font-semibold text-olive-dark">
            No encontramos este pedido
          </h1>
          <p className="mt-3 text-sm text-charcoal/65">
            Puede que la sesión haya terminado. Podés volver al catálogo y
            armarlo nuevamente.
          </p>
          <Button onClick={() => navigate("/catalogo")} className="mt-7">
            Volver al catálogo
          </Button>
        </div>
      </div>
    )
  }

  const message = buildWhatsAppMessage(order)
  const resendWhatsApp = () => {
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
  const copyMessage = async () => {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="page-container py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[28px] bg-olive-dark px-6 py-9 text-white md:px-10 md:py-12">
          <span className="grid size-14 place-items-center rounded-full bg-white/12">
            <Icon name="check" className="size-7" />
          </span>
          <Eyebrow>Pedido pendiente</Eyebrow>
          <h1 className="font-display text-4xl leading-tight font-semibold md:text-5xl">
            Pedido #{order.id} recibido
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75">
            Tu pedido está pendiente de confirmación. Te escribimos por WhatsApp
            para verificar stock, pago y entrega.
          </p>
        </div>

        <section className="mt-6 rounded-card bg-white p-5 shadow-card ring-1 ring-sand/15 md:p-8">
          <h2 className="font-display text-3xl font-semibold text-olive-dark">
            Resumen del pedido
          </h2>
          <div className="mt-5 divide-y divide-sand/25">
            {order.lines.map((line) => (
              <div
                key={`${line.product.id}-${line.variant.id}`}
                className="flex items-center gap-4 py-4"
              >
                <img
                  src={line.product.image}
                  alt=""
                  className="size-16 rounded-control object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-olive-dark">
                    {line.product.name}
                  </p>
                  <p className="mt-0.5 text-xs text-charcoal/55">
                    {line.quantity} × {line.variant.label}
                  </p>
                </div>
                <p className="text-sm font-bold">
                  {formatPrice(line.subtotal)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3 border-t border-sand/25 pt-5 text-sm">
            <div className="flex justify-between">
              <span className="text-charcoal/60">Subtotal</span>
              <strong>{formatPrice(order.subtotal)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal/60">Modalidad</span>
              <strong>
                {order.delivery === "retiro_local"
                  ? "Retiro local"
                  : "Entrega local"}
              </strong>
            </div>
            <div className="flex justify-between gap-5">
              <span className="text-charcoal/60">Dirección</span>
              <strong className="text-right">{order.address}</strong>
            </div>
            {order.addressHelp ? (
              <div className="flex justify-between gap-5">
                <span className="text-charcoal/60">
                  Indicaciones / contacto adicional
                </span>
                <strong className="text-right">{order.addressHelp}</strong>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-charcoal/60">Nombre</span>
              <strong>{order.name}</strong>
            </div>
            {order.phone ? (
              <div className="flex justify-between">
                <span className="text-charcoal/60">Teléfono</span>
                <strong>{order.phone}</strong>
              </div>
            ) : null}
            {order.email ? (
              <div className="flex justify-between">
                <span className="text-charcoal/60">Email</span>
                <strong>{order.email}</strong>
              </div>
            ) : null}
          </div>
        </section>

        <div className="mt-6 rounded-card bg-terracotta-soft p-5 md:p-6">
          <div className="flex gap-3">
            <Icon
              name="warning"
              className="mt-0.5 size-5 shrink-0 text-terracotta-dark"
            />
            <p className="text-sm leading-relaxed text-charcoal/75">
              <strong className="text-charcoal">
                Todavía falta la confirmación.
              </strong>{" "}
              Abrí WhatsApp para enviarnos el resumen y coordinar los detalles.
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button
              icon="whatsapp"
              onClick={resendWhatsApp}
              className="sm:flex-1"
            >
              Reenviar mensaje
            </Button>
            <Button
              variant="secondary"
              icon={copied ? "check" : "copy"}
              onClick={copyMessage}
              className="sm:flex-1"
            >
              {copied ? "Mensaje copiado" : "Copiar mensaje"}
            </Button>
          </div>
        </div>

        {order.email ? (
          <div className="mt-6 flex gap-4 rounded-card border border-olive/20 bg-cream-soft p-5 md:p-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-olive text-white">
              <Icon name="check" className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold text-olive-dark">
                Tu cuenta temporal
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-charcoal/65">
                Quedará asociada a <strong>{order.email}</strong> para que
                puedas conservar el resumen, consultar el estado y repetir este
                pedido.
              </p>
              <p className="mt-2 text-xs text-charcoal/50">
                Por ahora, la cuenta y el historial quedan guardados en este
                dispositivo; el envío automático de email se habilitará al
                conectar el servicio definitivo.
              </p>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => navigate("/catalogo")}
          className="mx-auto mt-7 flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-olive hover:underline focus-visible:outline-3 focus-visible:outline-olive"
        >
          Volver al catálogo <Icon name="arrow" className="size-4" />
        </button>
      </div>
    </div>
  )
}
