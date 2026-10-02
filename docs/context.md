# Contexto de construcción — Rosana Frutos Secos

## Estructura actual

- `frontend/`: React 19, TypeScript, Vite 8 y Tailwind CSS 4; interfaz pública importada de Figma Make.
- `frontend/src/backoffice/`: panel React de catálogo, imágenes y stock, en `/backoffice`.
- `frontend/src/lib/api.ts`: base de API y tratamiento de errores compartidos.
- `frontend/src/lib/catalog-api.ts`: adaptación del catálogo público a los componentes existentes.
- `frontend/src/lib/backoffice-api.ts`: contratos administrativos; precios transportados como strings decimales.
- `backend/`: Django 5.2 LTS y Django REST Framework; PostgreSQL mediante `DATABASE_URL`.
- SQLite se usa solo como arranque local cuando no se configura `DATABASE_URL`.
- `docs/backoffice.md`: fuente de verdad del alcance y operación de la etapa 1.

React y Django se comunican por API, sin compartir modelos internos. La navegación actual
usa History API; no se agregó un router ni otro framework de UI.
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

Django valida publicación, peso, stock y galería. Disponible = físico − reservado.
Los ajustes tienen motivo, protección de concurrencia y transacción; no se editan reservas.
No se borran productos, categorías ni variantes desde el panel; se desactivan/ocultan.
Las imágenes sí pueden quitarse de la galería; se preservan los archivos físicos locales.

La migración `0003` agrega galería con archivos, conservación, movimientos y restricciones,
sin reemplazar datos ni ejecutar fixtures. El catálogo local existente conserva 8 productos,
19 variantes y 16 imágenes. No recargar `sample_catalog` sobre datos administrados.

## Ejecución y límites de la etapa 1

- Django: `http://127.0.0.1:8000`.
- Vite: `http://localhost:8443` o `http://127.0.0.1:8443`.
- `VITE_API_BASE_URL` predeterminado: `/api/v1`; Vite redirige `/api` y `/media` a Django.
- `BACKOFFICE_ENABLED=true` solo tiene efecto con DEBUG y cliente local; no habilita producción.
- Archivos en `backend/media/`, excluidos de Git. Pillow verifica las imágenes subidas.
- Para el catálogo administrado, usar el servidor de desarrollo de Vite, no `vite preview`
  sin proxy. Un despliegue necesita reverse proxy de API/media y autenticación antes de habilitar administración.
- `.env.example` es una referencia: Django lee variables del proceso y no carga un `.env` automáticamente.

El catálogo público ya consulta Django. Los datos estáticos siguen como fallback visual;
no se utilizan para el backoffice. El carrito se revalida contra el catálogo recibido y se
vuelve a consultar el catálogo al regresar desde el panel.

## Pedidos y autenticación: pendientes de etapa 2

La creación de pedidos y “Mis pedidos” siguen siendo prototipos del frontend con almacenamiento
local; no hay persistencia de pedidos ni verificación real del email en Django.
El carrito deriva a WhatsApp indicando que stock, pago y entrega requieren confirmación.

Reglas acordadas para implementar después:

- `A_CONFIRMAR` no reserva unidades.
- Confirmar reserva stock mediante transacciones en Django.
- Reservas se mantienen durante preparación, retiro o reparto; terminar consume físico
  y libera reservado. Cancelar/vencer libera reservado sin aumentar físico.
- Plazos de reserva/recordatorios configurables; documentar calendario hábil antes de automatizar.
- Tablero mobile-first con pedidos por estado y “Próximos” ordenados por antigüedad,
  sin agenda ni franjas horarias.
- Acceso del cliente por enlace de email, sin contraseña; cada cliente solo ve sus pedidos.
- Autenticación del backoffice protege también catálogo, imágenes y stock.

No interpretar la pantalla actual de email + número de pedido como autenticación implementada.
Analíticas, dashboards, pagos online y automatización de WhatsApp quedan fuera de estas etapas.
