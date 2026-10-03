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

import CartPage, {
  type CartLine,
  type ResolvedCartLine,
} from "./pages/CartPage"

import CatalogPage from "./pages/CatalogPage"

import HomePage from "./pages/HomePage"

import OrderPage from "./pages/SecureOrderPage"

import OrdersPage from "./pages/SecureOrdersPage"

import ProductPage from "./pages/ProductPage"

const CART_KEY = "rosana-cart-v1"

function normalizeCart(value: unknown, products: Product[]): CartLine[] {
  if (!Array.isArray(value)) return []

  return value

    .map((line) => {
      const product = products.find((item) => item.id === line.productId)

      const variant = product?.variants.find(
        (item) => item.id === line.variantId,
      )

      if (!product || !variant || variant.stock <= 0) return null

      const quantity = Math.max(
        1,

        Math.min(Number(line.quantity) || 1, variant.stock),
      )

      return { productId: product.id, variantId: variant.id, quantity }
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

  const navigate = (target: string) => {
    const url = new URL(target, window.location.origin)

    if (
      url.pathname === window.location.pathname &&
      url.search === window.location.search
    )
      return

    window.history.pushState({}, "", `${url.pathname}${url.search}`)

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

          { productId: product.id, variantId: variant.id, quantity },
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
    setCart((current) =>
      current.map((line) =>
        line.productId === productId && line.variantId === variantId
          ? { ...line, quantity }
          : line,
      ),
    )

    setToast("Carrito actualizado.")
  }

  const removeLine = (productId: string, variantId: string) => {
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

    navigate(`/pedido/${order.id}`)
  }

  const repeatOrder = (order: ApiOrder) => {
    if (!catalogLoaded || catalogError) {
      setToast("Actualizá el catálogo antes de repetir el pedido.")
      return
    }

    const repeatedLines = order.lines.flatMap((line) => {
      const product = products.find(
        (item) => item.id === String(line.product_id_snapshot),
      )

      const variant = product?.variants.find(
        (item) => item.id === String(line.variant_id),
      )

      if (!product || !variant || variant.stock <= 0) return []

      return [
        {
          productId: product.id,

          variantId: variant.id,

          quantity: Math.min(line.quantity, variant.stock),
        },
      ]
    })

    setCart(repeatedLines)

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
      />
    )
  } else if (location.path === "/mis-pedidos") {
    page = (
      <OrdersPage
        navigate={navigate}
        onRepeat={repeatOrder}
        onLogout={() => setLastOrder(null)}
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
