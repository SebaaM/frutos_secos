import { useEffect, useState, type FormEvent } from "react"
import {
  getProduct,
  saveProduct,
  slugify,
  uploadImage,
  type AdminCategory,
  type AdminImage,
  type AdminProduct,
  type AdminVariant,
  type PendingImage,
  type ProductDraft,
  type VariantDraft,
} from "../lib/backoffice-api"
import Gallery from "./Gallery"
import StockPanel from "./StockPanel"
import {
  actionClass,
  Check,
  Field,
  inputClass,
  Notice,
  primaryClass,
} from "./controls"

const emptyVariant = (grams = 0): VariantDraft => ({
  sku: "",
  weight_grams: grams,
  price: "",
  is_active: true,
  stock_physical: 0,
  stock_reserved: 0,
  stock_available: 0,
})
const toDraft = (product: AdminProduct): ProductDraft => ({
  name: product.name,
  slug: product.slug,
  category: product.category,
  description: product.description,
  ingredients: product.ingredients,
  allergen_info: product.allergen_info,
  storage_instructions: product.storage_instructions,
  is_published: product.is_published,
  is_featured: product.is_featured,
  variants: product.variants,
})

function VariantRow({
  variant,
  index,
  disabled,
  onChange,
  onRemove,
  onStock,
}: {
  variant: VariantDraft
  index: number
  disabled: boolean
  onChange: (variant: VariantDraft) => void
  onRemove: () => void
  onStock: () => void
}) {
  const [unit, setUnit] = useState("g")
  const factor = unit === "kg" ? 1000 : 1
  return (
    <fieldset
      className="min-w-0 space-y-4 rounded-card border border-sand/35 bg-cream/70 p-4"
      disabled={disabled}
    >
      <legend className="px-1 text-sm font-bold">
        Presentación {index + 1}
        {!variant.is_active ? " · Inactiva" : ""}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Peso fijo">
          <div className="flex gap-2">
            <input
              className={inputClass}
              aria-label={`Peso fijo de presentación ${index + 1}`}
              required
              type="number"
              min={1 / factor}
              step={1 / factor}
              value={variant.weight_grams ? variant.weight_grams / factor : ""}
              onChange={(e) =>
                onChange({
                  ...variant,
                  weight_grams: Number(
                    (Number(e.target.value) * factor).toFixed(6),
                  ),
                })
              }
              disabled={disabled || variant.stock_reserved > 0}
            />
            <select
              className={`${inputClass} w-20 shrink-0`}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              aria-label={`Unidad de peso de presentación ${index + 1}`}
            >
              <option>g</option>
              <option>kg</option>
            </select>
          </div>
        </Field>
        <Field label="SKU">
          <input
            className={inputClass}
            required
            maxLength={64}
            value={variant.sku}
            onChange={(e) => onChange({ ...variant, sku: e.target.value })}
          />
        </Field>
        <Field label="Precio (ARS)">
          <input
            className={inputClass}
            required
            type="number"
            min="0.01"
            step="0.01"
            value={variant.price}
            onChange={(e) => onChange({ ...variant, price: e.target.value })}
          />
        </Field>
        <Field label={variant.id ? "Stock físico" : "Stock inicial (paquetes)"}>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="1"
            value={variant.stock_physical}
            readOnly={Boolean(variant.id)}
            onChange={(e) =>
              onChange({
                ...variant,
                stock_physical: Number(e.target.value),
                stock_available: Number(e.target.value),
              })
            }
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Check
          label="Presentación activa"
          checked={variant.is_active}
          onChange={(value) => onChange({ ...variant, is_active: value })}
          disabled={disabled || variant.stock_reserved > 0}
        />
        {variant.id ? (
          <>
            <p className="text-sm">
              Reservado: <strong>{variant.stock_reserved}</strong> · Disponible:{" "}
              <strong>{variant.stock_available}</strong>
            </p>
            <button type="button" className={actionClass} onClick={onStock}>
              Ajustes e historial
            </button>
          </>
        ) : (
          <button type="button" className={actionClass} onClick={onRemove}>
            Quitar presentación nueva
          </button>
        )}
      </div>
      {variant.stock_reserved > 0 && (
        <p className="text-xs text-charcoal/65">
          El peso y la activación están protegidos mientras haya unidades
          reservadas.
        </p>
      )}
    </fieldset>
  )
}

export default function ProductEditor({
  product,
  categories,
  onSaved,
  onClose,
  onDirty,
  onBusy,
}: {
  product: AdminProduct | null
  categories: AdminCategory[]
  onSaved: (product: AdminProduct) => void
  onClose: () => void
  onDirty: (dirty: boolean) => void
  onBusy: (busy: boolean) => void
}) {
  const initial: ProductDraft = product
    ? toDraft(product)
    : {
        name: "",
        slug: "",
        category: categories.find((item) => item.is_active)?.id || 0,
        description: "",
        ingredients: "",
        allergen_info: "",
        storage_instructions:
          "Conservar en un lugar fresco, seco y protegido de la luz.",
        is_published: true,
        is_featured: false,
        variants: [],
      }
  const [id, setId] = useState(product?.id)
  const [draft, setDraft] = useState(initial)
  const [baseline, setBaseline] = useState(JSON.stringify(initial))
  const [images, setImages] = useState<AdminImage[]>(product?.images || [])
  const [pending, setPending] = useState<PendingImage[]>([])
  const [stockVariant, setStockVariant] = useState<AdminVariant | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const dirty = baseline !== JSON.stringify(draft) || pending.length > 0
  const category = categories.find((item) => item.id === draft.category)
  const weights =
    category?.slug === "hierbas" ||
    category?.name.toLowerCase().includes("hierba")
      ? [25, 50, 100]
      : [100, 250, 500]

  useEffect(() => {
    onBusy(busy)
  }, [busy, onBusy])

  useEffect(() => {
    onDirty(dirty)
  }, [dirty, onDirty])
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
  function setField<K extends keyof ProductDraft>(
    field: K,
    value: ProductDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }))
  }
  function addVariant(grams = 0) {
    const variant = emptyVariant(grams)
    if (grams && draft.slug)
      variant.sku = `${draft.slug.toUpperCase()}-${grams}`.slice(0, 64)
    setField("variants", [...draft.variants, variant])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setNotice("")
    if (
      draft.variants.some(
        (item) =>
          !Number.isInteger(item.weight_grams) || item.weight_grams <= 0,
      )
    ) {
      setError(
        "Cada presentación debe tener un peso positivo en gramos enteros.",
      )
      return
    }
    if (
      draft.is_published &&
      (!category?.is_active ||
        images.length + pending.length === 0 ||
        !draft.variants.some((item) => item.is_active))
    ) {
      setError(
        "Para publicar elegí una categoría activa y agregá una imagen y una presentación activa. También podés guardar como borrador.",
      )
      return
    }
    if (pending.some((item) => !item.alt_text.trim())) {
      setError("Completá la descripción de cada imagen.")
      return
    }
    setBusy(true)
    let savedId = id
    let savedDraft = draft
    let successfulUploads = 0
    let metadataSaved = false
    const uploaded: AdminImage[] = []
    try {
      // A draft with its first images needs uploads before publication can be validated.
      const result = await saveProduct(savedId, {
        ...draft,
        is_published: Boolean(savedId && images.length && draft.is_published),
      })
      metadataSaved = true
      savedId = result.id
      savedDraft = { ...toDraft(result), is_published: draft.is_published }
      setId(savedId)
      setDraft(savedDraft)
      for (const image of pending) {
        uploaded.push(await uploadImage(savedId, image))
        successfulUploads++
      }
      setPending([])
      const final =
        result.is_published !== draft.is_published
          ? await saveProduct(savedId, savedDraft)
          : await getProduct(savedId)
      setDraft(toDraft(final))
      setBaseline(JSON.stringify(toDraft(final)))
      setImages(final.images)
      onSaved(final)
      setNotice(
        final.is_published
          ? "Producto guardado y publicado en la tienda."
          : "Borrador guardado. No aparece en la tienda.",
      )
    } catch (error) {
      if (metadataSaved && savedId) {
        setId(savedId)
        setDraft(savedDraft)
        if (uploaded.length) setImages((current) => [...current, ...uploaded])
        setPending((current) => current.slice(successfulUploads))
      }
      setError(
        `${(error as Error).message}${
          metadataSaved
            ? " Los cambios ya guardados se conservan; podés corregir y volver a intentar."
            : ""
        }`,
      )
    } finally {
      setBusy(false)
    }
  }

  function adjusted(variant: AdminVariant) {
    const stockFields = {
      stock_physical: variant.stock_physical,
      stock_reserved: variant.stock_reserved,
      stock_available: variant.stock_available,
    }
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((item) =>
        item.id === variant.id ? { ...item, ...stockFields } : item,
      ),
    }))
    setBaseline((current) => {
      const data = JSON.parse(current) as ProductDraft
      return JSON.stringify({
        ...data,
        variants: data.variants.map((item) =>
          item.id === variant.id ? { ...item, ...stockFields } : item,
        ),
      })
    })
    setStockVariant(variant)
    setNotice("Ajuste de stock registrado.")
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            {id ? "Editar producto" : "Nuevo producto"}
          </h1>
          <p className="mt-1 text-sm text-charcoal/65">
            Datos, presentaciones y galería. Los productos se ocultan con
            borrador, no se eliminan.
          </p>
        </div>
        <button className={actionClass} onClick={onClose} disabled={busy}>
          Volver al listado
        </button>
      </div>
      <form onSubmit={submit} className="space-y-6" aria-busy={busy}>
        <Notice error message={error} />
        <Notice message={notice} />
        <fieldset
          disabled={busy}
          className="space-y-5 rounded-card border border-sand/30 bg-white p-4 sm:p-6"
        >
          <legend className="sr-only">Información del producto</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                className={inputClass}
                required
                maxLength={160}
                value={draft.name}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    name: e.target.value,
                    slug: !id ? slugify(e.target.value) : current.slug,
                  }))
                }
              />
            </Field>
            <Field label="Identificador URL">
              <input
                className={inputClass}
                required
                pattern="[-a-zA-Z0-9_]+"
                maxLength={50}
                value={draft.slug}
                onChange={(e) => setField("slug", e.target.value)}
              />
            </Field>
            <Field label="Categoría">
              <select
                className={inputClass}
                required
                value={draft.category || ""}
                onChange={(e) => setField("category", Number(e.target.value))}
              >
                <option value="" disabled>
                  Seleccioná una categoría
                </option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {!item.is_active ? " (inactiva)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex flex-col justify-center">
              <Check
                label="Publicar al guardar"
                checked={draft.is_published}
                onChange={(value) => setField("is_published", value)}
              />
              <Check
                label="Destacar en inicio"
                checked={draft.is_featured}
                onChange={(value) => setField("is_featured", value)}
              />
            </div>
          </div>
          <Field label="Descripción">
            <textarea
              className={inputClass}
              rows={3}
              value={draft.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ingredientes">
              <textarea
                className={inputClass}
                rows={2}
                value={draft.ingredients}
                onChange={(e) => setField("ingredients", e.target.value)}
              />
            </Field>
            <Field label="Alérgenos y advertencias">
              <textarea
                className={inputClass}
                rows={2}
                value={draft.allergen_info}
                onChange={(e) => setField("allergen_info", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Conservación">
            <textarea
              className={inputClass}
              rows={2}
              value={draft.storage_instructions}
              onChange={(e) => setField("storage_instructions", e.target.value)}
            />
          </Field>
          <p className="text-xs text-charcoal/65">
            Para hierbas, describí ingredientes, aroma y preparación. No
            incluyas promesas terapéuticas.
          </p>
        </fieldset>
        <section className="space-y-4 rounded-card border border-sand/30 bg-white p-4 sm:p-6">
          <h3 className="font-display text-2xl font-semibold">
            Presentaciones por peso fijo
          </h3>
          <p className="text-sm text-charcoal/65">
            Cada peso tiene su SKU, precio y stock en paquetes. El reservado se
            calcula en Django y no se edita.
          </p>
          <div className="flex flex-wrap gap-2">
            {weights.map((grams) => (
              <button
                type="button"
                key={grams}
                className={actionClass}
                disabled={
                  busy ||
                  draft.variants.some((item) => item.weight_grams === grams)
                }
                onClick={() => addVariant(grams)}
              >
                Agregar {grams} g
              </button>
            ))}
            <button
              type="button"
              className={actionClass}
              onClick={() => addVariant()}
              disabled={busy}
            >
              Otro peso
            </button>
          </div>
          {draft.variants.map((variant, index) => (
            <VariantRow
              key={variant.id ? `saved-${variant.id}` : `new-${index}`}
              variant={variant}
              index={index}
              disabled={busy}
              onChange={(updated) =>
                setField(
                  "variants",
                  draft.variants.map((item, i) =>
                    i === index ? updated : item,
                  ),
                )
              }
              onRemove={() =>
                setField(
                  "variants",
                  draft.variants.filter((_, i) => i !== index),
                )
              }
              onStock={() => {
                if (variant.id) setStockVariant(variant as AdminVariant)
              }}
            />
          ))}
          {!draft.variants.length && (
            <p className="text-sm text-charcoal/65">
              Agregá una presentación para publicar.
            </p>
          )}
        </section>
        <Gallery
          productId={id}
          name={draft.name}
          images={images}
          pending={pending}
          onImages={setImages}
          onPending={setPending}
          disabled={busy}
        />
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-card border border-sand/40 bg-cream p-4 shadow-card">
          <button className={primaryClass} disabled={busy}>
            {busy ? "Guardando producto e imágenes…" : "Guardar producto"}
          </button>
          <span className="text-xs text-charcoal/65">
            {dirty ? "Hay cambios pendientes" : "Sin cambios pendientes"}
          </span>
        </div>
      </form>
      {stockVariant && (
        <StockPanel
          variant={stockVariant}
          onClose={() => setStockVariant(null)}
          onAdjusted={adjusted}
        />
      )}
    </div>
  )
}
