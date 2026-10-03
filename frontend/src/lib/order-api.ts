import { apiRequest, jsonRequest } from "./api"

export type Session = {
  csrf_token: string
  staff: { username: string } | null
  customer: { email: string } | null
}
export type OrderStatus = "A_CONFIRMAR" | "RESERVADO" | "PREPARANDO" | "LISTO_PARA_RETIRO" | "EN_REPARTO" | "TERMINADO" | "CANCELADO" | "VENCIDO"
export type ApiOrder = {
  id: string
  reference: string
  name: string
  email: string
  phone: string
  delivery: "retiro_local" | "entrega_local"
  address: string
  address_help: string
  status: OrderStatus
  status_label: string
  subtotal: string
  created_at: string
  updated_at: string
  reserved_at: string | null
  reservation_expires_at: string | null
  lines: {
    variant_id: number
    product_id_snapshot: number
    product_name: string
    sku: string
    weight_grams: number
    unit_price: string
    quantity: number
    line_total: string
  }[]
  events: {
    from_status: string
    to_status: OrderStatus
    public_note: string
    created_at: string
  }[]
}
export type AdminOrder = ApiOrder & { internal_note: string }
export type OrderContact = {
  delivery: ApiOrder["delivery"]
  address: string
  addressHelp: string
  name: string
  phone: string
  email: string
}
export type OrderInput = Omit<OrderContact, "addressHelp"> & {
  address_help: string
  idempotency_key: string
  lines: {
    variant_id: number
    quantity: number
    expected_unit_price: string
  }[]
}
export type Page<T,> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
export const getSession = () => apiRequest<Session>("/auth/session/")
export const staffLogin = (username: string, password: string) =>
  apiRequest<Session>(
    "/auth/staff/login/",
    jsonRequest("POST", { username, password }),
  )
export const staffLogout = () =>
  apiRequest<Session>("/auth/staff/logout/", jsonRequest("POST", {}))
export const customerLogout = () =>
  apiRequest<Session>("/auth/customer/logout/", jsonRequest("POST", {}))
export const requestAccess = (email: string) =>
  apiRequest<{ detail: string }>(
    "/auth/customer/request-link/",
    jsonRequest("POST", { email }),
  )
export const verifyAccess = (token: string) =>
  apiRequest<Session>("/auth/customer/verify/", jsonRequest("POST", { token }))
export const submitOrder = (data: OrderInput) =>
  apiRequest<ApiOrder>("/orders/", jsonRequest("POST", data))
export const getOrder = (id: string) =>
  apiRequest<ApiOrder>(`/orders/${encodeURIComponent(id)}/`)
export const listCustomerOrders = (page = 1) =>
  apiRequest<Page<ApiOrder>>(`/orders/?page=${page}`)
export const listAdminOrders = (
  page = 1,
  search = "",
  status = "",
  delivery = "",
  bucket = "",
) =>
  apiRequest<Page<AdminOrder>>(
    `/backoffice/orders/?${new URLSearchParams({ page: String(page), search, status, delivery, bucket })}`,
  )
export const transitionOrder = (
  order: AdminOrder,
  status: OrderStatus,
  public_note: string,
) =>
  apiRequest<AdminOrder>(
    `/backoffice/orders/${order.id}/transition/`,
    jsonRequest("POST", { status, expected_status: order.status, public_note }),
  )
export const saveOrderNote = (order: AdminOrder, internal_note: string) =>
  apiRequest<AdminOrder>(
    `/backoffice/orders/${order.id}/`,
    jsonRequest("PATCH", { internal_note }),
  )
