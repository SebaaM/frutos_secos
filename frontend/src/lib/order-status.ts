import type { ApiOrder, OrderStatus } from "./order-api"

export const statusLabels: Record<OrderStatus, string> = {
  A_CONFIRMAR: "A confirmar",

  RESERVADO: "Reservado",

  PREPARANDO: "Preparando",

  LISTO_PARA_RETIRO: "Listo para retirar",

  EN_REPARTO: "En reparto",

  TERMINADO: "Terminado",

  CANCELADO: "Cancelado",

  VENCIDO: "Vencido",
}

export const boardColumns = [
  { id: "confirmar", label: "A confirmar", statuses: ["A_CONFIRMAR"] },

  { id: "proximos", label: "Próximos", statuses: ["RESERVADO", "PREPARANDO"] },

  {
    id: "entrega",

    label: "A repartir / retirar",

    statuses: ["LISTO_PARA_RETIRO", "EN_REPARTO"],
  },

  { id: "entregados", label: "Entregados", statuses: ["TERMINADO"] },

  {
    id: "cerrados",

    label: "Cancelados / vencidos",

    statuses: ["CANCELADO", "VENCIDO"],
  },
] as const

export function nextStatuses(
  order: Pick<ApiOrder, "status" | "delivery">,
): OrderStatus[] {
  const next: Partial<Record<OrderStatus, OrderStatus[]>> = {
    A_CONFIRMAR: ["RESERVADO", "CANCELADO"],

    RESERVADO: ["PREPARANDO", "CANCELADO", "VENCIDO"],

    PREPARANDO: [
      order.delivery === "retiro_local" ? "LISTO_PARA_RETIRO" : "EN_REPARTO",

      "CANCELADO",
    ],

    LISTO_PARA_RETIRO: ["TERMINADO", "CANCELADO"],

    EN_REPARTO: ["TERMINADO", "CANCELADO"],
  }

  return next[order.status] || []
}

export const orderDate = (value: string) =>
  new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",

    timeStyle: "short",

    timeZone: "America/Argentina/Buenos_Aires",
  })

export function orderProgress(order: Pick<ApiOrder, "status" | "delivery">) {
  const steps: OrderStatus[] = [
    "A_CONFIRMAR",

    "RESERVADO",

    "PREPARANDO",

    order.delivery === "retiro_local" ? "LISTO_PARA_RETIRO" : "EN_REPARTO",

    "TERMINADO",
  ]

  return { steps, current: steps.indexOf(order.status) }
}

export function nextStep(order: Pick<ApiOrder, "status" | "delivery">) {
  const messages: Record<OrderStatus, string> = {
    A_CONFIRMAR: "Rosana revisará stock, pago y modalidad antes de confirmar.",

    RESERVADO: "Tu pedido está reservado y pasa a preparación.",

    PREPARANDO: "Rosana está preparando tu pedido.",

    LISTO_PARA_RETIRO: "Podés coordinar el retiro con Rosana.",

    EN_REPARTO: "Rosana coordinará la entrega contigo.",

    TERMINADO: "El pedido fue entregado o retirado.",

    CANCELADO: "El pedido fue cancelado. Si necesitás ayuda, escribí a Rosana.",

    VENCIDO: "La reserva venció. Podés volver a armar tu pedido.",
  }

  return messages[order.status]
}
