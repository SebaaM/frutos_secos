# Guía del proyecto — Rosana Frutos Secos

## Estructura y responsabilidad

- `frontend/` contiene la aplicación pública React + Vite + Tailwind. Sus instrucciones locales complementan este archivo.
- `backend/` contiene Django, Django REST Framework y la integración con PostgreSQL.
- `docs/` conserva decisiones de negocio, producto y arquitectura que no pertenecen a un paquete concreto.

## Reglas de negocio no negociables

- Todo producto se vende mediante variantes de peso fijo; cada variante tiene SKU, precio y stock propios.
- El estado `A_CONFIRMAR` no reserva unidades.
- `RESERVADO`, `PREPARANDO`, `LISTO_PARA_RETIRO` y `EN_REPARTO` mantienen unidades reservadas.
- El stock disponible se deriva de `stock_fisico - stock_reservado`.
- La confirmación de stock y los cambios de estado se validan en Django dentro de una transacción; el frontend solo refleja el resultado.
- Los pedidos enviados a WhatsApp deben comunicar que quedan pendientes de confirmación.

## Convenciones de desarrollo

- Mantener frontend y backend desacoplados por API; no acoplar componentes React a detalles internos de Django.
- Documentar nuevos endpoints/cambios con drf-spectacular; regenerar `docs/openapi.yaml` con `spectacular --validate --fail-on-warn`, nunca editarlo a mano. Referencia: `docs/api.md`.
- No publicar endpoints de pedidos/autenticación pendientes en el esquema. Swagger y esquema conservan el guard exclusivo de desarrollo local; los ejemplos de escritura modifican datos reales.
- Guardar secretos y números reales de WhatsApp solo en variables de entorno, nunca en archivos versionados.
- Para importes, usar `Decimal` o enteros en unidades menores en backend; nunca `float`.
- Mantener la experiencia mobile-first y controles accesibles de al menos 44 × 44 px.
- Mantener el pedido breve: carrito único, disponible como panel lateral durante la exploración y como
  página de revisión, sin estados duplicados ni botones redundantes.
- No hacer afirmaciones terapéuticas sobre hierbas ni promesas de salud no verificadas.

## Backoffice de catálogo (etapa 1)

- Panel React en `/backoffice`; API `/api/v1/backoffice/`. Fuentes de verdad: `docs/backoffice.md` y `docs/context.md`.
- Productos/presentaciones se guardan juntos en una transacción; galería y ajustes tienen operaciones independientes.
- SKU único global y peso único por producto. Pesos enteros en gramos; stock en paquetes por presentación.
- Para publicar: categoría activa, imagen y presentación activa con precio positivo.
- No borrar productos, categorías ni variantes: borrador/desactivación. No recargar fixtures ni reiniciar la base de datos existente.
- Reservado de solo lectura. El físico existente solo cambia por ajustes con motivo e historial; no bajar del reservado.
- Inventario es la vista inicial de operación: prioriza por presentación activa y publicada agotada o con
  1–5 paquetes disponibles. No usar “stock parcial” como tarea; los borradores se incluyen solo a pedido.
- El ajuste rápido recibe el conteo físico final, calcula el delta/disponible y conserva `expected_stock`,
  motivo e historial en Django. El historial se carga solo al solicitarlo; no permitir editar reservado.
- Publicar u ocultar un producto puede ser rápido desde Inventario. Ocultar debe advertir que afecta solo
  pedidos nuevos; publicar conserva las validaciones completas de catálogo. Las variantes se activan o
  desactivan únicamente desde el editor de producto.
- Múltiples imágenes: máximo 10; JPEG/PNG/WebP hasta 5 MB; descripción obligatoria y primera posición como portada.
- Mantener URLs existentes. Medios locales en `backend/media/`, nunca en Git. Al quitar de la galería, conservar archivo físico para recuperación manual.
- Administración requiere operador activo is_staff y sesión con CSRF. Conserva además DEBUG, BACKOFFICE_ENABLED, cliente local y origen permitido; autenticación no habilita exposición remota.
- El proxy Vite sobrescribe X-Backoffice-Client-IP con la IP del socket. No debilitar esa comprobación ni exponer administración en producción.
- Django admin de catálogo es de consulta: no habilitar escrituras que salteen auditoría o validaciones.

## Flujo de trabajo y próximas etapas

- Usar ramas `codex/<funcionalidad>`, commits pequeños y pruebas antes de integrar con merge no fast-forward a `main`.
- Preservar cambios ajenos, datos de ejemplo y archivos no versionados; nunca usar `loaddata` como rutina de arranque.
- Validar Django tests/check/migraciones pendientes, TypeScript y build de Vite; probar UI móvil y escritorio cuando se modifique.
- Los tests de concurrencia real requieren PostgreSQL: no afirmar que SQLite valida bloqueo de filas.
- Etapa 2 implementada: pedidos, tablero por antigüedad, cliente por enlace de email y operadores por sesión. Fuente de verdad: `docs/pedidos.md`.
- Enlaces de cliente de un uso, guardados como hash; customer separado de Django user/staff. No usar email + número ni historial local como contraseña.
- Toda escritura exige CSRF, incluido checkout/login anónimos. No crear operador/contraseña predeterminados ni guardar tokens en localStorage.
- Transiciones requieren expected_status; bloquear pedido, productos ordenados y variantes ordenadas. Terminar consume físico y reservado con movimiento; cancelar/vencer solo libera reservado.
- Plazo de reserva pendiente solo en RESERVADO; al preparar se cierra el plazo pero se conserva stock. Calendario configurable provisional; automatización deshabilitada hasta confirmar horarios.
- No importar historial local del prototipo ni convertir reservas preexistentes en pedidos ficticios. Pruebas UI deben usar una base aislada, no el catálogo administrado.
- No agregar agenda/franjas horarias, analíticas ni dashboards como parte del catálogo.
