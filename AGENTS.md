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
- Guardar secretos y números reales de WhatsApp solo en variables de entorno, nunca en archivos versionados.
- Para importes, usar `Decimal` o enteros en unidades menores en backend; nunca `float`.
- Mantener la experiencia mobile-first y controles accesibles de al menos 44 × 44 px.
- No hacer afirmaciones terapéuticas sobre hierbas ni promesas de salud no verificadas.

## Backoffice de catálogo (etapa 1)

- Panel React en `/backoffice`; API `/api/v1/backoffice/`. Fuentes de verdad: `docs/backoffice.md` y `docs/context.md`.
- Productos/presentaciones se guardan juntos en una transacción; galería y ajustes tienen operaciones independientes.
- SKU único global y peso único por producto. Pesos enteros en gramos; stock en paquetes por presentación.
- Para publicar: categoría activa, imagen y presentación activa con precio positivo.
- No borrar productos, categorías ni variantes: borrador/desactivación. No recargar fixtures ni reiniciar la base de datos existente.
- Reservado de solo lectura. El físico existente solo cambia por ajustes con motivo e historial; no bajar del reservado.
- Múltiples imágenes: máximo 10; JPEG/PNG/WebP hasta 5 MB; descripción obligatoria y primera posición como portada.
- Mantener URLs existentes. Medios locales en `backend/media/`, nunca en Git. Al quitar de la galería, conservar archivo físico para recuperación manual.
- Antes de autenticación, administración solo con DEBUG, bandera BACKOFFICE_ENABLED, cliente local y origen permitido.
- El proxy Vite sobrescribe X-Backoffice-Client-IP con la IP del socket. No debilitar esa comprobación ni exponer administración en producción.
- Django admin de catálogo es de consulta: no habilitar escrituras que salteen auditoría o validaciones.

## Flujo de trabajo y próximas etapas

- Usar ramas `codex/<funcionalidad>`, commits pequeños y pruebas antes de integrar con merge no fast-forward a `main`.
- Preservar cambios ajenos, datos de ejemplo y archivos no versionados; nunca usar `loaddata` como rutina de arranque.
- Validar Django tests/check/migraciones pendientes, TypeScript y build de Vite; probar UI móvil y escritorio cuando se modifique.
- Los tests de concurrencia real requieren PostgreSQL: no afirmar que SQLite valida bloqueo de filas.
- Etapa 2 pendiente: pedidos, tablero por antigüedad, cliente por enlace de email sin contraseña y autenticación de operadores.
- No agregar agenda/franjas horarias, analíticas ni dashboards como parte del catálogo.
