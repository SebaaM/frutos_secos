import { ProductCard } from "../components/product"
import { Button, Eyebrow, Icon } from "../components/ui"
import type { Product } from "../data/products"
import type { CatalogCategory } from "../lib/catalog-api"
import type { Navigate } from "../components/layout"

const categoryDescriptions: Record<string, string> = {
  "frutos-secos": "Naturales, crocantes y elegidos uno a uno.",
  mixes: "Combinaciones listas para cada momento.",
  hierbas: "Aromas simples para bajar un cambio.",
}

export default function HomePage({
  navigate,
  products,
  categories,
}: {
  navigate: Navigate
  products: Product[]
  categories: CatalogCategory[]
}) {
  const featured = products.filter((product) => product.featured)
  const hero = products.find((product) => product.slug === "castanas-de-caju") ?? products[0]
  const categoryCards = categories.map((category) => ({
    ...category,
    description:
      categoryDescriptions[category.slug] || "Productos seleccionados para todos los días.",
    image: products.find((product) => product.category === category.slug)?.image,
  }))

  return (
    <>
      <section className="page-container py-6 md:py-10">
        <div className="relative min-h-[590px] overflow-hidden rounded-[28px] bg-olive-dark md:min-h-[650px]">
          {hero ? (
            <img
              src={hero.image}
              alt={hero.imageAlt}
              className="absolute inset-0 size-full object-cover opacity-65 mix-blend-luminosity md:object-[center_54%]"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-olive-dark via-olive-dark/45 to-transparent md:bg-gradient-to-r md:from-olive-dark md:via-olive-dark/75 md:to-transparent" />
          <div className="relative z-10 flex min-h-[590px] max-w-2xl flex-col justify-end p-6 text-white md:min-h-[650px] md:justify-center md:p-14 lg:p-20">
            <Eyebrow>Tu despensa de todos los días</Eyebrow>
            <h1 className="font-display text-5xl leading-[0.95] font-semibold text-balance sm:text-6xl md:text-7xl">
              Un poco de lo rico de todos los días
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
              Frutos secos, mixes y hierbas en presentaciones simples. Elegís lo
              que te gusta y confirmamos juntos por WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                onClick={() => navigate("/catalogo")}
                className="min-w-40"
              >
                Ver productos <Icon name="arrow" className="size-4" />
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  document
                    .getElementById("como-comprar")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="border-white/25 bg-white/10 text-white hover:bg-white/15"
              >
                Cómo comprar
              </Button>
            </div>
            <p className="mt-7 flex items-center gap-2 text-xs font-semibold text-white/65">
              <Icon name="location" className="size-4" /> Retiro local y
              entregas en la zona
            </p>
          </div>
        </div>
      </section>

      <section
        id="como-comprar"
        className="page-container scroll-mt-28 py-16 md:py-24"
      >
        <div className="mx-auto mb-12 max-w-xl text-center">
          <Eyebrow>Así funciona</Eyebrow>
          <h2 className="font-display text-4xl font-semibold text-olive-dark md:text-5xl">
            Fácil, cercano y sin vueltas
          </h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-4">
          {[
            [
              "01",
              "Elegí",
              "Encontrá tu producto y la presentación que necesitás.",
            ],
            ["02", "Enviá", "Completá tus datos y mandanos el pedido."],
            [
              "03",
              "Confirmamos",
              "Revisamos stock, pago y forma de entrega por WhatsApp.",
            ],
            ["04", "Preparamos", "Dejamos todo listo para retirar o recibir."],
          ].map(([number, title, text]) => (
            <li
              key={number}
              className="rounded-card border border-sand/25 bg-white p-6"
            >
              <span className="font-display text-4xl font-bold text-terracotta/35">
                {number}
              </span>
              <h3 className="mt-5 font-display text-2xl font-semibold text-olive-dark">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/65">
                {text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="page-container py-14 md:py-20">
        <div className="mb-8 md:flex md:items-end md:justify-between">
          <div>
            <Eyebrow>Para elegir fácil</Eyebrow>
            <h2 className="font-display text-4xl font-semibold text-olive-dark md:text-5xl">
              Lo que buscás, a mano
            </h2>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-charcoal/65 md:mt-0">
            Tres categorías, una misma forma simple de comprar.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {categoryCards.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() => navigate(`/catalogo?categoria=${category.slug}`)}
              className="group relative min-h-72 overflow-hidden rounded-card text-left shadow-card focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-olive"
            >
              {category.image ? (
                <img
                  src={category.image}
                  alt=""
                  className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : null}
              <span className="absolute inset-0 bg-gradient-to-t from-olive-dark/95 via-olive-dark/20 to-transparent" />
              <span className="absolute right-5 bottom-5 left-5 text-white">
                <span className="mb-1 block font-display text-3xl font-semibold">
                  {category.name}
                </span>
                <span className="flex items-end justify-between gap-4 text-sm text-white/75">
                  {category.description}
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-olive-dark transition group-hover:translate-x-1">
                    <Icon name="arrow" />
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-cream-soft py-16 md:py-24">
        <div className="page-container">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <Eyebrow>Favoritos de la despensa</Eyebrow>
              <h2 className="font-display text-4xl font-semibold text-olive-dark md:text-5xl">
                Para empezar por acá
              </h2>
            </div>
            <Button
              variant="text"
              onClick={() => navigate("/catalogo")}
              className="hidden sm:inline-flex"
            >
              Ver todo <Icon name="arrow" className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpen={() => navigate(`/producto/${product.slug}`)}
              />
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate("/catalogo")}
            className="mt-6 w-full sm:hidden"
          >
            Ver todo el catálogo
          </Button>
        </div>
      </section>

      <section className="page-container pb-8 md:pb-14">
        <div className="grid overflow-hidden rounded-[28px] bg-terracotta text-white md:grid-cols-[1.2fr_0.8fr]">
          <div className="p-7 md:p-12 lg:p-16">
            <Eyebrow>Atención local</Eyebrow>
            <h2 className="max-w-2xl font-display text-4xl leading-tight font-semibold md:text-5xl">
              Sabés qué llevás y quién prepara tu pedido
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {[
                "Presentaciones fijas",
                "Información clara",
                "Respuesta humana",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-sm font-bold"
                >
                  <span className="grid size-6 place-items-center rounded-full bg-white/15">
                    <Icon name="check" className="size-3.5" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center bg-olive-dark p-7 md:p-10">
            <p className="text-sm leading-relaxed text-white/70">
              ¿No sabés cuánto llevar o qué combinación elegir? Escribinos.
              Estamos para ayudarte.
            </p>
            <Button
              onClick={() => navigate("/catalogo")}
              className="mt-6 bg-white text-olive-dark hover:bg-cream-soft"
            >
              Explorar el catálogo <Icon name="arrow" className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
