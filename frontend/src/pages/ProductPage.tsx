import { useEffect, useMemo, useState } from "react"
import type { Navigate } from "../components/layout"
import {
  ProductCard,
  QuantityStepper,
  WeightSelector,
} from "../components/product"
import { Button, Eyebrow, Icon, StockBadge } from "../components/ui"
import {
  categoryLabels,
  formatPrice,
  getStockState,
  type Product,
  type ProductVariant,
} from "../data/products"

export default function ProductPage({
  product,
  products,
  navigate,
  onAdd,
}: {
  product: Product
  products: Product[]
  navigate: Navigate
  onAdd: (product: Product, variant: ProductVariant, quantity: number) => void
}) {
  const firstAvailable = product.variants.find((variant) => variant.stock > 0)
  const images = product.images?.length
    ? product.images
    : [
        {
          id: "cover",
          url: product.image,
          alt: product.imageAlt,
          credit: product.imageCredit,
          position: 0,
        },
      ]
  const [selectedId, setSelectedId] = useState(firstAvailable?.id ?? "")
  const [selectedImageId, setSelectedImageId] = useState(images[0]?.id ?? "")
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    setSelectedId(
      product.variants.find((variant) => variant.stock > 0)?.id ?? "",
    )
    setSelectedImageId(images[0]?.id ?? "")
    setQuantity(1)
  }, [product.id])

  const selected = product.variants.find((variant) => variant.id === selectedId)
  const selectedImage =
    images.find((image) => image.id === selectedImageId) ?? images[0]
  const related = useMemo(
    () =>
      products
        .filter(
          (item) =>
            item.category === product.category && item.id !== product.id,
        )
        .slice(0, 3),
    [product],
  )
  const state = getStockState(selected?.stock ?? 0)

  const selectVariant = (variant: ProductVariant) => {
    setSelectedId(variant.id)
    setQuantity(1)
  }

  return (
    <div className="page-container py-7 md:py-14">
      <button
        type="button"
        onClick={() => navigate("/catalogo")}
        className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-olive focus-visible:outline-3 focus-visible:outline-olive"
      >
        <Icon name="arrow" className="size-4 rotate-180" /> Volver al catálogo
      </button>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[28px] bg-cream-soft">
            {selectedImage ? (
              <img
                src={selectedImage.url}
                alt={selectedImage.alt}
                className="size-full object-cover"
              />
            ) : null}
            <span className="absolute top-4 left-4">
              <StockBadge state={state} />
            </span>
          </div>
          {images.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((image) => (
                <button
                  type="button"
                  key={image.id}
                  onClick={() => setSelectedImageId(image.id)}
                  aria-label={`Ver imagen ${image.position + 1} de ${product.name}`}
                  aria-pressed={image.id === selectedImage?.id}
                  className={`size-16 shrink-0 overflow-hidden rounded-control border-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-olive ${
                    image.id === selectedImage?.id
                      ? "border-olive"
                      : "border-transparent"
                  }`}
                >
                  <img src={image.url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
          {selectedImage?.credit ? (
            <p className="mt-3 text-[10px] text-charcoal/45">
              Foto: {selectedImage.credit}
            </p>
          ) : null}
        </div>

        <div className="lg:pt-5">
          <Eyebrow>{product.categoryName || categoryLabels[product.category] || product.category}</Eyebrow>
          <h1 className="font-display text-5xl leading-none font-semibold text-olive-dark md:text-6xl">
            {product.name}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-charcoal/70">
            {product.description}
          </p>

          <div className="my-7 flex items-end justify-between border-y border-sand/25 py-5">
            <div>
              <p className="text-xs text-charcoal/55">
                Precio de la presentación
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-terracotta-dark">
                {selected ? formatPrice(selected.price) : "No disponible"}
              </p>
            </div>
            <div className="text-right text-xs text-charcoal/55">
              {selected?.stock ? (
                <>
                  <p className="font-bold text-charcoal">{selected.label}</p>
                  <p>
                    {selected.stock <= 5
                      ? `Quedan ${selected.stock}`
                      : "Stock disponible"}
                  </p>
                </>
              ) : (
                <p>Sin presentaciones disponibles</p>
              )}
            </div>
          </div>

          <WeightSelector
            variants={product.variants}
            selectedId={selectedId}
            onSelect={selectVariant}
          />

          <div className="mt-6">
            <p className="mb-3 text-sm font-bold text-olive-dark">Cantidad</p>
            <QuantityStepper
              value={quantity}
              max={selected?.stock ?? 1}
              onChange={setQuantity}
            />
            {selected && quantity === selected.stock && selected.stock > 0 ? (
              <p className="mt-2 text-xs font-semibold text-terracotta-dark">
                Alcanzaste el máximo disponible.
              </p>
            ) : null}
          </div>

          <Button
            disabled={
              !selected ||
              selected.stock <= 0 ||
              quantity < 1 ||
              quantity > (selected?.stock ?? 0)
            }
            onClick={() => selected && onAdd(product, selected, quantity)}
            icon="bag"
            className="mt-7 w-full md:w-auto md:min-w-64"
          >
            {selected ? "Agregar al carrito" : "Sin stock"}
          </Button>

          <div className="mt-6 flex gap-3 rounded-card bg-terracotta-soft p-4 text-sm text-charcoal/75">
            <Icon
              name="warning"
              className="mt-0.5 size-5 shrink-0 text-terracotta-dark"
            />
            <p>
              <strong className="text-charcoal">Stock orientativo.</strong> El
              stock se confirma por WhatsApp al revisar tu pedido.
            </p>
          </div>

          <div className="mt-8 divide-y divide-sand/25 border-y border-sand/25">
            {[
              ["Ingredientes", product.ingredients],
              ["Alérgenos", product.allergens],
              ["Conservación", product.storage],
            ].map(([title, content]) => (
              <details key={title} className="group py-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-bold text-olive-dark focus-visible:outline-3 focus-visible:outline-olive">
                  {title}
                  <Icon
                    name="chevron"
                    className="size-5 transition group-open:rotate-180"
                  />
                </summary>
                <p className="pb-2 pr-8 text-sm leading-relaxed text-charcoal/65">
                  {content}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="mt-16 border-t border-sand/25 pt-14 md:mt-24 md:pt-20">
          <Eyebrow>También te puede gustar</Eyebrow>
          <h2 className="mb-8 font-display text-4xl font-semibold text-olive-dark">
            De la misma familia
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5">
            {related.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                onOpen={() => navigate(`/producto/${item.slug}`)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
