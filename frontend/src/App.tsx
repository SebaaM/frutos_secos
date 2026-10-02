import { useEffect, useMemo, useState } from "react"
import { AppShell } from "./components/layout"
import { Button, Icon, Toast } from "./components/ui"
import {
  categoryLabels,
  products as exampleProducts,
  type Product,
  type ProductVariant,
} from "./data/products"
import { fetchCatalog, type CatalogCategory } from "./lib/catalog-api"
import CartPage, {
  type CartLine,
  type DeliveryMethod,
  type Order,
  type ResolvedCartLine,
} from "./pages/CartPage"
import CatalogPage from "./pages/CatalogPage"
import HomePage from "./pages/HomePage"
import OrderPage, { buildWhatsAppMessage } from "./pages/OrderPage"
import OrdersPage from "./pages/OrdersPage"
import ProductPage from "./pages/ProductPage"

const CART_KEY = "rosana-cart-v1"
const ORDER_KEY = "rosana-last-order-v1"
const ORDER_HISTORY_KEY = "rosana-order-history-v1"

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

function readCart(products: Product[]): CartLine[] {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]")
    return normalizeCart(stored, products)
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

function readOrder(): Order | null {
  try {
    const stored = sessionStorage.getItem(ORDER_KEY)
    return stored ? JSON.parse(stored) as Order : null
  } catch {
    return null
  }
}

function readOrderHistory(): Order[] {
  try {
    const stored = JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY) ?? "[]")
    return Array.isArray(stored)
      ? stored.filter((order) => order?.id && typeof order.email === "string")
      : []
  } catch {
    return []
  }
}

export default function App() {
  const [location, setLocation] = useState(() => ({
    path: window.location.pathname,
    search: window.location.search,
  }))
  const [products, setProducts] = useState<Product[]>(exampleProducts)
  const [categories, setCategories] = useState<CatalogCategory[]>(exampleCategories)
  const [catalogError, setCatalogError] = useState("")
  const [cart, setCart] = useState<CartLine[]>(() => readCart(exampleProducts))
  const [lastOrder, setLastOrder] = useState<Order | null>(readOrder)
  const [orderHistory, setOrderHistory] = useState<Order[]>(readOrderHistory)
  const [toast, setToast] = useState("")

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
    let cancelled = false

    void fetchCatalog()
      .then((catalog) => {
        if (cancelled) return
        setProducts(catalog.products)
        setCategories(catalog.categories)
        setCatalogError("")
      })
      .catch(() => {
        if (cancelled) return
        setCatalogError(
          "No pudimos actualizar el catálogo. Mostramos los productos de ejemplo.",
        )
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setCart((current) => normalizeCart(current, products))
  }, [products])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(orderHistory))
  }, [orderHistory])

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
    [cart],
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

  const createOrder = (data: {
    delivery: DeliveryMethod
    address: string
    addressHelp: string
    name: string
    phone: string
    email: string
  }) => {
    const order: Order = {
      id: `RF-${Date.now().toString().slice(-6)}`,
      lines: resolvedLines.map((line) => ({
        product: line.product,
        variant: line.variant,
        quantity: line.quantity,
        subtotal: line.subtotal,
      })),
      subtotal,
      delivery: data.delivery,
      address: data.address,
      addressHelp: data.addressHelp,
      name: data.name,
      phone: data.phone,
      email: data.email,
      createdAt: new Date().toISOString(),
      status: "pending",
    }
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(order))
    setOrderHistory((current) => [
      order,
      ...current.filter((item) => item.id !== order.id),
    ])
    const emailEndpoint = import.meta.env.VITE_ORDER_EMAIL_ENDPOINT
    if (emailEndpoint && order.email) {
      void fetch(emailEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: order.email,
          orderNumber: order.id,
          order,
        }),
      })
    }
    const whatsAppNumber =
      import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, "") || "2901528149"
    window.open(
      `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(buildWhatsAppMessage(order))}`,
      "_blank",
      "noopener,noreferrer",
    )
    setLastOrder(order)
    setCart([])
    navigate(`/pedido/${order.id}`)
  }

  const repeatOrder = (order: Order) => {
    const repeatedLines = order.lines.flatMap((line) => {
      const product = products.find((item) => item.id === line.product.id)
      const variant = product?.variants.find(
        (item) => item.id === line.variant.id,
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
    setToast("El pedido se agregó nuevamente al carrito.")
    navigate("/carrito")
  }

  let page
  if (location.path === "/") {
    page = <HomePage navigate={navigate} products={products} categories={categories} />
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
        orders={orderHistory}
        navigate={navigate}
        onRepeat={repeatOrder}
      />
    )
  } else if (location.path.startsWith("/pedido/")) {
    const requestedId = decodeURIComponent(
      location.path.replace("/pedido/", ""),
    )
    page = (
      <OrderPage
        order={
          orderHistory.find((order) => order.id === requestedId) ??
          (lastOrder?.id === requestedId ? lastOrder : null)
        }
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
