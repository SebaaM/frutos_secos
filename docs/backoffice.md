# Backoffice — etapa 1: catálogo

## Alcance implementado

Panel React en `/backoffice`, mobile-first y conectado a Django por `/api/v1/backoffice/`.
Administra productos, categorías, presentaciones de peso fijo, galería y stock.
La etapa 2 agrega autenticación de operadores y pedidos: ver [pedidos.md](pedidos.md).
Métricas y dashboards permanecen fuera de alcance.

## Operación

- La sección inicial es **Inventario**: muestra primero las presentaciones publicadas agotadas o con
  1–5 paquetes disponibles. Cada peso tiene su propia fila de trabajo, aun si otro peso del producto
  tiene unidades.
- Inventario ofrece solo búsqueda por nombre/SKU y los accesos **Para atender**, **Agotadas**,
  **Últimas unidades** y **Todo**. Los borradores quedan fuera por defecto y se incluyen con un
  único control cuando hace falta revisarlos.
- Desde cada producto se puede ocultar o publicar rápidamente. Al ocultarlo se confirma que deja de
  venderse en pedidos nuevos y que los pedidos existentes no cambian. Al publicar se mantienen las
  validaciones de categoría, imagen y presentación activa con precio positivo; si no se cumplen,
  hay que completar el editor.
- La sección **Productos** conserva el listado y el editor completo, con búsqueda por nombre o SKU y
  filtros por categoría, publicación y disponibilidad.
- Alta/edición: nombre, identificador URL, categoría, descripción, ingredientes, alérgenos,
  conservación y selección de destacados.
- Los productos nuevos proponen **publicar al guardar**. Se puede desmarcar para guardar un borrador.
- Publicar exige categoría activa, al menos una imagen y una presentación activa con precio positivo.
- Productos y presentaciones no se eliminan: se ocultan con borrador o se desactivan.
- Las categorías se crean, editan y desactivan. Primero hay que pasar sus productos a borrador
  para desactivar una categoría, evitando ocultar un catálogo publicado por accidente.
- Los nombres de categorías y la conservación se reflejan desde la API en la tienda.
- Al volver del panel a la tienda se vuelve a consultar el catálogo.
- Se advierte al salir con cambios pendientes en productos o categorías y se bloquea
  la navegación del panel mientras guarda el producto o categoría.

## Presentaciones y stock

Cada presentación tiene SKU único, peso entero en gramos, precio decimal en ARS y stock propio.
No se repite el mismo peso dentro de un producto, incluidas presentaciones inactivas.
La interfaz admite g y kg y guarda siempre gramos enteros.

- Sugerencias para frutos secos/mixes: 100, 250 y 500 g.
- Sugerencias para hierbas: 25, 50 y 100 g.
- Se admite otro peso positivo; las sugerencias no modifican las presentaciones existentes.
- Stock contado en **paquetes de cada presentación**, no materia prima a granel.
- Disponible = físico − reservado. Reservado es de solo lectura.
- El stock inicial de presentaciones nuevas queda registrado como movimiento.
- Ajustes posteriores: se ingresa el **conteo físico final** y la interfaz calcula el delta y el
  disponible. Incluye accesos +1 y +5, motivo preseleccionado (reposición, corrección de conteo o
  merma), nota opcional y valor físico esperado para detectar cambios hechos desde otra pantalla.
- No se permite físico negativo ni menor al reservado. Un conflicto devuelve HTTP 409:
  hay que actualizar el producto antes de intentar nuevamente.
- Peso y activación quedan protegidos si hay unidades reservadas.
- Historial: últimas 100 operaciones, con fecha, motivo, delta, físico anterior y resultante. Se
  consulta solo al pulsar **Ver historial**, para que la reposición cotidiana sea inmediata.
  Los ajustes físicos de catálogo aún no atribuyen usuario al movimiento; esa ampliación de auditoría
  sigue pendiente. Las transiciones de pedidos sí guardan su operador en OrderEvent.

### Alertas de reposición

- Inventario destaca **Sin stock** (terracota), **Últimas unidades** (ámbar) y disponible (oliva),
  con texto e indicadores además del color. Muestra paquetes disponibles para cada peso.
- Últimas unidades significa **1–5 paquetes disponibles por presentación activa**, no la suma del producto.
- La tarea de reposición existe por presentación, no por producto: no se usa “stock parcial” como
  alerta operativa. Si un peso está agotado, aparece en **Agotadas** aunque otro peso tenga unidades.
- Sin presentaciones activas es un estado neutro: no se considera agotado ni genera alertas.
  Las variantes inactivas tampoco entran en las cantidades disponibles o en las alertas.
- El panel de ajuste separa disponible, reservado y físico, destacando el disponible y el resultado
  esperado antes de confirmar. Si el físico está reservado, el mínimo del conteo impide quitar esas
  unidades; Django vuelve a validarlo dentro de su transacción.
- Los cambios de stock confirmados por Django actualizan el indicador de inventario y el editor. Al
  pulsar Actualizar se consulta nuevamente la API. No hay notificaciones externas, polling ni dashboard.
- En presentaciones nuevas, el stock mostrado es inicial y pendiente de guardar.

Producto y presentaciones se guardan en una misma transacción. Las operaciones de galería
y los ajustes de stock son transacciones independientes. Bloquean el producto antes de
escribir para serializar cambios; PostgreSQL es necesario para validar concurrencia real.

## Imágenes

- Hasta 10 imágenes por producto. JPEG, PNG y WebP válidos, máximo 5 MB y 25 megapíxeles cada una.
- Se pueden seleccionar varias imágenes desde el equipo o agregar una URL HTTP/HTTPS.
- Descripción accesible obligatoria; crédito opcional. La posición 0 es la portada.
- Flechas para cambiar el orden; descripción/crédito y eliminación se guardan inmediatamente.
- Archivos nuevos y URLs seleccionadas se suben al pulsar **Guardar producto**.
- No se puede quitar la última imagen de un producto publicado: antes hay que guardarlo como borrador.
- Las URLs existentes del catálogo se conservan; no se descargan ni reemplazan al migrar.
- Los archivos se guardan en `backend/media/products/<id>/` con nombres aleatorios y
  extensión derivada del contenido verificado, no del nombre enviado.
- Al quitar una imagen, se elimina su referencia de la galería, pero el archivo físico se conserva
  para recuperación manual. No hay papelera visual ni limpieza automática de archivos en esta etapa.
- `media/` no se versiona. Debe incluirse en las copias de seguridad junto con la base de datos.

Para un producto nuevo, la interfaz crea primero un borrador con sus presentaciones,
sube las imágenes y finalmente lo publica si fue solicitado. Lo mismo ocurre con un
borrador existente que recibe su primera imagen. Si una subida falla, se conservan el
borrador y las imágenes ya guardadas; el editor permite corregir y reintentar sin recrear
el producto ni reenviar las imágenes cuya subida se confirmó.

## Acceso autenticado con protección local

La etapa 2 protege este catálogo con sesión de operador activo `is_staff` y CSRF para escrituras.
Crear el primer responsable y configurar email según [pedidos.md](pedidos.md).
Además, para usar la API administrativa se exige:

1. `DJANGO_DEBUG=true` y `BACKOFFICE_ENABLED=true`.
2. Conexión de loopback a Django y, cuando pasa por Vite, cliente de loopback al proxy.
3. Si el navegador envía `Origin`, debe pertenecer a `CORS_ALLOWED_ORIGINS`.

Por defecto se admiten `http://localhost:8443` y `http://127.0.0.1:8443`.
Vite sobrescribe `X-Backoffice-Client-IP` con la dirección real del socket para impedir
que su proxy convierta conexiones de red en conexiones administrativas locales.
No añadir orígenes externos ni poner este panel detrás de otro proxy con DEBUG habilitado.
En producción la API devuelve 403, incluso si `BACKOFFICE_ENABLED=true`.

Django admin queda como consulta de catálogo/inventario, sin escritura, para no permitir
que otra interfaz saltee las validaciones o modifique las reservas.

## API

| Ruta relativa a `/api/v1/backoffice/` | Operación |
| --- | --- |
| `categories/` | GET listado, POST alta |
| `categories/<id>/` | GET detalle, PATCH edición/desactivación |
| `products/` | GET listado, POST borrador/alta |
| `products/<id>/` | GET detalle, PATCH edición/publicación con variantes |
| `products/<id>/images/` | POST archivo multipart o URL |
| `products/<id>/reorder-images/` | POST `{"ids": [id, ...]}` con toda la galería |
| `images/<id>/` | PATCH descripción/crédito, DELETE referencia |
| `variants/<id>/adjust-stock/` | POST `delta`, `reason`, `expected_stock` |
| `variants/<id>/movements/` | GET últimos 100 movimientos |

Las variantes existentes se envían con su ID; una nueva, sin ID y con stock inicial.
Al enviar `variants`, se incluyen todas las existentes, también las inactivas. Omitir
una existente no la elimina: se rechaza la operación. El stock reservado nunca se acepta
como escritura y el físico existente solo se modifica mediante ajustes.
La API pública `/api/v1/catalog/` continúa siendo de solo lectura.

## Verificación y conservación de datos

Se aplicó una migración aditiva, sin recargar fixtures: siguen los 8 productos, 19 variantes
y 16 imágenes originales, con los mismos SKU, precios, unidades y URLs.
Las pruebas usan una base de datos temporal y un directorio de medios temporal.

Validar: publicación incompleta, SKU/pesos repetidos, operaciones atómicas, archivos inválidos,
límites y orden de galería, última imagen publicada, ajustes y conflictos de stock, bloqueo
en producción/red/orígenes externos, catálogo público y conservación del catálogo de ejemplo.

Desde `frontend/`: `pnpm test` verifica límites 0/1/5/6, variantes inactivas, stock reservado,
agotados totales/parciales y filtros de reposición. Requiere Node 22.6+ con soporte de type stripping
(entorno actual Node 24), sin instalar otro framework de pruebas. Validar también TypeScript,
build y disposición a 320 px y escritorio. Las pruebas no escriben sobre el catálogo real.

## Etapa 2 implementada

El backoffice ya exige autenticación de operadores y tiene pedidos persistentes,
reservas, historial de estados y tablero móvil. “Próximos” se ordena por
antigüedad, sin agenda ni franjas horarias. El cliente accede a sus pedidos por
un enlace de email sin contraseña. Consultar [pedidos.md](pedidos.md) para el
detalle operativo y de seguridad.

Analíticas y dashboards siguen fuera del alcance actual.
