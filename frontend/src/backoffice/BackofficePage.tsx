import { useCallback, useEffect, useState } from "react"
import { formatPrice } from "../data/products"
import {
  listCategories,
  listProducts,
  type AdminCategory,
  type AdminProduct,
} from "../lib/backoffice-api"
import Categories from "./Categories"
import ProductEditor from "./ProductEditor"
import {
  actionClass,
  Field,
  inputClass,
  Notice,
  primaryClass,
} from "./controls"

export default function BackofficePage({
  navigate,
}: {
  navigate: (path: string) => void
}) {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [tab, setTab] = useState("products")
  const [editor, setEditor] = useState<{
    key: string
    product: AdminProduct | null
  } | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [published, setPublished] = useState("")
  const [stock, setStock] = useState("")

  const reload = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [newProducts, newCategories] = await Promise.all([
        listProducts(),
        listCategories(),
      ])
      setProducts(newProducts)
      setCategories(newCategories)
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void reload()
  }, [reload])
  function mayLeave() {
    return (
      !saving &&
      (!dirty ||
        window.confirm(
          "Hay cambios pendientes de guardar. ¿Querés salir y descartarlos?",
        ))
    )
  }
  function changeTab(next: string) {
    if (mayLeave()) {
      setEditor(null)
      setDirty(false)
      setTab(next)
      setNotice("")
      void reload()
    }
  }
  function openEditor(product: AdminProduct | null) {
    setEditor({ key: crypto.randomUUID(), product })
    setDirty(false)
    setNotice("")
    window.scrollTo({ top: 0 })
  }
  function productSaved(product: AdminProduct) {
    setProducts((current) =>
      [...current.filter((item) => item.id !== product.id), product].sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    )
  }
  function categorySaved(category: AdminCategory) {
    setCategories((current) =>
      [...current.filter((item) => item.id !== category.id), category].sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    )
  }
  const filtered = products.filter((product) => {
    const query = search.trim().toLocaleLowerCase("es")
    const variants = product.variants.filter((item) => item.is_active)
    return (
      (!query ||
        product.name.toLocaleLowerCase("es").includes(query) ||
        product.variants.some((item) =>
          item.sku.toLocaleLowerCase("es").includes(query),
        )) &&
      (!category || product.category === Number(category)) &&
      (!published || product.is_published === (published === "true")) &&
      (!stock ||
        (stock === "out"
          ? variants.every((item) => item.stock_available === 0)
          : stock === "low"
            ? variants.some(
                (item) => item.stock_available > 0 && item.stock_available <= 5,
              )
            : variants.some((item) => item.stock_available > 0)))
    )
  })

  return (
    <div className="min-h-screen bg-cream">
      <a
        href="#backoffice-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3"
      >
        Ir al contenido
      </a>
      <header className="border-b border-sand/30 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <div>
            <p className="font-display text-2xl font-semibold text-olive-dark">
              Rosana{" "}
              <span className="font-sans text-xs font-bold tracking-widest uppercase">
                Backoffice
              </span>
            </p>
            <p className="text-xs text-charcoal/65">
              Administración de catálogo
            </p>
          </div>
          <button
            className={actionClass}
            disabled={saving}
            onClick={() => {
              if (mayLeave()) navigate("/catalogo")
            }}
          >
            Ver tienda
          </button>
        </div>
      </header>
      <main
        id="backoffice-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-9"
      >
        <Notice message="Acceso temporal sin autenticación: solo para desarrollo local. No habilitar este panel en producción." />
        <nav
          className="flex flex-wrap gap-2"
          aria-label="Secciones del backoffice"
        >
          <button
            className={tab === "products" ? primaryClass : actionClass}
            disabled={saving}
            onClick={() => changeTab("products")}
            aria-current={tab === "products" ? "page" : undefined}
          >
            Productos
          </button>
          <button
            className={tab === "categories" ? primaryClass : actionClass}
            disabled={saving}
            onClick={() => changeTab("categories")}
            aria-current={tab === "categories" ? "page" : undefined}
          >
            Categorías
          </button>
        </nav>
        <Notice error message={error} />
        <Notice message={notice} />
        {error && (
          <button
            className={actionClass}
            onClick={() => void reload()}
            disabled={loading}
          >
            Reintentar conexión
          </button>
        )}
        {loading && <p role="status">Cargando catálogo administrativo…</p>}
        {!loading &&
          !error &&
          (editor ? (
            <ProductEditor
              key={editor.key}
              product={editor.product}
              categories={categories}
              onSaved={productSaved}
              onDirty={setDirty}
              onBusy={setSaving}
              onClose={() => {
                if (mayLeave()) {
                  setEditor(null)
                  setDirty(false)
                  void reload()
                }
              }}
            />
          ) : tab === "categories" ? (
            <Categories
              categories={categories}
              onSaved={categorySaved}
              onDirty={setDirty}
              onBusy={setSaving}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-display text-3xl font-semibold text-olive-dark">
                    Productos
                  </h1>
                  <p className="mt-1 text-sm text-charcoal/65">
                    {products.length} productos · Variantes e imágenes
                    conservadas
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={actionClass} onClick={() => void reload()}>
                    Actualizar
                  </button>
                  <button
                    className={primaryClass}
                    onClick={() => openEditor(null)}
                  >
                    Nuevo producto
                  </button>
                </div>
              </div>
              <section
                className="grid gap-4 rounded-card border border-sand/30 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
                aria-label="Filtros de productos"
              >
                <Field label="Buscar nombre o SKU">
                  <input
                    type="search"
                    className={inputClass}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Almendras, MENTA-50…"
                  />
                </Field>
                <Field label="Categoría">
                  <select
                    className={inputClass}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Publicación">
                  <select
                    className={inputClass}
                    value={published}
                    onChange={(e) => setPublished(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="true">Publicados</option>
                    <option value="false">Borradores</option>
                  </select>
                </Field>
                <Field label="Disponibilidad">
                  <select
                    className={inputClass}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  >
                    <option value="">Todo el stock</option>
                    <option value="available">Con stock</option>
                    <option value="low">Últimas unidades (1–5)</option>
                    <option value="out">Sin stock</option>
                  </select>
                </Field>
              </section>
              <p className="text-sm text-charcoal/65" role="status">
                {filtered.length} resultados
              </p>
              <div className="space-y-3">
                {filtered.map((product) => {
                  const active = product.variants.filter(
                    (item) => item.is_active,
                  )
                  const available = active.reduce(
                    (sum, item) => sum + item.stock_available,
                    0,
                  )
                  return (
                    <article
                      key={product.id}
                      className="flex min-w-0 flex-col gap-4 rounded-card border border-sand/30 bg-white p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        {product.images[0] ? (
                          <img
                            className="size-20 shrink-0 rounded-control bg-cream-soft object-cover"
                            src={product.images[0].image_url}
                            alt={product.images[0].alt_text}
                          />
                        ) : (
                          <div className="grid size-20 shrink-0 place-items-center rounded-control bg-cream-soft text-center text-xs">
                            Sin imagen
                          </div>
                        )}
                        <div className="min-w-0 space-y-2">
                          <h2 className="break-words font-display text-xl font-semibold text-olive-dark">
                            {product.name}
                          </h2>
                          <p className="text-xs text-charcoal/65">
                            {
                              categories.find(
                                (item) => item.id === product.category,
                              )?.name
                            }{" "}
                            · {product.is_published ? "Publicado" : "Borrador"}
                            {product.is_featured ? " · Destacado" : ""}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {product.variants.map((item) => (
                              <span
                                key={item.id}
                                className="rounded-lg bg-cream-soft px-2 py-1 text-xs"
                              >
                                {item.weight_grams} g ·{" "}
                                {formatPrice(Number(item.price))}
                                {!item.is_active ? " · Inactiva" : ""}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-charcoal/65">
                            {product.images.length} imágenes · Disponible:{" "}
                            <strong>{available}</strong> paquetes · Reservado:{" "}
                            {product.variants.reduce(
                              (sum, item) => sum + item.stock_reserved,
                              0,
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        className={actionClass}
                        onClick={() => openEditor(product)}
                        aria-label={`Editar producto ${product.name}`}
                      >
                        Editar producto
                      </button>
                    </article>
                  )
                })}
              </div>
              {!filtered.length && (
                <div className="rounded-card bg-white p-8 text-center">
                  <p>No hay productos para estos filtros.</p>
                  <button
                    className={`${actionClass} mt-4`}
                    onClick={() => {
                      setSearch("")
                      setCategory("")
                      setPublished("")
                      setStock("")
                    }}
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </>
          ))}
      </main>
    </div>
  )
}
