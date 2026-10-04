import { useEffect, useRef, useState, type ReactNode } from "react"

import { QuantityStepper } from "./product"

import { formatPrice } from "../data/products"

import { cartLineNeedsReview, type ResolvedCartLine } from "../lib/cart"

import { Button, Icon } from "./ui"

export type Navigate = (path: string, replace?: boolean) => void

function BrandMark({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2 rounded-lg text-left focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-olive"
      aria-label="Rosana, ir al inicio"
    >
      <span className="grid size-9 place-items-center rounded-full bg-olive text-white">
        <Icon name="leaf" className="size-5" />
      </span>
      <span>
        <span className="block font-display text-[26px] leading-none font-bold text-olive-dark">
          Rosana
        </span>
        <span className="hidden text-[9px] font-bold tracking-[0.18em] text-terracotta uppercase sm:block">
          Frutos secos
        </span>
      </span>
    </button>
  )
}

function NavLink({
  active,

  children,

  onClick,
}: {
  active: boolean

  children: ReactNode

  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-lg px-3 text-sm font-bold transition focus-visible:outline-3 focus-visible:outline-olive ${
        active ? "text-terracotta-dark" : "text-olive-dark hover:bg-cream-soft"
      }`}
    >
      {children}
    </button>
  )
}

export function AppShell({
  children,

  navigate,

  path,

  cartCount,

  cartSubtotal,

  cartLines,

  updateQuantity,

  removeLine,
}: {
  children: ReactNode

  navigate: Navigate

  path: string

  cartCount: number

  cartSubtotal: number

  cartLines: ResolvedCartLine[]

  updateQuantity: (
    productId: string,
    variantId: string,
    quantity: number,
  ) => void

  removeLine: (productId: string, variantId: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const [cartOpen, setCartOpen] = useState(false)

  const cartButtonRef = useRef<HTMLButtonElement>(null)

  const closeCart = () => {
    setCartOpen(false)

    window.setTimeout(() => cartButtonRef.current?.focus(), 0)
  }

  const go = (target: string) => {
    setMenuOpen(false)

    setCartOpen(false)

    navigate(target)
  }

  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <div className="bg-olive-dark px-4 py-2 text-center text-[11px] font-semibold tracking-wide text-white sm:text-xs">
        Retiro y entrega local <span className="mx-1 text-white/45">·</span>{" "}
        Confirmamos cada pedido por WhatsApp
      </div>
      <header className="sticky top-0 z-40 border-b border-sand/20 bg-cream/95 backdrop-blur-xl">
        <div className="page-container flex min-h-18 items-center justify-between gap-4">
          <BrandMark onClick={() => go("/")} />
          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-1 md:flex"
          >
            <NavLink active={path === "/"} onClick={() => go("/")}>
              Inicio
            </NavLink>
            <NavLink
              active={
                path.startsWith("/catalogo") || path.startsWith("/producto")
              }
              onClick={() => go("/catalogo")}
            >
              Catálogo
            </NavLink>
            <NavLink
              active={path.startsWith("/mis-pedidos")}
              onClick={() => go("/mis-pedidos")}
            >
              Mis pedidos
            </NavLink>
            <NavLink
              active={false}
              onClick={() => {
                go("/")

                window.setTimeout(
                  () =>
                    document

                      .getElementById("como-comprar")

                      ?.scrollIntoView({ behavior: "smooth" }),

                  50,
                )
              }}
            >
              Cómo comprar
            </NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <Button
                variant="secondary"
                icon="whatsapp"
                onClick={() =>
                  window.open(
                    "https://wa.me/?text=Hola%2C%20quiero%20hacer%20una%20consulta%20a%20Rosana.",

                    "_blank",

                    "noopener,noreferrer",
                  )
                }
              >
                WhatsApp
              </Button>
            </div>
            <button
              ref={cartButtonRef}
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative grid size-11 place-items-center rounded-full bg-olive text-white transition hover:bg-olive-dark focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
              aria-label={`Ver carrito, ${cartCount} artículos`}
            >
              <Icon name="bag" />
              {cartCount > 0 ? (
                <span className="absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-terracotta px-1 text-[10px] font-bold text-white ring-2 ring-cream">
                  {cartCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="grid size-11 place-items-center rounded-full text-olive-dark hover:bg-cream-soft focus-visible:outline-3 focus-visible:outline-olive md:hidden"
            >
              <Icon name={menuOpen ? "x" : "menu"} />
            </button>
          </div>
        </div>
        {menuOpen ? (
          <nav
            aria-label="Navegación móvil"
            className="border-t border-sand/20 bg-white p-4 md:hidden"
          >
            <div className="flex flex-col items-stretch">
              <NavLink active={path === "/"} onClick={() => go("/")}>
                Inicio
              </NavLink>
              <NavLink
                active={path.startsWith("/catalogo")}
                onClick={() => go("/catalogo")}
              >
                Catálogo
              </NavLink>
              <NavLink
                active={path.startsWith("/mis-pedidos")}
                onClick={() => go("/mis-pedidos")}
              >
                Mis pedidos
              </NavLink>
              <NavLink
                active={false}
                onClick={() => {
                  go("/")

                  window.setTimeout(
                    () =>
                      document

                        .getElementById("como-comprar")

                        ?.scrollIntoView({ behavior: "smooth" }),

                    50,
                  )
                }}
              >
                Cómo comprar
              </NavLink>
            </div>
          </nav>
        ) : null}
      </header>

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>

      <footer className="mt-16 bg-olive-dark text-white md:mt-24">
        <div className="page-container grid gap-10 py-12 md:grid-cols-[1.2fr_1fr_1fr] md:py-16">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-white/10">
                <Icon name="leaf" />
              </span>
              <span className="font-display text-3xl font-bold">Rosana</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              Frutos secos, mixes y hierbas elegidos con atención.
              Presentaciones simples y trato de barrio.
            </p>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-bold tracking-widest uppercase">
              Encontranos
            </h2>
            <ul className="space-y-3 text-sm text-white/75">
              <li className="flex items-center gap-2">
                <Icon name="whatsapp" className="size-4" /> WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <Icon name="instagram" className="size-4" /> Instagram
              </li>
              <li className="flex items-center gap-2">
                <Icon name="clock" className="size-4" /> Lun a sáb · 9 a 19 h
              </li>
              <li className="flex items-center gap-2">
                <Icon name="location" className="size-4" /> Retiro y cobertura
                local
              </li>
            </ul>
          </div>
          <div className="rounded-card bg-white/7 p-5 ring-1 ring-white/10">
            <p className="mb-2 text-sm font-bold">Antes de pedir</p>
            <p className="text-xs leading-relaxed text-white/65">
              Los productos se envasan donde se manipulan frutos secos y maní.
              Consultanos si tenés alergias.
            </p>
            <p className="mt-4 text-sm font-bold text-white">
              Los pedidos se confirman por WhatsApp.
            </p>
          </div>
        </div>
      </footer>

      {cartCount > 0 && !path.startsWith("/carrito") && !path.startsWith("/producto/") ? (
        <div className="fixed right-3 bottom-3 left-3 z-40 md:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex min-h-15 w-full items-center gap-3 rounded-card bg-terracotta px-5 text-left text-white shadow-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-olive"
          >
            <span className="relative grid size-9 place-items-center rounded-full bg-white/15">
              <Icon name="bag" className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-xs text-white/75">
                {cartCount} {cartCount === 1 ? "artículo" : "artículos"}
              </span>
              <span className="block text-sm font-bold">Ver carrito</span>
            </span>
            <span className="text-sm font-bold">
              {formatPrice(cartSubtotal)}
            </span>
          </button>
        </div>
      ) : null}

      <CartDrawer
        open={cartOpen}
        onClose={closeCart}
        onCheckout={() => go("/carrito")}
        lines={cartLines}
        subtotal={cartSubtotal}
        updateQuantity={updateQuantity}
        removeLine={removeLine}
      />
    </div>
  )
}

function CartDrawer({
  open,

  onClose,

  onCheckout,

  lines,

  subtotal,

  updateQuantity,

  removeLine,
}: {
  open: boolean

  onClose: () => void

  onCheckout: () => void

  lines: ResolvedCartLine[]

  subtotal: number

  updateQuantity: (
    productId: string,
    variantId: string,
    quantity: number,
  ) => void

  removeLine: (productId: string, variantId: string) => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  const drawerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()

        return
      }

      if (event.key !== "Tab") return

      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      )

      if (!focusable?.length) return

      const first = focusable[0]

      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()

        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()

        first.focus()
      }
    }

    document.body.style.overflow = "hidden"

    window.addEventListener("keydown", handleKeyDown)

    window.setTimeout(() => closeRef.current?.focus(), 0)

    return () => {
      document.body.style.overflow = previousOverflow

      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose, open])

  if (!open) return null

  const hasChanges = lines.some(cartLineNeedsReview)

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <button
        type="button"
        aria-label="Cerrar carrito"
        onClick={onClose}
        className="absolute inset-0 bg-olive-dark/45 backdrop-blur-[1px]"
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="absolute top-0 right-0 flex h-full w-full max-w-md flex-col bg-cream shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-sand/25 px-5 py-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-terracotta uppercase">
              Tu selección
            </p>
            <h2
              id="cart-drawer-title"
              className="font-display text-3xl font-semibold text-olive-dark"
            >
              Carrito
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-full text-olive-dark hover:bg-cream-soft focus-visible:outline-3 focus-visible:outline-olive"
            aria-label="Cerrar carrito"
          >
            <Icon name="x" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {!lines.length ? (
            <p className="rounded-card bg-white p-5 text-sm text-charcoal/65">
              Todavía no agregaste productos.
            </p>
          ) : (
            <ul className="divide-y divide-sand/25">
              {lines.map((line) => (
                <li
                  key={`${line.productId}-${line.variantId}`}
                  className="py-4"
                >
                  <div className="flex gap-3">
                    <img
                      src={line.product.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-16 shrink-0 rounded-control object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-terracotta">
                        {line.variant.label}
                      </p>
                      <h3 className="font-display text-lg font-semibold text-olive-dark">
                        {line.product.name}
                      </h3>
                      <p className="mt-1 text-sm font-bold">
                        {formatPrice(line.subtotal)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.productId, line.variantId)}
                      className="grid size-11 shrink-0 place-items-center rounded-full text-terracotta-dark hover:bg-terracotta-soft focus-visible:outline-3 focus-visible:outline-terracotta"
                      aria-label={`Eliminar ${line.product.name}, ${line.variant.label}`}
                    >
                      <Icon name="trash" className="size-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <QuantityStepper
                      compact
                      value={line.quantity}
                      max={line.variant.stock}
                      onChange={(quantity) =>
                        updateQuantity(line.productId, line.variantId, quantity)
                      }
                    />
                    {cartLineNeedsReview(line) ? (
                      <span className="text-right text-xs font-bold text-terracotta-dark">
                        Revisar disponibilidad o precio
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-sand/25 bg-white p-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <span className="text-sm text-charcoal/65">Subtotal</span>
            <strong className="font-display text-3xl text-olive-dark">
              {formatPrice(subtotal)}
            </strong>
          </div>
          <Button
            disabled={!lines.length}
            onClick={onCheckout}
            className="w-full"
          >
            Revisar y enviar pedido
          </Button>
          {hasChanges ? (
            <p className="mt-3 text-center text-xs text-terracotta-dark">
              Hay cambios para revisar antes de enviar.
            </p>
          ) : (
            <p className="mt-3 text-center text-xs text-charcoal/60">
              Stock, entrega y pago se confirman con Rosana.
            </p>
          )}
        </footer>
      </aside>
    </div>
  )
}
