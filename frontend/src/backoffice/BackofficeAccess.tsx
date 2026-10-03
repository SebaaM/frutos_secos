import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  getSession,
  staffLogin,
  staffLogout,
  type Session,
} from "../lib/order-api"
import {
  actionClass,
  Field,
  inputClass,
  Notice,
  primaryClass,
} from "./controls"

export default function BackofficeAccess({
  children,
  navigate,
  onLogout,
}: {
  children: (logout: () => Promise<void>) => ReactNode
  navigate: (path: string) => void
  onLogout: () => void
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const reload = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setSession(await getSession())
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void reload()
  }, [reload])
  // Recheck on focus so another tab's logout does not leave an obsolete panel mounted.
  useEffect(() => {
    const check = () => {
      void getSession()
        .then(setSession)
        .catch(() => {
          /* Preserve unsaved edits on temporary network errors. */
        })
    }
    window.addEventListener("focus", check)
    return () => window.removeEventListener("focus", check)
  }, [])
  async function login(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    try {
      setSession(await staffLogin(username, password))
      setPassword("")
    } catch (error) {
      setError((error as Error).message)
      setPassword("")
    } finally {
      setBusy(false)
    }
  }
  async function logout() {
    await staffLogout()
    onLogout()
    setSession(null)
  }
  if (session?.staff) return children(logout)
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-4 py-8">
      <form
        onSubmit={login}
        className="w-full max-w-md space-y-5 rounded-card bg-white p-6 shadow-card sm:p-8"
      >
        <p className="text-xs font-bold tracking-widest text-terracotta uppercase">
          Rosana · Backoffice
        </p>
        <h1 className="font-display text-3xl font-semibold text-olive-dark">
          Acceso de operadores
        </h1>
        <p className="text-sm text-charcoal/65">
          Administrá catálogo, stock y pedidos con una cuenta de operador.
        </p>
        <Notice error message={error} />
        {loading ? (
          <p role="status">Consultando sesión…</p>
        ) : (
          <>
            <Field label="Usuario">
              <input
                className={inputClass}
                autoComplete="username"
                required
                maxLength={150}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={busy}
              />
            </Field>
            <Field label="Contraseña">
              <input
                className={inputClass}
                type="password"
                autoComplete="current-password"
                required
                maxLength={256}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
              />
            </Field>
            <button className={`${primaryClass} w-full`} disabled={busy}>
              {busy ? "Ingresando…" : "Ingresar al backoffice"}
            </button>
          </>
        )}
        {error && (
          <button
            type="button"
            className={actionClass}
            disabled={busy}
            onClick={() => void reload()}
          >
            Reintentar conexión
          </button>
        )}
        <button
          type="button"
          className={actionClass}
          onClick={() => navigate("/")}
        >
          Volver a la tienda
        </button>
        <p className="text-xs text-charcoal/60">
          Sin cuenta predeterminada: el responsable del sistema debe crear el
          operador. El acceso sigue limitado al entorno local.
        </p>
      </form>
    </main>
  )
}
