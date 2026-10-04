# Research — estado actual de la web

> Relevamiento para orientar cambios posteriores en la web de Rosana Frutos Secos.  
> Última revisión: 3 de octubre de 2026.

## Propósito y fuentes

Este documento concentra el estado **ya implementado** y los límites que deben
conservarse al modificar la interfaz. No reemplaza las especificaciones de
dominio; sirve como punto de partida de trabajo.

| Prioridad | Fuente | Uso |
| --- | --- | --- |
| 1 | [AGENTS.md](../AGENTS.md) | Reglas de negocio, seguridad y validaciones obligatorias. |
| 2 | [context.md](context.md), [pedidos.md](pedidos.md) y [backoffice.md](backoffice.md) | Estado funcional y operativo vigente. |
| 3 | Implementación en `frontend/src/` y contratos de API | Comportamiento concreto de la interfaz. |
| 4 | [TODO.md](../TODO.md) | Backlog vigente de ideas y tareas que aún no están implementadas. |

El antiguo backlog del frontend se retiró al consolidar esta documentación. Entre
otros puntos, todavía enumeraba como pendientes el flujo de pedidos, las
sesiones de cliente, el tablero de pedidos y la autenticación de operadores,
que ya están implementados. El nuevo `TODO.md` se mantiene limitado a trabajo
pendiente y debe contrastarse con las especificaciones de mayor prioridad antes
de modificar reglas de negocio.

## Arquitectura y navegación existentes

- La web pública está hecha con React 19, TypeScript, Vite 8 y Tailwind CSS 4.
  Django + Django REST Framework es la fuente de verdad de catálogo, inventario,
  pedidos y sesiones.
- La aplicación no usa React Router: `App.tsx` navega con History API. Las rutas
  públicas actuales son `/`, `/catalogo`, `/producto/:slug`, `/carrito`,
  `/mis-pedidos` y `/pedido/:id`. El panel interno está en `/backoffice`.
- El catálogo público consulta `/api/v1`; Vite proxifica `/api`, `/media` y
  `/static` hacia Django en desarrollo. Los datos estáticos son solo un fallback
  visual: no habilitan crear pedidos.
- La identidad, las reservas y los precios se determinan en Django. React puede
  advertir, bloquear un CTA o mostrar el resultado, pero no sustituir esas
  validaciones.
- La interfaz sigue una pauta mobile-first con los colores crema, oliva y
  terracota, Fraunces/DM Sans y controles accesibles de al menos 44 × 44 px.

## Experiencia pública implementada

### Catálogo y producto

- Inicio, catálogo por categoría, detalle de producto y navegación entre rutas
  ya funcionan con el catálogo de la API.
- Los productos se venden exclusivamente por presentaciones de peso fijo. Cada
  presentación tiene SKU, precio y disponibilidad propios.
- El detalle permite seleccionar presentaciones y agregarlas al carrito. La
  galería admite varias imágenes; la primera es la portada y el texto alternativo
  proviene del catálogo.
- El detalle permite compartir el enlace del producto mediante la API nativa del
  navegador o, cuando no está disponible, copiarlo al portapapeles.
- Aún no hay búsqueda por nombre, orden comercial ni filtros persistidos en la
  URL como capacidad general del catálogo. Son posibles mejoras, no requisitos
  ya cumplidos.

### Carrito y checkout

- `src/lib/cart.ts` es la única fuente del carrito para el panel lateral y la
  página `/carrito`. Guarda solamente líneas de carrito y el precio al agregar;
  los datos personales permanecen en el estado de la página.
- Antes de enviar, el carrito compara precio, disponibilidad y cantidad contra
  el catálogo actualizado. Las líneas agotadas, insuficientes o con precio
  cambiado exigen revisión.
- La creación del pedido requiere que el catálogo real esté disponible, envía
  precio esperado por línea y emplea una clave de idempotencia para impedir
  duplicados por pulsaciones repetidas. Mientras se crea muestra un estado de
  carga y, ante un error, conserva el carrito y el formulario para reintentar.
- Hay retiro local y entrega local. La dirección es obligatoria para entrega y
  opcional para retiro; el costo se presenta como “A confirmar”. La interfaz
  separa indicaciones y contacto adicional, aunque actualmente ambos se
  transportan juntos en `address_help` hacia la API.
- Tras crear el pedido se navega a su detalle y se ofrece continuar la
  coordinación por WhatsApp. El texto deja claro que el pedido queda pendiente
  de confirmación: nunca debe sugerir que el stock fue reservado automáticamente.

### Mis pedidos y acceso de cliente

- El cliente solicita un enlace por email y lo verifica explícitamente. El
  token vive en el fragmento de URL, se guarda como hash en el servidor y se
  consume una sola vez; la sesión posterior es HttpOnly con CSRF.
- `/mis-pedidos` permite consultar los pedidos propios, cerrar sesión y borrar
  los datos de carrito/formulario locales de este dispositivo. Borrar datos
  locales no equivale a eliminar datos del servidor ni a una política de
  retención.
- Desde un pedido anterior se puede repetir la selección. Antes se vuelve a
  comprobar catálogo, presentaciones, stock y precios; los cambios se comunican
  antes de volver al carrito.
- El detalle muestra una línea de progreso y el siguiente paso para los estados
  operativos. Aún se deben definir filtros en “Mis pedidos”, la eliminación de
  datos personales en el servidor y una política de retención.

## Pedidos, stock y reglas que no se pueden alterar

| Estado | Efecto en stock |
| --- | --- |
| `A_CONFIRMAR` | No reserva unidades. |
| `RESERVADO`, `PREPARANDO`, `LISTO_PARA_RETIRO`, `EN_REPARTO` | Mantienen las unidades reservadas. |
| `TERMINADO` | Consume físico y libera reservado mediante movimiento. |
| `CANCELADO` o `VENCIDO` | Libera reservado; no incrementa físico. |

- Disponible siempre es `stock_fisico - stock_reservado`.
- Confirmar stock y cambiar de estado requiere transacción en Django; las
  transiciones usan `expected_status` para evitar sobrescribir cambios ajenos.
- Los precios son `Decimal` en backend y strings decimales en los contratos
  administrativos. No introducir `float` como fuente de verdad.
- El vencimiento automático de reservas está deshabilitado hasta confirmar el
  calendario comercial. Los recordatorios y alertas internas previas siguen
  fuera de la implementación actual.

## Backoffice implementado

- El acceso exige operador Django activo con `is_staff`, sesión y CSRF, y además
  conserva el guard local de `DEBUG`, `BACKOFFICE_ENABLED`, cliente local y
  origen permitido. La autenticación no autoriza abrirlo a Internet.
- Inventario es la vista inicial. Muestra primero las presentaciones activas y
  publicadas que están agotadas o con 1–5 paquetes disponibles; los borradores
  se incluyen solo bajo demanda.
- El ajuste rápido recibe el conteo físico final, calcula el delta y conserva
  motivo, stock esperado e historial en Django. El reservado es de solo lectura
  y el historial se carga únicamente cuando el operador lo solicita.
- El editor permite administrar categorías, productos, variantes fijas y una
  galería de hasta diez JPEG/PNG/WebP de hasta 5 MB. La primera imagen es la
  portada; no se borra el archivo físico al quitar una imagen de la galería.
- Se puede publicar u ocultar un producto desde Inventario. Ocultar afecta solo
  pedidos nuevos; publicar conserva las validaciones de categoría activa,
  imagen y presentación activa con precio positivo. Las variantes se activan o
  desactivan solo desde el editor.
- El tablero de pedidos es mobile-first, agrupa por estado y prioriza pendientes
  por antigüedad con paginación independiente por columna. No incluye agenda,
  franjas horarias, analíticas ni dashboards.

## Pendientes reales para decidir antes de implementar

Estos puntos sobreviven al contraste entre la documentación vigente, el código
actual y el backlog; no deben asumirse como aprobados automáticamente.

1. **Operación de WhatsApp y email.** Definir número final por variable de
   entorno, probar en dispositivos reales la apertura, reenvío y copia del
   mensaje, y elegir/configurar proveedor SMTP transaccional para producción.
   Ningún número real ni secreto va al repositorio.
2. **Privacidad.** Acordar texto de consentimiento, política de conservación,
   solicitud de eliminación de datos y requisitos legales aplicables. La UI ya
   explica el uso operativo de teléfono/email, pero no resuelve la política
   completa.
3. **Validación de experiencia.** Ejecutar pruebas con clientes reales y
   revisión de teclado, lectores de pantalla, contraste WCAG AA, movimiento
   reducido y anchos de 320, 390, 768, 1024 y 1440 px.
4. **Calidad operativa.** Completar pruebas de flujo de retiro/entrega,
   reintentos de WhatsApp, sesión vencida y errores de red; definir copias de
   seguridad de catálogo y pedidos. Las pruebas de concurrencia deben correr en
   PostgreSQL, no en SQLite.
5. **Evolución opcional.** Búsqueda y orden de catálogo, mejoras de seguimiento
   de pedidos, compartir productos, impresión de resumen, favoritos,
   estacionales y métricas deben priorizarse por separado. No agregar agenda,
   franjas, pagos online, analíticas ni automatizaciones de WhatsApp como parte
   de un cambio menor de la web.

## Guía de intervención para los próximos cambios

- Para una modificación visual pública, empezar en `frontend/src/App.tsx` y en
  las páginas/componentes que importa; conservar el carrito único y la
  navegación actual salvo decisión explícita de introducir un router.
- Para catálogo e inventario, mantener el límite de API: no simular escrituras,
  no reutilizar los datos de fallback y no calcular stock disponible desde el
  físico solamente.
- Para pedidos, partir de `src/lib/order-api.ts`, `src/lib/order-status.ts` y
  `src/lib/order-message.ts`; todas las mutaciones usan credenciales y CSRF y
  no se reintentan silenciosamente.
- Si se cambia un endpoint o su contrato, documentarlo mediante drf-spectacular
  y regenerar `docs/openapi.yaml` con validación. Nunca editar el YAML a mano.
- Al modificar código, validar como mínimo TypeScript sin emisión y `pnpm build`;
  también ejecutar `pnpm test` si se tocan reglas de inventario. Probar la UI en
  mobile y escritorio en proporción al cambio.

## Lectura recomendada antes de una tarea concreta

- Catálogo, productos, imágenes y ajustes: [backoffice.md](backoffice.md).
- Checkout, estados, acceso y operación de pedidos: [pedidos.md](pedidos.md).
- Contratos, errores y esquema: [api.md](api.md).
- Restricciones globales del proyecto: [AGENTS.md](../AGENTS.md).

