import { useEffect, useState } from "react"
import {
  deleteImage,
  editImage,
  reorderImages,
  type AdminImage,
  type ImageMetadata,
  type PendingImage,
} from "../lib/backoffice-api"
import { actionClass, Field, inputClass, Notice } from "./controls"

function Preview({ image }: { image: PendingImage }) {
  const [source, setSource] = useState(image.image_url)
  useEffect(() => {
    if (!image.file) {
      setSource(image.image_url)
      return
    }
    const url = URL.createObjectURL(image.file)
    setSource(url)
    return () => URL.revokeObjectURL(url)
  }, [image.file, image.image_url])
  return (
    <img
      src={source}
      alt={image.alt_text}
      className="aspect-square w-full rounded-control bg-cream-soft object-cover"
    />
  )
}

function SavedImage({
  image,
  disabled,
  onSave,
  onMove,
  onDelete,
  first,
  last,
}: {
  image: AdminImage
  disabled: boolean
  onSave: (data: ImageMetadata) => Promise<void>
  onMove: (direction: number) => void
  onDelete: () => void
  first: boolean
  last: boolean
}) {
  const [alt, setAlt] = useState(image.alt_text)
  const [credit, setCredit] = useState(image.credit)
  return (
    <article className="min-w-0 space-y-3 rounded-card border border-sand/30 bg-white p-3">
      <img
        src={image.image_url}
        alt={image.alt_text}
        className="aspect-square w-full rounded-control bg-cream-soft object-cover"
      />
      <p className="text-xs font-bold text-olive">
        {first ? "Portada" : `Imagen ${image.position + 1}`}
      </p>
      <Field label="Descripción de la imagen">
        <input
          className={inputClass}
          value={alt}
          maxLength={255}
          onChange={(e) => setAlt(e.target.value)}
          disabled={disabled}
        />
      </Field>
      <Field label="Crédito (opcional)">
        <input
          className={inputClass}
          value={credit}
          maxLength={160}
          onChange={(e) => setCredit(e.target.value)}
          disabled={disabled}
        />
      </Field>
      <button
        type="button"
        className={`${actionClass} w-full`}
        onClick={() => void onSave({ alt_text: alt.trim(), credit })}
        disabled={
          disabled ||
          !alt.trim() ||
          (alt === image.alt_text && credit === image.credit)
        }
      >
        Guardar descripción
      </button>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={actionClass}
          disabled={disabled || first}
          onClick={() => onMove(-1)}
          aria-label={`Mover imagen ${image.position + 1} antes`}
        >
          ←
        </button>
        <button
          type="button"
          className={actionClass}
          disabled={disabled || last}
          onClick={() => onMove(1)}
          aria-label={`Mover imagen ${image.position + 1} después`}
        >
          →
        </button>
        <button
          type="button"
          className={`${actionClass} text-terracotta-dark`}
          disabled={disabled}
          onClick={onDelete}
        >
          Quitar
        </button>
      </div>
    </article>
  )
}

export default function Gallery({
  productId,
  name,
  images,
  pending,
  onImages,
  onPending,
  disabled,
}: {
  productId?: number
  name: string
  images: AdminImage[]
  pending: PendingImage[]
  onImages: (images: AdminImage[]) => void
  onPending: (images: PendingImage[]) => void
  disabled: boolean
}) {
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const total = images.length + pending.length

  function addFiles(files: FileList | null) {
    if (!files) return
    const selection = Array.from(files)
    if (
      selection.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setError("Elegí archivos JPEG, PNG o WebP, de hasta 5 MB cada uno.")
      return
    }
    if (total + selection.length > 10) {
      setError("Se admiten hasta 10 imágenes por producto.")
      return
    }
    setError("")
    onPending([
      ...pending,
      ...selection.map((file) => ({
        key: crypto.randomUUID(),
        file,
        image_url: "",
        alt_text: name || "",
        credit: "",
      })),
    ])
  }
  function addUrl() {
    try {
      if (!["https:", "http:"].includes(new URL(url).protocol))
        throw new Error()
    } catch {
      setError("Ingresá una URL completa http o https.")
      return
    }
    if (total >= 10) {
      setError("Se admiten hasta 10 imágenes por producto.")
      return
    }
    onPending([
      ...pending,
      {
        key: crypto.randomUUID(),
        image_url: url,
        alt_text: name || "",
        credit: "",
      },
    ])
    setUrl("")
    setError("")
  }
  async function execute(work: () => Promise<void>) {
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await work()
      setNotice("Galería actualizada. Este cambio ya está guardado.")
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setBusy(false)
    }
  }
  function move(image: AdminImage, direction: number) {
    if (!productId) return
    const ids = images.map((item) => item.id)
    const index = ids.indexOf(image.id)
    ;[ids[index], ids[index + direction]] = [ids[index + direction], ids[index]]
    void execute(async () => onImages(await reorderImages(productId, ids)))
  }
  function remove(image: AdminImage) {
    if (
      !window.confirm(
        "¿Quitar esta imagen de la galería? El archivo local se conserva para recuperación.",
      )
    )
      return
    void execute(async () => {
      await deleteImage(image.id)
      onImages(
        images
          .filter((item) => item.id !== image.id)
          .map((item, position) => ({ ...item, position })),
      )
    })
  }

  return (
    <section className="space-y-4 rounded-card border border-sand/30 bg-cream/50 p-4 sm:p-5">
      <div>
        <h3 className="font-display text-2xl font-semibold">
          Imágenes · {total}/10
        </h3>
        <p className="mt-1 text-sm text-charcoal/65">
          La primera es la portada. Archivos JPEG, PNG o WebP de hasta 5 MB, o
          URLs existentes.
        </p>
      </div>
      <Notice error message={error} />
      <Notice message={notice} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Seleccionar imágenes"
          hint="Podés elegir varias. Se subirán al guardar el producto."
        >
          <input
            className={inputClass}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || busy || total >= 10}
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ""
            }}
          />
        </Field>
        <Field label="Agregar desde URL">
          <div className="flex flex-wrap gap-2">
            <input
              className={`${inputClass} flex-1`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={disabled || busy}
              placeholder="https://…"
            />
            <button
              type="button"
              className={actionClass}
              onClick={addUrl}
              disabled={disabled || busy || !url || total >= 10}
            >
              Agregar URL
            </button>
          </div>
        </Field>
      </div>
      {images.length > 0 && (
        <p className="text-xs text-charcoal/65">
          Orden, descripciones y eliminación de imágenes existentes se guardan
          inmediatamente. Para quitar la última imagen de un producto publicado,
          primero guardalo como borrador.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((image, index) => (
          <SavedImage
            key={image.id}
            image={image}
            disabled={disabled || busy}
            first={index === 0}
            last={index === images.length - 1}
            onMove={(direction) => move(image, direction)}
            onDelete={() => remove(image)}
            onSave={(data) =>
              execute(async () => {
                const updated = await editImage(image.id, data)
                onImages(
                  images.map((item) =>
                    item.id === updated.id ? updated : item,
                  ),
                )
              })
            }
          />
        ))}
        {pending.map((image) => (
          <article
            key={image.key}
            className="min-w-0 space-y-3 rounded-card border-2 border-dashed border-olive/50 bg-white p-3"
          >
            <Preview image={image} />
            <p className="text-xs font-bold text-terracotta">
              Pendiente de guardar
            </p>
            <Field label="Descripción de la imagen">
              <input
                className={inputClass}
                required
                maxLength={255}
                value={image.alt_text}
                onChange={(e) =>
                  onPending(
                    pending.map((item) =>
                      item.key === image.key
                        ? { ...item, alt_text: e.target.value }
                        : item,
                    ),
                  )
                }
                disabled={disabled || busy}
              />
            </Field>
            <Field label="Crédito (opcional)">
              <input
                className={inputClass}
                maxLength={160}
                value={image.credit}
                onChange={(e) =>
                  onPending(
                    pending.map((item) =>
                      item.key === image.key
                        ? { ...item, credit: e.target.value }
                        : item,
                    ),
                  )
                }
                disabled={disabled || busy}
              />
            </Field>
            <button
              type="button"
              className={actionClass}
              disabled={disabled || busy}
              onClick={() =>
                onPending(pending.filter((item) => item.key !== image.key))
              }
            >
              Quitar selección
            </button>
          </article>
        ))}
      </div>
      {total === 0 && (
        <p className="text-sm text-charcoal/65">
          Agregá al menos una imagen antes de publicar.
        </p>
      )}
    </section>
  )
}
