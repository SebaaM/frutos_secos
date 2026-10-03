export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || "/api/v1")

  .replace(/\/$/, "")

let csrfToken = ""

let csrfRequest: Promise<string> | null = null

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)

    this.name = "ApiError"

    this.status = status
  }
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken

  if (!csrfRequest) {
    csrfRequest = fetch(`${API_BASE_URL}/auth/session/`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })

      .then(async (response) => {
        if (!response.ok)
          throw new Error("No pudimos iniciar una sesión segura. Reintentá.")

        const data = (await response.json()) as { csrf_token: string }

        csrfToken = data.csrf_token

        return csrfToken
      })
      .finally(() => {
        csrfRequest = null
      })
  }

  return csrfRequest
}

const fieldLabels: Record<string, string> = {
  name: "Nombre",

  slug: "Identificador",

  category: "Categoría",

  variants: "Presentaciones",

  sku: "SKU",

  weight_grams: "Peso",

  price: "Precio",

  is_published: "Publicación",

  is_active: "Activo",

  image: "Imagen",

  image_url: "URL",

  alt_text: "Descripción de imagen",
  email: "Email",
  address: "Dirección",
  delivery: "Modalidad",
  lines: "Productos",
  expected_unit_price: "Precio esperado",
  expected_status: "Estado esperado",
}

function errorText(value: unknown): string {
  if (typeof value === "string") return value

  if (Array.isArray(value))
    return value.map(errorText).filter(Boolean).join(" · ")

  if (value && typeof value === "object") {
    return Object.entries(value)

      .map(([key, item]) => {
        const message = errorText(item)

        return ["detail", "non_field_errors"].includes(key)
          ? message
          : `${fieldLabels[key] || key}: ${message}`
      })

      .join(" · ")
  }

  return ""
}

export async function apiRequest<T>(
  path: string,

  options: RequestInit = {},
): Promise<T> {
  let response: Response

  const headers = new Headers(options.headers)

  headers.set("Accept", "application/json")

  if (
    !["GET", "HEAD", "OPTIONS"].includes(
      (options.method || "GET").toUpperCase(),
    )
  ) {
    headers.set("X-CSRFToken", await getCsrfToken())
  }

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,

      credentials: "include",

      headers,
    })
  } catch {
    throw new Error(
      "No pudimos conectar con la API. Revisá que Django esté funcionando y volvé a intentar.",
    )
  }

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null)

    if (response.status === 403) csrfToken = ""

    throw new ApiError(
      errorText(data) || `La API respondió con ${response.status}.`,
      response.status,
    )
  }

  if (response.status === 204) return undefined as T

  const data: T = await response.json()

  if (
    data &&
    typeof data === "object" &&
    "csrf_token" in data &&
    typeof data.csrf_token === "string"
  )
    csrfToken = data.csrf_token

  return data
}

export function jsonRequest(method: string, data: unknown): RequestInit {
  return {
    method,

    headers: { "Content-Type": "application/json" },

    body: JSON.stringify(data),
  }
}
