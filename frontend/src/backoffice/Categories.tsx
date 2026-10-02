import { useEffect, useState, type FormEvent } from "react"
import {
  saveCategory,
  slugify,
  type AdminCategory,
} from "../lib/backoffice-api"
import {
  actionClass,
  Check,
  Field,
  inputClass,
  Notice,
  primaryClass,
} from "./controls"

export default function Categories({
  categories,
  onSaved,
  onDirty,
  onBusy,
}: {
  categories: AdminCategory[]
  onSaved: (category: AdminCategory) => void
  onDirty: (dirty: boolean) => void
  onBusy: (busy: boolean) => void
}) {
  const [editing, setEditing] = useState<AdminCategory | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const dirty =
    open &&
    (name !== (editing?.name || "") ||
      slug !== (editing?.slug || "") ||
      active !== (editing?.is_active ?? true))
  useEffect(() => {
    onDirty(dirty)
  }, [dirty, onDirty])
  useEffect(() => {
    onBusy(busy)
  }, [busy, onBusy])
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [dirty])

  function edit(category: AdminCategory | null) {
    if (
      dirty &&
      !window.confirm("¿Descartar los cambios pendientes de esta categoría?")
    )
      return
    setEditing(category)
    setName(category?.name || "")
    setSlug(category?.slug || "")
    setActive(category?.is_active ?? true)
    setOpen(true)
    setError("")
    setNotice("")
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      onSaved(
        await saveCategory(editing?.id, {
          name: name.trim(),
          slug,
          is_active: active,
        }),
      )
      setOpen(false)
      setNotice("Categoría guardada.")
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Categorías</h1>
          <p className="mt-1 text-sm text-charcoal/65">
            Ordená tu catálogo. Las categorías se desactivan, no se eliminan.
          </p>
        </div>
        <button
          className={primaryClass}
          onClick={() => edit(null)}
          disabled={busy}
        >
          Nueva categoría
        </button>
      </div>
      <Notice message={notice} />
      {open && (
        <form
          onSubmit={submit}
          className="space-y-4 rounded-card border border-sand/40 bg-white p-5"
        >
          <h3 className="text-lg font-bold">
            {editing ? "Editar categoría" : "Nueva categoría"}
          </h3>
          <Notice error message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                className={inputClass}
                required
                maxLength={80}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!editing) setSlug(slugify(e.target.value))
                }}
                disabled={busy}
              />
            </Field>
            <Field label="Identificador URL">
              <input
                className={inputClass}
                required
                pattern="[-a-zA-Z0-9_]+"
                maxLength={50}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={busy}
              />
            </Field>
          </div>
          <Check
            label="Categoría activa"
            checked={active}
            onChange={setActive}
            disabled={busy}
          />
          <p className="text-xs text-charcoal/65">
            Para desactivarla, primero pasá sus productos publicados a borrador.
          </p>
          <div className="flex gap-3">
            <button className={primaryClass} disabled={busy}>
              {busy ? "Guardando…" : "Guardar categoría"}
            </button>
            <button
              type="button"
              className={actionClass}
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((category) => (
          <article
            key={category.id}
            className="flex items-center justify-between gap-3 rounded-card border border-sand/30 bg-white p-4"
          >
            <div className="min-w-0">
              <h3 className="break-words font-bold">{category.name}</h3>
              <p className="break-all text-xs text-charcoal/65">
                {category.slug} · {category.is_active ? "Activa" : "Inactiva"}
              </p>
            </div>
            <button
              className={actionClass}
              onClick={() => edit(category)}
              disabled={busy}
              aria-label={`Editar categoría ${category.name}`}
            >
              Editar
            </button>
          </article>
        ))}
      </div>
      {!categories.length && (
        <p>Creá una categoría antes de cargar productos.</p>
      )}
    </div>
  )
}
