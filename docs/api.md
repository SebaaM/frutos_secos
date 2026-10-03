# API — OpenAPI y Swagger

Contrato actual: OpenAPI 3.0.3, versión API `1.0.0`, generado desde Django REST Framework
con drf-spectacular. Incluye 32 operaciones de sistema, catálogo, backoffice, pedidos y autenticación.
La operación de pedidos y configuración de acceso se explica en [pedidos.md](pedidos.md).

## Abrir la documentación

Con Django en `127.0.0.1:8000` y Vite en `localhost:8443`:

- [Swagger UI](http://localhost:8443/api/docs/swagger/)
- [Esquema YAML](http://localhost:8443/api/schema/)
- [Esquema JSON](http://localhost:8443/api/schema/?format=json)
- [Contrato exportado y versionado](openapi.yaml): importar en Postman, Insomnia o Figma/integraciones compatibles.

Swagger y el esquema son **solo de desarrollo local**: requieren `DJANGO_DEBUG=true`,
`BACKOFFICE_ENABLED=true`, IP loopback y un Origin permitido cuando esté presente.
En producción o para clientes remotos responden `403`. No se cambió la seguridad del backoffice.
El backoffice ahora exige también una sesión de operador activo; el guard local no fue retirado.

Swagger utiliza recursos instalados localmente (`drf-spectacular-sidecar`), sin CDN ni
envío del esquema a un validador externo. Vite proxifica `/api`, `/media` y `/static` a Django.
El proxy `/api` conserva la verificación de la IP real del cliente.

También se puede consultar en `http://127.0.0.1:8000/api/docs/swagger/`.
Para **escrituras desde Swagger usar el puerto 8443**: es el origen ya autorizado para
el backoffice. No ampliar la lista de orígenes ni desactivar permisos para hacerlo funcionar.
Iniciar sesión desde `/backoffice` usando el mismo hostname que Swagger. Las cookies HttpOnly
se envían automáticamente; no copiar el sessionid a “Authorize”. Swagger inyecta CSRF desde su
plantilla. **Recargar Swagger después de iniciar/cerrar sesión o canjear un enlace**, porque esas
operaciones rotan el token CSRF. Los clientes propios obtienen `csrf_token` en `auth/session/`
y lo envían como `X-CSRFToken` junto con las cookies.

**“Try it out” ejecuta llamadas reales.** POST, PATCH y DELETE pueden modificar productos,
galerías o inventario. Usar una base de pruebas para experimentar; no recargar fixtures ni
ejecutar ejemplos de escritura sobre el catálogo administrado. Los IDs de los ejemplos
son ilustrativos: reemplazarlos por IDs existentes.

## Convenciones

- Base funcional: `/api/v1/`; rutas con `/` final. IDs numéricos en catálogo; UUID en pedidos, no referencias ni slugs.
- Respuestas JSON. Catálogo usa arrays sin paginación; pedidos usan `{count,next,previous,results}`, 50 por página.
- Precios en ARS, strings decimales con dos posiciones: `"6300.00"`. No usar `float` en backend.
- `weight_grams`: entero positivo. Por ejemplo, 0,25 kg se envía como `250` gramos.
- Stock: número de paquetes de una variante, no gramos. Disponible = físico − reservado.
- Fechas de movimientos: ISO 8601. Cada variante tiene SKU global único, precio y stock propios.
- Catálogo público: categorías activas, productos publicados y variantes activas; puede mostrar agotados.
- `availability`: `in_stock`, `low_stock` (1–5 disponibles), `out_of_stock` (0 disponibles).
- Galería ordenada por `position`; primera imagen como portada. `image_url` devuelve la URL utilizable,
  tanto para un archivo subido como para una URL heredada; no expone rutas físicas.

## Endpoints actuales

| Método | Ruta relativa a `/api/v1/` | Operación |
| --- | --- | --- |
| GET | `health/` | Responde `{"status":"ok"}`; no comprueba la base de datos |
| GET | `catalog/categories/` | Categorías activas, ordenadas por nombre |
| GET | `catalog/categories/{id}/` | Detalle de categoría activa |
| GET | `catalog/products/` | Productos publicados, ordenados por nombre |
| GET | `catalog/products/{id}/` | Detalle público, presentaciones y galería |
| GET / POST | `backoffice/categories/` | Listar todas / crear categoría |
| GET / PATCH | `backoffice/categories/{id}/` | Consultar / editar o desactivar |
| GET / POST | `backoffice/products/` | Listar todos / crear con presentaciones |
| GET / PATCH | `backoffice/products/{id}/` | Consultar / editar producto y presentaciones |
| POST | `backoffice/products/{id}/images/` | Agregar una imagen por solicitud |
| POST | `backoffice/products/{id}/reorder-images/` | Ordenar galería y elegir portada |
| PATCH / DELETE | `backoffice/images/{id}/` | Editar metadatos / quitar referencia |
| POST | `backoffice/variants/{id}/adjust-stock/` | Ajustar físico con motivo e historial |
| GET | `backoffice/variants/{id}/movements/` | Hasta 100 movimientos, más recientes primero |
| GET | `auth/session/` | Identidades de sesión y token CSRF; no devuelve credenciales de acceso |
| POST | `auth/staff/login/` | Usuario/contraseña de operador activo, sin acceso por email de cliente |
| POST | `auth/staff/logout/` | Cierra sesión compartida del navegador |
| POST | `auth/customer/request-link/` | Solicita enlace con respuesta genérica y rate limit |
| POST | `auth/customer/verify/` | Canjea token de un uso por sesión de cliente |
| POST | `auth/customer/logout/` | Cierra solo la identidad de cliente |
| POST / GET | `orders/` | Crea A_CONFIRMAR / lista los pedidos del cliente verificado |
| GET | `orders/{id}/` | Detalle e historial privado, sin notas internas |
| GET | `backoffice/orders/` | Lista administrativa paginada, más antiguos primero |
| GET / PATCH | `backoffice/orders/{id}/` | Detalle / solo nota interna |
| POST | `backoffice/orders/{id}/transition/` | Cambio de estado transaccional con expected_status |

No hay PUT. No hay DELETE de productos, variantes ni categorías: usar borrador o desactivación.
Las raíces de los routers son enlaces de navegación, no operaciones de negocio exportadas.

### Filtros

- Público: `catalog/products/?category=frutos-secos&featured=true`.
  `category` es **slug**; solo `featured=true` literal activa el filtro de destacados.
- Administrativo: `backoffice/products/?search=almendra&category=1&published=false`.
  `category` es un **ID numérico válido**, `search` busca nombre o SKU sin distinguir mayúsculas,
  y `published` acepta `true` o `false`.
- Disponibilidad en el panel se filtra en React: no existe parámetro API `stock`.
- Pedidos administrativos: `?page=1&bucket=proximos&delivery=retiro_local&search=RF-`.
  `bucket`: confirmar, proximos, entrega, entregados, cerrados. También `status` filtra un estado exacto.
  Las columnas consultan páginas independientes para no ocultar pendientes detrás de entregados antiguos.
- La identidad del cliente viene de la sesión verificada, nunca de un filtro email o número de pedido.

## Escrituras y reglas importantes

### Producto y presentaciones

Crear primero como borrador (`is_published=false`), agregar galería y después publicar.
Publicación requiere categoría activa, una imagen y una presentación activa con precio positivo.
Producto y variantes se guardan dentro de una transacción.

```json
{
  "name": "Almendras naturales",
  "slug": "almendras-ejemplo",
  "category": 1,
  "ingredients": "Almendras.",
  "allergen_info": "Contiene almendras.",
  "is_published": false,
  "variants": [
    {"sku": "EJ-ALM-250", "weight_grams": 250, "price": "6300.00", "is_active": true, "stock_physical": 10}
  ]
}
```

PATCH permite omitir campos del producto. Si incluye `variants`, debe enviar todas las
presentaciones existentes con `id` y datos completos (`sku`, `weight_grams`, `price`, `is_active`).
Omitir una variante no la elimina y se rechaza. Para agregar otra, enviar una entrada sin `id`.
No repetir peso dentro del producto. No cambiar peso ni desactivar variantes reservadas.
El stock inicial solo se establece al crear una variante. El existente se modifica con ajustes;
`stock_reserved` y `stock_available` son de solo lectura.

### Imágenes

POST acepta `multipart/form-data` con `image` (archivo), `alt_text` y `credit` opcional;
o JSON con `image_url`, `alt_text` y `credit`. Archivo o URL, nunca ambos.
Máximo 10 imágenes por producto; JPEG/PNG/WebP hasta 5 MiB y 25 megapíxeles. Para múltiples
archivos, realizar una solicitud por imagen. La subida se agrega al final de la galería.

Para reordenar: `{"ids":[2,1]}` con todos los IDs actuales, sin repetir; el primero es portada.
PATCH de imagen solo permite `alt_text` y `credit`. DELETE responde `204` sin cuerpo,
preserva el archivo físico y no permite quitar la última imagen de un producto publicado.

### Inventario

```json
{"delta": 5, "reason": "Reposición", "expected_stock": 10}
```

`delta` debe ser distinto de cero. `expected_stock` es el físico visto por el operador:
si cambió, se devuelve `409`. Volver a consultar, revisar la diferencia y decidir antes
de reintentar; no hacerlo automáticamente. No permite físico negativo o menor al reservado.
Cada ajuste crea un movimiento auditado, sin modificar reservas. Los locks de filas
requieren PostgreSQL; SQLite no valida concurrencia real.

### Errores

- `400`: errores por campo, `non_field_errors` o lista de mensajes de validación.
- `403`: sesión insuficiente, CSRF inválido, enlace vencido/usado, desarrollo deshabilitado, conexión remota u origen no autorizado.
- `404`: recurso inexistente o pedido ajeno; en catálogo público también productos no publicados/categorías inactivas.
- `405`: método no admitido.
- `409`: stock/estado/precio desactualizado o reutilización de una clave de idempotencia con otros datos.
- `429`: rate limit de login, enlaces o checkout; respetar Retry-After.

### Crear y cambiar un pedido

POST `orders/` (anónimo permitido, **CSRF obligatorio**):

```json
{
  "idempotency_key": "bd1dbe80-53b3-4cac-81a6-d8c83b902abb",
  "name": "Cliente de ejemplo",
  "email": "cliente@example.invalid",
  "phone": "",
  "delivery": "retiro_local",
  "address": "",
  "address_help": "",
  "lines": [{"variant_id": 1, "quantity": 2, "expected_unit_price": "6300.00"}]
}
```

No aceptar subtotal ni precios como fuente de verdad. No repetir variantes ni enviar cantidades fraccionarias.
IDs/precios son ilustrativos: no ejecutar este ejemplo en la base administrada.
Respuesta `201`; reintento idéntico con la misma clave devuelve `200` y el mismo pedido, sin reserva.
El frontend muestra el enlace de WhatsApp después del éxito; la API no contacta WhatsApp.

POST `backoffice/orders/{uuid}/transition/`:

```json
{"status":"RESERVADO","expected_status":"A_CONFIRMAR","public_note":"Reserva confirmada; coordinemos el pago."}
```

Los estados válidos dependen del estado actual y la modalidad. Cambios obsoletos devuelven `409`.
PATCH del detalle permite `{"internal_note":"Texto privado para operadores"}` solamente.
Cliente recibe snapshots, estado, vencimiento e historial público, nunca notas internas ni actor.
No hay cancelación directa del cliente ni endpoint para editar líneas de un pedido creado.
Todas las transiciones/inventario las decide el servidor en una transacción; ver [reglas](pedidos.md).

Ejemplos reales de formatos: `{"sku":["Este campo es requerido."]}`,
`["Enviá todos los identificadores de la galería, sin repetir."]`,
`{"detail":"Los datos cambiaron. Actualizá antes de volver a intentar."}`.

## Mantener y validar el contrato

Desde `backend/`, instalar dependencias y regenerar cada vez que cambien endpoints o serializers:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py spectacular --file ../docs/openapi.yaml --validate --fail-on-warn
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

No editar `openapi.yaml` a mano. Fuente de verdad: serializers y decoradores `extend_schema`
en las vistas; contratos auxiliares de documentación en `backend/apps/catalog/schema.py`.
Las pruebas verifican operaciones, request/response, multipart, decimales, contrato exportado
y restricciones locales. Generar el esquema no consulta ni modifica el catálogo.

Integración basada en la [documentación oficial de drf-spectacular](https://drf-spectacular.readthedocs.io/en/stable/readme.html)
y su [guía de personalización](https://drf-spectacular.readthedocs.io/en/latest/customization.html).
