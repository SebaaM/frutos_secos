import { useState, type FormEvent } from "react"
import type { Navigate } from "../components/layout"
import { QuantityStepper } from "../components/product"
import { Button, Eyebrow, FormField, Icon } from "../components/ui"
import {
  formatPrice,
  type Product,
  type ProductVariant,
} from "../data/products"

export type CartLine = {
  productId: string
  variantId: string
  quantity: number
}

export type DeliveryMethod = "retiro_local" | "entrega_local"

export type Order = {
  id: string
  lines: {
    product: Product
    variant: ProductVariant
    quantity: number
    subtotal: number
  }[]
  subtotal: number
  delivery: DeliveryMethod
  address: string
  addressHelp: string
  name: string
  phone: string
  email: string
  createdAt: string
  status: "pending"
}

export type ResolvedCartLine = CartLine & {
  product: Product
  variant: ProductVariant
  subtotal: number
}

export default function CartPage({
  lines,
  subtotal,
  navigate,
  updateQuantity,
  removeLine,
  createOrder,
}: {
  lines: ResolvedCartLine[]
  subtotal: number
  navigate: Navigate
  updateQuantity: (
    productId: string,
    variantId: string,
    quantity: number,
  ) => void
  removeLine: (productId: string, variantId: string) => void
  createOrder: (data: {
    delivery: DeliveryMethod
    address: string
    addressHelp: string
    name: string
    phone: string
    email: string
  }) => void
}) {
  const [delivery, setDelivery] = useState<DeliveryMethod>("retiro_local")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [addressHelp, setAddressHelp] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!lines.length) {
    return (
      <div className="page-container py-12 md:py-20">
        <div className="mx-auto max-w-xl rounded-[28px] bg-cream-soft px-6 py-14 text-center md:px-12">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-white text-olive shadow-sm">
            <Icon name="bag" className="size-9" />
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold text-olive-dark">
            Tu carrito está vacío
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-charcoal/65">
            Cuando encuentres algo rico, va a aparecer acá listo para tu pedido.
          </p>
          <Button onClick={() => navigate("/catalogo")} className="mt-7">
            Ver productos
          </Button>
        </div>
      </div>
    )
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = "Ingresá tu nombre."
    if (!phone.trim() && !email.trim())
      next.phone = "Ingresá un teléfono o un email para contactarte."
    else if (phone.trim() && phone.replace(/\D/g, "").length < 8)
      next.phone = "Revisá el número de teléfono."
    if (
      email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    )
      next.email = "Revisá el email."
    if (!address.trim()) next.address = "Ingresá una dirección o barrio."
    setErrors(next)
    return next
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const next = validate()
    if (Object.keys(next).length) {
      window.setTimeout(
        () => document.getElementById(Object.keys(next)[0])?.focus(),
        0,
      )
      return
    }
    createOrder({
      delivery,
      address: address.trim(),
      addressHelp: addressHelp.trim(),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
    })
  }

  return (
    <div className="page-container py-9 md:py-16">
      <div className="mb-10">
        <Eyebrow>Tu selección</Eyebrow>
        <h1 className="font-display text-5xl font-semibold text-olive-dark md:text-6xl">
          Carrito
        </h1>
        <p className="mt-3 text-sm text-charcoal/60">
          Revisá presentaciones y cantidades antes de enviar.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start"
      >
        <div className="space-y-8">
          <section aria-labelledby="cart-lines-title">
            <h2 id="cart-lines-title" className="sr-only">
              Productos elegidos
            </h2>
            <div className="divide-y divide-sand/25 rounded-card bg-white px-4 shadow-card ring-1 ring-sand/15 md:px-6">
              {lines.map((line) => (
                <article
                  key={`${line.productId}-${line.variantId}`}
                  className="grid grid-cols-[84px_1fr] gap-4 py-5 md:grid-cols-[100px_1fr_auto] md:items-center"
                >
                  <img
                    src={line.product.image}
                    alt=""
                    className="aspect-square size-[84px] rounded-control object-cover md:size-[100px]"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-widest text-terracotta uppercase">
                      {line.variant.label}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-semibold text-olive-dark">
                      {line.product.name}
                    </h3>
                    <p className="mt-1 text-xs text-charcoal/55">
                      {formatPrice(line.variant.price)} por unidad
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 md:hidden">
                      <QuantityStepper
                        compact
                        value={line.quantity}
                        max={line.variant.stock}
                        onChange={(quantity) =>
                          updateQuantity(
                            line.productId,
                            line.variantId,
                            quantity,
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          removeLine(line.productId, line.variantId)
                        }
                        className="grid size-11 place-items-center rounded-full text-terracotta-dark hover:bg-terracotta-soft focus-visible:outline-3 focus-visible:outline-terracotta"
                        aria-label={`Eliminar ${line.product.name}, ${line.variant.label}`}
                      >
                        <Icon name="trash" className="size-[18px]" />
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-between border-t border-sand/20 pt-4 md:col-span-1 md:block md:border-0 md:pt-0 md:text-right">
                    <div className="hidden items-center justify-end gap-2 md:flex">
                      <QuantityStepper
                        compact
                        value={line.quantity}
                        max={line.variant.stock}
                        onChange={(quantity) =>
                          updateQuantity(
                            line.productId,
                            line.variantId,
                            quantity,
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          removeLine(line.productId, line.variantId)
                        }
                        className="grid size-11 place-items-center rounded-full text-terracotta-dark hover:bg-terracotta-soft focus-visible:outline-3 focus-visible:outline-terracotta"
                        aria-label={`Eliminar ${line.product.name}, ${line.variant.label}`}
                      >
                        <Icon name="trash" className="size-[18px]" />
                      </button>
                    </div>
                    <span className="text-xs text-charcoal/50 md:hidden">
                      Subtotal
                    </span>
                    <p className="font-display text-xl font-bold text-olive-dark md:mt-3">
                      {formatPrice(line.subtotal)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="delivery-title">
            <h2
              id="delivery-title"
              className="font-display text-3xl font-semibold text-olive-dark"
            >
              ¿Cómo lo recibís?
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {
                  id: "retiro_local" as const,
                  icon: "bag" as const,
                  title: "Retiro local",
                  text: "Coordinamos día y horario.",
                },
                {
                  id: "entrega_local" as const,
                  icon: "location" as const,
                  title: "Entrega local",
                  text: "El costo depende de la zona.",
                },
              ].map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer gap-4 rounded-card border p-5 transition focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-olive ${
                    delivery === option.id
                      ? "border-olive bg-cream-soft"
                      : "border-sand/35 bg-white hover:border-olive/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={option.id}
                    checked={delivery === option.id}
                    onChange={() => {
                      setDelivery(option.id)
                      setErrors((current) => ({ ...current, address: "" }))
                    }}
                    className="sr-only"
                  />
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-full ${
                      delivery === option.id
                        ? "bg-olive text-white"
                        : "bg-cream-soft text-olive"
                    }`}
                  >
                    <Icon name={option.icon} />
                  </span>
                  <span>
                    <span className="flex items-center gap-2 font-bold text-olive-dark">
                      {option.title}
                      {delivery === option.id ? (
                        <Icon name="check" className="size-4 text-olive" />
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs text-charcoal/60">
                      {option.text}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section aria-labelledby="customer-title">
            <h2
              id="customer-title"
              className="font-display text-3xl font-semibold text-olive-dark"
            >
              Tus datos
            </h2>
            <p className="mt-2 text-sm text-charcoal/60">
              Solo necesitamos lo mínimo para responderte.
            </p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <FormField
                id="name"
                label="Nombre"
                value={name}
                onChange={(value) => {
                  setName(value)
                  setErrors((current) => ({ ...current, name: "" }))
                }}
                error={errors.name}
                placeholder="¿Cómo te llamás?"
                autoComplete="name"
              />
              <FormField
                id="phone"
                label="Teléfono"
                value={phone}
                onChange={(value) => {
                  setPhone(value)
                  setErrors((current) => ({
                    ...current,
                    phone: "",
                    email: "",
                  }))
                }}
                error={errors.phone}
                placeholder="Ej. 11 2345 6789"
                type="tel"
                autoComplete="tel"
                help="Nos comunicaremos a este número para coordinar y recibir el pedido. Completá un teléfono o un email."
              />
              <FormField
                id="email"
                label="Email"
                value={email}
                onChange={(value) => {
                  setEmail(value)
                  setErrors((current) => ({
                    ...current,
                    phone: "",
                    email: "",
                  }))
                }}
                error={errors.email}
                placeholder="nombre@ejemplo.com"
                type="email"
                autoComplete="email"
                help="Si ingresás un email, crearemos una cuenta temporal para guardar el resumen, consultar el estado y repetir este pedido."
              />
              <div className="sm:col-span-2">
                <FormField
                  id="address"
                  label="Dirección o barrio"
                  value={address}
                  onChange={(value) => {
                    setAddress(value)
                    setErrors((current) => ({ ...current, address: "" }))
                  }}
                  error={errors.address}
                  placeholder="Calle, altura y barrio"
                  autoComplete="street-address"
                  help={
                    delivery === "entrega_local"
                      ? "La cobertura y el costo se confirman por WhatsApp."
                      : "La usamos como referencia; el retiro se coordina por WhatsApp."
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <FormField
                  id="address-help"
                  label="Ayuda para la dirección o contacto adicional (opcional)"
                  value={addressHelp}
                  onChange={setAddressHelp}
                  placeholder="Entre calles, piso, referencia, otro teléfono o persona de contacto"
                  multiline
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="rounded-[24px] bg-olive-dark p-6 text-white shadow-lg lg:sticky lg:top-28 md:p-7">
          <h2 className="font-display text-3xl font-semibold">Resumen</h2>
          <div className="mt-6 space-y-4 border-y border-white/15 py-5 text-sm">
            <div className="flex justify-between gap-4 text-white/70">
              <span>
                Productos (
                {lines.reduce((total, line) => total + line.quantity, 0)})
              </span>
              <span className="font-bold text-white">
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-white/70">
              <span>Entrega</span>
              <span className="font-bold text-white">A confirmar</span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-4 py-5">
            <span className="text-sm text-white/70">Subtotal</span>
            <span className="font-display text-3xl font-bold">
              {formatPrice(subtotal)}
            </span>
          </div>
          <Button
            type="submit"
            icon="whatsapp"
            className="w-full bg-terracotta hover:bg-terracotta-dark"
          >
            Enviar pedido por WhatsApp
          </Button>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-white/55">
            Al continuar, creamos un pedido pendiente. Stock, pago y entrega se
            confirman personalmente.
          </p>
        </aside>
      </form>
    </div>
  )
}
