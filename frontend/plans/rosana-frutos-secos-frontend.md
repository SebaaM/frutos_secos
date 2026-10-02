# Plan de implementación — Rosana Frutos Secos

## 1. Resultado esperado

Construir una tienda pública responsive y funcional en React/Vite que traduzca el brief a una experiencia web mobile-first. La app permitirá recorrer Inicio, filtrar el Catálogo, elegir una presentación en el Detalle, administrar un Carrito y completar cualquiera de las dos rutas de recepción (retiro o entrega) hasta una pantalla de pedido pendiente y la derivación a WhatsApp.

La implementación será un prototipo frontend completo: no habrá backend, cobro, autenticación ni reserva real de stock. Todos los textos y estados reforzarán que el pedido queda **pendiente de confirmación humana por WhatsApp**.

La estructura `00 · Cover & brand` a `06 · Handoff` se tomará como especificación del sistema visual y de componentes, no como páginas visibles de la tienda ni como un lienzo Figma literal. Sus foundations, variantes y notas relevantes quedarán materializadas en tokens CSS, componentes React y estados interactivos.

## 2. Estado actual y restricciones verificadas

- El repositorio es un scaffold mínimo de React 19 + Vite 8 + TypeScript + Tailwind CSS v4.
- `src/App.tsx` está vacío salvo por un contenedor; `src/index.css` solo importa Tailwind.
- No hay design system, router, librería de iconos, backend ni datos preexistentes.
- El servidor de desarrollo ya está supervisado por Figma Make y no se iniciará otro.
- No se añadirán dependencias para routing, estado o iconos: la escala del proyecto permite resolverlo con React, History API, estado local y SVG accesibles.
- El árbol Git está limpio al momento de planificar.

## 3. Arquitectura de navegación

Se implementará una SPA con rutas navegables mediante History API y enlaces reales, sin dependencia externa:

- `/` — Inicio.
- `/catalogo` — Catálogo; el filtro activo se reflejará en `?categoria=` para conservar navegación y compartir estado.
- `/producto/:slug` — Detalle de producto.
- `/carrito` — Carrito, modalidad y datos del cliente.
- `/pedido/:id` — Confirmación pendiente y derivación a WhatsApp.

El manejador de navegación actualizará `history.pushState`, responderá a `popstate`, moverá el foco al contenido principal y hará scroll al inicio. Una ruta o producto desconocido mostrará un estado recuperable con enlace al catálogo.

## 4. Modelo de datos y estado

### Catálogo local

Crear un catálogo tipado de aproximadamente 8 productos repartidos entre Frutos secos, Mixes y Hierbas naturales. Cada producto incluirá:

- `id`, `slug`, categoría, nombre, descripción y texto alternativo.
- Imagen editorial seleccionada de Unsplash, con créditos conservados en los metadatos/datos.
- Ingredientes, alérgenos y conservación.
- Variantes de peso con `id`, etiqueta, gramos, precio y stock.
- Indicador de destacado.

Los datos demostrarán todos los casos del brief: disponible, últimas unidades (umbral constante configurable, inicialmente `5`) y sin stock. Al menos un producto estará totalmente agotado y algunas variantes estarán agotadas para cubrir estados mixtos.

### Carrito

- Estado global en `App`, con líneas identificadas por combinación de producto + variante.
- Añadir una combinación existente acumula cantidad respetando el stock.
- El stepper impide bajar de 1 o superar el stock; eliminar quita la línea completa.
- El carrito se persistirá en `localStorage` para sobrevivir recargas y navegación.
- Los subtotales se calcularán desde datos fuente, no se almacenarán duplicados.
- Al restaurar el carrito, se validarán IDs y límites contra el catálogo actual.

### Pedido local

Al enviar un formulario válido:

1. Crear un objeto local con identificador legible (prefijo `RF-` más una porción de timestamp), líneas, subtotal, modalidad, dirección cuando corresponda, nombre, teléfono, fecha y estado `pending`.
2. Guardar el último pedido en `sessionStorage` para que la pantalla sobreviva una recarga de la sesión.
3. Vaciar el carrito y navegar a `/pedido/:id`.
4. Generar el mensaje de WhatsApp exactamente con el orden y lenguaje definidos en el brief.

No se simulará una confirmación exitosa de compra ni se descontará stock.

## 5. Sistema visual

### Tokens y tipografía

En `src/index.css`:

- Importar primero Tailwind y las fuentes públicas Google `Fraunces` (600/700) y `DM Sans` (400/500/600/700).
- Definir tokens semánticos de Tailwind v4/CSS para cream, olive, terracotta, sand, charcoal y white según los valores entregados.
- Definir familias tipográficas, radios, sombras suaves, transiciones, foco visible y estilos base.
- Mantener fondo `cream-50`, superficies elevadas blancas, títulos oliva oscuro y acción primaria terracota.
- Incluir `prefers-reduced-motion` y evitar animación no esencial cuando esté activo.

### Dirección de arte

- Apariencia de despensa local cuidada: fondos mate, serif editorial en encabezados, bordes orgánicos suaves, poco ruido decorativo y jerarquía generosa.
- Fotografías de frutos secos, mixes y hierbas en luz natural. Se usarán URLs concretas de Unsplash ya investigadas, no endpoints aleatorios; por ejemplo, fotografías de Maja Vujic para castañas de cajú y Nathan Dumlao/Pavel Avakumov para hierbas secas.
- Recortes `object-cover` consistentes, imágenes 1:1 en tarjetas y una composición editorial más amplia en hero/detalle.
- Los estados nunca dependerán solo del color: siempre incluirán texto y, cuando aporte claridad, icono.

## 6. Componentes React

Organizar componentes locales y reutilizables, sin introducir un framework de UI:

- `AppShell`: aviso superior, header mobile/desktop, contenido, footer y barra flotante móvil del carrito.
- `BrandMark` y `Icon`: logotipo textual y set mínimo de SVG (carrito, flechas, más/menos, check, alerta, ubicación, WhatsApp, Instagram, copiar, papelera, menú/cierre). Todo icono interactivo tendrá nombre accesible.
- `Button`: primary, secondary, text e icon; soportará disabled/loading y estados hover/pressed/focus desde CSS.
- `StockBadge`: disponible, últimas unidades, sin stock.
- `CategoryChip`: estados normal/activo/foco y `aria-pressed`.
- `ProductCard`: imagen, categoría, presentación inicial, precio desde, stock y acción; sin acción de añadir directa.
- `WeightSelector`: chips con precio, selección inequívoca y variante agotada deshabilitada.
- `QuantityStepper`: límites explícitos, botones de al menos 44 × 44 y etiqueta accesible.
- `FormField`: label persistente, ayuda/error, `aria-describedby` y estado inválido.
- `DeliveryOption`: tarjetas-radio para retiro y entrega.
- `CartLine` y `OrderSummary`.
- `Toast`: región `aria-live` para producto añadido, carrito actualizado y errores locales.

Los componentes usarán elementos HTML semánticos internamente porque no existe un design system de componentes en el repositorio; la consistencia se sostendrá con tokens y variantes locales.

## 7. Pantallas e interacción

### Inicio

- Aviso operativo discreto.
- Hero editorial con el título y CTA indicados, foto dominante y detalle decorativo sutil.
- Tres accesos de categoría que abren el catálogo ya filtrado.
- Grilla/carrusel horizontal mobile de cuatro destacados.
- Bloque “Así funciona” en cuatro pasos.
- Bloque de confianza sobre presentaciones, claridad y atención local.
- CTA final dual hacia Catálogo y WhatsApp.

### Catálogo

- Introducción, contador derivado y chips de filtro.
- Dos columnas mobile; tres a cuatro columnas según ancho desktop.
- Estado vacío con acción “Ver todos”.
- Tarjetas agotadas visibles pero sin acción de compra directa.

### Detalle

- Diseño apilado mobile y dos columnas desktop.
- Imagen principal, categoría, nombre, precio reactivo y disponibilidad de la variante seleccionada.
- Selector de peso; por defecto seleccionará la primera variante con stock.
- Stepper limitado por stock y CTA fijo/accesible en mobile.
- “Agregar al carrito” actualiza estado, muestra toast y mantiene al usuario en contexto.
- Ingredientes, alérgenos y conservación en secciones `details/summary` accesibles.
- Nota permanente de confirmación de stock y productos relacionados.

### Carrito

- Estado vacío ilustrado con SVG suave, mensaje y CTA al catálogo.
- Líneas editables con miniatura, variante, precio, stepper, subtotal y eliminar.
- Resumen con subtotal y costo de entrega “A confirmar”.
- Radios para retiro/entrega.
- Nombre y teléfono siempre obligatorios; dirección/barrio aparece y pasa a ser obligatoria solo para entrega.
- Validación al salir del campo y al enviar; foco en el primer error y mensajes junto al control.
- En desktop, resumen/formulario en panel sticky; en mobile, una sola columna y CTA visible sin tapar contenido.

### Pedido pendiente

- “Pedido #… recibido” y etiqueta “Pendiente de confirmación”, nunca “Compra confirmada”.
- Mensaje prioritario de verificación humana.
- Resumen completo de líneas, subtotal, modalidad, dirección y datos.
- Botón “Abrir WhatsApp”, “Copiar mensaje” con feedback accesible y vuelta al catálogo.
- El número se leerá de `import.meta.env.VITE_WHATSAPP_NUMBER`; jamás se escribirá uno real en código. Con número configurado se abrirá la conversación directa; sin él se usará el enlace de WhatsApp sin destinatario con el mensaje precargado, manteniendo funcional el prototipo.
- Si no existe el pedido solicitado en sesión, mostrar un estado recuperable en lugar de inventar una confirmación.

## 8. Responsive y accesibilidad

- Mobile-first desde 390 px; adaptación cuidada a 1440 px y anchos intermedios.
- Contenedor máximo de 1280 px, padding mobile de 16 px y desktop hasta 80 px.
- Objetivos táctiles mínimos de 44 × 44.
- Header mobile compacto con navegación desplegable accesible; navegación completa en desktop.
- Barra flotante del carrito solo en mobile cuando contiene líneas, con cantidad y subtotal.
- Foco visible de alto contraste, orden DOM lógico, labels persistentes y regiones `aria-live`.
- Imágenes con alt descriptivo específico; imágenes puramente decorativas con alt vacío.
- Sin alturas fijas que recorten nombres, precios o errores.
- Contraste revisado especialmente en terracota/blanco, oliva/blanco, texto secundario y estados disabled; si el terracota propuesto no alcanza AA para texto pequeño, se usará una variante visual más oscura para el fondo interactivo manteniendo el token original en acentos no textuales.

## 9. Organización de archivos prevista

- `src/App.tsx` — estado global, navegación SPA y composición principal.
- `src/data/products.ts` — tipos, catálogo, umbral de stock y helpers de disponibilidad/precio.
- `src/components/ui.tsx` — primitivas visuales pequeñas (Button, Icon, badges, chips, campos, toast).
- `src/components/layout.tsx` — aviso, header, navegación, footer y barra flotante.
- `src/components/product.tsx` — ProductCard, selector de peso y stepper.
- `src/pages/HomePage.tsx`
- `src/pages/CatalogPage.tsx`
- `src/pages/ProductPage.tsx`
- `src/pages/CartPage.tsx`
- `src/pages/OrderPage.tsx`
- `src/index.css` — imports, tokens Tailwind v4, estilos base y utilidades globales.

Si durante la implementación algún archivo queda trivial, se combinará con su vecino para evitar fragmentación innecesaria, sin cambiar las interfaces descritas.

## 10. Secuencia de implementación

1. Crear tipos y catálogo local con variantes/stock/imágenes.
2. Definir fonts, tokens y estilos base.
3. Construir primitivas UI, iconos y layout global.
4. Implementar navegación SPA y persistencia segura del carrito.
5. Implementar Inicio y Catálogo.
6. Implementar Detalle y añadir al carrito.
7. Implementar Carrito, validación condicional y generación del pedido.
8. Implementar pantalla pendiente, plantilla/copia/apertura de WhatsApp.
9. Ajustar responsive, foco, estados vacíos/error/agotado y movimiento reducido.
10. Formatear y verificar.

## 11. Verificación

### Automatizada

- Ejecutar `pnpm format` usando el script del repositorio.
- Ejecutar `pnpm build` por tratarse de una implementación amplia, y corregir cualquier error TypeScript/Vite.

### Revisión funcional manual en la preview existente

- Inicio → categoría → producto → cambiar peso → cantidad → añadir.
- Filtros de las tres categorías, “Todos” y estado vacío demostrable.
- Variante agotada, producto agotado y umbral de últimas unidades.
- Carrito: incrementar, decrementar, máximo, eliminar, persistir tras recarga.
- Ruta retiro: datos válidos → pedido pendiente → mensaje de WhatsApp correcto.
- Ruta entrega: dirección obligatoria → pedido pendiente → dirección incluida una sola vez.
- Copiar mensaje y comportamiento sin `VITE_WHATSAPP_NUMBER`.
- Navegación atrás/adelante y rutas desconocidas.
- Vistas aproximadas de 390 px y 1440 px, sin overflow ni contenido cubierto.
- Recorrido por teclado de menú, chips, selector, stepper, formulario y CTAs; foco visible y mensajes anunciables.

## 12. Criterios de cierre

La implementación se considerará completa cuando:

- Las cinco vistas principales sean navegables y visualmente coherentes.
- Una persona pueda filtrar, elegir peso, añadir, editar y enviar un pedido sin instrucciones externas.
- Retiro y entrega produzcan el resumen y mensaje especificados.
- No exista lenguaje que implique cobro, reserva o confirmación automática.
- Estén visibles y utilizables los casos vacío, agotado, últimas unidades, validación y pedido inexistente.
- El número de WhatsApp no esté hardcodeado.
- Formato y build terminen correctamente.

## 13. Fuera de alcance

- Crear o editar un archivo Figma con páginas `00–06`.
- Backend, base de datos, administración de catálogo o sincronización de stock.
- Autenticación, pagos, tarifas de reparto o cálculo de cobertura.
- Envío real de pedidos a un servidor o reserva de inventario.
- Analytics, SEO avanzado o internacionalización.
