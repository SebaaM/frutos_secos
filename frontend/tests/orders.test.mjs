import test from "node:test"
import assert from "node:assert/strict"
import {
  boardColumns,
  nextStatuses,
  nextStep,
  orderProgress,
  statusLabels,
} from "../src/lib/order-status.ts"
import { buildWhatsAppMessage } from "../src/lib/order-message.ts"
import { formatPrice } from "../src/data/products.ts"

test("todos los estados pertenecen a una sola columna", () => {
  const states = boardColumns.flatMap((column) => column.statuses)
  assert.equal(states.length, 8)
  assert.deepEqual([...states].sort(), Object.keys(statusLabels).sort())
  assert.equal(new Set(states).size, states.length)
})

test("los precios decimales no se redondean a pesos enteros", () => {
  assert.ok(formatPrice(2000.25).endsWith(",25"))
  assert.ok(formatPrice(6000.75).endsWith(",75"))
  assert.ok(formatPrice(4000.5).endsWith(",50"))
})
test("próximos son reservas y preparación sin fechas programadas", () => {
  assert.deepEqual(
    boardColumns.find((column) => column.id === "proximos").statuses,
    ["RESERVADO", "PREPARANDO"],
  )
})
test("la modalidad determina retiro o reparto", () => {
  assert.deepEqual(
    nextStatuses({ status: "PREPARANDO", delivery: "retiro_local" }),
    ["LISTO_PARA_RETIRO", "CANCELADO"],
  )
  assert.deepEqual(
    nextStatuses({ status: "PREPARANDO", delivery: "entrega_local" }),
    ["EN_REPARTO", "CANCELADO"],
  )
})
test("pedidos cerrados no proponen nuevas transiciones", () => {
  for (const status of ["TERMINADO", "CANCELADO", "VENCIDO"])
    assert.deepEqual(nextStatuses({ status, delivery: "retiro_local" }), [])
})
test("el progreso y el siguiente paso usan la modalidad", () => {
  const pickup = { status: "LISTO_PARA_RETIRO", delivery: "retiro_local" }
  assert.equal(orderProgress(pickup).current, 3)
  assert.equal(nextStep(pickup), "Podés coordinar el retiro con Rosana.")
  assert.equal(
    orderProgress({ status: "EN_REPARTO", delivery: "entrega_local" }).current,
    3,
  )
})
test("el mensaje usa snapshots de API y aclara confirmación pendiente", () => {
  const message = buildWhatsAppMessage({
    reference: "RF-TEST",
    created_at: "2026-10-03T12:00:00Z",
    status_label: "A confirmar",
    subtotal: "6000.75",
    delivery: "entrega_local",
    address: "Calle 123",
    address_help: "Piso 2",
    name: "Cliente",
    phone: "12345678",
    email: "cliente@example.invalid",
    lines: [
      {
        product_name: "Nueces",
        weight_grams: 250,
        quantity: 3,
        line_total: "6000.75",
      },
    ],
  })
  for (const text of [
    "RF-TEST",
    "Nueces — 250 g × 3",
    "Calle 123",
    "Piso 2",
    "cliente@example.invalid",
    "Mis pedidos",
    "A confirmar",
    "no confirma stock",
    "a coordinar",
  ])
    assert.ok(message.includes(text), text)
  assert.ok(!message.includes("NaN"))
  assert.ok(!message.includes("contraseña"))
})
