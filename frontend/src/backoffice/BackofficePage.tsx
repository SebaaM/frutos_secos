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

import StockBadge from "./StockBadge"

import OrdersBoard from "./OrdersBoard"

import {
  matchesStockFilter,
  productStock,
  variantStockState,
} from "./stock-status"

import {
  actionClass,
  Field,
  inputClass,
  Notice,
  primaryClass,
} from "./controls"

export default function BackofficePage({
  navigate,

  logout,
}: {
  navigate: (path: string) => void

  logout: () => Promise<void>
}) {
  const [products, setProducts] = useState<AdminProduct[]>([])

  const [categories, setCategories] = useState<AdminCategory[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState("")

  const [notice, setNotice] = useState("")

  const [tab, setTab] = useState("orders")

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

    return (
      (!query ||
        product.name.toLocaleLowerCase("es").includes(query) ||
        product.variants.some((item) =>
          item.sku.toLocaleLowerCase("es").includes(query),
        )) &&
      (!category || product.category === Number(category)) &&
      (!published || product.is_published === (published === "true")) &&
      matchesStockFilter(product.variants, stock)
    )
  })

  const attentionCount = products.filter(
    (product) => productStock(product.variants).needsAttention,
  ).length

  const outCount = products.filter(
    (product) => productStock(product.variants).state === "out",
  ).length

  const partialCount = products.filter(
    (product) => productStock(product.variants).state === "partial",
  ).length

  const lowCount = products.filter(
    (product) => productStock(product.variants).low > 0,
  ).length

  function showStock(filter: string) {
    setSearch("")

    setCategory("")

    setPublished("")

    setStock(filter)
  }

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
              Catálogo, inventario y pedidos
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
          <button
            className={actionClass}
            disabled={saving}
            onClick={async () => {
              if (!mayLeave()) return

              try {
                await logout()
              } catch (error) {
                setError((error as Error).message)
              }
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main
        id="backoffice-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-9"
      >
        <p className="text-xs text-charcoal/65">
          Sesión de operador · entorno local
        </p>
        <nav
          className="flex flex-wrap gap-2"
          aria-label="Secciones del backoffice"
        >
          <button
            className={tab === "orders" ? primaryClass : actionClass}
            disabled={saving}
            onClick={() => changeTab("orders")}
            aria-current={tab === "orders" ? "page" : undefined}
          >
            Pedidos
          </button>
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
        {tab === "orders" && (
          <OrdersBoard onDirty={setDirty} onBusy={setSaving} />
        )}
        {loading && tab !== "orders" && (
          <p role="status">Cargando catálogo administrativo…</p>
        )}
        {!loading &&
          !error &&
          tab !== "orders" &&
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
              {attentionCount > 0 && (
                <section
                  className="space-y-3 rounded-card border-2 border-terracotta/50 bg-terracotta-soft p-4"
                  aria-label="Alertas de stock"
                >
                  <div>
                    <h2 className="text-lg font-bold text-terracotta-dark">
                      {attentionCount}{" "}
                      {attentionCount === 1
                        ? "producto necesita"
                        : "productos necesitan"}{" "}
                      atención de stock
                    </h2>
                    <p className="mt-1 text-sm text-terracotta-dark">
                      Revisá cada peso: puede estar agotado aunque otro tenga
                      unidades. Últimas unidades: 1–5 paquetes disponibles.
                    </p>
                    <p className="mt-1 text-xs text-terracotta-dark">
                      Incluye publicados y borradores de todo el catálogo. Una
                      presentación inactiva no genera alertas.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={primaryClass}
                      aria-pressed={stock === "attention"}
                      onClick={() => showStock("attention")}
                    >
                      Ver productos por reponer
                    </button>
                    {outCount > 0 && (
                      <button
                        className={actionClass}
                        aria-pressed={stock === "out"}
                        onClick={() => showStock("out")}
                      >
                        Sin stock ({outCount})
                      </button>
                    )}
                    {partialCount > 0 && (
                      <button
                        className={actionClass}
                        aria-pressed={stock === "partial"}
                        onClick={() => showStock("partial")}
                      >
                        Stock parcial ({partialCount})
                      </button>
                    )}
                    {lowCount > 0 && (
                      <button
                        className={actionClass}
                        aria-pressed={stock === "low"}
                        onClick={() => showStock("low")}
                      >
                        Últimas unidades ({lowCount})
                      </button>
                    )}
                  </div>
                </section>
              )}
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
                    <option value="attention">
                      Por reponer (agotados o pocos)
                    </option>
                    <option value="low">Últimas unidades (1–5)</option>
                    <option value="out">Sin stock</option>
                    <option value="partial">
                      Stock parcial (algún peso agotado)
                    </option>
                  </select>
                </Field>
              </section>
              <p className="text-sm text-charcoal/65" role="status">
                {filtered.length} resultados
              </p>
              <div className="space-y-3">
                {filtered.map((product) => {
                  const inventory = productStock(product.variants)

                  return (
                    <article
                      key={product.id}
                      className={`flex min-w-0 flex-col gap-4 rounded-card border-l-4 border border-sand/30 bg-white p-4 sm:flex-row sm:items-center ${
                        inventory.state === "out" ||
                        inventory.state === "partial"
                          ? "border-l-terracotta"
                          : inventory.state === "low"
                            ? "border-l-stock-warning"
                            : "border-l-sand/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex min-w-0 items-start gap-3">
                          {product.images[0] ? (
                            <img
                              className="size-16 shrink-0 rounded-control bg-cream-soft object-cover sm:size-20"
                              src={product.images[0].image_url}
                              alt={product.images[0].alt_text}
                            />
                          ) : (
                            <div className="grid size-16 shrink-0 place-items-center rounded-control bg-cream-soft text-center text-xs sm:size-20">
                              Sin imagen
                            </div>
                          )}
                          <div className="min-w-0 space-y-2">
                            <h2 className="break-words font-display text-xl font-semibold text-olive-dark">
                              {product.name}
                            </h2>
                            <StockBadge state={inventory.state} />
                            <p className="text-xs text-charcoal/65">
                              {
                                categories.find(
                                  (item) => item.id === product.category,
                                )?.name
                              }{" "}
                              ·{" "}
                              {product.is_published ? "Publicado" : "Borrador"}
                              {product.is_featured ? " · Destacado" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {product.variants.map((item) => (
                            <div
                              key={item.id}
                              className="space-y-2 rounded-control border border-sand/30 bg-cream/60 p-3 text-xs"
                            >
                              <p className="font-bold">
                                {item.weight_grams} g ·{" "}
                                {formatPrice(Number(item.price))}
                              </p>
                              <StockBadge
                                state={variantStockState(item)}
                                label={!item.is_active ? "Inactiva" : undefined}
                              />
                              <p>
                                <strong className="text-base tabular-nums">
                                  {item.stock_available}
                                </strong>{" "}
                                paquetes disponibles
                              </p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-charcoal/65">
                          {product.images.length} imágenes · Disponible:{" "}
                          <strong>{inventory.available}</strong> paquetes en
                          pesos activos · Reservado:{" "}
                          {product.variants.reduce(
                            (sum, item) => sum + item.stock_reserved,

                            0,
                          )}
                        </p>
                        {inventory.needsAttention && (
                          <p
                            className={`text-sm font-semibold ${
                              inventory.out > 0
                                ? "text-terracotta-dark"
                                : "text-stock-warning"
                            }`}
                          >
                            {inventory.out > 0 &&
                              `${inventory.out} ${
                                inventory.out === 1
                                  ? "presentación agotada"
                                  : "presentaciones agotadas"
                              }. `}
                            {inventory.low > 0 &&
                              `${inventory.low} ${
                                inventory.low === 1
                                  ? "presentación con pocas unidades"
                                  : "presentaciones con pocas unidades"
                              }.`}
                          </p>
                        )}
                      </div>
                      <button
                        className={actionClass}
                        onClick={() => openEditor(product)}
                        aria-label={`Editar producto ${product.name}`}
                      >
                        {inventory.needsAttention
                          ? "Revisar stock y producto"
                          : "Editar producto"}
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
