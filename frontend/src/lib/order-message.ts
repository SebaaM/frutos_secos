import { formatPrice } from "../data/products.ts"
import type { ApiOrder } from "./order-api"

export function buildWhatsAppMessage(order: ApiOrder) {
  return [
    `Hola Rosana, quiero coordinar mi pedido ${order.reference}.`,
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
    "",
    `Estado actual: ${order.status_label}.`,
    "El envío a WhatsApp no confirma stock, pago ni entrega. La reserva requiere confirmación de Rosana.",
  ]
    .filter(Boolean)
    .join("\n")
}
