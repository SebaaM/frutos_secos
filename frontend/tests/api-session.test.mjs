import test from "node:test"
import assert from "node:assert/strict"

test("CSRF se obtiene antes de un POST y se actualiza al iniciar sesión", async () => {
  const { apiRequest, jsonRequest } = await import(
    "../src/lib/api.ts?case=session"
  )
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith("/auth/session/"))
      return Response.json({ csrf_token: "initial" })
    if (url.endsWith("/auth/staff/login/"))
      return Response.json({ csrf_token: "rotated" })
    return new Response(null, { status: 204 })
  }
  try {
    await apiRequest(
      "/auth/staff/login/",
      jsonRequest("POST", { username: "test", password: "test-only-password" }),
    )
    await apiRequest("/backoffice/products/", jsonRequest("POST", {}))
    assert.equal(calls.length, 3)
    assert.ok(calls[0].url.endsWith("/auth/session/"))
    assert.equal(calls[1].options.headers.get("X-CSRFToken"), "initial")
    assert.equal(calls[2].options.headers.get("X-CSRFToken"), "rotated")
    for (const call of calls) assert.equal(call.options.credentials, "include")
  } finally {
    globalThis.fetch = original
  }
})
test("errores de API conservan HTTP status y un 403 refresca CSRF en el próximo intento", async () => {
  const { apiRequest, jsonRequest, ApiError } = await import(
    "../src/lib/api.ts?case=errors"
  )
  const original = globalThis.fetch
  let requests = 0
  let sessions = 0
  globalThis.fetch = async (url) => {
    if (url.endsWith("/auth/session/")) {
      sessions++
      return Response.json({ csrf_token: "csrf" })
    }
    requests++
    return Response.json(
      { detail: requests === 1 ? "Sesión requerida" : "Stock cambió" },
      { status: requests === 1 ? 403 : 409 },
    )
  }
  try {
    await assert.rejects(
      apiRequest("/orders/", jsonRequest("POST", {})),
      (error) => error instanceof ApiError && error.status === 403,
    )
    await assert.rejects(
      apiRequest("/orders/", jsonRequest("POST", {})),
      (error) =>
        error instanceof ApiError &&
        error.status === 409 &&
        error.message === "Stock cambió",
    )
    assert.equal(sessions, 2)
    assert.equal(requests, 2) // Never silently retry a write.
  } finally {
    globalThis.fetch = original
  }
})
