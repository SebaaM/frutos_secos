import { formatPrice } from "../data/products.ts"

import type { ApiOrder } from "./order-api"

type MessageOrder = Pick<ApiOrder, "reference" | "status_label" | "subtotal" | "delivery" | "address" | "address_help" | "name" | "phone" | "email" | "lines"> & {
  created_at?: string
}

function orderDateForMessage(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",

    timeStyle: "short",

    timeZone: "America/Argentina/Buenos_Aires",
  })
}

export function buildWhatsAppMessage(
  order: MessageOrder,

  ordersUrl = typeof window === "undefined"
    ? "/mis-pedidos"
    : `${window.location.origin}/mis-pedidos`,
) {
  return [
    `Hola Rosana, quiero coordinar mi pedido ${order.reference}.`,

    order.created_at && `Creado: ${orderDateForMessage(order.created_at)}.`,

    "",

    ...order.lines.map(
      (line) =>
        `• ${line.product_name} — ${line.weight_grams} g × ${line.quantity}: ${formatPrice(Number(line.line_total))}`,
    ),

    "",

    `Subtotal: ${formatPrice(Number(order.subtotal))}`,

    "Costo de reparto y pago: a coordinar.",

    `Modalidad: ${
      order.delivery === "retiro_local" ? "Retiro local" : "Reparto local"
    }`,

    order.address && `Dirección / referencia: ${order.address}`,

    order.address_help && `Indicaciones: ${order.address_help}`,

    `Nombre: ${order.name}`,

    order.phone && `Teléfono: ${order.phone}`,

    `Email: ${order.email}`,

    `Mis pedidos: ${ordersUrl}`,

    "",

    `Estado actual: ${order.status_label}.`,

    "El envío a WhatsApp no confirma stock, pago ni entrega. La reserva requiere confirmación de Rosana.",
  ]

    .filter(Boolean)

    .join("\n")
}
