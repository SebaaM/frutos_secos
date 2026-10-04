# Contexto de construcción — Rosana Frutos Secos

## Estructura actual

- `frontend/`: React 19, TypeScript, Vite 8 y Tailwind CSS 4; interfaz pública importada de Figma Make.
- `frontend/src/backoffice/`: panel React de inventario, catálogo, imágenes y pedidos, en `/backoffice`.
- `frontend/src/backoffice/InventoryPage.tsx`: vista inicial de operación diaria; prioriza por
  presentación publicada agotada o con pocas unidades. `StockPanel.tsx` ajusta el conteo físico final
  y carga el historial solo a demanda.
- `frontend/src/backoffice/stock-status.ts`: criterios compartidos de alertas/filtros por presentación activa;
  `StockBadge.tsx`: indicadores y resumen de disponible/reservado/físico. Pruebas con `pnpm test`.
- `frontend/src/lib/api.ts`: base de API y tratamiento de errores compartidos.
- `frontend/src/lib/catalog-api.ts`: adaptación del catálogo público a los componentes existentes.
- `frontend/src/lib/backoffice-api.ts`: contratos administrativos; precios transportados como strings decimales.
- `frontend/src/lib/cart.ts`: fuente única del carrito, snapshots de precio y revisión de disponibilidad
  antes del checkout.
- `backend/`: Django 5.2 LTS y Django REST Framework; PostgreSQL mediante `DATABASE_URL`.
- SQLite se usa solo como arranque local cuando no se configura `DATABASE_URL`.
- `docs/backoffice.md`: fuente de verdad del catálogo; `docs/pedidos.md`: pedidos y acceso de etapa 2.
- `docs/api.md`: guía de integración; `docs/openapi.yaml`: contrato OpenAPI 3.0.3 generado desde DRF.
- Swagger local en `/api/docs/swagger/`, esquema dinámico `/api/schema/` (YAML o `?format=json`).
  drf-spectacular y sidecar sirven assets locales, sin CDN; documentación protegida por el guard local.

React y Django se comunican por API, sin compartir modelos internos. La navegación actual
usa History API; no se agregó un router ni otro framework de UI. El carrito se abre también como
panel lateral desde la exploración del catálogo, sin duplicar su estado ni sumar pasos al pedido.
El estilo mantiene crema, verde oliva y terracota, tipografía Fraunces/DM Sans,
controles de al menos 44 px y disposición mobile-first.

## Modelo y fuentes de verdad

- `Category`: nombre, slug único y activación.
- `Product`: información comercial, categoría, publicación, destacado y conservación.
- `ProductVariant`: SKU global único, peso fijo entero en gramos, `Decimal` de precio,
  físico, reservado y activación. No se repite peso por producto.
- `ProductImage`: archivo local o URL heredada, descripción accesible, crédito y posición.
  La primera imagen de la galería es la portada.
- `StockMovement`: variante, delta, motivo, físico anterior/resultante y fecha.
- `Customer` y `AccessLink`: identidad de cliente separada de operadores y token de acceso de un uso, almacenado como hash.
- `Order`, `OrderLine`, `OrderEvent`: pedido con referencia/UUID, snapshots de pesos/precios/nombres y transiciones auditadas.

Django valida publicación, peso, stock y galería. Disponible = físico − reservado.
Los ajustes tienen motivo, protección de concurrencia y transacción; no se editan reservas.
La UI alerta por presentación activa: 0 agotado, 1–5 últimas unidades, 6+ disponible. Inventario abre
en **Para atender** y no usa “stock parcial” como tarea: muestra cada peso agotado o bajo directamente.
Los borradores se incluyen solo de forma intencional. Sin variantes activas no se clasifica como agotado.
El disponible existente se lee desde la API, nunca del físico solamente.
No se borran productos, categorías ni variantes desde el panel; se desactivan/ocultan.
Las imágenes sí pueden quitarse de la galería; se preservan los archivos físicos locales.

La migración `0003` agrega galería con archivos, conservación, movimientos y restricciones,
sin reemplazar datos ni ejecutar fixtures. Las migraciones iniciales de accounts/orders crean
tablas nuevas y no reescriben el catálogo. No recargar `sample_catalog` sobre datos administrados.

## Ejecución y límites de la etapa 1

- Django: `http://127.0.0.1:8000`.
- Vite: `http://localhost:8443` o `http://127.0.0.1:8443`.
- `VITE_API_BASE_URL` predeterminado: `/api/v1`; Vite redirige `/api`, `/media` y `/static` a Django.
- `BACKOFFICE_ENABLED=true` solo tiene efecto con DEBUG y cliente local; no habilita producción.
- Archivos en `backend/media/`, excluidos de Git. Pillow verifica las imágenes subidas.
- Para el catálogo administrado, usar el servidor de desarrollo de Vite, no `vite preview`
  sin proxy. Un despliegue necesita reverse proxy de API/media, HTTPS y una política explícita de administración.
- `.env.example` es una referencia: Django lee variables del proceso y no carga un `.env` automáticamente.

El catálogo público ya consulta Django. Los datos estáticos siguen como fallback visual;
no se utilizan para el backoffice. El carrito lateral y la página de carrito comparten los mismos datos,
se revalidan contra el catálogo recibido y se vuelve a consultar el catálogo al regresar desde el panel.

## Pedidos y autenticación: etapa 2 implementada

El carrito crea el pedido en Django y luego ofrece derivarlo a WhatsApp. Email obligatorio,
precio esperado y clave de idempotencia; subtotal calculado con Decimal y snapshots históricos.
Los nuevos pedidos no se guardan en localStorage; el historial viejo no se borra ni usa como credencial.
El fallback del catálogo no puede generar pedidos. La pantalla de detalle consulta estado e historial reales.

Reglas actuales:

- `A_CONFIRMAR` no reserva unidades.
- Confirmar reserva stock mediante transacciones en Django.
- Reservas se mantienen durante preparación, retiro o reparto; terminar consume físico
  y libera reservado. Cancelar/vencer libera reservado sin aumentar físico.
- Vencimiento configurable a 48 horas de apertura; calendario provisional lunes a sábado de 9 a 19.
  Comando `expire_reservations` con dry-run; ejecución automática deshabilitada por defecto.
  Solo vence RESERVADO: iniciar preparación cierra el plazo pendiente y mantiene stock.
  Recordatorios y alertas internas previas todavía pendientes.
- Tablero mobile-first con pedidos por estado y “Próximos” ordenados por antigüedad,
  sin agenda ni franjas horarias.
- Acceso del cliente por enlace de email, sin contraseña; cada cliente solo ve sus pedidos.
- Autenticación del backoffice protege también catálogo, imágenes y stock.
- Sesiones HttpOnly con CSRF obligatorio incluso en login y checkout anónimo. Enlaces de un uso,
  token en hash y fragmento URL, POST explícito para verificar; customer y staff separados.
- La administración conserva el guard local además de exigir operador activo. No habilitar producción por cambiar DEBUG.
- Email consola en desarrollo; configurar SMTP y crear un operador interactivo para uso real.

Detalles funcionales y configuración en [pedidos.md](pedidos.md). El acceso anterior de email +
número de pedido fue reemplazado; ninguna referencia permite ver datos privados sin verificación.
Analíticas, dashboards, pagos online y automatización de WhatsApp quedan fuera de estas etapas.
