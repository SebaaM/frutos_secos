import { useEffect, useMemo, useRef, useState } from "react"

import { AppShell } from "./components/layout"

import { Button, Icon, Toast } from "./components/ui"

import {
  categoryLabels,
  products as exampleProducts,
  type Product,
  type ProductVariant,
} from "./data/products"

import { fetchCatalog, type CatalogCategory } from "./lib/catalog-api"

import BackofficePage from "./backoffice/BackofficePage"

import BackofficeAccess from "./backoffice/BackofficeAccess"

import { submitOrder, type ApiOrder, type OrderContact } from "./lib/order-api"

import CartPage from "./pages/CartPage"

import CatalogPage from "./pages/CatalogPage"

import HomePage from "./pages/HomePage"

import OrderPage from "./pages/SecureOrderPage"

import OrdersPage from "./pages/SecureOrdersPage"

import ProductPage from "./pages/ProductPage"

import {
  emptyCheckoutDraft,
  type CartLine,
  type ResolvedCartLine,
} from "./lib/cart"

const CART_KEY = "rosana-cart-v1"

function normalizeCart(value: unknown, products: Product[]): CartLine[] {
  if (!Array.isArray(value)) return []

  return value

    .map((line) => {
      const product = products.find((item) => item.id === line.productId)

      const variant = product?.variants.find(
        (item) => item.id === line.variantId,
      )

      if (!product || !variant) return null

      const quantity = Math.max(1, Number(line.quantity) || 1)

      const priceAtAdd = Number(line.priceAtAdd)

      return {
        productId: product.id,

        variantId: variant.id,

        quantity,

        priceAtAdd: Number.isFinite(priceAtAdd) ? priceAtAdd : variant.price,
      }
    })

    .filter((line): line is CartLine => Boolean(line))
}

function readCart(): CartLine[] {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]")

    return Array.isArray(stored)
      ? stored.filter(
          (line) =>
            typeof line?.productId === "string" &&
            typeof line?.variantId === "string" &&
            Number.isInteger(line.quantity) &&
            line.quantity > 0,
        )
      : []
  } catch {
    return []
  }
}

function exampleCategories(): CatalogCategory[] {
  return Object.entries(categoryLabels).map(([slug, name]) => ({
    id: slug,

    slug,

    name,
  }))
}

export default function App() {
  const [location, setLocation] = useState(() => ({
    path: window.location.pathname,

    search: window.location.search,
  }))

  const [products, setProducts] = useState<Product[]>(exampleProducts)

  const [categories, setCategories] =
    useState<CatalogCategory[]>(exampleCategories)

  const [catalogError, setCatalogError] = useState("")

  const [cart, setCart] = useState<CartLine[]>(readCart)

  const [catalogLoaded, setCatalogLoaded] = useState(false)

  const [lastOrder, setLastOrder] = useState<ApiOrder | null>(null)

  const [checkoutDraft, setCheckoutDraft] = useState(emptyCheckoutDraft)

  const [cartNotice, setCartNotice] = useState("")

  const orderAttempt = useRef<{
    payload: string

    key: string
  } | null>(null)

  const [toast, setToast] = useState("")

  const isBackoffice =
    location.path === "/backoffice" || location.path.startsWith("/backoffice/")

  useEffect(() => {
    const onPopState = () =>
      setLocation({
        path: window.location.pathname,

        search: window.location.search,
      })

    window.addEventListener("popstate", onPopState)

    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  useEffect(() => {
    if (isBackoffice) return

    let cancelled = false

    void fetchCatalog()

      .then((catalog) => {
        if (cancelled) return

        setProducts(catalog.products)

        setCategories(catalog.categories)

        setCatalogError("")

        setCatalogLoaded(true)
      })

      .catch(() => {
        if (cancelled) return

        setCatalogError(
          "No pudimos actualizar el catálogo. Mostramos la última información disponible; confirmá disponibilidad por WhatsApp.",
        )
      })

    return () => {
      cancelled = true
    }
  }, [isBackoffice])

  useEffect(() => {
    if (catalogLoaded) setCart((current) => normalizeCart(current, products))
  }, [products, catalogLoaded])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (!toast) return

    const timeout = window.setTimeout(() => setToast(""), 3500)

    return () => window.clearTimeout(timeout)
  }, [toast])

  const navigate = (target: string, replace = false) => {
    const url = new URL(target, window.location.origin)

    if (
      url.pathname === window.location.pathname &&
      url.search === window.location.search
    )
      return

    window.history[replace ? "replaceState" : "pushState"](
      {},

      "",

      `${url.pathname}${url.search}`,
    )

    setLocation({ path: url.pathname, search: url.search })

    window.scrollTo({ top: 0, behavior: "smooth" })

    window.setTimeout(
      () =>
        document.getElementById("main-content")?.focus({ preventScroll: true }),

      0,
    )
  }

  const resolvedLines = useMemo<ResolvedCartLine[]>(
    () =>
      cart.flatMap((line) => {
        const product = products.find((item) => item.id === line.productId)

        const variant = product?.variants.find(
          (item) => item.id === line.variantId,
        )

        if (!product || !variant) return []

        return [
          {
            ...line,

            product,

            variant,

            subtotal: variant.price * line.quantity,

            priceChanged: line.priceAtAdd !== variant.price,

            unavailable: variant.stock <= 0,

            quantityUnavailable: line.quantity > variant.stock,
          },
        ]
      }),

    [cart, products],
  )

  const subtotal = resolvedLines.reduce(
    (total, line) => total + line.subtotal,

    0,
  )

  const count = cart.reduce((total, line) => total + line.quantity, 0)

  const addToCart = (
    product: Product,

    variant: ProductVariant,

    quantity: number,
  ) => {
    setCart((current) => {
      const existing = current.find(
        (line) =>
          line.productId === product.id && line.variantId === variant.id,
      )

      if (!existing)
        return [
          ...current,

          {
            productId: product.id,

            variantId: variant.id,

            quantity,

            priceAtAdd: variant.price,
          },
        ]

      return current.map((line) =>
        line === existing
          ? {
              ...line,

              quantity: Math.min(line.quantity + quantity, variant.stock),
            }
          : line,
      )
    })

    setToast(`${product.name} · ${variant.label} se agregó al carrito.`)
  }

  const updateQuantity = (
    productId: string,

    variantId: string,

    quantity: number,
  ) => {
    setCartNotice("")

    setCart((current) =>
      current.map((line) =>
        line.productId === productId && line.variantId === variantId
          ? { ...line, quantity: Math.max(1, quantity) }
          : line,
      ),
    )

    setToast("Carrito actualizado.")
  }

  const removeLine = (productId: string, variantId: string) => {
    const line = cart.find(
      (item) => item.productId === productId && item.variantId === variantId,
    )

    if (
      line &&
      line.quantity > 1 &&
      !window.confirm(
        `Vas a quitar ${line.quantity} unidades de esta presentación. ¿Querés continuar?`,
      )
    )
      return

    setCartNotice("")

    setCart((current) =>
      current.filter(
        (line) =>
          !(line.productId === productId && line.variantId === variantId),
      ),
    )

    setToast("Producto eliminado del carrito.")
  }

  const createOrder = async (data: OrderContact) => {
    if (!catalogLoaded || catalogError)
      throw new Error(
        "El catálogo no está conectado. Actualizá la página antes de pedir; no enviaremos un pedido con datos de ejemplo.",
      )

    const { addressHelp, ...contact } = data

    const payload = {
      ...contact,

      email: contact.email.toLowerCase(),

      address_help: addressHelp,

      lines: resolvedLines.map((line) => ({
        variant_id: Number(line.variant.id),

        quantity: line.quantity,

        expected_unit_price: line.variant.price.toFixed(2),
      })),
    }

    const serialized = JSON.stringify(payload)

    if (orderAttempt.current?.payload !== serialized)
      orderAttempt.current = { payload: serialized, key: crypto.randomUUID() }

    const order = await submitOrder({
      ...payload,

      idempotency_key: orderAttempt.current.key,
    })

    orderAttempt.current = null

    setLastOrder(order)

    setCart([])

    setCheckoutDraft(emptyCheckoutDraft)

    setCartNotice("")

    navigate(`/pedido/${order.id}`)
  }

  const repeatOrder = (order: ApiOrder) => {
    if (!catalogLoaded || catalogError) {
      setToast("Actualizá el catálogo antes de repetir el pedido.")

      return
    }

    const changes: string[] = []

    const repeatedLines = order.lines.flatMap((line) => {
      const product = products.find(
        (item) => item.id === String(line.product_id_snapshot),
      )

      const variant = product?.variants.find(
        (item) => item.id === String(line.variant_id),
      )

      if (!product || !variant || variant.stock <= 0) {
        changes.push(
          `${line.product_name} ${line.weight_grams} g ya no está disponible.`,
        )

        return []
      }

      if (Number(line.unit_price) !== variant.price)
        changes.push(
          `${line.product_name} ${line.weight_grams} g cambió de precio.`,
        )

      if (line.quantity > variant.stock)
        changes.push(
          `${line.product_name} ${line.weight_grams} g ahora permite ${variant.stock} unidades.`,
        )

      return [
        {
          productId: product.id,

          variantId: variant.id,

          quantity: Math.min(line.quantity, variant.stock),

          priceAtAdd: variant.price,
        },
      ]
    })

    setCart(repeatedLines)

    setCartNotice(
      changes.length
        ? `Revisamos tu selección anterior: ${changes.join(" ")}`
        : "La selección sigue disponible con sus precios actuales.",
    )

    setToast(
      repeatedLines.length
        ? "Selección agregada con precios y disponibilidad actuales. Revisala antes de enviar."
        : "Las presentaciones de ese pedido no están disponibles.",
    )

    navigate("/carrito")
  }

  if (isBackoffice)
    return (
      <BackofficeAccess navigate={navigate} onLogout={() => setLastOrder(null)}>
        {(logout) => <BackofficePage navigate={navigate} logout={logout} />}
      </BackofficeAccess>
    )

  let page

  if (location.path === "/") {
    page = (
      <HomePage
        navigate={navigate}
        products={products}
        categories={categories}
      />
    )
  } else if (location.path === "/catalogo") {
    page = (
      <CatalogPage
        navigate={navigate}
        search={location.search}
        products={products}
        categories={categories}
        catalogError={catalogError}
      />
    )
  } else if (location.path.startsWith("/producto/")) {
    const slug = decodeURIComponent(location.path.replace("/producto/", ""))

    const product = products.find((item) => item.slug === slug)

    page = product ? (
      <ProductPage
        product={product}
        products={products}
        navigate={navigate}
        onAdd={addToCart}
      />
    ) : (
      <NotFound navigate={navigate} />
    )
  } else if (location.path === "/carrito") {
    page = (
      <CartPage
        lines={resolvedLines}
        subtotal={subtotal}
        navigate={navigate}
        updateQuantity={updateQuantity}
        removeLine={removeLine}
        createOrder={createOrder}
        draft={checkoutDraft}
        onDraftChange={setCheckoutDraft}
        notice={cartNotice}
      />
    )
  } else if (location.path === "/mis-pedidos") {
    page = (
      <OrdersPage
        navigate={navigate}
        onRepeat={repeatOrder}
        onLogout={() => setLastOrder(null)}
        onClearLocal={() => {
          setCart([])

          setCheckoutDraft(emptyCheckoutDraft)

          setCartNotice("")

          setToast("Se borraron los datos guardados en este dispositivo.")
        }}
      />
    )
  } else if (location.path.startsWith("/pedido/")) {
    const requestedId = decodeURIComponent(
      location.path.replace("/pedido/", ""),
    )

    page = (
      <OrderPage
        key={requestedId}
        id={requestedId}
        initialOrder={lastOrder?.id === requestedId ? lastOrder : null}
        navigate={navigate}
      />
    )
  } else {
    page = <NotFound navigate={navigate} />
  }

  return (
    <AppShell
      navigate={navigate}
      path={location.path}
      cartCount={count}
      cartSubtotal={subtotal}
      cartLines={resolvedLines}
      updateQuantity={updateQuantity}
      removeLine={removeLine}
    >
      {page}
      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </AppShell>
  )
}

function NotFound({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="page-container py-16">
      <div className="mx-auto max-w-xl rounded-[28px] bg-cream-soft px-6 py-14 text-center">
        <Icon name="leaf" className="mx-auto size-10 text-olive" />
        <h1 className="mt-5 font-display text-4xl font-semibold text-olive-dark">
          Esta página no está en la despensa
        </h1>
        <p className="mt-3 text-sm text-charcoal/65">
          Podés volver al catálogo y seguir eligiendo.
        </p>
        <Button onClick={() => navigate("/catalogo")} className="mt-7">
          Ver productos
        </Button>
      </div>
    </div>
  )
}
