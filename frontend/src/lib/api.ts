export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api/v1"
).replace(/\/$/, "")

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
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { Accept: "application/json", ...options.headers },
    })
  } catch {
    throw new Error(
      "No pudimos conectar con la API. Revisá que Django esté funcionando y volvé a intentar.",
    )
  }
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null)
    throw new Error(
      errorText(data) || `La API respondió con ${response.status}.`,
    )
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function jsonRequest(method: string, data: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }
}
